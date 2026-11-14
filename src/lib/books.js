// Acesso à tabela "books" no Supabase. A privacidade é garantida pela
// Row Level Security (ver supabase/schema.sql): cada pessoa só vê as suas linhas.
import { supabase } from './supabase.js'

export const STATUSES = [
  { value: 'want', label: 'Quero ler', short: 'Quero ler' },
  { value: 'reading', label: 'A ler', short: 'A ler' },
  { value: 'read', label: 'Lido', short: 'Lido' },
]

export const statusLabel = (s) => STATUSES.find((x) => x.value === s)?.label ?? s

const CACHE_KEY = 'livros:shelf-cache'

const BOOK_FIELDS = [
  'isbn13',
  'isbn10',
  'title',
  'subtitle',
  'authors',
  'publisher',
  'published_date',
  'page_count',
  'language',
  'description',
  'cover_url',
  'source',
  'source_id',
]

const USER_FIELDS = ['status', 'rating', 'started_at', 'finished_at', 'notes']

function pick(obj, keys) {
  const out = {}
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k] === '' ? null : obj[k]
  return out
}

function readCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
  } catch {
    return null
  }
}

function writeCache(rows) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows))
  } catch {
    /* sem espaço ou modo privado: ignora */
  }
}

export function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch {
    /* ignora */
  }
}

/** Mantém a cópia local alinhada depois de adicionar/alterar/remover. */
function patchCache(fn) {
  const cached = readCache()
  if (cached) writeCache(fn(cached))
}

export function cachedShelf() {
  return readCache() ?? []
}

/** Lista todos os livros do utilizador. Em caso de falha de rede devolve a cópia local. */
export async function listBooks() {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order('updated_at', { ascending: false })
  if (error) {
    const cached = readCache()
    if (cached) return { books: cached, offline: true }
    throw error
  }
  writeCache(data)
  return { books: data, offline: false }
}

export async function getBook(id) {
  const { data, error } = await supabase.from('books').select('*').eq('id', id).maybeSingle()
  if (error) {
    const cached = readCache()?.find((b) => b.id === id)
    if (cached) return cached
    throw error
  }
  return data
}

export async function findByIsbn(isbn13) {
  if (!isbn13) return null
  const { data, error } = await supabase
    .from('books')
    .select('id,status')
    .eq('isbn13', isbn13)
    .maybeSingle()
  if (error) return null
  return data
}

export async function addBook(book, userData) {
  const row = { ...pick(book, BOOK_FIELDS), ...pick(userData, USER_FIELDS) }
  const { data, error } = await supabase.from('books').insert(row).select().single()
  if (error) {
    if (error.code === '23505') throw new Error('Este livro já está na tua estante.')
    throw error
  }
  patchCache((rows) => [data, ...rows])
  return data
}

export async function updateBook(id, changes) {
  const row = pick(changes, [...BOOK_FIELDS, ...USER_FIELDS])
  const { data, error } = await supabase.from('books').update(row).eq('id', id).select().single()
  if (error) {
    if (error.code === '23505') throw new Error('Já tens outro livro com este ISBN.')
    throw error
  }
  patchCache((rows) => rows.map((b) => (b.id === id ? data : b)))
  return data
}

export async function deleteBook(id) {
  const { error } = await supabase.from('books').delete().eq('id', id)
  if (error) throw error
  patchCache((rows) => rows.filter((b) => b.id !== id))
}
