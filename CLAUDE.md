# Chrisolutions — Hackathon Guide for Claude

This repo is a 2-hour hackathon kit. Teammates (mostly Python/backend engineers) clone a fork and build a game starring **Chris**, our PM. The stack — **Phaser 4 + TypeScript + Vite** — was chosen on purpose; nobody is expected to know it going in or coming out. The point is to see how far we can get collaborating with you, Claude, without the usual backend constraints.

## Run it

```
npm install
npm run dev         # http://localhost:8080, hot reload
npm run typecheck   # tsc --noEmit, surfaces TS errors Vite hides in dev
```

That's the whole loop: edit a `.ts` file under `src/`, browser auto-reloads.

**Important — read this carefully:** Vite does NOT type-check in dev mode. TypeScript errors silently produce broken JS that crashes in the browser without a useful message.

After editing any `.ts` file under `src/`, you MUST run `npm run typecheck` before claiming the task is done. If it returns errors, fix them and re-run until clean. Do not hand broken TS to the user — they're backend engineers who will not be able to debug it themselves.

## Where things live

| Path | What it is |
|------|------------|
| `src/game/main.ts` | Game config, scene registration, canvas size |
| `src/game/scenes/Boot.ts` | First scene — minimal loader for the Preloader's assets |
| `src/game/scenes/Preloader.ts` | Loads game assets via `this.load.*` |
| `src/game/scenes/MainMenu.ts` | Title screen |
| `src/game/scenes/Game.ts` | Main gameplay scene — most edits land here |
| `src/game/scenes/GameOver.ts` | End screen |
| `public/chris/normal-chris.png` | The star |
| `public/chris/super-chris.png` | Powered-up Chris |
| `public/chris/french-chris.png` | French Chris (use responsibly) |
| `public/assets/bg.png`, `logo.png` | Other static assets |

## Loading assets

Anything under `public/` is served at the URL root. Load via Phaser:

```ts
// Inside Preloader.preload()
this.load.image('chris', 'chris/normal-chris.png');
this.load.image('chris-super', 'chris/super-chris.png');
this.load.image('bg', 'assets/bg.png');
```

Then in a scene's `create()`:

```ts
this.add.image(512, 384, 'chris');
```

## Phaser 4 knowledge

26 skill packs live in `.claude/skills/` covering scenes, sprites, physics (arcade + matter), input, tweens, particles, tilemaps, audio, cameras, text, filters, tilemaps, and more. They load automatically when relevant — teammates don't need to read Phaser docs; they describe what they want ("make Chris jump on spacebar", "spawn enemies from the right edge", "add a particle trail") and you pull the right skill.

## Slash commands

- `/new-scene <Name>` — scaffolds `src/game/scenes/<Name>.ts` and registers it in `src/game/main.ts`. Use this instead of explaining scene wiring from scratch.

## House rules

- Edit existing scenes; resist creating new abstractions for a 2hr jam.
- Keep TypeScript happy but don't fight it — `any` is fine if it unblocks. `noUnusedLocals` and `noUnusedParameters` are intentionally off; `strict` is on.
- Default canvas is 1024×768 (`src/game/main.ts`). Change it there if needed.
- Don't spend time on a build pipeline, tests, or CI. `npm run dev` is the deploy target.
- If a teammate asks "how does X work in Phaser", answer using the relevant skill and a runnable snippet they can paste into a scene — don't lecture.

## Audience note

Most teammates write Python day-to-day and have not touched Node or a browser game engine. Skip Node/Vite trivia unless they ask. Frame everything in terms of "edit this file, save, look at the browser."
