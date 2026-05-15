import { Scene, GameObjects } from 'phaser';

interface GameOverData {
    score?: number;
    caught?: boolean;
}

export class GameOver extends Scene
{
    background: GameObjects.Image;
    score = 0;
    caught = true;

    constructor ()
    {
        super('GameOver');
    }

    init (data: GameOverData)
    {
        this.score = data?.score ?? 0;
        this.caught = data?.caught ?? true;
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'background').setAlpha(0.6);

        const CHRIS_X = 512;
        const CHRIS_Y = 280;
        const CHRIS_SCALE = 2;
        this.add.image(CHRIS_X, CHRIS_Y, 'chris').setScale(CHRIS_SCALE);

        if (this.caught)
        {
            // Teardrops on/under the eyes. Chris source is 128×128 — eyes sit
            // roughly at (45, 55) and (80, 55); shift relative to source center
            // (64, 64), scale by CHRIS_SCALE, then translate to display.
            const tearStyle = { fontSize: '36px' };
            const tearSpots = [
                { sx: 45, sy: 58 },
                { sx: 80, sy: 58 }
            ];
            for (const spot of tearSpots)
            {
                const screenX = CHRIS_X + (spot.sx - 64) * CHRIS_SCALE;
                const screenY = CHRIS_Y + (spot.sy - 64) * CHRIS_SCALE;
                this.add.text(screenX, screenY, '💧', tearStyle).setOrigin(0.5);
            }
        }

        const headlineText = this.caught ? 'Merdre!' : 'Je suis pleine';
        this.add.text(512, 480, headlineText, {
            fontFamily: 'Arial Black', fontSize: 96, color: '#ffffff',
            stroke: '#000000', strokeThickness: 10
        }).setOrigin(0.5);

        this.add.text(512, 560, `Final score: ${this.score}`, {
            fontFamily: 'Arial', fontSize: 36, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        const prompt = this.add.text(512, 680, 'PRESS SPACE', {
            fontFamily: 'Arial Black', fontSize: 30, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        this.tweens.add({
            targets: prompt,
            alpha: 0.3,
            ease: 'Sine.InOut',
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        const restart = () => this.scene.start('MainMenu');
        this.input.once('pointerdown', restart);
        this.input.keyboard!.once('keydown-SPACE', restart);
    }
}
