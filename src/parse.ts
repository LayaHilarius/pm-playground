// Turns the notes I type into sections the screen can draw.
//
// How I write notes:
//   Clarify                 a heading: a known word on its own line,
//                           or any line starting with "#" or ending with ":"
//   Is this India only?     a plain line (or "- ...") is a new point
//   -> Yes, India only      "->" is the answer to the point above, highlighted
//     - urban and rural     an indented "-" (or "--") is a detail, hidden until I click
//   // note to self          a comment: never drawn
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

export interface Section {
  title: string
  kind: SectionKind
  points: Point[]
  tree: TreeNode[]
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

function headingTitle(line: string, stepNames: string[]): string | null {
  if (line.startsWith('#')) return line.replace(/^#+/, '').trim()
  if (line.endsWith(':') && !line.startsWith('-')) return line.slice(0, -1).trim()
  const key = normalize(line)
  if (KNOWN_HEADINGS.includes(key) || stepNames.includes(key)) return line
  return null
}

function kindOf(title: string): SectionKind {
  const t = normalize(title)
  if (t.startsWith('clarif')) return 'clarify'
  if (STRUCTURE_HEADINGS.includes(t)) return 'structure'
  if (t === 'chain') return 'chain'
  return 'list'
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
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

  const lines = notes.split('\n')
  for (let lineNumber = 0; lineNumber < lines.length; lineNumber++) {
    // "//" starts a comment: a note to myself that is never drawn.
    const rawLine = lines[lineNumber].replace(/\s*\/\/.*$/, '')
    const line = rawLine.trim()
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
    const title: string | null = inChain && indent > 0 ? null : headingTitle(line, stepNames)
    if (title !== null) {
      current = { title: capitalize(title), kind: kindOf(title), points: [], tree: [], ended: false }
      sections.push(current)
      treeStack = []
      continue
    }

    if (inChain && current) {
      addToTree(current.tree, treeStack, line, indent, lineNumber)
      continue
    }

    // Text typed before any heading still shows up.
    if (current === null) {
      current = { title: 'Notes', kind: 'list', points: [], tree: [], ended: false }
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
