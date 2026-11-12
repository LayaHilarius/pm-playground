// Chain: my notes drawn as a tree, plus a calculator in the corner.
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

export function ChainView({ section }: { section: Section }) {
  return (
    <section className="section">
      <h2>{section.title}</h2>
      <div className="chain-body">
        <div className="chain-main">
          {section.tree.length === 0 ? (
            <p className="chain-hint">
              Type the top box, then indent each branch with 2 spaces. Add <b>F:</b> under a box for its formula.
            </p>
          ) : (
            <div className="trees">
              {/* Each top-level box is its own tree, one under the other, each scrolling sideways if wide. */}
              {section.tree.map((node) => (
                <div key={node.line} className="tree-scroll">
                  <ul className="tree">
                    <TreeBranch node={node} />
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
        <Calculator />
      </div>
    </section>
  )
}
