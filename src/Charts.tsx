// --pie--, --bar--, --table-- and --funnel-- blocks from my notes.

import type React from 'react'
import { calculate } from './calc.ts'
import type { Chart, ChartItem, ChartType } from './parse.ts'

// Clicking Funnel / Table rewrites the chart's marker line in my notes.
export type ChartTypeHandler = (line: number, type: ChartType) => void

// Fixed order, never cycled. Checked for colour-blind separation (dataviz palette).
const COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
const colorAt = (i: number) => COLORS[i % COLORS.length]

// Lines without a number get an equal share: the average of the others (or 1 if none have one).
function weights(items: ChartItem[]): number[] {
  const known = items.map((i) => i.value).filter((v): v is number => v !== null && v > 0)
  const fallback = known.length > 0 ? known.reduce((a, b) => a + b, 0) / known.length : 1
  return items.map((i) => (i.value !== null && i.value > 0 ? i.value : fallback))
}

function percent(n: number): string {
  return `${Math.round(n * 1000) / 10}%`
}

// Warn when every value is a % and they don't add up to 100%.
function percentWarning(items: ChartItem[]): string {
  if (items.length === 0 || !items.every((i) => i.shown.endsWith('%') && i.value !== null)) return ''
  const total = items.reduce((sum, i) => sum + (i.value ?? 0), 0)
  return Math.abs(total - 1) > 0.005 ? `Adds up to ${percent(total)}, not 100%` : ''
}

function slicePath(start: number, end: number, r: number): string {
  // A full circle can't be one arc, so a single slice is drawn as a circle instead.
  const x = (a: number) => r + r * Math.sin(a * 2 * Math.PI)
  const y = (a: number) => r - r * Math.cos(a * 2 * Math.PI)
  const large = end - start > 0.5 ? 1 : 0
  return `M ${r} ${r} L ${x(start)} ${y(start)} A ${r} ${r} 0 ${large} 1 ${x(end)} ${y(end)} Z`
}

function Legend({ items, shares }: { items: ChartItem[]; shares: number[] }) {
  return (
    <ul className="legend">
      {items.map((item, i) => (
        <li key={i}>
          <span className="swatch" style={{ background: colorAt(i) }} aria-hidden="true" />
          <span className="legend-text">
            <span className="legend-label">{item.label}</span>
            <span className="legend-value">
              {item.shown || '–'}
              {!item.shown.endsWith('%') && ` · ${percent(shares[i])}`}
            </span>
            {item.note && <span className="legend-note">{item.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

function PieChart({ items }: { items: ChartItem[] }) {
  const w = weights(items)
  const total = w.reduce((a, b) => a + b, 0)
  const shares = w.map((v) => v / total)
  const r = 80
  let start = 0
  const warning = percentWarning(items)

  return (
    <figure className="chart">
      <div className="chart-row">
        <svg width={r * 2} height={r * 2} viewBox={`0 0 ${r * 2} ${r * 2}`} role="img" aria-label="Pie chart">
          {shares.map((share, i) => {
            const end = start + share
            const label = `${items[i].label}: ${items[i].shown || percent(share)}`
            const shape =
              shares.length === 1 ? (
                <circle key={i} cx={r} cy={r} r={r} fill={colorAt(i)} />
              ) : (
                <path key={i} d={slicePath(start, end, r)} fill={colorAt(i)} stroke="#fff" strokeWidth={2}>
                  <title>{label}</title>
                </path>
              )
            start = end
            return shape
          })}
        </svg>
        <Legend items={items} shares={shares} />
      </div>
      {warning && <figcaption className="chart-warning">{warning}</figcaption>}
    </figure>
  )
}

function BarChart({ items }: { items: ChartItem[] }) {
  const w = weights(items)
  const max = Math.max(...w)
  const total = w.reduce((a, b) => a + b, 0)
  const warning = percentWarning(items)

  return (
    <figure className="chart">
      <div className="bars">
        {items.map((item, i) => (
          <div key={i} className="bar-row" title={`${item.label}: ${item.shown || percent(w[i] / total)}`}>
            <span className="bar-label">{item.label}</span>
            <span className="bar-track">
              <span className="bar" style={{ width: `${(w[i] / max) * 100}%`, background: colorAt(0) }} />
            </span>
            <span className="bar-value">{item.shown || '–'}</span>
            {item.note && <span className="bar-note">{item.note}</span>}
          </div>
        ))}
      </div>
      {warning && <figcaption className="chart-warning">{warning}</figcaption>}
    </figure>
  )
}

function TableChart({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null
  const [head, ...body] = rows
  const columns = Math.max(...rows.map((r) => r.length))
  const pad = (row: string[]) => [...row, ...Array(columns - row.length).fill('')]
  return (
    <div className="table-wrap">
      <table className="notes-table">
        <thead>
          <tr>
            {pad(head).map((cell, i) => (
              <th key={i}>{cell}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, r) => (
            <tr key={r}>
              {pad(row).map((cell, i) => (
                <td key={i}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// "1.2M", "45%", "3,000" -> a number. Anything else -> null.
function numberOf(cell: string): number | null {
  if (!/\d/.test(cell)) return null
  try {
    const n = calculate(cell)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

// The columns (after the first) that hold numbers: each one becomes a funnel.
function numberColumns(rows: string[][]): number[] {
  const [, ...body] = rows
  const columns = Math.max(0, ...rows.map((r) => r.length))
  const out: number[] = []
  for (let c = 1; c < columns; c++) if (body.some((r) => numberOf(r[c] ?? '') !== null)) out.push(c)
  return out
}

function short(n: number): string {
  return `${Math.round(n * 100)}%`
}

interface Stage {
  label: string
  shown: string
  value: number | null
  fromPrev: number | null // share of the stage above that made it here
}

function stagesOf(rows: string[][], column: number): Stage[] {
  const [, ...body] = rows
  let prev: number | null = null
  return body.map((row) => {
    const value = numberOf(row[column] ?? '')
    const fromPrev = value !== null && prev !== null && prev > 0 ? value / prev : null
    if (value !== null) prev = value
    return { label: row[0] ?? '', shown: (row[column] ?? '').trim(), value, fromPrev }
  })
}

// The step where the most people leave: the lowest share kept from the stage above.
function worstStep(stages: Stage[]): number {
  let worst = -1
  stages.forEach((s, i) => {
    if (s.fromPrev !== null && (worst === -1 || s.fromPrev < (stages[worst].fromPrev ?? 1))) worst = i
  })
  return worst
}

// highlight: the step to mark in red (the biggest change between columns, or this funnel's worst step).
function Funnel({ title, stages, color, highlight }: { title: string; stages: Stage[]; color: string; highlight: number }) {
  const top = Math.max(0, ...stages.map((s) => s.value ?? 0))
  const worst = highlight
  return (
    <div className="funnel">
      {title && <h3 className="funnel-title">{title}</h3>}
      <ol className="funnel-stages">
        {stages.map((stage, i) => {
          const width = top > 0 && stage.value !== null ? Math.max(6, (stage.value / top) * 100) : 6
          return (
            <li key={i} className={i === worst ? 'funnel-stage worst' : 'funnel-stage'}>
              {stage.fromPrev !== null && (
                <span className="funnel-drop">
                  {short(stage.fromPrev)} kept · {short(1 - stage.fromPrev)} drop
                </span>
              )}
              {/* A thin bar can't hold its number, so the number sits just to its right. */}
              <span className="funnel-bar-track" style={{ '--half': `${width / 2}%` } as React.CSSProperties}>
                <span className="funnel-bar" style={{ width: `${width}%`, background: color }}>
                  {width >= 25 && <span className="funnel-value">{stage.shown || '–'}</span>}
                </span>
                {width < 25 && <span className="funnel-value outside">{stage.shown || '–'}</span>}
              </span>
              <span className="funnel-label">{stage.label}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// With two columns or more (Before, After): which step's conversion fell the most.
function biggestChange(rows: string[][], columns: number[]): { step: number; text: string } {
  const none = { step: -1, text: '' }
  if (columns.length < 2) return none
  const first = stagesOf(rows, columns[0])
  const last = stagesOf(rows, columns[columns.length - 1])
  let best = -1
  let bestFall = 0
  first.forEach((s, i) => {
    const a = s.fromPrev
    const b = last[i]?.fromPrev
    if (a === null || b === null || b === undefined) return
    if (a - b > bestFall) {
      bestFall = a - b
      best = i
    }
  })
  if (best < 1) return none
  const head = rows[0] ?? []
  const text = `Biggest change: ${first[best - 1].label} → ${first[best].label}, ${short(first[best].fromPrev ?? 0)} kept in ${
    head[columns[0]] || 'the first column'
  } vs ${short(last[best].fromPrev ?? 0)} in ${head[columns[columns.length - 1]] || 'the last column'}`
  return { step: best, text }
}

function FunnelChart({ rows }: { rows: string[][] }) {
  const columns = numberColumns(rows)
  if (rows.length < 2 || columns.length === 0) return <TableChart rows={rows} />
  const head = rows[0]
  const change = biggestChange(rows, columns)
  return (
    <figure className="chart funnel-chart">
      <div className="funnels">
        {columns.map((c, i) => (
          <Funnel
            key={c}
            title={head[c] ?? ''}
            stages={stagesOf(rows, c)}
            color={colorAt(i)}
            highlight={change.step !== -1 ? change.step : worstStep(stagesOf(rows, c))}
          />
        ))}
      </div>
      {change.text && <figcaption className="funnel-change">{change.text}</figcaption>}
    </figure>
  )
}

// A --bar-- block written as a table (a header row, or 3+ columns) is drawn as grouped bars.
function isTableShaped(chart: Chart): boolean {
  const rows = chart.rows
  if (rows.length < 2) return false
  if (rows[0].length >= 3) return true
  return numberOf(rows[0][1] ?? '') === null && rows.slice(1).some((r) => numberOf(r[1] ?? '') !== null)
}

// "125000" -> "125K" so labels fit above thin bars. Values I typed with a unit ("10M", "45%") stay as typed.
function compact(cell: string, value: number | null): string {
  if (value === null || /[a-z%]/i.test(cell)) return cell
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

// One group of bars per step, one bar per number column (Before, After), side by side.
function GroupedBars({ rows }: { rows: string[][] }) {
  const columns = numberColumns(rows)
  const [head, ...body] = rows
  const values = body.map((row) => columns.map((c) => numberOf(row[c] ?? '')))
  const max = Math.max(0, ...values.flat().map((v) => v ?? 0))
  return (
    <figure className="chart grouped-chart">
      <div className="groups" role="img" aria-label="Bar chart">
        {body.map((row, r) => (
          <div key={r} className="group">
            <div className="group-bars">
              {columns.map((c, i) => {
                const v = values[r][i]
                const height = max > 0 && v !== null ? Math.max(2, (v / max) * 100) : 0
                return (
                  <div key={c} className="gbar-col" title={`${row[0]} · ${head[c] ?? ''}: ${row[c] ?? ''}`}>
                    <span className="gbar-value">{compact(row[c] ?? '', v)}</span>
                    <span className="gbar" style={{ height: `${height}%`, background: colorAt(i) }} />
                  </div>
                )
              })}
            </div>
            <span className="group-label">{row[0]}</span>
          </div>
        ))}
      </div>
      {columns.length > 1 && (
        <ul className="legend legend-row">
          {columns.map((c, i) => (
            <li key={c}>
              <span className="swatch" style={{ background: colorAt(i) }} aria-hidden="true" />
              <span className="legend-label">{head[c]}</span>
            </li>
          ))}
        </ul>
      )}
    </figure>
  )
}

const VIEWS: { type: ChartType; name: string }[] = [
  { type: 'table', name: 'Table' },
  { type: 'bar', name: 'Bar' },
  { type: 'funnel', name: 'Funnel' },
]

// A table with numbers gets a Table / Bar / Funnel switch. Each click rewrites the marker in my notes.
function Switchable({ chart, onChartType }: { chart: Chart; onChartType?: ChartTypeHandler }) {
  const canSwitch = chart.rows.length >= 2 && numberColumns(chart.rows).length > 0
  const view: ChartType = canSwitch ? chart.type : 'table'
  return (
    <div className="switchable">
      {onChartType && canSwitch && (
        <div className="chart-switch" role="group" aria-label="Show as">
          {VIEWS.map((v) => (
            <button
              key={v.type}
              type="button"
              className={view === v.type ? 'on' : ''}
              aria-pressed={view === v.type}
              onClick={() => onChartType(chart.line, v.type)}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}
      {view === 'funnel' ? (
        <FunnelChart rows={chart.rows} />
      ) : view === 'bar' ? (
        <GroupedBars rows={chart.rows} />
      ) : (
        <TableChart rows={chart.rows} />
      )}
    </div>
  )
}

export function ChartView({ chart, onChartType }: { chart: Chart; onChartType?: ChartTypeHandler }) {
  if (chart.type === 'table' || chart.type === 'funnel' || (chart.type === 'bar' && isTableShaped(chart)))
    return <Switchable chart={chart} onChartType={onChartType} />
  if (chart.items.length === 0) return null
  if (chart.type === 'bar') return <BarChart items={chart.items} />
  return <PieChart items={chart.items} />
}
