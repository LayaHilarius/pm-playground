# PM Playground

A note-taker I keep open on a shared screen during PM interview practice. I type my answer as I talk, and it turns into a visual the interviewer can follow.

One tab per interview question. Built with React and TypeScript, one question type at a time. First up: guesstimates.

## How I write notes

Guesstimate steps, "two Cs, four Ss": **Clarify, Chain, Segment, Solve, Sanity check, Summary.**

```
Clarify
New cars only, or used too?
-> New cars only
--end--

Structure
Clarify
Chain
Segment
Solve
Sanity check
Summary
--end--

Chain
...
```

| I type | It shows |
| --- | --- |
| `Clarify` on its own line | My questions as bullets |
| `-> answer` | The answer to the question above, highlighted |
| `--end--` | Closes the section. Clarify folds into one card of answers only (click to open it again) |
| `Structure`, then one step per line, then `--end--` | The step bar on top: ✓ done, ● the step I'm on, numbers for the rest |
| A step's name on its own line | Opens that step and moves the bar along |
| An indented `- detail` | A detail, hidden until I click the card |

Next: a visual for each step, starting with Chain.

Everything is saved in my browser. Nothing leaves my laptop.

## Where the code is

```
src/parse.ts              notes text -> sections (plain TypeScript, no React)
src/Visual.tsx            draws the sections: Q&A cards, stages, expandable cards
src/App.tsx               first page, tabs, notes box
src/NewQuestionDialog.tsx the "+ New" form
src/questions.ts          question types, saving to the browser
```

## Run it

Needs Node 20.19 or newer. With nvm, `nvm use` picks the version from `.nvmrc`.

```
nvm use
npm install
npm run dev
```
