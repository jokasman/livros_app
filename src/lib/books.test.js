import { describe, expect, it } from 'vitest'
import { sanitizeRow } from './books.js'

describe('limpeza dos dados antes de gravar', () => {
  it('corrige valores que a base de dados recusaria', () => {
    const r = sanitizeRow({
      title: '  A Criada  ', page_count: 0, isbn13: '123', authors: ['Freida McFadden', ''],
      source: 'outra', status: 'read', rating: 7, cover_url: 'x'.repeat(400000),
    })
    expect(r).toEqual({
      title: 'A Criada', page_count: null, isbn13: null, authors: ['Freida McFadden'],
      source: 'manual', status: 'read', rating: null, cover_url: null,
    })
  })

  it('mantém valores válidos e não acrescenta campos', () => {
    const r = sanitizeRow({ title: 'A Criada', page_count: '352', isbn13: '9789895701124', rating: 3 })
    expect(r).toEqual({ title: 'A Criada', page_count: 352, isbn13: '9789895701124', rating: 3 })
    expect(sanitizeRow({ status: 'want' })).toEqual({ status: 'want' })
  })
})
