import { Scene, Physics, GameObjects, Types } from 'phaser';

const PLAYER_SPEED = 280;
const CHASE_SPEED = 115;
const WANDER_SPEED = 70;
const FLEE_SPEED = 200;
const SUPER_DURATION = 3000;
const POWERUP_RESPAWN = 5000;
const SPAWN_INTERVAL = 18000;
const MAX_FRENCHIES = 6;

type Mode = 'chase' | 'wander' | 'idle';
interface ChaserState {
    mode: Mode;
    until: number;
    wanderX: number;
    wanderY: number;
    lastWasChase: boolean;
}

export class Game extends Scene
{
    background: GameObjects.Image;
    chris: Physics.Arcade.Sprite;
    frenchies: Physics.Arcade.Group;
    powerup: Physics.Arcade.Sprite;
    cursors: Types.Input.Keyboard.CursorKeys;
    wasd: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
    scoreText: GameObjects.Text;
    instructions: GameObjects.Container;
    chaserState: Map<Physics.Arcade.Sprite, ChaserState> = new Map();
    score = 0;
    isSuper = false;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.score = 0;
        this.isSuper = false;
        this.chaserState = new Map();

        const kb = this.input.keyboard!;
        this.cursors = kb.createCursorKeys();
        this.wasd = kb.addKeys('W,A,S,D') as typeof this.wasd;

        this.background = this.add.image(512, 384, 'background').setDisplaySize(1024, 768);

        this.chris = this.physics.add.sprite(160, 384, 'chris').setScale(0.5);
        this.chris.setCollideWorldBounds(true);

        this.frenchies = this.physics.add.group();
        this.spawnFrenchie(820, 200);
        this.spawnFrenchie(500, 600);
        this.spawnFrenchie(700, 100);

        this.time.addEvent({
            delay: SPAWN_INTERVAL,
            loop: true,
            callback: () => {
                if (this.frenchies.getLength() >= MAX_FRENCHIES) return;
                const edge = Math.floor(Math.random() * 4);
                let x: number;
                let y: number;
                if (edge === 0) { x = 50;  y = Math.floor(Math.random() * 668) + 50; }
                else if (edge === 1) { x = 974; y = Math.floor(Math.random() * 668) + 50; }
                else if (edge === 2) { x = Math.floor(Math.random() * 924) + 50; y = 50; }
                else               { x = Math.floor(Math.random() * 924) + 50; y = 718; }
                this.spawnFrenchie(x, y);
            }
        });

        this.powerup = this.physics.add.sprite(512, 384, 'chris-super').setScale(0.4);
        this.placePowerup();

        this.scoreText = this.add.text(20, 16, 'Score: 0', {
            fontFamily: 'Arial', fontSize: 28, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        });

        this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                this.score += 1;
                this.scoreText.setText(`Score: ${this.score}`);
            }
        });

        this.buildInstructions();

        this.physics.add.overlap(this.chris, this.frenchies, () => this.hitFrenchie());
        this.physics.add.overlap(this.chris, this.powerup, () => this.collectPowerup());
    }

    update ()
    {
        if (!this.cursors || !this.wasd) return;

        const left = this.cursors.left.isDown || this.wasd.A.isDown;
        const right = this.cursors.right.isDown || this.wasd.D.isDown;
        const up = this.cursors.up.isDown || this.wasd.W.isDown;
        const down = this.cursors.down.isDown || this.wasd.S.isDown;

        const vx = left ? -PLAYER_SPEED : right ? PLAYER_SPEED : 0;
        const vy = up ? -PLAYER_SPEED : down ? PLAYER_SPEED : 0;
        this.chris.setVelocity(vx, vy);

        const now = this.time.now;
        const chasers = this.frenchies.getChildren() as Physics.Arcade.Sprite[];
        for (const f of chasers)
        {
            if (this.isSuper)
            {
                const dx = f.x - this.chris.x;
                const dy = f.y - this.chris.y;
                const len = Math.hypot(dx, dy) || 1;
                f.setVelocity((dx / len) * FLEE_SPEED, (dy / len) * FLEE_SPEED);
            }
            else
            {
                let state = this.chaserState.get(f);
                if (!state || now >= state.until)
                {
                    const prevWasChase = state?.mode === 'chase';
                    state = this.rollChaserState(now, prevWasChase);
                    this.chaserState.set(f, state);
                }

                if (state.mode === 'chase')
                {
                    this.physics.moveToObject(f, this.chris, CHASE_SPEED);
                }
                else if (state.mode === 'wander')
                {
                    this.physics.moveTo(f, state.wanderX, state.wanderY, WANDER_SPEED);
                }
                else
                {
                    f.setVelocity(0, 0);
                }
            }

            const body = f.body as Physics.Arcade.Body;
            if (body && (body.velocity.x !== 0 || body.velocity.y !== 0))
            {
                f.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
            }
        }
    }

    rollChaserState (now: number, prevWasChase: boolean): ChaserState
    {
        // After a chase, force a cooldown — must wander or idle before chasing again.
        // Otherwise 25% chase / 55% wander / 20% idle.
        const r = Math.random();
        const canChase = !prevWasChase;

        if (canChase && r < 0.25)
        {
            // Short, twitchy chase — locks on for under a second, then loses interest.
            return {
                mode: 'chase',
                until: now + 500 + Math.random() * 500,
                wanderX: 0, wanderY: 0,
                lastWasChase: true
            };
        }

        // Pick wander vs idle (when chase isn't available, redistribute its weight).
        const wanderCutoff = canChase ? 0.8 : 0.75;
        if (r < wanderCutoff)
        {
            return {
                mode: 'wander',
                until: now + 1500 + Math.random() * 2500,
                wanderX: Math.floor(Math.random() * 924) + 50,
                wanderY: Math.floor(Math.random() * 668) + 50,
                lastWasChase: false
            };
        }

        return {
            mode: 'idle',
            until: now + 800 + Math.random() * 1500,
            wanderX: 0, wanderY: 0,
            lastWasChase: false
        };
    }

    buildInstructions ()
    {
        const lines = [
            'Arrow keys or WASD to move',
            'French Chris wanders, then hunts — watch when they lock on',
            'Grab Super Chris to make them flee for 3 seconds',
            'Survive as long as you can'
        ];

        const panel = this.add.rectangle(512, 110, 720, 160, 0x000000, 0.55)
            .setStrokeStyle(2, 0xffffff, 0.6);

        const title = this.add.text(512, 50, 'How to play', {
            fontFamily: 'Arial Black', fontSize: 26, color: '#ffffff'
        }).setOrigin(0.5);

        const body = this.add.text(512, 110, lines.join('\n'), {
            fontFamily: 'Arial', fontSize: 18, color: '#ffffff', align: 'center'
        }).setOrigin(0.5);

        this.instructions = this.add.container(0, 0, [panel, title, body]);

        this.tweens.add({
            targets: this.instructions,
            alpha: 0,
            delay: 4000,
            duration: 800,
            onComplete: () => this.instructions.destroy()
        });
    }

    spawnFrenchie (x: number, y: number)
    {
        const f = this.physics.add.sprite(x, y, 'chris-french').setScale(0.4);
        this.frenchies.add(f);
        // Start idle for a beat so the player gets a moment to read the board.
        this.chaserState.set(f, {
            mode: 'idle',
            until: this.time.now + 1000 + Math.random() * 1500,
            wanderX: 0, wanderY: 0,
            lastWasChase: false
        });
        if (this.isSuper) f.setTint(0xff5555);
    }

    placePowerup ()
    {
        const x = Math.floor(Math.random() * 824) + 100;
        const y = Math.floor(Math.random() * 568) + 100;
        // Kill any pulse tween from a previous spawn — otherwise tweens stack
        // and the scale converges to 0, making the powerup invisible.
        this.tweens.killTweensOf(this.powerup);
        this.powerup.setScale(0.4);
        this.powerup.enableBody(true, x, y, true, true);
        this.tweens.add({
            targets: this.powerup,
            scale: 0.5,
            ease: 'Sine.InOut',
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    collectPowerup ()
    {
        if (!this.powerup.active) return;

        this.powerup.disableBody(true, true);
        this.isSuper = true;
        this.chris.setTexture('chris-super');
        this.chris.setTint(0xfff7a8);
        this.tweens.add({ targets: this.chris, scale: 0.65, duration: 200, yoyo: true });

        (this.frenchies.getChildren() as Physics.Arcade.Sprite[]).forEach(f => f.setTint(0xff5555));

        this.time.delayedCall(SUPER_DURATION, () => {
            this.isSuper = false;
            this.chris.setTexture('chris');
            this.chris.clearTint();
            this.chris.setScale(0.5);
            (this.frenchies.getChildren() as Physics.Arcade.Sprite[]).forEach(f => f.clearTint());
        });

        this.time.delayedCall(POWERUP_RESPAWN, () => this.placePowerup());
    }

    hitFrenchie ()
    {
        if (this.isSuper) return;
        if (!this.scene.isActive('Game')) return;
        this.scene.start('GameOver', { score: this.score });
    }
}
