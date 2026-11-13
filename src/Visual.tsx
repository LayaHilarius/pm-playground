// Draws the parsed notes: the step bar on top, Clarify as highlighted bullets
// that fold into one answers card, and every other section as point cards.

import { useState } from 'react'
import { ChainBody } from './Chain.tsx'
import { ChartView } from './Charts.tsx'
import type { Point, Section, Step } from './parse.ts'

function PointCard({ point }: { point: Point }) {
  const [open, setOpen] = useState(false)
  const canExpand = point.details.length > 0 || point.text.length > 90

  const body = (
    <>
      {point.text && <span className={open ? 'card-text' : 'card-text clamp'}>{point.text}</span>}
      {point.answers.map((answer, i) => (
        <mark key={i} className="answer">
          {answer}
        </mark>
      ))}
      {open && point.details.length > 0 && (
        <ul className="card-details">
          {point.details.map((detail, i) => (
            <li key={i}>{detail}</li>
          ))}
        </ul>
      )}
    </>
  )

  if (!canExpand) return <div className="card">{body}</div>
  return (
    <button type="button" className={open ? 'card open' : 'card'} onClick={() => setOpen(!open)} aria-expanded={open}>
      {body}
    </button>
  )
}

// While I'm clarifying: my bullets as typed, answers highlighted.
function ClarifyList({ section }: { section: Section }) {
  return (
    <ul className="clarify-list">
      {section.points.map((point, i) => (
        <li key={i}>
          {point.text && <span>{point.text}</span>}
          {point.answers.map((answer, j) => (
            <mark key={j} className="answer">
              {answer}
            </mark>
          ))}
        </li>
      ))}
    </ul>
  )
}

// One line that says what a closed section holds.
function summaryOf(section: Section): string {
  const parts: string[] = []
  if (section.kind === 'clarify') {
    if (section.note) parts.push(section.note)
    const answers = section.points.flatMap((p) => p.answers)
    parts.push(answers.length > 0 ? answers.join(' · ') : 'No answers yet')
  } else if (section.kind === 'chain') {
    // Folded Chain shows its formula: from "Chain (formula)" or the top box's "F:" line.
    if (section.note) parts.push(section.note)
    for (const root of section.tree) {
      if (root.formula) parts.push(`${root.text} = ${root.formula}${root.value ? ` (${root.value})` : ''}`)
      else if (root.value) parts.push(`${root.text} ${root.value}`)
      else if (!section.note && root.children.length > 0)
        parts.push(`${root.text}: ${root.children.map((c) => c.text).join(' + ')}`)
      else if (!section.note) parts.push(root.text)
    }
  } else {
    if (section.note) parts.push(section.note)
    parts.push(...section.points.map((p) => p.text))
  }
  // Charts add their items: "Blue collar 30% · White collar 40%"
  for (const chart of section.charts) {
    if (chart.type === 'table') parts.push(chart.rows.slice(1).map((r) => r[0]).join(' · '))
    else parts.push(chart.items.map((i) => `${i.label} ${i.shown}`.trim()).join(' · '))
  }
  return parts.filter(Boolean).join(' · ')
}

// What a section looks like while I'm typing in it (or after I unfold it).
function SectionBody({ section, showMaths }: { section: Section; showMaths: boolean }) {
  let main = null
  if (section.kind === 'chain') main = <ChainBody section={section} showMaths={showMaths} />
  else if (section.kind === 'clarify') main = <ClarifyList section={section} />
  else if (section.points.length > 0)
    main = (
      <div className="point-grid">
        {section.points.map((point, i) => (
          <PointCard key={i} point={point} />
        ))}
      </div>
    )
  return (
    <>
      {main}
      {section.charts.length > 0 && (
        <div className="charts">
          {section.charts.map((chart, i) => (
            <ChartView key={i} chart={chart} />
          ))}
        </div>
      )}
    </>
  )
}

// After --end--: the section folds into one line. Click it to open it again.
function FoldedSection({ section, showMaths }: { section: Section; showMaths: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={open ? 'folded open' : 'folded'}>
      <button type="button" className="summary-card" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="summary-title">
          <span className="tick" aria-hidden="true">
            ✓
          </span>
          {section.title}
        </span>
        <span className="summary-answers">{summaryOf(section)}</span>
      </button>
      {open && (
        <div className="folded-body">
          <SectionBody section={section} showMaths={showMaths} />
        </div>
      )}
    </div>
  )
}

function SectionView({ section, showMaths }: { section: Section; showMaths: boolean }) {
  if (section.ended) return <FoldedSection section={section} showMaths={showMaths} />
  return (
    <section className="section">
      <h2>{section.title}</h2>
      {section.note && <p className="section-note">{section.note}</p>}
      <SectionBody section={section} showMaths={showMaths} />
    </section>
  )
}

// The navigator: my Structure list as steps, ticked when done.
export function StepBar({ steps }: { steps: Step[] }) {
  if (steps.length === 0) return null
  return (
    <nav className="step-bar" aria-label="Steps">
      <ol>
        {steps.map((step, i) => (
          <li key={i} className={`step ${step.status}`} aria-current={step.status === 'current' ? 'step' : undefined}>
            <span className="step-icon" aria-hidden="true">
              {step.status === 'done' ? '✓' : step.status === 'current' ? '●' : i + 1}
            </span>
            {step.name}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export function Visual({ sections, steps }: { sections: Section[]; steps: Step[] }) {
  // The Structure list lives in the step bar, so it isn't drawn again below.
  const body = sections.filter((s) => s.kind !== 'structure')
  // One Maths box only, next to the latest tree (Chain or Solve).
  const lastTree = body.filter((s) => s.kind === 'chain').at(-1)

  if (sections.length === 0) {
    return (
      <div className="visual-empty">
        <p>Start typing on the left. Try:</p>
        <pre>{`Clarify\nNew cars only, or used too?\n-> New only\n--end--\n\nStructure\nClarify\nChain\nSegment\n--end--`}</pre>
      </div>
    )
  }
  return (
    <div className="visual">
      <StepBar steps={steps} />
      {body.map((section, i) => (
        <SectionView key={i} section={section} showMaths={section === lastTree} />
      ))}
    </div>
  )
}
