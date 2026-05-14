---
description: Scaffold a new Phaser scene and register it in src/game/main.ts
argument-hint: <SceneName>
---

Create a new Phaser scene named `$1` for this project.

Steps:

1. Create the file `src/game/scenes/$1.ts` with this content (replace `$1` with the actual name):

   ```ts
   import { Scene } from 'phaser';

   export class $1 extends Scene
   {
       constructor()
       {
           super('$1');
       }

       create()
       {
           this.add.text(512, 384, '$1', {
               fontFamily: 'Arial Black',
               fontSize: 48,
               color: '#ffffff',
               stroke: '#000000',
               strokeThickness: 8,
           }).setOrigin(0.5);
       }

       update()
       {
           // per-frame logic
       }
   }
   ```

2. Edit `src/game/main.ts`:
   - Add `import { $1 } from './scenes/$1';` next to the other scene imports.
   - Add `$1` to the `scene: [...]` array in the config (put it where it makes sense — typically at the end before any GameOver-style scene).

3. Tell the user how to transition into the new scene from an existing one — e.g. `this.scene.start('$1')`.

Do not start any other scenes or modify gameplay logic. Just scaffold and register.
