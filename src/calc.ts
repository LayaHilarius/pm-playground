// The little calculator in the corner of Chain.
// Understands: 5B/5 · 50% of 5B · 1.45B / 5 × 3 · 2 crore + 30 lakh · (3 + 2) x 4
//
// Units:  K = thousand, M = million, B = billion, L / lakh, Cr / crore, % = divide by 100

const UNITS: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  m: 1e6,
  mn: 1e6,
  million: 1e6,
  b: 1e9,
  bn: 1e9,
  billion: 1e9,
  l: 1e5,
  lakh: 1e5,
  lakhs: 1e5,
  cr: 1e7,
  crore: 1e7,
  crores: 1e7,
}

type Token = { kind: 'num'; value: number } | { kind: 'op'; value: string }

function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  const text = input.toLowerCase().replace(/,/g, '')
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (ch === ' ') {
      i++
      continue
    }
    // A number, maybe with a unit or % right after it: 1.45b, 30 lakh, 50%
    const num = /^\d*\.?\d+/.exec(text.slice(i))
    if (num) {
      let value = parseFloat(num[0])
      i += num[0].length
      const unit = /^\s*(thousand|million|billion|crores?|lakhs?|mn|bn|cr|k|m|b|l)(?![a-z])/.exec(text.slice(i))
      if (unit) {
        value *= UNITS[unit[1]]
        i += unit[0].length
      }
      const pct = /^\s*%/.exec(text.slice(i))
      if (pct) {
        value /= 100
        i += pct[0].length
      }
      tokens.push({ kind: 'num', value })
      continue
    }
    // Words: "of" (50% of 5B) and "x" mean multiply. Other words are labels and skipped,
    // so "1.45B people / 5 per house" works.
    const word = /^[a-z]+/.exec(text.slice(i))
    if (word) {
      if (word[0] === 'of' || word[0] === 'x') tokens.push({ kind: 'op', value: '*' })
      i += word[0].length
      continue
    }
    if ('+-*/()'.includes(ch)) tokens.push({ kind: 'op', value: ch })
    else if (ch === '×') tokens.push({ kind: 'op', value: '*' })
    else if (ch === '÷') tokens.push({ kind: 'op', value: '/' })
    else throw new Error(`I don't understand "${input.slice(i, i + 6).trim()}"`)
    i++
  }
  return tokens
}

// Classic recursive descent: expression = term (+|- term)*, term = factor (*|/ factor)*
function evaluate(tokens: Token[]): number {
  let pos = 0
  const peek = () => tokens[pos]
  const isOp = (op: string) => peek()?.kind === 'op' && peek()?.value === op

  function factor(): number {
    const token = peek()
    if (!token) throw new Error('Something is missing at the end')
    if (isOp('-')) {
      pos++
      return -factor()
    }
    if (isOp('(')) {
      pos++
      const value = expression()
      if (!isOp(')')) throw new Error('A bracket is not closed')
      pos++
      return value
    }
    if (token.kind === 'num') {
      pos++
      return token.value
    }
    throw new Error(`Unexpected "${token.value}"`)
  }

  function term(): number {
    let value = factor()
    while (isOp('*') || isOp('/')) {
      const op = tokens[pos++].value
      const right = factor()
      if (op === '/' && right === 0) throw new Error('Cannot divide by zero')
      value = op === '*' ? value * right : value / right
    }
    return value
  }

  function expression(): number {
    let value = term()
    while (isOp('+') || isOp('-')) {
      const op = tokens[pos++].value
      const right = term()
      value = op === '+' ? value + right : value - right
    }
    return value
  }

  const result = expression()
  if (pos < tokens.length) throw new Error(`Unexpected "${tokens[pos].value}"`)
  return result
}

export function calculate(input: string): number {
  return evaluate(tokenize(input))
}

function trim(n: number): string {
  return parseFloat(n.toPrecision(3)).toString()
}

// 1000000000 -> "1B"
export function shortNumber(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e9) return trim(n / 1e9) + 'B'
  if (abs >= 1e6) return trim(n / 1e6) + 'M'
  if (abs >= 1e3) return trim(n / 1e3) + 'K'
  return trim(n)
}

// 1000000000 -> "100 crore"
export function indianNumber(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1e7) return trim(n / 1e7) + ' crore'
  if (abs >= 1e5) return trim(n / 1e5) + ' lakh'
  return trim(n)
}

// 1000000000 -> "1,000,000,000"
export function fullNumber(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}
