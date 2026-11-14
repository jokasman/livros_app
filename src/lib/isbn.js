// Utilitários para ISBN-10 / ISBN-13.

/** Remove tudo exceto dígitos e X (maiúsculo). */
export function cleanIsbn(value) {
  return String(value ?? '')
    .toUpperCase()
    .replace(/[^0-9X]/g, '')
}

export function isValidIsbn10(isbn) {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false
  let sum = 0
  for (let i = 0; i < 10; i++) {
    const c = isbn[i]
    const v = c === 'X' ? 10 : Number(c)
    sum += v * (10 - i)
  }
  return sum % 11 === 0
}

export function isValidIsbn13(isbn) {
  if (!/^\d{13}$/.test(isbn)) return false
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(isbn[i]) * (i % 2 === 0 ? 1 : 3)
  const check = (10 - (sum % 10)) % 10
  return check === Number(isbn[12])
}

export function isbn10to13(isbn10) {
  const core = '978' + isbn10.slice(0, 9)
  let sum = 0
  for (let i = 0; i < 12; i++) sum += Number(core[i]) * (i % 2 === 0 ? 1 : 3)
  return core + ((10 - (sum % 10)) % 10)
}

export function isbn13to10(isbn13) {
  if (!isbn13.startsWith('978')) return null
  const core = isbn13.slice(3, 12)
  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(core[i]) * (10 - i)
  const check = (11 - (sum % 11)) % 11
  return core + (check === 10 ? 'X' : String(check))
}

/**
 * Normaliza qualquer ISBN válido para ISBN-13.
 * Devolve null se não for um ISBN válido.
 */
export function toIsbn13(value) {
  const c = cleanIsbn(value)
  if (c.length === 13 && isValidIsbn13(c) && /^97[89]/.test(c)) return c
  if (c.length === 10 && isValidIsbn10(c)) return isbn10to13(c)
  return null
}

/** Indica se o texto parece um ISBN (para decidir o tipo de pesquisa). */
export function looksLikeIsbn(value) {
  return toIsbn13(value) !== null
}

/** Formata um ISBN-13 para apresentação: 978-972-0-04612-3 → simplificado 978-9720046123 */
export function formatIsbn(isbn13) {
  if (!isbn13) return ''
  return isbn13.length === 13 ? `${isbn13.slice(0, 3)}-${isbn13.slice(3)}` : isbn13
}
