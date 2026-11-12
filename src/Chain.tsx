// Chain and Solve: my notes drawn as trees (one sheet each), plus a calculator in the corner.
// I do the maths myself; numbers come from "(value)" in my notes.

import { useState } from 'react'
import { calculate, fullNumber, indianNumber, shortNumber } from './calc.ts'
import type { Section, TreeNode } from './parse.ts'

function TreeBox({ node }: { node: TreeNode }) {
  return (
    <div className="tree-box-wrap">
      {node.formula && <div className="tree-formula">{node.formula}</div>}
      <div className="tree-box">
        <span className="tree-name">{node.text}</span>
        {node.value && <span className="tree-value">{node.value}</span>}
      </div>
    </div>
  )
}

function TreeBranch({ node }: { node: TreeNode }) {
  return (
    <li>
      <TreeBox node={node} />
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeBranch key={child.line} node={child} />
          ))}
        </ul>
      )}
    </li>
  )
}

// Each top-level box is a sheet, side by side. Once its top box has a number,
// the sheet folds down to just that number. Click it to see the working again.
function Sheet({ node }: { node: TreeNode }) {
  const done = node.value !== ''
  const [open, setOpen] = useState(false)

  if (done && !open) {
    return (
      <button type="button" className="sheet folded" onClick={() => setOpen(true)} aria-expanded={false}>
        <span className="tick" aria-hidden="true">
          ✓
        </span>
        <span className="tree-name">{node.text}</span>
        <span className="tree-value">{node.value}</span>
        {node.children.length > 0 && <span className="card-more">Show working</span>}
      </button>
    )
  }

  return (
    <div className="sheet">
      {done && (
        <button type="button" className="sheet-fold" onClick={() => setOpen(false)}>
          Fold
        </button>
      )}
      <div className="tree-scroll">
        <ul className="tree">
          <TreeBranch node={node} />
        </ul>
      </div>
    </div>
  )
}

function Calculator() {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<string[]>([])

  let result: number | null = null
  let error = ''
  if (input.trim() !== '') {
    try {
      result = calculate(input)
    } catch (e) {
      error = (e as Error).message
    }
  }

  return (
    <div className="calc">
      <label className="calc-label" htmlFor="calc-input">
        Maths
      </label>
      <input
        id="calc-input"
        className="calc-input"
        value={input}
        placeholder="50% of 5B"
        spellCheck={false}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && result !== null) {
            setHistory([`${input} = ${shortNumber(result)}`, ...history].slice(0, 3))
            setInput('')
          }
        }}
      />
      {result !== null && (
        <div className="calc-result" aria-live="polite">
          <strong>{shortNumber(result)}</strong>
          <span>{indianNumber(result)}</span>
          <span className="calc-full">{fullNumber(result)}</span>
        </div>
      )}
      {error && <div className="calc-error">{error}</div>}
      {history.length > 0 && (
        <ul className="calc-history">
          {history.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ChainBody({ section, showMaths }: { section: Section; showMaths: boolean }) {
  return (
    <div className="chain-body">
      <div className="chain-main">
        {section.tree.length === 0 ? (
          <p className="chain-hint">
            Type the top box, then indent each branch with 2 spaces. Add <b>F:</b> under a box for its formula.
          </p>
        ) : (
          <div className="sheets">
            {section.tree.map((node) => (
              <Sheet key={node.line} node={node} />
            ))}
          </div>
        )}
      </div>
      {showMaths && <Calculator />}
    </div>
  )
}
