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
| `--end--` | Closes the section and folds it into one line: Clarify shows its answers, Chain its formula, Solve each sheet's number. Click to open it again |
| `Structure`, then one step per line, then `--end--` | The step bar on top: ✓ done, ● the step I'm on, numbers for the rest |
| A step's name on its own line | Opens that step and moves the bar along |
| An indented `- detail` | A detail, hidden until I click the card |
| `// note //` | A comment to myself, never drawn. It runs until the next `//`, even across lines. Without a closing `//` it stops at the end of the line |

### Charts, in any step

```
--pie--
Rich,10%
-> repaint every 4 years
Middle,40%
Low,50%
--end--
```

| I type | It shows |
| --- | --- |
| `--pie--`, then `key,value` lines, then `--end--` | A pie chart. Values can be `10%`, `290M`, `2 crore`. A line with no value gets an equal share |
| `--bar--` … `--end--` | A bar chart, same lines |
| `--table--`, then `key,value,value…` lines, then `--end--` | A table. The first line is the header |
| `-> note` under a pie or bar line | How that segment behaves, shown next to it |

If every value is a % and they don't add up to 100%, the chart says so.

### Chain and Solve: trees I fill in myself

Chain is the formula tree, no numbers yet. Solve is the same idea with numbers. Each top-level line is its own sheet, side by side; a sheet whose top box has a number folds down to that number (click it to see the working).

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
| `(87M)` at the end of a line | The box's number |
| Another unindented line | A new tree, drawn under the first one |

The app does not do the maths for me. The **Maths** box next to the tree is a calculator: `5B/5`, `50% of 5B`, `2 crore + 30 lakh`, `1.45B / 5 × 3`. It shows the answer in B/M, in crore/lakh, and in full. Words like "people" or "rooms" are ignored, and Enter keeps the last 3 sums.

Everything is saved in my browser. Nothing leaves my laptop.

## Product sense notes

Pick **Product sense** in + New. Clarify, Structure, `->` answers, `--end--` and the charts work the same way. The headings it knows: Goal, Mission, Users, User journey, Pain points, Solutions, Metrics, Guardrails, Tradeoffs, Summary.

| I type | It draws |
| --- | --- |
| `User journey`, then one stage per line | Numbered stages, top to bottom |
| A line indented under a stage | A pain point inside that stage |
| `low`, `moderate`, `high` or `very high` indented under it | Its friction: four dashes, green to red |
| Any other indented line | A description |
| A line under Pain points, Solutions, Metrics… | A card; indented lines are its description and friction |
| `P0`–`P3` (or `high`, `low`) indented under a solution | Its priority badge |
| `Metrics`, then `North star`, `Supporting metrics`, `Guardrails` (each with metrics indented below) | One panel: the north star on top, supporting metrics and guardrails side by side |
| A line ending in ` *`, or a click on its star | The north star (one per section). Hover it to see it shoot |

## Metrics notes

Pick **Metrics** in + New. The headings it knows: Clarify, Goal, Key actions, Metric hierarchy, Formulas, Pitfalls, Summary.

| I type | It draws |
| --- | --- |
| `Metric hierarchy` (or `Metrics`), then `Primary: <metric>` | The big gold card on top |
| `Adoption:`, `Engagement:`, `Retention:`, `Experience:`, `Quality:`, `Business:`, `Leading:` … then the metric | One box per metric, labelled with its type |
| `Guardrail: <metric>` | A red box, shown last |
| `F: a / b` indented under a metric (`× 1000` at the end works too) | The formula as a fraction, plus a row in the formula table under the boxes |
| `up` or `down` indented under a metric | "Higher is better" or "Lower is better" |
| Any other indented line | The question the metric answers |

## Strategy notes

Pick **Strategy** in + New. The headings it knows: Clarify, Goal, Why now, Market, Trends, Customer segments, Pain points, Competition, Right to win, Options, Risks, Go-to-market, Metrics (or Metrics funnel), Recommendation.

| I type | It draws |
| --- | --- |
| `--table--` under Market, Customer segments, Competition or Metrics funnel | A table with the Table / Bar / Funnel switch |
| Lines under Why now, Trends, Right to win or Recommendation | Plain bullets |
| A line ending in ` *` under Options (or a click on its star) | My pick |
| `low`, `medium`, `high` indented under a risk | Its severity: four dashes, green to red |
| `-> mitigation` under a risk | The mitigation, highlighted |

## Root cause notes

Pick **Root cause** in + New. Everything above works here too. The headings it knows: Activation funnel, Funnel, Data check, Internal factors, External factors, Hypotheses, Root cause, Conclusion, Next steps.

| I type | It draws |
| --- | --- |
| `--table--`, then `Step,Before,After` and one step per line, closed with `--end--` | A table with a **Table / Bar / Funnel** switch above it |
| A click on **Bar** | One group of bars per step, one bar per column (Before next to After), with a legend. (It writes `--bar--`.) |
| A click on **Funnel** | Each number column becomes a funnel, side by side, with the % kept and dropped at each step. With two columns or more, the step that changed most is marked in red. (It writes `--funnel--` into my notes; **Table** switches back.) |

## Where the code is

```
src/parse.ts              notes text -> sections (plain TypeScript, no React)
src/Visual.tsx            draws the sections and the step bar
src/Chain.tsx             the Chain tree and the Maths box
src/Product.tsx           north star, friction and priority, the User journey
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
