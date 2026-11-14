import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupIsbn, mapGoogleVolume, mapOpenLibraryDoc, mergeResults, searchBooks } from './bookApi.js'

const googleItem = {
  id: 'abc123',
  volumeInfo: {
    title: 'Ensaio sobre a Cegueira',
    authors: ['José Saramago'],
    publisher: 'Porto Editora',
    publishedDate: '2014-05-01',
    pageCount: 312,
    language: 'pt',
    description: 'Uma cegueira branca…',
    industryIdentifiers: [
      { type: 'ISBN_10', identifier: '9720046120' },
      { type: 'ISBN_13', identifier: '9789720046123' },
    ],
    imageLinks: { thumbnail: 'http://books.google.com/books/content?id=abc&zoom=1&edge=curl' },
  },
}

const olDoc = {
  key: '/works/OL1W',
  title: 'Ensaio sobre a cegueira',
  author_name: ['José Saramago'],
  publisher: ['Caminho'],
  first_publish_year: 1995,
  isbn: ['9789722110402', '9789720046123'],
  cover_i: 42,
  number_of_pages_median: 310,
}

afterEach(() => vi.unstubAllGlobals())

function stubFetch(routes) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const u = String(url)
      for (const [match, body, status = 200] of routes) {
        if (u.includes(match)) return { ok: status === 200, status, json: async () => body }
      }
      return { ok: false, status: 404, json: async () => ({}) }
    }),
  )
}

describe('mapeamento', () => {
  it('Google Books', () => {
    const b = mapGoogleVolume(googleItem)
    expect(b.isbn13).toBe('9789720046123')
    expect(b.isbn10).toBe('9720046120')
    expect(b.authors).toEqual(['José Saramago'])
    expect(b.cover_url.startsWith('https://')).toBe(true)
    expect(b.cover_url).not.toContain('edge=curl')
  })

  it('Open Library prefere o ISBN pesquisado', () => {
    expect(mapOpenLibraryDoc(olDoc, '9789720046123').isbn13).toBe('9789720046123')
    expect(mapOpenLibraryDoc(olDoc).isbn13).toBe('9789722110402')
    expect(mapOpenLibraryDoc(olDoc).cover_url).toBe('https://covers.openlibrary.org/b/id/42-M.jpg')
  })

  it('junta resultados repetidos e completa campos em falta', () => {
    const g = { ...mapGoogleVolume(googleItem), description: null }
    const o = { ...mapOpenLibraryDoc(olDoc, '9789720046123'), description: 'Da OL' }
    const merged = mergeResults([g], [o])
    expect(merged).toHaveLength(1)
    expect(merged[0].source).toBe('google')
    expect(merged[0].description).toBe('Da OL')
  })
})

describe('pesquisa', () => {
  it('usa a Open Library quando a Google falha', async () => {
    stubFetch([
      ['googleapis.com', {}, 429],
      ['openlibrary.org/search.json', { docs: [olDoc] }],
    ])
    const r = await searchBooks('saramago', 'author')
    expect(r).toHaveLength(1)
    expect(r[0].source).toBe('openlibrary')
    const googleUrl = decodeURIComponent(fetch.mock.calls[0][0])
    expect(googleUrl).toContain('inauthor:"saramago"')
  })

  it('dá erro quando nenhuma fonte responde', async () => {
    stubFetch([])
    await expect(searchBooks('x')).rejects.toThrow(/ligação/)
  })

  it('procura por ISBN na Google e completa com a Open Library', async () => {
    stubFetch([
      ['googleapis.com', { items: [googleItem] }],
      [
        'openlibrary.org/api/books',
        { 'ISBN:9789720046123': { title: 'Ensaio', authors: [{ name: 'José Saramago' }], cover: { medium: 'https://c/m.jpg' } } },
      ],
    ])
    const b = await lookupIsbn('972-0-04612-0')
    expect(b.title).toBe('Ensaio sobre a Cegueira')
    expect(b.isbn13).toBe('9789720046123')
  })

  it('devolve null quando o ISBN não existe', async () => {
    stubFetch([
      ['googleapis.com', { totalItems: 0 }],
      ['openlibrary.org/api/books', {}],
    ])
    expect(await lookupIsbn('9780306406157')).toBeNull()
  })
})
