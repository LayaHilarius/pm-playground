// Draws the parsed notes: the step bar on top, Clarify as highlighted bullets
// that fold into one answers card, and every other section as point cards.

import { useState } from 'react'
import { ChainView } from './Chain.tsx'
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
      {canExpand && (
        <span className="card-more">
          {open ? 'Show less' : point.details.length > 0 ? `+${point.details.length} more` : 'Show more'}
        </span>
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

// After --end--: one card holding only the answers. Click to see the questions again.
function ClarifyCard({ section }: { section: Section }) {
  const [open, setOpen] = useState(false)
  const answers = section.points.flatMap((p) => p.answers)

  return (
    <button
      type="button"
      className={open ? 'summary-card open' : 'summary-card'}
      onClick={() => setOpen(!open)}
      aria-expanded={open}
    >
      <span className="summary-title">
        <span className="tick" aria-hidden="true">
          ✓
        </span>
        {section.title}
      </span>
      {open ? (
        <ClarifyList section={section} />
      ) : (
        <span className="summary-answers">
          {answers.length > 0 ? answers.join(' · ') : 'No answers yet'}
        </span>
      )}
    </button>
  )
}

function SectionView({ section, showMaths }: { section: Section; showMaths: boolean }) {
  if (section.kind === 'chain') return <ChainView section={section} showMaths={showMaths} />
  if (section.kind === 'clarify') {
    if (section.ended) return <ClarifyCard section={section} />
    return (
      <section className="section">
        <h2>{section.title}</h2>
        <ClarifyList section={section} />
      </section>
    )
  }

  return (
    <section className="section">
      <h2>{section.title}</h2>
      {section.points.length > 0 && (
        <div className="point-grid">
          {section.points.map((point, i) => (
            <PointCard key={i} point={point} />
          ))}
        </div>
      )}
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
