// Chain: my notes drawn as a tree, plus a calculator in the corner.
// I do the maths myself. Clicking a box lets me type its number, which is written back into my notes.

import { useState } from 'react'
import { calculate, fullNumber, indianNumber, shortNumber } from './calc.ts'
import type { Section, TreeNode } from './parse.ts'

type SetValue = (line: number, value: string) => void

function TreeBox({ node, onSetValue }: { node: TreeNode; onSetValue: SetValue }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.value)

  function save() {
    onSetValue(node.line, draft)
    setEditing(false)
  }

  return (
    <div className="tree-box-wrap">
      {node.formula && <div className="tree-formula">{node.formula}</div>}
      {editing ? (
        <div className="tree-box editing">
          <span className="tree-name">{node.text}</span>
          <input
            autoFocus
            className="tree-input"
            value={draft}
            placeholder="87M, 20%…"
            aria-label={`Number for ${node.text}`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') save()
              if (e.key === 'Escape') {
                setDraft(node.value)
                setEditing(false)
              }
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className="tree-box"
          onClick={() => {
            setDraft(node.value)
            setEditing(true)
          }}
          title="Click to type a number"
        >
          <span className="tree-name">{node.text}</span>
          {node.value ? <span className="tree-value">{node.value}</span> : <span className="tree-empty">+ number</span>}
        </button>
      )}
    </div>
  )
}

function TreeBranch({ node, onSetValue }: { node: TreeNode; onSetValue: SetValue }) {
  return (
    <li>
      <TreeBox node={node} onSetValue={onSetValue} />
      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <TreeBranch key={child.line} node={child} onSetValue={onSetValue} />
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

export function ChainView({ section, onSetValue }: { section: Section; onSetValue: SetValue }) {
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
            <div className="tree-scroll">
              <ul className="tree">
                {section.tree.map((node) => (
                  <TreeBranch key={node.line} node={node} onSetValue={onSetValue} />
                ))}
              </ul>
            </div>
          )}
        </div>
        <Calculator />
      </div>
    </section>
  )
}
