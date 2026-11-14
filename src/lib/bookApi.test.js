import { afterEach, describe, expect, it, vi } from 'vitest'
import { lookupIsbn, mapGoogleVolume, mapOpenLibraryDoc, mergeResults, rankPortugueseFirst, searchBooks } from './bookApi.js'

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

describe('edições portuguesas', () => {
  it('põe primeiro as edições de Portugal, depois Brasil/pt, depois o resto', () => {
    const books = [
      { title: 'EN', isbn13: '9780306406157', language: 'en' },
      { title: 'BR', isbn13: '9788535914849', language: 'pt' },
      { title: 'ES', isbn13: '9788408000000', language: 'es' },
      { title: 'PT', isbn13: '9789896264612', language: null },
    ]
    expect(rankPortugueseFirst(books).map((b) => b.title)).toEqual(['PT', 'BR', 'EN', 'ES'])
  })

  it('na Open Library escolhe o ISBN português da obra', () => {
    const doc = { ...olDoc, isbn: ['9780306406157', '9788535914849', '9789722110402'] }
    expect(mapOpenLibraryDoc(doc, null, true).isbn13).toBe('9789722110402')
    expect(mapOpenLibraryDoc(doc, null, true).language).toBe('pt')
  })
})

describe('pesquisa', () => {
  it('usa a Open Library quando a Google falha', async () => {
    stubFetch([
      ['googleapis.com', {}, 429],
      ['openlibrary.org/search.json', { docs: [olDoc] }],
    ])
    const { results, warnings } = await searchBooks('saramago', 'author')
    expect(results).toHaveLength(1)
    expect(results[0].source).toBe('openlibrary')
    expect(warnings[0]).toMatch(/Google Books recusou/)
    const googleUrl = decodeURIComponent(fetch.mock.calls[0][0])
    expect(googleUrl).toContain('inauthor:"saramago"')
  })

  it('com ptOnly pede só edições em português às duas fontes', async () => {
    stubFetch([
      ['googleapis.com', { items: [] }],
      ['openlibrary.org/search.json', { docs: [] }],
    ])
    await searchBooks('José Rodrigues dos Santos', 'author', { ptOnly: true })
    const [gUrl, oUrl] = fetch.mock.calls.map((c) => String(c[0]))
    expect(gUrl).toContain('langRestrict=pt')
    expect(oUrl).toContain('language=por')
  })

  it('não filtra a língua numa pesquisa por ISBN', async () => {
    stubFetch([
      ['googleapis.com', { items: [] }],
      ['openlibrary.org/search.json', { docs: [] }],
    ])
    await searchBooks('9789720046123', 'isbn', { ptOnly: true })
    expect(fetch.mock.calls.some((c) => /langRestrict|language=/.test(String(c[0])))).toBe(false)
  })

  it('avisa quando a Google recusa e o ISBN não aparece', async () => {
    stubFetch([
      ['googleapis.com', {}, 429],
      ['openlibrary.org/api/books', {}],
    ])
    await expect(lookupIsbn('9780306406157')).rejects.toThrow(/Google Books recusou/)
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
