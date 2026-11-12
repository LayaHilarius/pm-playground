import { useEffect, useMemo, useState } from 'react'
import { NewQuestionDialog } from './NewQuestionDialog.tsx'
import { parseNotes } from './parse.ts'
import { loadQuestions, saveQuestions, typeName, type Question } from './questions.ts'
import { Visual } from './Visual.tsx'

function Logo({ size }: { size: number }) {
  return <img src="./logo.svg" width={size} height={size} alt="" />
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
            <button
              key={q.id}
              className={q.id === activeId ? 'tab active' : 'tab'}
              onClick={() => setActiveId(q.id)}
            >
              <span className="tab-title">{q.title}</span>
              <span className="badge">{typeName(q.type)}</span>
            </button>
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
                  // Tab indents by 2 spaces (for Chain branches) instead of leaving the box.
                  // insertText goes through the browser's own typing, so Cmd+Z still undoes it.
                  if (e.key !== 'Tab' || e.shiftKey) return
                  e.preventDefault()
                  document.execCommand('insertText', false, '  ')
                }}
                placeholder={'Clarify\nIs this new cars only?\n-> Yes, new cars only\n--end--'}
                spellCheck={false}
                autoFocus
              />
              <p className="notes-help">
                <b>Clarify</b> starts a section · <b>-&gt;</b> answer · <b>--end--</b> closes it ·{' '}
                <b>Structure</b> then one step per line, closed with <b>--end--</b>, makes the step bar
              </p>
            </section>
          )}

          <Visual sections={sections} steps={steps} />
        </main>
      )}
      {dialog}
    </div>
  )
}
