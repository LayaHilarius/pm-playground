// Turns the notes I type into sections the screen can draw.
//
// How I write notes:
//   Clarify                 a heading: a known word on its own line,
//                           or any line starting with "#" or ending with ":"
//   Is this India only?     a plain line (or "- ...") is a new point
//   -( Yes, India only      "-(" is the answer to the point above, shown in bold
//     - urban and rural     an indented "-" (or "--") is a detail, hidden until I click
//   Structure               points under Structure become numbered stages

export type SectionKind = 'clarify' | 'structure' | 'list'

export interface Point {
  text: string
  answers: string[]
  details: string[]
}

export interface Section {
  title: string
  kind: SectionKind
  points: Point[]
}

const KNOWN_HEADINGS = [
  'clarify',
  'clarifying questions',
  'clarification',
  'assumptions',
  'structure',
  'approach',
  'framework',
  'calculation',
  'calculations',
  'math',
  'segments',
  'sanity check',
  'answer',
  'final answer',
  'summary',
]

const STRUCTURE_HEADINGS = ['structure', 'approach', 'framework']

function headingTitle(line: string): string | null {
  if (line.startsWith('#')) return line.replace(/^#+/, '').trim()
  if (line.endsWith(':') && !line.startsWith('-')) return line.slice(0, -1).trim()
  if (KNOWN_HEADINGS.includes(line.toLowerCase())) return line
  return null
}

function kindOf(title: string): SectionKind {
  const t = title.toLowerCase()
  if (t.startsWith('clarif')) return 'clarify'
  if (STRUCTURE_HEADINGS.includes(t)) return 'structure'
  return 'list'
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function parseNotes(notes: string): Section[] {
  const sections: Section[] = []
  let current: Section | null = null

  for (const rawLine of notes.split('\n')) {
    const line = rawLine.trim()
    if (line === '') continue

    const title = headingTitle(line)
    if (title !== null) {
      current = { title: capitalize(title), kind: kindOf(title), points: [] }
      sections.push(current)
      continue
    }

    // Text typed before any heading still shows up.
    if (current === null) {
      current = { title: 'Notes', kind: 'list', points: [] }
      sections.push(current)
    }

    const lastPoint: Point | undefined = current.points[current.points.length - 1]

    // "-(" answer, shown in bold under the point above it.
    if (line.startsWith('-(')) {
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
