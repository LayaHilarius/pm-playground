import { useEffect, useMemo, useState } from 'react'
import { NewQuestionDialog } from './NewQuestionDialog.tsx'
import { parseNotes } from './parse.ts'
import { loadQuestions, saveQuestions, typeName, type Question } from './questions.ts'
import { Visual } from './Visual.tsx'

function Logo({ size }: { size: number }) {
  return <img src="./logo.svg" width={size} height={size} alt="" />
}

// Tab indents by 2 spaces instead of leaving the box. With several lines selected, every
// selected line moves in one step. Shift+Tab moves them back out.
// Edits go through insertText (the browser's own typing), so Cmd+Z still undoes them.
// Types text over the selection the way the browser does, so Cmd+Z still works.
// If the browser refuses, change the text directly and tell React about it.
function replaceSelection(box: HTMLTextAreaElement, text: string) {
  box.focus()
  if (document.execCommand('insertText', false, text)) return
  box.setRangeText(text, box.selectionStart, box.selectionEnd, 'end')
  box.dispatchEvent(new Event('input', { bubbles: true }))
}

function indentWithTab(box: HTMLTextAreaElement, outdent: boolean) {
  const { selectionStart: start, selectionEnd: end, value } = box
  const multiLine = value.slice(start, end).includes('\n')

  if (!multiLine && !outdent) {
    replaceSelection(box, '  ')
    return
  }

  // Grow the selection to whole lines.
  const blockStart = value.lastIndexOf('\n', start - 1) + 1
  const lastLineEnd = value.indexOf('\n', end > start && value[end - 1] === '\n' ? end - 1 : end)
  const blockEnd = lastLineEnd === -1 ? value.length : lastLineEnd
  const lines = value.slice(blockStart, blockEnd).split('\n')
  const changed = lines.map((line) => (outdent ? line.replace(/^ {1,2}|^\t/, '') : '  ' + line)).join('\n')

  box.setSelectionRange(blockStart, blockEnd)
  replaceSelection(box, changed)
  if (multiLine) box.setSelectionRange(blockStart, blockStart + changed.length)
  else {
    // One line moved out: keep the cursor where it was in the text.
    const caret = Math.max(blockStart, start - (blockEnd - blockStart - changed.length))
    box.setSelectionRange(caret, caret)
  }
}

export default function App() {
  const [questions, setQuestions] = useState<Question[]>(loadQuestions)
  const [activeId, setActiveId] = useState<string | null>(() => questions[0]?.id ?? null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [notesHidden, setNotesHidden] = useState(false)

  useEffect(() => saveQuestions(questions), [questions])

  const active = questions.find((q) => q.id === activeId) ?? null
  const { sections, steps } = useMemo(() => parseNotes(active?.notes ?? ''), [active?.notes])

  function createQuestion(title: string, type: string) {
    const question: Question = {
      id: crypto.randomUUID(),
      title,
      type,
      notes: '',
      createdAt: new Date().toISOString(),
    }
    setQuestions([...questions, question])
    setActiveId(question.id)
    setDialogOpen(false)
  }

  function updateNotes(notes: string) {
    setQuestions(questions.map((q) => (q.id === activeId ? { ...q, notes } : q)))
  }

  // Clicking a star: that line becomes the north star (" *" at its end), the rest of the
  // section loses theirs. Clicking the north star again takes it away.
  function toggleStar(line: number, group: number[]) {
    if (!active) return
    const lines = active.notes.split('\n')
    if (line >= lines.length) return
    const hadStar = /[*★]\s*$/.test(lines[line])
    for (const l of group) if (l < lines.length) lines[l] = lines[l].replace(/\s*[*★]\s*$/, '')
    if (!hadStar) lines[line] = lines[line].replace(/\s+$/, '') + ' *'
    updateNotes(lines.join('\n'))
  }

  function deleteQuestion(id: string) {
    if (!window.confirm('Delete this question and its notes?')) return
    const rest = questions.filter((q) => q.id !== id)
    setQuestions(rest)
    if (id === activeId) setActiveId(rest[0]?.id ?? null)
  }

  const dialog = (
    <NewQuestionDialog open={dialogOpen} onCancel={() => setDialogOpen(false)} onCreate={createQuestion} />
  )

  // First page: just the name, the logo and + New.
  if (questions.length === 0) {
    return (
      <main className="home">
        <Logo size={72} />
        <h1>PM Playground</h1>
        <p>Think out loud. It draws as you type.</p>
        <button className="primary big" onClick={() => setDialogOpen(true)}>
          + New
        </button>
        {dialog}
      </main>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Logo size={26} />
          PM Playground
        </div>
        <nav className="tabs" aria-label="Questions">
          {questions.map((q) => (
            <div key={q.id} className={q.id === activeId ? 'tab active' : 'tab'}>
              <button className="tab-open" onClick={() => setActiveId(q.id)}>
                <span className="tab-title">{q.title}</span>
                <span className="badge">{typeName(q.type)}</span>
              </button>
              <button
                className="tab-close"
                onClick={() => deleteQuestion(q.id)}
                aria-label={`Delete ${q.title}`}
                title="Delete this question"
              >
                ×
              </button>
            </div>
          ))}
          <button className="tab new" onClick={() => setDialogOpen(true)}>
            + New
          </button>
        </nav>
      </header>

      {active && (
        <main className={notesHidden ? 'workspace notes-hidden' : 'workspace'}>
          <div className="question-bar">
            <h1>{active.title}</h1>
            <div className="question-actions">
              <button className="ghost" onClick={() => setNotesHidden(!notesHidden)}>
                {notesHidden ? 'Show notes' : 'Hide notes'}
              </button>
              <button className="ghost danger" onClick={() => deleteQuestion(active.id)}>
                Delete
              </button>
            </div>
          </div>

          {!notesHidden && (
            <section className="notes" aria-label="Notes">
              <textarea
                value={active.notes}
                onChange={(e) => updateNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== 'Tab') return
                  e.preventDefault()
                  indentWithTab(e.currentTarget, e.shiftKey)
                }}
                placeholder={
                  active.type === 'product-sense'
                    ? 'Clarify\nWhich part of Maps?\n-> Navigation\n--end--'
                    : 'Clarify\nIs this new cars only?\n-> Yes, new cars only\n--end--'
                }
                spellCheck={false}
                autoFocus
              />
              <p className="notes-help">
                <b>Clarify</b> starts a section · <b>-&gt;</b> answer · <b>--end--</b> closes it ·{' '}
                <b>Structure</b> then one step per line, closed with <b>--end--</b>, makes the step bar ·{' '}
                <b>--pie--</b> / <b>--bar--</b> / <b>--table--</b> with <b>key,value</b> lines, closed with <b>--end--</b>
                {active.type === 'product-sense' && (
                  <>
                    {' '}
                    · <b>User journey</b>: a stage per line, indent for its pain points, indent again for friction (
                    <b>low</b>, <b>moderate</b>, <b>high</b>, <b>very high</b>) · indented lines are descriptions ·{' '}
                    <b>P0</b>–<b>P3</b> under Solutions · end a line with <b>*</b> (or click its star) for the north star
                  </>
                )}
              </p>
            </section>
          )}

          <Visual sections={sections} steps={steps} type={active.type} onStar={toggleStar} />
        </main>
      )}
      {dialog}
    </div>
  )
}
