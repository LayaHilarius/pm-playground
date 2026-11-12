import { calculate } from './calc.ts'

// Turns the notes I type into sections the screen can draw.
//
// How I write notes:
//   Clarify                 a heading: a known word on its own line,
//                           or any line starting with "#" or ending with ":"
//   Is this India only?     a plain line (or "- ...") is a new point
//   -> Yes, India only      "->" is the answer to the point above, highlighted
//     - urban and rural     an indented "-" (or "--") is a detail, hidden until I click
//   // note to self //       a comment, from // to the next //, never drawn.
//                           It can span lines. Without a closing //, it stops at the end of the line.
//   --end--                 closes the section. Clarify folds into one card of answers.
//
//   Structure               each line under Structure is one step of my answer.
//   Clarify                 They become the step bar on top. Close the list with --end--.
//   Chain                   After that, typing a step's name opens that step.
//   --end--
//
//   Chain                   lines under Chain become a tree (a flowchart).
//   Paint cans (17Cr)       an unindented line is the top of a tree; "(...)" at the end is its number
//     Houses (87M)          indent with 2 spaces (or a tab) to make a branch
//     F: houses × cans / 10 an "F:" line is the formula of the box above, shown on top of it

export type SectionKind = 'clarify' | 'structure' | 'chain' | 'list'

export interface TreeNode {
  text: string
  value: string
  formula: string
  line: number // which line of my notes this box came from, so the box can write back to it
  children: TreeNode[]
}

export interface Point {
  text: string
  answers: string[]
  details: string[]
}

export type ChartType = 'pie' | 'bar' | 'table'

export interface ChartItem {
  label: string
  shown: string // the value as I typed it: "10%", "290M"
  value: number | null // the same value as a number, if it has one
  note: string // a "->" line under it: how this segment behaves
}

export interface Chart {
  type: ChartType
  items: ChartItem[] // pie and bar
  rows: string[][] // table: "key,value,value" -> cells, first row is the header
}

export interface Section {
  title: string
  note: string // text after the heading: "Chain (people × cups)" -> "people × cups"
  kind: SectionKind
  points: Point[]
  tree: TreeNode[]
  charts: Chart[]
  ended: boolean
}

export type StepStatus = 'done' | 'current' | 'todo'

export interface Step {
  name: string
  status: StepStatus
}

export interface ParsedNotes {
  sections: Section[]
  steps: Step[]
}

const KNOWN_HEADINGS = [
  'clarify',
  'clarifying questions',
  'clarification',
  'structure',
  'approach',
  'framework',
  'chain',
  'segment',
  'segments',
  'solve',
  'calculation',
  'calculate',
  'assumptions',
  'sanity check',
  'summary',
  'answer',
  'final answer',
]

const STRUCTURE_HEADINGS = ['structure', 'approach', 'framework']
const END_MARKER = '--end--'

// "Sanity check" and "sanity check:" should match each other.
export function normalize(text: string): string {
  return text.toLowerCase().replace(/[:#]/g, '').trim()
}

function isHeadingWord(text: string, stepNames: string[]): boolean {
  const key = normalize(text)
  return KNOWN_HEADINGS.includes(key) || stepNames.includes(key)
}

// A heading can carry a note after it: "Chain (people × cups a day)" or "Chain: people × cups".
const HEADING_WITH_NOTE = /^(.+?)\s*(?:\((.*)\)|:\s*(.+))\s*$/

function headingParts(line: string, stepNames: string[]): { title: string; note: string } | null {
  if (line.startsWith('#')) return { title: line.replace(/^#+/, '').trim(), note: '' }
  if (line.endsWith(':') && !line.startsWith('-')) return { title: line.slice(0, -1).trim(), note: '' }
  if (isHeadingWord(line, stepNames)) return { title: line, note: '' }
  const withNote = HEADING_WITH_NOTE.exec(line)
  if (withNote && isHeadingWord(withNote[1], stepNames)) {
    return { title: withNote[1].trim(), note: (withNote[2] ?? withNote[3] ?? '').trim() }
  }
  return null
}

function headingTitle(line: string, stepNames: string[]): string | null {
  return headingParts(line, stepNames)?.title ?? null
}

function kindOf(title: string): SectionKind {
  const t = normalize(title)
  if (t.startsWith('clarif')) return 'clarify'
  if (STRUCTURE_HEADINGS.includes(t)) return 'structure'
  // Chain (the formula tree) and Solve (the same tree with numbers) are both drawn as trees.
  if (t === 'chain' || t === 'solve') return 'chain'
  return 'list'
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Removes comments: from "//" to the next "//" (across lines if needed).
// A "//" with no closing "//" after it is a comment to the end of its line.
// Line breaks inside a comment are kept, so line numbers stay the same.
export function stripComments(notes: string): string {
  let out = ''
  let i = 0
  while (i < notes.length) {
    const start = notes.indexOf('//', i)
    if (start === -1) {
      out += notes.slice(i)
      break
    }
    out += notes.slice(i, start)
    const close = notes.indexOf('//', start + 2)
    const lineEnd = notes.indexOf('\n', start)
    const end = close !== -1 ? close + 2 : lineEnd !== -1 ? lineEnd : notes.length
    out += notes.slice(start, end).replace(/[^\n]/g, '')
    i = end
  }
  return out
}

// --pie-- ... --end--: one "key,value" per line (value can be 10%, 290M, 2 crore).
// --table-- ... --end--: "key,value,value" per line, the first line is the header.
const CHART_MARKER = /^--(pie|bar|table)--$/i

// "Rich,10%" -> label + value. ("Rich 10%" works too.) No number -> equal share.
function chartItem(line: string): ChartItem {
  const text = line.replace(/^[-*•]\s*/, '')
  const comma = text.indexOf(',')
  if (comma !== -1) {
    const label = text.slice(0, comma).trim()
    const shown = text.slice(comma + 1).trim()
    let value: number | null = null
    try {
      value = shown === '' ? null : calculate(shown)
    } catch {
      value = null
    }
    return { label, shown, value, note: '' }
  }
  const match = /^(.*?)[\s:=]*\(?\s*(-?[\d.,]+\s*(?:%|k|m|mn|b|bn|cr|crores?|l|lakhs?|thousand|million|billion)?)\s*\)?$/i.exec(text)
  if (!match || match[1].trim() === '') return { label: text, shown: '', value: null, note: '' }
  let value: number | null = null
  try {
    value = calculate(match[2])
  } catch {
    value = null
  }
  return { label: match[1].trim(), shown: match[2].trim(), value, note: '' }
}

function addToChart(chart: Chart, line: string) {
  if (chart.type === 'table') {
    chart.rows.push(line.split(',').map((cell) => cell.trim()))
    return
  }
  const last = chart.items[chart.items.length - 1]
  if (line.startsWith('->') && last) {
    last.note = line.slice(2).trim()
    return
  }
  chart.items.push(chartItem(line))
}

function indentOf(rawLine: string): number {
  const leading = /^[ \t]*/.exec(rawLine)?.[0] ?? ''
  return leading.replace(/\t/g, '  ').length
}

// "Houses (87M)" -> text "Houses", value "87M"
export function splitValue(text: string): { text: string; value: string } {
  const match = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(text)
  if (!match) return { text, value: '' }
  return { text: match[1], value: match[2].trim() }
}

function addToTree(
  roots: TreeNode[],
  stack: { indent: number; node: TreeNode }[],
  line: string,
  indent: number,
  lineNumber: number,
) {
  const clean = line.replace(/^[-*•]\s*/, '')

  // "F: ..." is the formula of the box above.
  const formula = /^f\s*:\s*(.*)$/i.exec(clean)
  if (formula) {
    const last = stack[stack.length - 1]
    if (last) last.node.formula = formula[1].trim()
    return
  }

  const { text, value } = splitValue(clean)
  const node: TreeNode = { text, value, formula: '', line: lineNumber, children: [] }

  // Close every open box that is indented as much as this line, or more.
  while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop()
  const parent = stack[stack.length - 1]
  if (parent) parent.node.children.push(node)
  else roots.push(node)
  stack.push({ indent, node })
}

function parseSections(notes: string): Section[] {
  const sections: Section[] = []
  const stepNames: string[] = []
  let current: Section | null = null
  // Open boxes of the Chain tree, with how far each one is indented.
  let treeStack: { indent: number; node: TreeNode }[] = []
  let openChart: Chart | null = null

  const lines = stripComments(notes).split('\n')
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    const rawLine = lines[lineNumber]
    const line = rawLine.trim()

    // --pie--, --bar--, --table-- open a chart in any section. --end-- closes the chart
    // (not the section). Starting a new heading also closes it, in case I forget.
    const marker = CHART_MARKER.exec(line)
    if (marker) {
      const type = marker[1].toLowerCase() as ChartType
      if (current === null) {
        current = { title: 'Notes', note: '', kind: 'list', points: [], tree: [], charts: [], ended: false }
        sections.push(current)
      }
      openChart = { type, items: [], rows: [] }
      current.charts.push(openChart)
      continue
    }
    if (openChart) {
      if (line === '') continue
      if (line.toLowerCase() === END_MARKER) {
        openChart = null
        continue
      }
      if (indentOf(rawLine) > 0 || headingTitle(line, stepNames) === null) {
        addToChart(openChart, line)
        continue
      }
      openChart = null
    }

    if (line === '') continue

    if (line.toLowerCase() === END_MARKER) {
      if (current) current.ended = true
      continue
    }

    // Inside an open Structure list, every line is a step, even "Clarify" or "Chain".
    const inStructure = current !== null && current.kind === 'structure' && !current.ended
    if (inStructure && current) {
      const text = line.replace(/^([-*•]|\d+[.)])\s*/, '')
      current.points.push({ text, answers: [], details: [] })
      stepNames.push(normalize(text))
      continue
    }

    // Inside Chain, an indented line is always a box, even if it is called "Segment".
    const indent = indentOf(rawLine)
    const inChain: boolean = current !== null && current.kind === 'chain' && !current.ended
    const heading: { title: string; note: string } | null = inChain && indent > 0 ? null : headingParts(line, stepNames)
    if (heading !== null) {
      const title: string = heading.title
      const note: string = heading.note
      current = { title: capitalize(title), note, kind: kindOf(title), points: [], tree: [], charts: [], ended: false }
      sections.push(current)
      treeStack = []
      continue
    }

    if (inChain && current) {
      addToTree(current.tree, treeStack, line, indent, lineNumber)
      continue
    }

    // Text typed before any heading still shows up. So does text after a closed Structure,
    // without turning into extra steps.
    if (current === null || (current.kind === 'structure' && current.ended)) {
      current = { title: 'Notes', note: '', kind: 'list', points: [], tree: [], charts: [], ended: false }
      sections.push(current)
    }

    const lastPoint: Point | undefined = current.points[current.points.length - 1]

    // "->" (or the older "-(") answer, highlighted under the point above it.
    if (line.startsWith('->') || line.startsWith('-(')) {
      const answer = line.slice(2).replace(/\)$/, '').trim()
      if (answer === '') continue
      if (lastPoint) lastPoint.answers.push(answer)
      else current.points.push({ text: '', answers: [answer], details: [] })
      continue
    }

    // Indented "-" or "--": a detail of the point above.
    const isIndented = /^(\s{2,}|\t)/.test(rawLine)
    if (lastPoint && (line.startsWith('--') || (isIndented && line.startsWith('-')))) {
      const detail = line.replace(/^-+/, '').trim()
      if (detail !== '') lastPoint.details.push(detail)
      continue
    }

    // Anything else is a new point. Strip "- ", "* " or "1. " from the front.
    const text = line.replace(/^([-*•]|\d+[.)])\s*/, '')
    current.points.push({ text, answers: [], details: [] })
  }

  return sections
}

// The step bar: each step in my Structure list is
//   done    when I closed it with --end--, or moved on to a later section
//   current when it's the section I'm typing in now
//   todo    when I haven't opened it yet
function stepsFrom(sections: Section[]): Step[] {
  const structure = sections.find((s) => s.kind === 'structure')
  if (!structure) return []

  const lastIndex = sections.length - 1
  return structure.points.map((point) => {
    const index = sections.findIndex((s) => normalize(s.title) === normalize(point.text))
    let status: StepStatus = 'todo'
    if (index !== -1) {
      const section = sections[index]
      status = section.ended || index < lastIndex ? 'done' : 'current'
    }
    return { name: point.text, status }
  })
}

export function parseNotes(notes: string): ParsedNotes {
  const sections = parseSections(notes)
  return { sections, steps: stepsFrom(sections) }
}
