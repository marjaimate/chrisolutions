import { Scene, Physics, GameObjects, Types } from 'phaser';

const TILE = 48;
const COLS = 16;
const ROWS = 16;
const MAZE_PIXEL_W = COLS * TILE; // = 768; canvas is 1024, leaving a 256px right margin for UI.
const PLAYER_SPEED = 150;
const GHOST_SPEED_NORMAL = 100;
const GHOST_SPEED_FRENZY = 150; // 1.5×
const GHOST_CATCH_RADIUS = 22;
const GLOW_DURATION = 800;
const GLOW_COLOR = 0xfff58a;
const BAGUETTE_PICKUP_RADIUS = 20;
const FRENZY_INTERVAL_MIN = 15000;
const FRENZY_INTERVAL_MAX = 25000;
const FRENZY_DURATION = 5000;
const FRENZY_COLOR = 0xff66cc;
const WINE_SPAWN_MIN = 35000;
const WINE_SPAWN_MAX = 45000;
const WINE_COUNT = 2;
const SUPER_DURATION = 20000;
const SUPER_TINT = 0xfff7a8;
const CHRIS_SCALE = 0.17;
const SUPER_CHRIS_SCALE = 0.25;
const GHOST_SPEED_FRIGHTENED = 60; // ghosts slow down during super so eating them is winnable

// '#' = wall, '.' = path with a baguette, ' ' = path with no baguette (start tile).
const MAZE = [
    '################',
    '# .............#',
    '#.####.##.####.#',
    '#..............#',
    '#.##.######.##.#',
    '#..............#',
    '#.##.######.##.#',
    '#..............#',
    '#.####.##.####.#',
    '#..............#',
    '#.##.######.##.#',
    '#..............#',
    '#.##.######.##.#',
    '#..............#',
    '#.####.##.####.#',
    '################',
];

const GHOST_SPAWNS = [
    { col: 7, row: 7 },
    { col: 8, row: 7 },
    { col: 12, row: 11 },
];

interface Ghost {
    text: GameObjects.Text;
    halo: GameObjects.Arc;
    col: number;
    row: number;
    lastDc: number;
    lastDr: number;
    spawnCol: number;
    spawnRow: number;
    eaten: boolean;
}

const DIRS = [
    { dc: 1, dr: 0 },
    { dc: -1, dr: 0 },
    { dc: 0, dr: 1 },
    { dc: 0, dr: -1 },
];

export class Game extends Scene
{
    chris: Physics.Arcade.Sprite;
    walls: Physics.Arcade.StaticGroup;
    baguettes: GameObjects.Text[] = [];
    wines: GameObjects.Text[] = [];
    ghosts: Ghost[] = [];
    cursors: Types.Input.Keyboard.CursorKeys;
    wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    scoreText: GameObjects.Text;
    frenzyText: GameObjects.Text;
    superText: GameObjects.Text;
    pauseOverlay: GameObjects.Container;
    anthem?: Phaser.Sound.BaseSound;
    score = 0;
    totalBaguettes = 0;
    glowToken = 0;
    superToken = 0;
    caught = false;
    paused = false;
    frenzy = false;
    super = false;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.score = 0;
        this.totalBaguettes = 0;
        this.baguettes = [];
        this.wines = [];
        this.ghosts = [];
        this.glowToken = 0;
        this.superToken = 0;
        this.caught = false;
        this.paused = false;
        this.frenzy = false;
        this.super = false;
        this.anthem = undefined;

        this.cameras.main.setBackgroundColor('#0a0a2a');

        const kb = this.input.keyboard!;
        this.cursors = kb.createCursorKeys();
        this.wasd = kb.addKeys('W,A,S,D') as typeof this.wasd;

        this.walls = this.physics.add.staticGroup();
        this.buildMaze();

        const startX = 1 * TILE + TILE / 2;
        const startY = 1 * TILE + TILE / 2;
        this.chris = this.physics.add.sprite(startX, startY, 'chris').setScale(CHRIS_SCALE);
        const body = this.chris.body as Physics.Arcade.Body;
        body.setSize(this.chris.width * 0.65, this.chris.height * 0.65);
        this.chris.setDepth(5);

        this.physics.add.collider(this.chris, this.walls);

        for (const spawn of GHOST_SPAWNS)
        {
            this.spawnGhost(spawn.col, spawn.row);
        }

        this.buildRightMargin();

        this.pauseOverlay = this.buildPauseOverlay();
        this.pauseOverlay.setVisible(false);

        kb.on('keydown-SPACE', () => this.togglePause());

        this.scheduleFrenzy();
        this.scheduleWine();
    }

    buildRightMargin ()
    {
        // Vertical divider between the maze (left) and UI margin (right).
        this.add.rectangle(MAZE_PIXEL_W, 384, 2, 768, 0x60a5fa, 0.4).setDepth(10);

        const marginX = MAZE_PIXEL_W + 18;

        this.scoreText = this.add.text(marginX, 24, `Baguettes: 0 / ${this.totalBaguettes}`, {
            fontFamily: 'Arial', fontSize: 22, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setDepth(10);

        this.frenzyText = this.add.text(marginX, 80, 'FRENZY!', {
            fontFamily: 'Arial Black', fontSize: 30, color: '#ff66cc',
            stroke: '#000000', strokeThickness: 5
        }).setDepth(10).setVisible(false);

        this.superText = this.add.text(marginX, 130, 'SUPER CHRIS', {
            fontFamily: 'Arial Black', fontSize: 22, color: '#fff7a8',
            stroke: '#000000', strokeThickness: 5
        }).setDepth(10).setVisible(false);

        this.add.text(marginX, 700, 'arrows / WASD — move\nSPACE — pause', {
            fontFamily: 'Arial', fontSize: 16, color: '#cbd5e1',
            stroke: '#000000', strokeThickness: 3
        }).setDepth(10);
    }

    buildPauseOverlay (): GameObjects.Container
    {
        const dim = this.add.rectangle(512, 384, 1024, 768, 0x000000, 0.55);
        const title = this.add.text(512, 340, 'PAUSED', {
            fontFamily: 'Arial Black', fontSize: 80, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8
        }).setOrigin(0.5);
        const hint = this.add.text(512, 420, 'press SPACE to resume', {
            fontFamily: 'Arial', fontSize: 22, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        return this.add.container(0, 0, [dim, title, hint]).setDepth(20);
    }

    togglePause ()
    {
        if (this.caught) return;
        this.paused = !this.paused;
        if (this.paused)
        {
            this.physics.pause();
            this.tweens.pauseAll();
            this.time.paused = true;
            this.sound.pauseAll();
            this.pauseOverlay.setVisible(true);
        }
        else
        {
            this.physics.resume();
            this.tweens.resumeAll();
            this.time.paused = false;
            this.sound.resumeAll();
            this.pauseOverlay.setVisible(false);
        }
    }

    update ()
    {
        if (this.caught || this.paused) return;
        if (!this.cursors || !this.wasd) return;

        const left = this.cursors.left.isDown || this.wasd.A.isDown;
        const right = this.cursors.right.isDown || this.wasd.D.isDown;
        const up = this.cursors.up.isDown || this.wasd.W.isDown;
        const down = this.cursors.down.isDown || this.wasd.S.isDown;

        const vx = left ? -PLAYER_SPEED : right ? PLAYER_SPEED : 0;
        const vy = up ? -PLAYER_SPEED : down ? PLAYER_SPEED : 0;
        this.chris.setVelocity(vx, vy);

        const cx = this.chris.x;
        const cy = this.chris.y;

        for (let i = this.baguettes.length - 1; i >= 0; i--)
        {
            const bag = this.baguettes[i];
            if (Math.hypot(bag.x - cx, bag.y - cy) < BAGUETTE_PICKUP_RADIUS)
            {
                this.baguettes.splice(i, 1);
                this.eatBaguette(bag);
            }
        }

        for (let i = this.wines.length - 1; i >= 0; i--)
        {
            const wine = this.wines[i];
            if (Math.hypot(wine.x - cx, wine.y - cy) < BAGUETTE_PICKUP_RADIUS)
            {
                this.wines.splice(i, 1);
                this.eatWine(wine);
            }
        }

        for (const ghost of this.ghosts)
        {
            // Keep the halo glued to the moving ghost emoji.
            ghost.halo.x = ghost.text.x;
            ghost.halo.y = ghost.text.y;

            if (ghost.eaten) continue;
            if (Math.hypot(ghost.text.x - cx, ghost.text.y - cy) < GHOST_CATCH_RADIUS)
            {
                if (this.super)
                {
                    this.eatGhost(ghost);
                }
                else
                {
                    this.onCaught();
                    return;
                }
            }
        }
    }

    buildMaze ()
    {
        for (let r = 0; r < ROWS; r++)
        {
            for (let c = 0; c < COLS; c++)
            {
                const ch = MAZE[r][c];
                const x = c * TILE + TILE / 2;
                const y = r * TILE + TILE / 2;

                if (ch === '#')
                {
                    const wall = this.add.image(x, y, 'wall-tile').setDisplaySize(TILE, TILE);
                    this.physics.add.existing(wall, true);
                    // Static body inherits its source-texture dimensions (1024×1024 here),
                    // so resync it to the display size.
                    const body = wall.body as Physics.Arcade.StaticBody;
                    body.setSize(TILE, TILE);
                    body.updateFromGameObject();
                    this.walls.add(wall);
                }
                else if (ch === '.')
                {
                    const bag = this.add.text(x, y, '🥖', { fontSize: '22px' })
                        .setOrigin(0.5);
                    this.baguettes.push(bag);
                    this.totalBaguettes++;
                }
            }
        }
    }

    spawnGhost (col: number, row: number)
    {
        const x = col * TILE + TILE / 2;
        const y = row * TILE + TILE / 2;
        const halo = this.add.circle(x, y, 20, FRENZY_COLOR, 0.55)
            .setDepth(3)
            .setVisible(false);
        const text = this.add.text(x, y, '👻', { fontSize: '30px' })
            .setOrigin(0.5)
            .setDepth(4);
        const ghost: Ghost = {
            text, halo, col, row, lastDc: 0, lastDr: 0,
            spawnCol: col, spawnRow: row, eaten: false
        };
        this.ghosts.push(ghost);
        this.stepGhost(ghost);
    }

    isWall (col: number, row: number): boolean
    {
        if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return true;
        return MAZE[row][col] === '#';
    }

    stepGhost (ghost: Ghost)
    {
        if (this.caught || ghost.eaten) return;

        // Filter out walls. By default also forbid reversing — gives ghosts a
        // committed Pac-Man-style path; only reverse at a dead-end.
        const open = DIRS.filter(d => !this.isWall(ghost.col + d.dc, ghost.row + d.dr));
        const forward = open.filter(d => !(d.dc === -ghost.lastDc && d.dr === -ghost.lastDr));
        const options = forward.length > 0 ? forward : open;
        if (options.length === 0) return;

        const chrisCol = Math.floor(this.chris.x / TILE);
        const chrisRow = Math.floor(this.chris.y / TILE);

        let chosen;
        if (Math.random() < 0.7)
        {
            let best = options[0];
            let bestDist = Infinity;
            for (const d of options)
            {
                const dist = Math.hypot(ghost.col + d.dc - chrisCol, ghost.row + d.dr - chrisRow);
                if (dist < bestDist) { bestDist = dist; best = d; }
            }
            chosen = best;
        }
        else
        {
            chosen = options[Math.floor(Math.random() * options.length)];
        }

        ghost.lastDc = chosen.dc;
        ghost.lastDr = chosen.dr;
        ghost.col += chosen.dc;
        ghost.row += chosen.dr;

        const targetX = ghost.col * TILE + TILE / 2;
        const targetY = ghost.row * TILE + TILE / 2;
        const speed = this.super
            ? GHOST_SPEED_FRIGHTENED
            : (this.frenzy ? GHOST_SPEED_FRENZY : GHOST_SPEED_NORMAL);

        this.tweens.add({
            targets: ghost.text,
            x: targetX,
            y: targetY,
            duration: (TILE * 1000) / speed,
            ease: 'Linear',
            onComplete: () => this.stepGhost(ghost)
        });
    }

    scheduleFrenzy ()
    {
        const delay = FRENZY_INTERVAL_MIN + Math.random() * (FRENZY_INTERVAL_MAX - FRENZY_INTERVAL_MIN);
        this.time.delayedCall(delay, () => this.startFrenzy());
    }

    scheduleWine ()
    {
        const delay = WINE_SPAWN_MIN + Math.random() * (WINE_SPAWN_MAX - WINE_SPAWN_MIN);
        this.time.delayedCall(delay, () => this.spawnWine());
    }

    spawnWine ()
    {
        if (this.caught) return;
        // Need enough baguettes left so the player can still win after the swap.
        if (this.baguettes.length <= WINE_COUNT) return;

        // Pick N distinct random indices from the remaining baguettes.
        const picks: number[] = [];
        while (picks.length < WINE_COUNT)
        {
            const i = Math.floor(Math.random() * this.baguettes.length);
            if (!picks.includes(i)) picks.push(i);
        }
        picks.sort((a, b) => b - a); // splice from the end so earlier indices stay valid

        for (const idx of picks)
        {
            const bag = this.baguettes[idx];
            const wine = this.add.text(bag.x, bag.y, '🍷', { fontSize: '24px' })
                .setOrigin(0.5);
            this.tweens.add({
                targets: wine,
                scale: 1.18,
                duration: 700,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
            this.wines.push(wine);
            bag.destroy();
            this.baguettes.splice(idx, 1);
            this.totalBaguettes--;
        }

        this.scoreText.setText(`Baguettes: ${this.score} / ${this.totalBaguettes}`);
    }

    eatWine (wine: GameObjects.Text)
    {
        this.tweens.killTweensOf(wine);
        wine.destroy();
        this.startSuper();
    }

    startSuper ()
    {
        const wasSuper = this.super;
        this.super = true;
        // Ensure the super sprite renders at the exact same size as normal Chris,
        // even if a glow tween was mid-yoyo when the wine was eaten.
        this.tweens.killTweensOf(this.chris);
        this.chris.setTexture('chris-super');
        this.chris.setScale(SUPER_CHRIS_SCALE);
        this.chris.setTint(SUPER_TINT);

        // Dim un-eaten ghosts to signal they're vulnerable.
        for (const ghost of this.ghosts)
        {
            if (!ghost.eaten) ghost.text.setAlpha(0.5);
        }

        this.superText.setVisible(true);
        if (!wasSuper)
        {
            this.tweens.add({
                targets: this.superText,
                alpha: 0.45,
                duration: 500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        }

        // Restart anthem from the top — handles wine-on-wine too.
        if (this.anthem) { this.anthem.stop(); this.anthem.destroy(); }
        this.anthem = this.sound.add('marseillaise', { volume: 0.55 });
        this.anthem.play();

        const myToken = ++this.superToken;
        this.time.delayedCall(SUPER_DURATION, () => {
            if (this.superToken === myToken) this.endSuper();
        });
    }

    endSuper ()
    {
        this.super = false;
        this.tweens.killTweensOf(this.chris);
        this.chris.setTexture('chris');
        this.chris.setScale(CHRIS_SCALE);
        this.chris.clearTint();

        this.tweens.killTweensOf(this.superText);
        this.superText.setVisible(false).setAlpha(1);

        this.stopAnthem();

        // Bring eaten ghosts back at their original spawn tile.
        for (const ghost of this.ghosts)
        {
            ghost.text.setAlpha(1);
            if (ghost.eaten)
            {
                ghost.eaten = false;
                ghost.col = ghost.spawnCol;
                ghost.row = ghost.spawnRow;
                ghost.lastDc = 0;
                ghost.lastDr = 0;
                const x = ghost.spawnCol * TILE + TILE / 2;
                const y = ghost.spawnRow * TILE + TILE / 2;
                ghost.text.setPosition(x, y).setVisible(true);
                ghost.halo.setPosition(x, y);
                this.stepGhost(ghost);
            }
        }
    }

    stopAnthem ()
    {
        if (this.anthem)
        {
            this.anthem.stop();
            this.anthem.destroy();
            this.anthem = undefined;
        }
    }

    eatGhost (ghost: Ghost)
    {
        ghost.eaten = true;
        this.tweens.killTweensOf(ghost.text);
        this.tweens.killTweensOf(ghost.halo);
        ghost.text.setVisible(false);
        ghost.halo.setVisible(false);
        this.sound.play('chomp', { volume: 0.8, rate: 0.9 });
    }

    startFrenzy ()
    {
        if (this.caught) return;
        this.frenzy = true;
        for (const ghost of this.ghosts)
        {
            ghost.halo.setVisible(true).setAlpha(0.55).setScale(1);
            this.tweens.add({
                targets: ghost.halo,
                alpha: 0.2,
                scale: 1.25,
                duration: 350,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        }
        this.frenzyText.setVisible(true);
        this.tweens.add({
            targets: this.frenzyText,
            alpha: 0.4,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        this.time.delayedCall(FRENZY_DURATION, () => this.endFrenzy());
    }

    endFrenzy ()
    {
        this.frenzy = false;
        for (const ghost of this.ghosts)
        {
            this.tweens.killTweensOf(ghost.halo);
            ghost.halo.setVisible(false).setScale(1).setAlpha(0.55);
        }
        this.tweens.killTweensOf(this.frenzyText);
        this.frenzyText.setVisible(false).setAlpha(1);
        if (!this.caught) this.scheduleFrenzy();
    }

    eatBaguette (bag: GameObjects.Text)
    {
        bag.destroy();
        this.score += 1;
        this.scoreText.setText(`Baguettes: ${this.score} / ${this.totalBaguettes}`);
        // Slight pitch jitter so rapid pickups don't sound robotically identical.
        this.sound.play('chomp', { volume: 0.6, rate: 1.6 + (Math.random() * 0.4 - 0.2) });
        this.triggerGlow();

        if (this.score >= this.totalBaguettes)
        {
            this.stopAnthem();
            this.time.delayedCall(700, () => {
                this.scene.start('GameOver', { score: this.score, caught: false });
            });
        }
    }

    triggerGlow ()
    {
        const base = this.super ? SUPER_CHRIS_SCALE : CHRIS_SCALE;
        this.tweens.killTweensOf(this.chris);
        this.chris.setScale(base);
        this.chris.setTint(GLOW_COLOR);

        const myToken = ++this.glowToken;

        const aura = this.add.circle(this.chris.x, this.chris.y, 22, GLOW_COLOR, 0.6)
            .setDepth(this.chris.depth - 1);

        this.tweens.add({
            targets: aura,
            scale: 2.4,
            alpha: 0,
            duration: GLOW_DURATION,
            ease: 'Sine.Out',
            onComplete: () => aura.destroy()
        });

        this.tweens.add({
            targets: this.chris,
            scale: base * 1.27,
            duration: GLOW_DURATION / 2,
            yoyo: true,
            ease: 'Sine.InOut'
        });

        this.time.delayedCall(GLOW_DURATION, () => {
            if (this.glowToken === myToken)
            {
                this.chris.clearTint();
            }
        });
    }

    onCaught ()
    {
        if (this.caught) return;
        this.caught = true;
        this.chris.setVelocity(0, 0);
        this.chris.setTint(0xff4444);
        for (const ghost of this.ghosts)
        {
            this.tweens.killTweensOf(ghost.text);
            this.tweens.killTweensOf(ghost.halo);
            ghost.halo.setVisible(false);
        }
        this.tweens.killTweensOf(this.frenzyText);
        this.frenzyText.setVisible(false);
        this.stopAnthem();
        this.sound.play('sad-trombone', { volume: 0.7 });
        this.cameras.main.shake(350, 0.012);
        this.time.delayedCall(750, () => {
            this.scene.start('GameOver', { score: this.score, caught: true });
        });
    }
}
