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
//
// Product sense:
//   User journey            each unindented line is a stage, numbered 1, 2, 3
//   Search destination      a stage
//     Too many results      indented under a stage: a pain point inside that stage
//       high                indented under a pain point: its friction (low, moderate, high, very high)
//       people give up      any other indented line: a description
//   Pain points / Solutions / Metrics: a line is a card, an indented line is its description,
//                           and an indented level word is its friction (or priority: P0–P3 under Solutions).
//   A line ending in " *"   is my north star (or my pick). Clicking a card's star sets it.
//
// Root cause:
//   --table-- Step,Before,After ... --end--   the Funnel button above it turns each number
//                           column into a funnel (it rewrites the marker as --funnel--).

export type SectionKind = 'clarify' | 'structure' | 'chain' | 'journey' | 'metrics' | 'list'

export interface TreeNode {
  text: string
  value: string
  formula: string
  line: number // which line of my notes this box came from, so the box can write back to it
  children: TreeNode[]
}

// How bad a pain point is (friction) or how important a solution is (priority). Rank 1–4.
export interface Level {
  kind: 'friction' | 'priority'
  rank: number
  label: string
}

export interface Point {
  text: string
  answers: string[]
  details: string[]
  level: Level | null
  star: boolean // the line ends with " *": my north star, or my pick
  line: number // which line of my notes it came from, so clicking the star can write " *" back
  indent: number // how far that line is indented
  levelLine: number // the line holding its friction / priority word, or -1
  endLine: number // its last line (descriptions included), so a new friction line goes after it
  children: Point[] // User journey: the pain points inside a stage
  group: MetricGroup // Metrics: which box it belongs in
  category: string // Metrics: the type I wrote before ":" ("Adoption", "Primary"), or ''
  formula: string // Metrics: an indented "F: a / b" line
  direction: 'up' | 'down' | '' // Metrics: which way is good
}

export type MetricGroup = '' | 'north' | 'supporting' | 'guardrail'

function newPoint(text: string, line: number, answers: string[] = [], indent = 0): Point {
  const { text: clean, star } = splitStar(text)
  return { text: clean, answers, details: [], level: null, star, line, indent, levelLine: -1, endLine: line, children: [], group: '', category: '', formula: '', direction: '' }
}

// Remembers which line set a point's friction, and that the point now reaches this line.
function setLevel(point: Point, level: Level, line: number) {
  point.level = level
  point.levelLine = line
  point.endLine = Math.max(point.endLine, line)
}

function addDetail(point: Point, text: string, line: number) {
  point.details.push(text)
  point.endLine = Math.max(point.endLine, line)
}

// "Search destination *" -> text "Search destination", star true
export function splitStar(text: string): { text: string; star: boolean } {
  const match = /^(.*?)\s*[*★]$/.exec(text)
  if (!match || match[1].trim() === '') return { text, star: false }
  return { text: match[1], star: true }
}

const LEVEL_WORD =
  /^(?:(friction|priority)\s*[:-]?\s*)?(very\s+high|high|moderate|medium|low|p[0-3])(?:\s+(friction|priority))?\.?$/i

// "high", "very high friction", "priority: low", "P1" -> a Level. Anything else -> null.
export function levelOf(text: string, sectionTitle: string): Level | null {
  const match = LEVEL_WORD.exec(text.trim())
  if (!match) return null
  const word = match[2].toLowerCase().replace(/\s+/, ' ')
  const named = (match[1] ?? match[3] ?? '').toLowerCase()
  const isP = /^p[0-3]$/.test(word)
  const kind: Level['kind'] =
    isP || named === 'priority' || (named === '' && normalize(sectionTitle).startsWith('solution')) ? 'priority' : 'friction'
  if (isP) return { kind, rank: 4 - Number(word[1]), label: word.toUpperCase() }
  const rank = { low: 1, moderate: 2, medium: 2, high: 3, 'very high': 4 }[word] ?? 2
  return { kind, rank, label: `${capitalize(word)} ${kind}` }
}

export type ChartType = 'pie' | 'bar' | 'table' | 'funnel'

export interface ChartItem {
  label: string
  shown: string // the value as I typed it: "10%", "290M"
  value: number | null // the same value as a number, if it has one
  note: string // a "->" line under it: how this segment behaves
}

export interface Chart {
  type: ChartType
  items: ChartItem[] // pie and bar
  rows: string[][] // table and funnel: "key,value,value" -> cells, first row is the header
  line: number // the line of its --marker--, so the Funnel / Table button can switch it
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
  // Product sense
  'goal',
  'goals',
  'mission',
  'user',
  'users',
  'user segments',
  'user journey',
  'journey',
  'pain point',
  'pain points',
  'solution',
  'solutions',
  'metric',
  'metrics',
  'north star',
  'guardrail',
  'guardrails',
  'tradeoff',
  'tradeoffs',
  'trade-offs',
  'trade offs',
  'prioritization',
  // Root cause
  'funnel',
  'activation funnel',
  'data check',
  'internal factors',
  'external factors',
  'hypothesis',
  'hypotheses',
  'root cause',
  'conclusion',
  'next steps',
  // Metrics
  'metric hierarchy',
  'metrics hierarchy',
  'key actions',
  'users and actions',
  'user actions',
  'pitfalls',
  'tradeoffs and pitfalls',
  'measurement',
  'how to measure',
  'experiment',
  'targets',
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
  if (t === 'user journey' || t === 'journey') return 'journey'
  if (t === 'metrics' || t === 'metric' || t === 'metric hierarchy' || t === 'metrics hierarchy') return 'metrics'
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
// --funnel-- is a table drawn as a funnel: one funnel per number column (Before, After).
const CHART_MARKER = /^--(pie|bar|table|funnel)--$/i

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
  if (chart.type === 'table' || chart.type === 'funnel') {
    chart.rows.push(line.split(',').map((cell) => cell.trim()))
    return
  }
  // A --bar-- block can also be a whole table (Step,Before,After): keep its rows too.
  if (chart.type === 'bar' && !line.startsWith('->')) chart.rows.push(line.split(',').map((cell) => cell.trim()))
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

// User journey: unindented = a stage; indented once = a pain point in that stage;
// indented under a pain point = its friction or description. Returns the pain points' indent.
function addToJourney(section: Section, line: string, indent: number, lineNumber: number, painIndent: number): number {
  const text = line.replace(/^([-•]|\*\s|\d+[.)])\s*/, '')
  const stage = section.points[section.points.length - 1]
  if (indent === 0 || !stage) {
    section.points.push(newPoint(text, lineNumber))
    return -1
  }
  const level = levelOf(text, section.title)
  const pain = stage.children[stage.children.length - 1]
  if (pain && indent > painIndent) {
    if (level) setLevel(pain, level, lineNumber)
    else addDetail(pain, text, lineNumber)
    return painIndent
  }
  if (level) {
    setLevel(stage, level, lineNumber)
    return painIndent
  }
  stage.children.push(newPoint(text, lineNumber, [], indent))
  return indent
}

// Inside Metrics: "North star", "Supporting metrics", "Guardrails" (with or without ":") start a box.
// "North star: 90-day retention" puts the metric on the same line.
// Any metric type works the same way: "Primary: repeat rate", "Adoption: tracking views", "Experience: ...".
const METRIC_TYPES = [
  'north\\s*star(?:\\s*metrics?)?',
  'primary(?:\\s*(?:outcome\\s*)?metrics?)?',
  'supporting(?:\\s*metrics?|\\s*mertics?)?',
  'secondary(?:\\s*metrics?)?',
  'guard\\s*rails?(?:\\s*metrics?)?',
  'gaurd\\s*rails?',
  'counter(?:\\s*metrics?)?',
  'adoption',
  'activation',
  'engagement',
  'retention',
  'growth',
  '(?:customer\\s*|user\\s*)?experience',
  '(?:feature\\s*)?quality',
  'satisfaction',
  'trust',
  'reliability',
  'efficiency',
  'business',
  'revenue',
  'monetization',
  'leading(?:\\s*(?:indicator|metric))?',
  'lagging(?:\\s*(?:indicator|metric))?',
]
const METRIC_GROUP = new RegExp(`^(${METRIC_TYPES.join('|')})\\s*(?::\\s*(.*))?$`, 'i')

function metricGroupOf(label: string): MetricGroup {
  const l = label.toLowerCase()
  if (l.startsWith('north') || l.startsWith('primary')) return 'north'
  if (/^(guard|gaurd|counter)/.test(l)) return 'guardrail'
  return 'supporting'
}

// The box's kicker: "Adoption", "Customer experience". The generic group names give ''.
function metricCategoryOf(label: string): string {
  const l = label.toLowerCase().replace(/\s+/g, ' ').trim()
  if (/^(north|supporting|secondary|guard|gaurd|counter)/.test(l)) return ''
  if (l.startsWith('primary')) return 'Primary metric'
  return capitalize(l)
}

// "up", "down", "higher is better", "lower is better", "↑", "↓"
const DIRECTION = /^(?:good\s*(?:if|when)?\s*:?\s*)?(up|down|higher(?:\s+is\s+better)?|lower(?:\s+is\s+better)?|increase|decrease|↑|↓)$/i

function directionOf(text: string): 'up' | 'down' | '' {
  const m = DIRECTION.exec(text.trim())
  if (!m) return ''
  return /^(up|higher|increase|↑)/i.test(m[1]) ? 'up' : 'down'
}

interface MetricState {
  group: MetricGroup
  category: string
  itemIndent: number // how far this box's metrics are indented (-1: none yet)
}

export const NEW_METRIC_STATE: MetricState = { group: '', category: '', itemIndent: -1 }

// A line inside Metrics: a box label, a metric in the current box, or (indented deeper) its
// formula ("F: ..."), its good direction ("up" / "down"), or a description.
function addToMetrics(section: Section, line: string, indent: number, lineNumber: number, state: MetricState): MetricState {
  const label = METRIC_GROUP.exec(line)
  if (label) {
    const group = metricGroupOf(label[1])
    const category = metricCategoryOf(label[1])
    const rest = (label[2] ?? '').trim()
    if (rest) {
      const point = newPoint(rest, lineNumber, [], indent)
      point.group = group
      point.category = category
      section.points.push(point)
      // The metric sits on the label line, so lines indented under it are its details.
      return { group, category, itemIndent: indent }
    }
    return { group, category, itemIndent: -1 }
  }
  const text = line.replace(/^([-•]|\*\s|\d+[.)])\s*/, '')
  const last = section.points[section.points.length - 1]
  if (last && state.itemIndent !== -1 && indent > state.itemIndent && last.group === state.group) {
    const formula = /^f\s*[:=]\s*(.+)$/i.exec(text)
    const direction = directionOf(text)
    if (formula) last.formula = formula[1].trim()
    else if (direction) last.direction = direction
    else {
      const level = levelOf(text, section.title)
      if (level) setLevel(last, level, lineNumber)
      else addDetail(last, text, lineNumber)
      return state
    }
    last.endLine = Math.max(last.endLine, lineNumber)
    return state
  }
  const point = newPoint(text, lineNumber, [], indent)
  point.group = state.group
  point.category = state.category
  section.points.push(point)
  return { ...state, itemIndent: state.itemIndent === -1 ? indent : Math.min(state.itemIndent, indent) }
}

function parseSections(notes: string): Section[] {
  const sections: Section[] = []
  const stepNames: string[] = []
  let current: Section | null = null
  // Open boxes of the Chain tree, with how far each one is indented.
  let treeStack: { indent: number; node: TreeNode }[] = []
  let openChart: Chart | null = null
  // User journey: how far the current stage's pain points are indented.
  let painIndent = -1
  let metricState: MetricState = NEW_METRIC_STATE

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
      openChart = { type, items: [], rows: [], line: lineNumber }
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
      current.points.push(newPoint(text, lineNumber))
      stepNames.push(normalize(text))
      continue
    }

    // Inside Chain or User journey, an indented line is always a box, even if it is called "Segment".
    const indent = indentOf(rawLine)
    const inChain: boolean = current !== null && current.kind === 'chain' && !current.ended
    const inJourney: boolean = current !== null && current.kind === 'journey' && !current.ended
    const inMetrics: boolean = current !== null && current.kind === 'metrics' && !current.ended
    // "North star" and "Guardrails:" inside Metrics are its boxes, not new sections.
    if (inMetrics && current && METRIC_GROUP.test(line)) {
      metricState = addToMetrics(current, line, indent, lineNumber, metricState)
      continue
    }
    const heading: { title: string; note: string } | null =
      (inChain || inJourney || inMetrics) && indent > 0 ? null : headingParts(line, stepNames)
    if (heading !== null) {
      const title: string = heading.title
      const note: string = heading.note
      current = { title: capitalize(title), note, kind: kindOf(title), points: [], tree: [], charts: [], ended: false }
      sections.push(current)
      treeStack = []
      painIndent = -1
      metricState = NEW_METRIC_STATE
      continue
    }

    if (inMetrics && current) {
      metricState = addToMetrics(current, line, indent, lineNumber, metricState)
      continue
    }

    if (inJourney && current) {
      painIndent = addToJourney(current, line, indent, lineNumber, painIndent)
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
      // "-( answer)" may end with a ")" that closes the "-(": drop it only if nothing opened it.
      let answer = line.slice(2).trim()
      if (line.startsWith('-(') && answer.endsWith(')') && !answer.includes('(')) answer = answer.slice(0, -1).trim()
      if (answer === '') continue
      if (lastPoint) lastPoint.answers.push(answer)
      else current.points.push(newPoint('', lineNumber, [answer]))
      continue
    }

    // Indented (or "--"): the description of the point above, or its friction / priority.
    const isIndented = indent > 0
    if (lastPoint && (line.startsWith('--') || (isIndented && (line.startsWith('-') || current.kind === 'list')))) {
      const detail = line.replace(/^-+/, '').trim()
      const level = current.kind === 'list' ? levelOf(detail, current.title) : null
      if (level) setLevel(lastPoint, level, lineNumber)
      else if (detail !== '') addDetail(lastPoint, detail, lineNumber)
      continue
    }

    // Anything else is a new point. Strip "- ", "* " or "1. " from the front.
    const text = line.replace(/^([-•]|\*\s|\d+[.)])\s*/, '')
    current.points.push(newPoint(text, lineNumber))
  }

  return sections
}

// The step bar: each step in my Structure list is
//   done    when I closed it with --end--, or moved on to a later section
//   current when it's the section I'm typing in now
//   todo    when I haven't opened it yet
// "Pain points" in Structure opens with "Pain point" too.
function sameStep(a: string, b: string): boolean {
  const key = (t: string) => normalize(t).replace(/s$/, '')
  return key(a) === key(b)
}

function stepsFrom(sections: Section[]): Step[] {
  const structure = sections.find((s) => s.kind === 'structure')
  if (!structure) return []

  const lastIndex = sections.length - 1
  return structure.points.map((point) => {
    let index = sections.findIndex((s) => sameStep(s.title, point.text))
    // A "Guardrails" step is also covered by a Guardrails box inside Metrics.
    const box = METRIC_GROUP.exec(point.text)
    if (index === -1 && box) {
      const group = metricGroupOf(box[1])
      index = sections.findIndex((s) => s.kind === 'metrics' && s.points.some((p) => p.group === group))
    }
    // A "Formulas" / "Define metrics" step is covered by the F: lines inside Metrics.
    if (index === -1 && /^(formulas?|define\s*(the\s*)?metrics?|metric\s*definitions?)$/i.test(normalize(point.text))) {
      index = sections.findIndex((s) => s.kind === 'metrics' && s.points.some((p) => p.formula))
    }
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
