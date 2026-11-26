// Draws the parsed notes: the step bar on top, Clarify as highlighted bullets
// that fold into one answers card, and every other section as point cards.

import { useState } from 'react'
import { ChainBody } from './Chain.tsx'
import { ChartView, type ChartTypeHandler } from './Charts.tsx'
import type { Point, Section, Step } from './parse.ts'
import { normalize } from './parse.ts'
import { Friction, Journey, LevelMeter, MetricsPanel, NorthStar, starLines, type LevelHandler, type StarHandler } from './Product.tsx'

// A card: the point, its answers, its description (indented lines), its friction or
// priority, and a star at the end. Long text is cut to two lines; click to read it all.
interface CardProps {
  point: Point
  group: number[]
  onStar?: StarHandler
  onLevel?: LevelHandler // only for pain points: friction I can click
  starLabel?: string
}

function PointCard({ point, group, onStar, onLevel, starLabel }: CardProps) {
  const [open, setOpen] = useState(false)
  const canExpand = point.text.length > 90 || point.details.join(' ').length > 140

  return (
    <div className={`card${open ? ' open' : ''}${point.star ? ' starred' : ''}`}>
      <div
        className={canExpand ? 'card-main clickable' : 'card-main'}
        onClick={canExpand ? () => setOpen(!open) : undefined}
        aria-expanded={canExpand ? open : undefined}
      >
        {point.text && <span className={open ? 'card-text' : 'card-text clamp'}>{point.text}</span>}
        {point.answers.map((answer, i) => (
          <mark key={i} className="answer">
            {answer}
          </mark>
        ))}
        {point.details.length > 0 && (
          <span className={open ? 'card-desc' : 'card-desc clamp'}>{point.details.join(' · ')}</span>
        )}
        {onLevel ? (
          <Friction point={point} insertAfter={point.endLine} onLevel={onLevel} />
        ) : (
          point.level && <LevelMeter level={point.level} />
        )}
      </div>
      {onStar && <NorthStar on={point.star} line={point.line} group={group} onStar={onStar} label={starLabel} />}
    </div>
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
  } else if (section.kind === 'journey') {
    if (section.note) parts.push(section.note)
    parts.push(section.points.map((p) => p.text).join(' → '))
    const star = section.points.flatMap((p) => [p, ...p.children]).find((p) => p.star)
    if (star) parts.push(`★ ${star.text}`)
  } else if (section.kind === 'metrics') {
    if (section.note) parts.push(section.note)
    const mark = { north: '★ ', supporting: '↗ ', guardrail: '🛡 ', '': '' }
    const order = { north: 0, supporting: 1, guardrail: 2, '': 3 }
    const sorted = [...section.points].sort((a, b) => order[a.group] - order[b.group])
    parts.push(...sorted.map((p) => mark[p.group] + p.text))
  } else {
    if (section.note) parts.push(section.note)
    // The starred one first.
    const sorted = [...section.points].sort((a, b) => Number(b.star) - Number(a.star))
    parts.push(...sorted.map((p) => (p.star ? `★ ${p.text}` : p.text)))
  }
  // Charts add their items: "Blue collar 30% · White collar 40%"
  for (const chart of section.charts) {
    if (chart.type === 'table' || chart.type === 'funnel') parts.push(chart.rows.slice(1).map((r) => r[0]).join(' · '))
    else parts.push(chart.items.map((i) => `${i.label} ${i.shown}`.trim()).join(' · '))
  }
  return parts.filter(Boolean).join(' · ')
}

// What a section looks like while I'm typing in it (or after I unfold it).
interface BodyProps {
  section: Section
  showMaths: boolean
  onStar?: StarHandler
  onLevel?: LevelHandler
  onChartType?: ChartTypeHandler
}

// Goal and Mission are short statements, so they stay as plain bullets.
const BULLET_SECTIONS = ['goal', 'goals', 'mission', 'why now', 'trends', 'right to win', 'recommendation']

function Bullets({ section }: { section: Section }) {
  return (
    <ul className="clarify-list">
      {section.points.map((point) => (
        <li key={point.line}>
          <span>
            {point.star && <span className="bullet-star">★ </span>}
            {point.text}
          </span>
          {point.answers.map((answer, j) => (
            <mark key={j} className="answer">
              {answer}
            </mark>
          ))}
          {point.details.length > 0 && <span className="bullet-desc">{point.details.join(' · ')}</span>}
        </li>
      ))}
    </ul>
  )
}

function SectionBody({ section, showMaths, onStar, onLevel, onChartType }: BodyProps) {
  let main = null
  if (section.kind === 'chain') main = <ChainBody section={section} showMaths={showMaths} />
  else if (section.kind === 'clarify') main = <ClarifyList section={section} />
  else if (section.kind === 'journey') main = <Journey section={section} onStar={onStar} onLevel={onLevel} />
  else if (section.kind === 'metrics') main = <MetricsPanel section={section} />
  else if (BULLET_SECTIONS.includes(normalize(section.title))) main = <Bullets section={section} />
  else if (section.points.length > 0) {
    const group = starLines(section)
    const title = normalize(section.title)
    const isPain = title.startsWith('pain')
    // Risks have a severity, not a pick. Options and solutions get "My pick"; the rest "North star".
    const isRisk = title.startsWith('risk')
    const starLabel = isPain || title.startsWith('user') || title.startsWith('journey') ? 'North star' : 'My pick'
    main = (
      <div className="point-grid">
        {section.points.map((point) => (
          <PointCard
            key={point.line}
            point={point}
            group={group}
            onStar={isRisk ? undefined : onStar}
            onLevel={isPain ? onLevel : undefined}
            starLabel={starLabel}
          />
        ))}
      </div>
    )
  }
  return (
    <>
      {main}
      {section.charts.length > 0 && (
        <div className="charts">
          {section.charts.map((chart, i) => (
            <ChartView key={i} chart={chart} onChartType={onChartType} />
          ))}
        </div>
      )}
    </>
  )
}

// After --end--: the section folds into one line. Click it to open it again.
function FoldedSection({ section, showMaths, onStar, onLevel, onChartType }: BodyProps) {
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
          <SectionBody section={section} showMaths={showMaths} onStar={onStar} onLevel={onLevel} onChartType={onChartType} />
        </div>
      )}
    </div>
  )
}

function SectionView({ section, showMaths, onStar, onLevel, onChartType }: BodyProps) {
  if (section.ended)
    return (
      <FoldedSection section={section} showMaths={showMaths} onStar={onStar} onLevel={onLevel} onChartType={onChartType} />
    )
  return (
    <section className="section">
      <h2>{section.title}</h2>
      {section.note && <p className="section-note">{section.note}</p>}
      <SectionBody section={section} showMaths={showMaths} onStar={onStar} onLevel={onLevel} onChartType={onChartType} />
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

const EXAMPLES: Record<string, string> = {
  guesstimate: `Clarify\nNew cars only, or used too?\n-> New only\n--end--\n\nStructure\nClarify\nChain\nSegment\n--end--`,
  'product-sense': `Structure\nClarify\nGoal\nUsers\nUser journey\nPain points\nSolutions\nMetrics\n--end--\n\nUser journey\nSearch destination\n  Too many results\n    high\nFollow directions *\n  Lost at junctions\n    very high`,
  metrics: `Structure\nClarify\nGoal\nKey actions\nMetric hierarchy\nPitfalls\nSummary\n--end--\n\nMetric hierarchy\nPrimary: 60-day repeat transfer rate\n  F: customers who transfer again in 60 days / customers who made a transfer\n  up\nAdoption: Tracking view rate\n  F: transfers with tracking opened / all transfers\nGuardrail: Transfer failure rate\n  F: failed transfers / all transfers\n  down`,
  strategy: `Structure\nClarify\nGoal\nMarket\nCustomer segments\nPain points\nCompetition\nRight to win\nOptions\nRisks\nGo-to-market\nMetrics\nRecommendation\n--end--\n\nOptions\nBuild our own *\n  Uses Maps and Android reach\nPartner with a local player\n\nRisks\nRegulation on ride pricing\n  high\n  -> Start in one city with fixed fares`,
  'root-cause': `Clarify\nHow is a navigation start counted?\n-> Tapping Start on a route\nSudden or gradual?\n-> Sudden, from last Tuesday\n--end--\n\nStructure\nClarify\nActivation funnel\nInternal factors\nExternal factors\nHypotheses\nConclusion\n--end--\n\nActivation funnel\n--table--\nStep,Before,After\nOpen app,10M,10M\nSearch,6M,5.9M\nSee route,5M,4.9M\nTap Start,4M,2.9M\n--end--`,
}

interface VisualProps {
  sections: Section[]
  steps: Step[]
  type: string
  onStar?: StarHandler
  onLevel?: LevelHandler
  onChartType?: ChartTypeHandler
}

export function Visual({ sections, steps, type, onStar, onLevel, onChartType }: VisualProps) {
  // The Structure list lives in the step bar, so it isn't drawn again below.
  const body = sections.filter((s) => s.kind !== 'structure')
  // One Maths box only, next to the latest tree (Chain or Solve).
  const lastTree = body.filter((s) => s.kind === 'chain').at(-1)

  if (sections.length === 0) {
    return (
      <div className="visual-empty">
        <p>Start typing on the left. Try:</p>
        <pre>{EXAMPLES[type] ?? EXAMPLES.guesstimate}</pre>
      </div>
    )
  }
  return (
    <div className="visual">
      <StepBar steps={steps} />
      {body.map((section, i) => (
        <SectionView
          key={i}
          section={section}
          showMaths={section === lastTree}
          onStar={onStar}
          onLevel={onLevel}
          onChartType={onChartType}
        />
      ))}
    </div>
  )
}
