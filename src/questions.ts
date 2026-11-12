// The questions I'm practising, saved in this browser (localStorage).

export interface QuestionType {
  id: string
  name: string
  ready: boolean
}

// A type becomes "ready" the week I learn it.
export const QUESTION_TYPES: QuestionType[] = [
  { id: 'guesstimate', name: 'Guesstimate', ready: true },
  { id: 'product-sense', name: 'Product sense', ready: false },
  { id: 'metrics', name: 'Metrics', ready: false },
  { id: 'root-cause', name: 'Root cause', ready: false },
]

export interface Question {
  id: string
  title: string
  type: string
  notes: string
  createdAt: string
}

const STORAGE_KEY = 'pm-playground:questions'

export function loadQuestions(): Question[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as Question[]) : []
  } catch {
    return []
  }
}

export function saveQuestions(questions: Question[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(questions))
  } catch {
    // Storage can be blocked (private window). The app still works, it just won't remember.
  }
}

export function typeName(typeId: string): string {
  return QUESTION_TYPES.find((t) => t.id === typeId)?.name ?? typeId
}
