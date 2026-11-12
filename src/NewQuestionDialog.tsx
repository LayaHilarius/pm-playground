// The "+ New" form: pick the question type, then type the question.

import { useEffect, useRef, useState } from 'react'
import { QUESTION_TYPES } from './questions.ts'

interface Props {
  open: boolean
  onCancel: () => void
  onCreate: (title: string, type: string) => void
}

export function NewQuestionDialog({ open, onCancel, onCreate }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [type, setType] = useState('guesstimate')
  const [title, setTitle] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) {
      setTitle('')
      dialog.showModal()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (title.trim() === '') return
    onCreate(title.trim(), type)
  }

  return (
    <dialog ref={dialogRef} className="dialog" onCancel={onCancel} onClose={onCancel}>
      <form onSubmit={submit}>
        <h2>New question</h2>

        <fieldset className="type-picker">
          <legend>Type of question</legend>
          {QUESTION_TYPES.map((t) => (
            <label key={t.id} className={t.ready ? 'type-option' : 'type-option disabled'}>
              <input
                type="radio"
                name="type"
                value={t.id}
                checked={type === t.id}
                disabled={!t.ready}
                onChange={() => setType(t.id)}
              />
              {t.name}
              {!t.ready && <span className="soon">soon</span>}
            </label>
          ))}
        </fieldset>

        <label className="field">
          Question
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="How many cars are sold in India every year?"
          />
        </label>

        <div className="dialog-buttons">
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="primary" disabled={title.trim() === ''}>
            Create
          </button>
        </div>
      </form>
    </dialog>
  )
}
