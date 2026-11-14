// Pesquisa de livros em bases públicas: Google Books (principal) e Open Library (alternativa).
import { cleanIsbn, isbn13to10, toIsbn13 } from './isbn.js'

const GOOGLE_KEY = import.meta.env?.VITE_GOOGLE_BOOKS_KEY || ''
const GOOGLE_URL = 'https://www.googleapis.com/books/v1/volumes'
const OL_URL = 'https://openlibrary.org'

export const SEARCH_MODES = [
  { value: 'all', label: 'Tudo' },
  { value: 'title', label: 'Título' },
  { value: 'author', label: 'Autor' },
  { value: 'isbn', label: 'ISBN' },
  { value: 'publisher', label: 'Editora' },
]

/** Capa por ISBN no Open Library (devolve 404 se não existir, graças a default=false). */
export function openLibraryCoverByIsbn(isbn13) {
  return isbn13 ? `https://covers.openlibrary.org/b/isbn/${isbn13}-M.jpg?default=false` : null
}

function httpsUrl(url) {
  if (!url) return null
  return url.replace(/^http:\/\//, 'https://').replace('&edge=curl', '')
}

// ---------- Google Books ----------

export function mapGoogleVolume(item) {
  const v = item?.volumeInfo ?? {}
  const ids = v.industryIdentifiers ?? []
  const raw13 = ids.find((i) => i.type === 'ISBN_13')?.identifier
  const raw10 = ids.find((i) => i.type === 'ISBN_10')?.identifier
  const isbn13 = toIsbn13(raw13) ?? toIsbn13(raw10)
  const img = v.imageLinks ?? {}
  return {
    source: 'google',
    source_id: item.id,
    isbn13,
    isbn10: raw10 ? cleanIsbn(raw10) : isbn13 ? isbn13to10(isbn13) : null,
    title: v.title ?? 'Sem título',
    subtitle: v.subtitle ?? null,
    authors: v.authors ?? [],
    publisher: v.publisher ?? null,
    published_date: v.publishedDate ?? null,
    page_count: v.pageCount ?? null,
    language: v.language ?? null,
    description: v.description ?? null,
    cover_url: httpsUrl(img.thumbnail || img.smallThumbnail) ?? openLibraryCoverByIsbn(isbn13),
  }
}

function googleQuery(mode, text) {
  const t = text.trim().replace(/"/g, '')
  switch (mode) {
    case 'isbn':
      return `isbn:${cleanIsbn(t)}`
    case 'title':
      return `intitle:"${t}"`
    case 'author':
      return `inauthor:"${t}"`
    case 'publisher':
      return `inpublisher:"${t}"`
    default:
      return t
  }
}

async function searchGoogle(mode, text, signal) {
  const params = new URLSearchParams({
    q: googleQuery(mode, text),
    maxResults: '30',
    printType: 'books',
  })
  if (GOOGLE_KEY) params.set('key', GOOGLE_KEY)
  const res = await fetch(`${GOOGLE_URL}?${params}`, { signal })
  if (!res.ok) throw new Error(`Google Books respondeu ${res.status}`)
  const data = await res.json()
  return (data.items ?? []).map(mapGoogleVolume)
}

// ---------- Open Library ----------

export function mapOpenLibraryDoc(doc, preferredIsbn = null) {
  const isbns = (doc.isbn ?? []).map(cleanIsbn)
  const isbn13 =
    (preferredIsbn && isbns.map(toIsbn13).includes(preferredIsbn) ? preferredIsbn : null) ??
    isbns.map(toIsbn13).find(Boolean) ??
    null
  return {
    source: 'openlibrary',
    source_id: doc.key ?? null,
    isbn13,
    isbn10: isbn13 ? isbn13to10(isbn13) : null,
    title: doc.title ?? 'Sem título',
    subtitle: doc.subtitle ?? null,
    authors: doc.author_name ?? [],
    publisher: doc.publisher?.[0] ?? null,
    published_date: doc.first_publish_year ? String(doc.first_publish_year) : null,
    page_count: doc.number_of_pages_median ?? null,
    language: doc.language?.[0] ?? null,
    description: null,
    cover_url: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : openLibraryCoverByIsbn(isbn13),
  }
}

async function searchOpenLibrary(mode, text, signal) {
  const key = { title: 'title', author: 'author', publisher: 'publisher', isbn: 'isbn' }[mode] ?? 'q'
  const params = new URLSearchParams({
    [key]: mode === 'isbn' ? cleanIsbn(text) : text.trim(),
    limit: '30',
    fields:
      'key,title,subtitle,author_name,publisher,first_publish_year,isbn,cover_i,number_of_pages_median,language',
  })
  const res = await fetch(`${OL_URL}/search.json?${params}`, { signal })
  if (!res.ok) throw new Error(`Open Library respondeu ${res.status}`)
  const data = await res.json()
  const preferred = mode === 'isbn' ? toIsbn13(text) : null
  return (data.docs ?? []).map((d) => mapOpenLibraryDoc(d, preferred))
}

export function mapOpenLibraryEdition(isbn13, data) {
  if (!data) return null
  return {
    source: 'openlibrary',
    source_id: data.key ?? null,
    isbn13,
    isbn10: isbn13to10(isbn13),
    title: data.title ?? 'Sem título',
    subtitle: data.subtitle ?? null,
    authors: (data.authors ?? []).map((a) => a.name),
    publisher: data.publishers?.[0]?.name ?? null,
    published_date: data.publish_date ?? null,
    page_count: data.number_of_pages ?? null,
    language: null,
    description: typeof data.notes === 'string' ? data.notes : null,
    cover_url: data.cover?.medium ?? data.cover?.large ?? openLibraryCoverByIsbn(isbn13),
  }
}

async function lookupOpenLibraryIsbn(isbn13, signal) {
  const params = new URLSearchParams({ bibkeys: `ISBN:${isbn13}`, format: 'json', jscmd: 'data' })
  const res = await fetch(`${OL_URL}/api/books?${params}`, { signal })
  if (!res.ok) throw new Error(`Open Library respondeu ${res.status}`)
  const data = await res.json()
  return mapOpenLibraryEdition(isbn13, data[`ISBN:${isbn13}`])
}

// ---------- API pública ----------

function dedupeKey(b) {
  if (b.isbn13) return `isbn:${b.isbn13}`
  return `t:${b.title.toLowerCase().trim()}|${(b.authors[0] ?? '').toLowerCase().trim()}`
}

/** Junta resultados, mantendo a ordem e completando campos em falta com a segunda fonte. */
export function mergeResults(primary, secondary) {
  const map = new Map()
  for (const b of [...primary, ...secondary]) {
    const k = dedupeKey(b)
    const existing = map.get(k)
    if (!existing) {
      map.set(k, { ...b })
    } else {
      for (const [field, value] of Object.entries(b)) {
        const cur = existing[field]
        const empty = cur == null || (Array.isArray(cur) && cur.length === 0)
        if (empty && value != null) existing[field] = value
      }
    }
  }
  return [...map.values()]
}

/**
 * Pesquisa livros. Consulta as duas fontes em paralelo e junta os resultados
 * (Google Books primeiro). Se uma fonte falhar, usa a outra.
 */
export async function searchBooks(text, mode = 'all', { signal } = {}) {
  if (!text?.trim()) return []
  const [g, o] = await Promise.allSettled([
    searchGoogle(mode, text, signal),
    searchOpenLibrary(mode, text, signal),
  ])
  if (g.status === 'rejected' && o.status === 'rejected') {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    throw new Error('Não foi possível contactar as bases de livros. Verifica a ligação à internet.')
  }
  return mergeResults(
    g.status === 'fulfilled' ? g.value : [],
    o.status === 'fulfilled' ? o.value : [],
  )
}

/** Procura um livro pelo ISBN. Devolve o livro ou null. */
export async function lookupIsbn(value, { signal } = {}) {
  const isbn13 = toIsbn13(value)
  if (!isbn13) throw new Error('ISBN inválido.')
  const [g, o] = await Promise.allSettled([
    searchGoogle('isbn', isbn13, signal),
    lookupOpenLibraryIsbn(isbn13, signal),
  ])
  const google = g.status === 'fulfilled' ? g.value.filter((b) => b.isbn13 === isbn13) : []
  const ol = o.status === 'fulfilled' && o.value ? [o.value] : []
  if (g.status === 'rejected' && o.status === 'rejected') {
    throw new Error('Não foi possível contactar as bases de livros. Verifica a ligação à internet.')
  }
  const merged = mergeResults(google.slice(0, 1), ol)
  return merged[0] ?? null
}
