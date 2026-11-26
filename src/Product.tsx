// Product sense pieces: the north star, friction and priority meters, and the User journey.

import type { Level, Point, Section } from './parse.ts'

// Clicking a star makes that line my north star (it writes " *" into my notes).
// Only one per section: the others in `group` lose theirs.
export type StarHandler = (line: number, group: number[]) => void

// Clicking a friction dash writes the word into my notes: it replaces the point's
// friction line, or adds one after `insertAfter`, indented one step deeper.
export interface LevelTarget {
  levelLine: number
  insertAfter: number
  indent: number
}
export type LevelHandler = (target: LevelTarget, word: string | null) => void

const FRICTION_WORDS = ['low', 'moderate', 'high', 'very high']

// Four dashes I can click: dash 1 = low … dash 4 = very high. Clicking the current one clears it.
export function FrictionPicker({ point, insertAfter, onLevel }: { point: Point; insertAfter: number; onLevel: LevelHandler }) {
  const rank = point.level?.kind === 'friction' ? point.level.rank : 0
  const target: LevelTarget = { levelLine: point.levelLine, insertAfter, indent: point.indent + 2 }
  return (
    <span className={`friction picker rank-${rank}${rank === 0 ? ' empty' : ''}`} onClick={(e) => e.stopPropagation()}>
      <span className="dashes">
        {FRICTION_WORDS.map((word, i) => (
          <button
            key={word}
            type="button"
            className={i < rank ? 'dash filled' : 'dash'}
            title={`${word} friction`}
            aria-label={`${word} friction`}
            aria-pressed={i + 1 === rank}
            onClick={() => onLevel(target, i + 1 === rank ? null : word)}
          />
        ))}
      </span>
      {rank > 0 ? point.level?.label : 'Set friction'}
    </span>
  )
}

// Shows the friction picker when I can click it, otherwise the plain meter.
function Friction({ point, insertAfter, onLevel }: { point: Point; insertAfter: number; onLevel?: LevelHandler }) {
  if (onLevel && (!point.level || point.level.kind === 'friction'))
    return <FrictionPicker point={point} insertAfter={insertAfter} onLevel={onLevel} />
  return point.level ? <LevelMeter level={point.level} /> : null
}
export { Friction }

export function NorthStar({ on, line, group, onStar }: { on: boolean; line: number; group: number[]; onStar?: StarHandler }) {
  return (
    <button
      type="button"
      className={on ? 'north-star on' : 'north-star'}
      aria-pressed={on}
      aria-label={on ? 'North star' : 'Make this the north star'}
      title={on ? 'North star' : 'Make this the north star'}
      onClick={(e) => {
        e.stopPropagation()
        onStar?.(line, group)
      }}
    >
      <span className="star-trail" aria-hidden="true" />
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
      </svg>
      {on && <span className="star-label">North star</span>}
    </button>
  )
}

// Friction: four dashes that fill up and turn from green to red.
// Priority: a small badge (P0 is the most important).
export function LevelMeter({ level }: { level: Level }) {
  if (level.kind === 'priority') {
    return <span className={`priority rank-${level.rank}`}>{level.label}</span>
  }
  return (
    <span className={`friction rank-${level.rank}`}>
      <span className="dashes" aria-hidden="true">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={n <= level.rank ? 'dash filled' : 'dash'} />
        ))}
      </span>
      {level.label}
    </span>
  )
}

// Every line in a section that can carry the star, so choosing one clears the others.
export function starLines(section: Section): number[] {
  return section.points.flatMap((p) => [p.line, ...p.children.map((c) => c.line)])
}

function PainItem({ pain, group, onStar, onLevel }: { pain: Point; group: number[]; onStar?: StarHandler; onLevel?: LevelHandler }) {
  return (
    <li className="pain">
      <div className="pain-main">
        <span className="pain-text">{pain.text}</span>
        {pain.details.map((d, i) => (
          <span key={i} className="pain-desc">
            {d}
          </span>
        ))}
        <Friction point={pain} insertAfter={pain.endLine} onLevel={onLevel} />
      </div>
      <NorthStar on={pain.star} line={pain.line} group={group} onStar={onStar} />
    </li>
  )
}

// The journey as numbered stages, top to bottom, with the pain points inside each stage.
export function Journey({ section, onStar, onLevel }: { section: Section; onStar?: StarHandler; onLevel?: LevelHandler }) {
  if (section.points.length === 0) {
    return (
      <p className="chain-hint">
        One stage per line. Indent under a stage for a pain point, and indent again for its friction (low, moderate,
        high, very high).
      </p>
    )
  }
  const group = starLines(section)
  return (
    <ol className="journey">
      {section.points.map((stage, i) => (
        <li key={stage.line} className={stage.star ? 'stage starred' : 'stage'}>
          <div className="stage-row">
            <span className="stage-num" aria-hidden="true">
              {i + 1}
            </span>
            <div className="stage-main">
              <span className="stage-title">{stage.text}</span>
              {stage.details.map((d, j) => (
                <span key={j} className="pain-desc">
                  {d}
                </span>
              ))}
              {stage.level && <LevelMeter level={stage.level} />}
            </div>
            <NorthStar on={stage.star} line={stage.line} group={group} onStar={onStar} />
          </div>
          {stage.children.length > 0 && (
            <ul className="pains">
              {stage.children.map((pain) => (
                <PainItem key={pain.line} pain={pain} group={group} onStar={onStar} onLevel={onLevel} />
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  )
}

// "a / b × 1000" -> a over b, then "× 1000". No "/" -> the text as typed.
function splitFormula(formula: string): { top: string; bottom: string; scale: string } | null {
  const scaled = /^(.*?)\s*[×x*]\s*([\d,.]+\s*[kKmM]?)$/.exec(formula)
  const body = scaled ? scaled[1] : formula
  const slash = body.indexOf('/')
  if (slash === -1) return null
  const top = body.slice(0, slash).trim().replace(/^\((.*)\)$/, '$1')
  const bottom = body.slice(slash + 1).trim().replace(/^\((.*)\)$/, '$1')
  if (!top || !bottom) return null
  return { top, bottom, scale: scaled ? scaled[2] : '' }
}

export function Formula({ formula }: { formula: string }) {
  const parts = splitFormula(formula)
  if (!parts) return <span className="formula plain">{formula}</span>
  return (
    <span className="formula" aria-label={formula}>
      <span className="fraction">
        <span className="numerator">{parts.top}</span>
        <span className="denominator">{parts.bottom}</span>
      </span>
      {parts.scale && <span className="scale">× {parts.scale}</span>}
    </span>
  )
}

function Direction({ direction }: { direction: Point['direction'] }) {
  if (!direction) return null
  return (
    <span className={`direction ${direction}`} title={direction === 'up' ? 'Higher is better' : 'Lower is better'}>
      {direction === 'up' ? '↑ Higher is better' : '↓ Lower is better'}
    </span>
  )
}

function kickerOf(point: Point): string {
  if (point.category) return point.category
  if (point.group === 'north') return 'North star metric'
  if (point.group === 'guardrail') return 'Guardrail'
  if (point.group === 'supporting') return 'Supporting metric'
  return ''
}

// One metric in its own box: type on top, the metric, the question it answers, its formula.
function MetricCard({ point }: { point: Point }) {
  const kicker = kickerOf(point)
  return (
    <div className={`metric-card ${point.group || 'other'}`}>
      {kicker && <span className="metric-card-kicker">{kicker}</span>}
      <span className="metric-card-text">{point.text}</span>
      {point.details.length > 0 && <span className="metric-desc">{point.details.join(' · ')}</span>}
      {point.formula && <Formula formula={point.formula} />}
      <Direction direction={point.direction} />
    </div>
  )
}

// Every metric that has a formula, in one table: what I'd say when asked "how exactly do you measure it?"
function FormulaTable({ points }: { points: Point[] }) {
  const rows = points.filter((p) => p.formula)
  if (rows.length === 0) return null
  return (
    <div className="table-wrap formula-table">
      <table className="notes-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Type</th>
            <th>Formula</th>
            <th>Good if</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.line}>
              <td className="ft-metric">{p.text}</td>
              <td>{kickerOf(p)}</td>
              <td>
                <Formula formula={p.formula} />
              </td>
              <td>{p.direction === 'up' ? '↑ Higher' : p.direction === 'down' ? '↓ Lower' : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const GROUP_ORDER = { north: 0, supporting: 1, guardrail: 2, '': 3 }

// The metric hierarchy: the primary metric on top, every other metric in its own box below
// (guardrails last, in red), then the formula table.
export function MetricsPanel({ section }: { section: Section }) {
  const north = section.points.filter((p) => p.group === 'north')
  const rest = section.points.filter((p) => p.group !== 'north').sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group])

  if (section.points.length === 0) {
    return (
      <p className="chain-hint">
        Under Metrics, type <b>Primary:</b> your main metric, then one line per other metric like <b>Adoption:</b>,{' '}
        <b>Experience:</b> or <b>Guardrail:</b>. Indent <b>F: a / b</b> for its formula and <b>up</b> or <b>down</b> for
        which way is good.
      </p>
    )
  }
  return (
    <div className="metrics">
      {north.map((p) => (
        <div key={p.line} className="metric-north">
          <span className="north-star on" aria-hidden="true">
            <span className="star-trail" />
            <svg viewBox="0 0 24 24" width="28" height="28">
              <path d="M12 2.8l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 16.8l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
            </svg>
          </span>
          <div className="metric-north-main">
            <span className="metric-kicker">{kickerOf(p)}</span>
            <span className="metric-north-text">{p.text}</span>
            {p.details.length > 0 && <span className="metric-desc">{p.details.join(' · ')}</span>}
            {p.formula && <Formula formula={p.formula} />}
            <Direction direction={p.direction} />
          </div>
        </div>
      ))}
      {rest.length > 0 && (
        <div className="metric-grid">
          {rest.map((p) => (
            <MetricCard key={p.line} point={p} />
          ))}
        </div>
      )}
      <FormulaTable points={[...north, ...rest]} />
    </div>
  )
}
