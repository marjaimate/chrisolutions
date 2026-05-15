import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        this.add.image(512, 384, 'background');

        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        const bar = this.add.rectangle(512 - 230, 384, 4, 28, 0xffffff);

        this.load.on('progress', (progress: number) => {
            bar.width = 4 + (460 * progress);
        });
    }

    preload ()
    {
        this.load.image('chris', 'chris/normal-chris.png');
        this.load.image('chris-super', 'chris/super-chris.png');
        this.load.image('chris-french', 'chris/french-chris.png');
        this.load.image('chris-after-hours', 'chris/after-hours-chris.png');
        this.load.image('wall-tile', 'tile2.png');

        // "Taking A Bite" by Mike Koenig — CC BY 3.0, via soundbible.com
        this.load.audio('chomp', 'sounds/chomp.mp3');

        // La Marseillaise — public domain (U.S. Navy Band recording), via Wikimedia Commons
        this.load.audio('marseillaise', 'sounds/marseillaise.mp3');

        // Sad trombone (wah-wah) — CC0 / public domain, via orangefreesounds.com
        this.load.audio('sad-trombone', 'sounds/sad-trombone.mp3');
    }

    create ()
    {
        // Generate a small white circle texture for particle emitters.
        const g = this.make.graphics({ x: 0, y: 0 }, false);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(4, 4, 4);
        g.generateTexture('sparkle', 8, 8);
        g.destroy();

        this.scene.start('MainMenu');
    }
}
