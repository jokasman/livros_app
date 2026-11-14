import { describe, expect, it } from 'vitest'
import { cleanIsbn, isbn10to13, isbn13to10, isValidIsbn10, isValidIsbn13, looksLikeIsbn, toIsbn13 } from './isbn.js'

describe('isbn', () => {
  it('limpa hífenes e espaços', () => {
    expect(cleanIsbn('978-972-0-04612-3 ')).toBe('9789720046123')
    expect(cleanIsbn('0-306-40615-x')).toBe('030640615X')
  })

  it('valida ISBN-10 e ISBN-13', () => {
    expect(isValidIsbn10('0306406152')).toBe(true)
    expect(isValidIsbn10('0306406153')).toBe(false)
    expect(isValidIsbn10('080442957X')).toBe(true)
    expect(isValidIsbn13('9780306406157')).toBe(true)
    expect(isValidIsbn13('9780306406158')).toBe(false)
  })

  it('converte entre formatos', () => {
    expect(isbn10to13('0306406152')).toBe('9780306406157')
    expect(isbn13to10('9780306406157')).toBe('0306406152')
    expect(isbn13to10('9780804429573')).toBe('080442957X')
    expect(isbn13to10('9791234567896')).toBeNull()
  })

  it('normaliza para ISBN-13', () => {
    expect(toIsbn13('0-306-40615-2')).toBe('9780306406157')
    expect(toIsbn13('978-0-306-40615-7')).toBe('9780306406157')
    expect(toIsbn13('5601234567890')).toBeNull() // EAN de produto, não é livro
    expect(toIsbn13('abc')).toBeNull()
    expect(looksLikeIsbn('O Principezinho')).toBe(false)
  })
})
