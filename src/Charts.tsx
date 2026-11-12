// --pie--, --bar-- and --table-- blocks from my notes.

import type { Chart, ChartItem } from './parse.ts'

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

export function ChartView({ chart }: { chart: Chart }) {
  if (chart.type === 'table') return <TableChart rows={chart.rows} />
  if (chart.items.length === 0) return null
  if (chart.type === 'bar') return <BarChart items={chart.items} />
  return <PieChart items={chart.items} />
}
