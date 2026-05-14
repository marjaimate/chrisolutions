import { Scene, GameObjects } from 'phaser';

export class MainMenu extends Scene
{
    background: GameObjects.Image;
    chris: GameObjects.Image;
    title: GameObjects.Text;
    prompt: GameObjects.Text;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.background = this.add.image(512, 384, 'background');

        this.add.particles(512, 420, 'sparkle', {
            speedY: { min: -40, max: -10 },
            speedX: { min: -20, max: 20 },
            lifespan: 2000,
            quantity: 1,
            frequency: 80,
            scale: { start: 1, end: 0 },
            alpha: { start: 0.8, end: 0 },
            blendMode: 'ADD'
        });

        this.chris = this.add.image(512, 400, 'chris').setScale(0.7);
        this.tweens.add({
            targets: this.chris,
            y: this.chris.y - 10,
            ease: 'Sine.InOut',
            duration: 1200,
            yoyo: true,
            repeat: -1
        });
        this.tweens.add({
            targets: this.chris,
            angle: 3,
            ease: 'Sine.InOut',
            duration: 1600,
            yoyo: true,
            repeat: -1
        });

        this.title = this.add.text(512, -100, 'Chrisolutions', {
            fontFamily: 'Arial Black', fontSize: 72, color: '#ffffff',
            stroke: '#000000', strokeThickness: 10,
            align: 'center'
        }).setOrigin(0.5);

        this.tweens.add({
            targets: this.title,
            y: 140,
            ease: 'Bounce.Out',
            duration: 1000,
            onComplete: () => {
                this.tweens.add({
                    targets: this.title,
                    scale: 1.04,
                    ease: 'Sine.InOut',
                    duration: 900,
                    yoyo: true,
                    repeat: -1
                });
            }
        });

        this.prompt = this.add.text(512, 680, 'click anywhere to start', {
            fontFamily: 'Arial', fontSize: 26, color: '#ffffff',
            stroke: '#000000', strokeThickness: 4
        }).setOrigin(0.5);
        this.tweens.add({
            targets: this.prompt,
            alpha: 0.3,
            ease: 'Sine.InOut',
            duration: 700,
            yoyo: true,
            repeat: -1
        });

        this.input.once('pointerdown', () => {
            this.scene.start('Game');
        });
    }
}
