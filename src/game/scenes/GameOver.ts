import { Scene, GameObjects } from 'phaser';

interface GameOverData {
    score?: number;
}

export class GameOver extends Scene
{
    background: GameObjects.Image;
    score = 0;

    constructor ()
    {
        super('GameOver');
    }

    init (data: GameOverData)
    {
        this.score = data?.score ?? 0;
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'background').setAlpha(0.6);

        this.add.image(512, 300, 'chris-after-hours').setScale(0.5);

        this.add.text(512, 480, 'Merdre!', {
            fontFamily: 'Arial Black', fontSize: 96, color: '#ffffff',
            stroke: '#000000', strokeThickness: 10
        }).setOrigin(0.5);

        this.add.text(512, 560, `Final score: ${this.score}`, {
            fontFamily: 'Arial', fontSize: 36, color: '#ffffff',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);

        const prompt = this.add.text(512, 680, 'click to play again', {
            fontFamily: 'Arial', fontSize: 24, color: '#ffffff',
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

        this.input.once('pointerdown', () => {
            this.scene.start('MainMenu');
        });
    }
}
