// Draws the parsed notes: Clarify as Q&A cards, Structure as numbered stages,
// everything else as point cards. A card with details expands on click.

import { useState } from 'react'
import type { Point, Section } from './parse.ts'

function PointCard({ point, label }: { point: Point; label?: string }) {
  const [open, setOpen] = useState(false)
  const canExpand = point.details.length > 0 || point.text.length > 90

  const body = (
    <>
      {label && <span className="card-label">{label}</span>}
      {point.text && <span className={open ? 'card-text' : 'card-text clamp'}>{point.text}</span>}
      {point.answers.map((answer, i) => (
        <strong key={i} className="card-answer">
          {answer}
        </strong>
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

function SectionView({ section }: { section: Section }) {
  if (section.kind === 'structure') {
    return (
      <section className="section">
        <h2>{section.title}</h2>
        <ol className="stages">
          {section.points.map((point, i) => (
            <li key={i} className="stage">
              <span className="stage-number" aria-hidden="true">
                {i + 1}
              </span>
              <PointCard point={point} />
            </li>
          ))}
        </ol>
      </section>
    )
  }

  return (
    <section className="section">
      <h2>{section.title}</h2>
      <div className={section.kind === 'clarify' ? 'qa-grid' : 'point-grid'}>
        {section.points.map((point, i) => (
          <PointCard key={i} point={point} label={section.kind === 'clarify' ? `Q${i + 1}` : undefined} />
        ))}
      </div>
    </section>
  )
}

export function Visual({ sections }: { sections: Section[] }) {
  if (sections.length === 0) {
    return (
      <div className="visual-empty">
        <p>Start typing on the left. Try:</p>
        <pre>{`Clarify\nIs this India only?\n-( Yes, India only\nStructure\nPopulation of India\nPeople who own a car`}</pre>
      </div>
    )
  }
  return (
    <div className="visual">
      {sections.map((section, i) => (
        <SectionView key={i} section={section} />
      ))}
    </div>
  )
}
