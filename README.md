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

### Chain: a tree I fill in myself

```
Chain
Paint cans per year
F: houses + factories + vehicles + art
  Houses (87M)
  F: 1.45B / 5 × 3 rooms / 10 yrs
  Factories
  Vehicles
    Cars
    Two-wheelers
```

| I type | It shows |
| --- | --- |
| The first line under Chain | The top box |
| A line indented with 2 spaces (Tab key) | A branch under the box above it |
| `F: formula` under a box | The formula, shown on top of that box |
| `(87M)` at the end of a line | The box's number. Clicking a box and typing a number writes this into my notes |

The app does not do the maths for me. The **Maths** box next to the tree is a calculator: `5B/5`, `50% of 5B`, `2 crore + 30 lakh`, `1.45B / 5 × 3`. It shows the answer in B/M, in crore/lakh, and in full. Words like "people" or "rooms" are ignored, and Enter keeps the last 3 sums.

Everything is saved in my browser. Nothing leaves my laptop.

## Where the code is

```
src/parse.ts              notes text -> sections (plain TypeScript, no React)
src/Visual.tsx            draws the sections and the step bar
src/Chain.tsx             the Chain tree and the Maths box
src/calc.ts               the calculator (no React)
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
