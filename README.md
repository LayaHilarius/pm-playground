# PM Playground

A note-taker I keep open on a shared screen during PM interview practice. I type my answer as I talk, and it turns into a visual the interviewer can follow.

One tab per interview question. Built with React and TypeScript, one question type at a time. First up: guesstimates.

## How I write notes

```
Clarify
Is this new cars only?
-( New cars only

Structure
Indian households, about 30 crore
  - 1.4 billion people / about 4.5 per household
Split by income: rich, middle, low
```

| I type | It shows |
| --- | --- |
| `Clarify`, `Structure`, `Assumptions`, `Calculation`, `Sanity check`, `Summary` on their own line, or any line starting with `#` or ending with `:` | A new section |
| A plain line (or `- ...`) | A point. Under Clarify, a question card. Under Structure, a numbered stage |
| `-( answer` | The answer to the point above, in bold |
| An indented `- detail` (or `-- detail`) | A detail, hidden until I click the card |

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

```
npm install
npm run dev
```
