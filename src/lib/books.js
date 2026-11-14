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

const SOURCES = ['google', 'bnp', 'openlibrary', 'manual']
const positiveInt = (v) => {
  const n = Number(v)
  return Number.isInteger(n) && n > 0 ? n : null
}

/**
 * Garante que os dados respeitam as regras da base de dados (supabase/schema.sql).
 * As fontes externas trazem por vezes valores inválidos (ex.: 0 páginas).
 */
export function sanitizeRow(row) {
  const out = { ...row }
  if ('title' in out) out.title = String(out.title ?? '').trim().slice(0, 500) || 'Sem título'
  if ('page_count' in out) out.page_count = positiveInt(out.page_count)
  if ('isbn13' in out && out.isbn13 != null && !/^97[89]\d{10}$/.test(out.isbn13)) out.isbn13 = null
  if ('authors' in out) out.authors = (Array.isArray(out.authors) ? out.authors : []).map(String).filter(Boolean)
  if ('cover_url' in out && out.cover_url != null && String(out.cover_url).length >= 400000) out.cover_url = null
  if ('source' in out && !SOURCES.includes(out.source)) out.source = 'manual'
  if ('status' in out && !['want', 'reading', 'read'].includes(out.status)) out.status = 'want'
  if ('rating' in out && out.rating != null) {
    const r = positiveInt(out.rating)
    out.rating = r && r <= 5 ? r : null
  }
  return out
}

/** Traduz erros da base de dados para mensagens compreensíveis. */
function friendlyError(error, fallback) {
  if (error?.code === '23505') return new Error(fallback.duplicate)
  if (error?.code === '23514') {
    const field = error.message?.match(/books_(\w+?)_check/)?.[1]
    return new Error(`Não foi possível guardar: um dos dados do livro não é válido${field ? ` (${field})` : ''}. Corrige-o em "Editar dados" ou tenta novamente.`)
  }
  if (error?.code === '42501') return new Error('Sem permissão para guardar. Termina a sessão e volta a entrar.')
  if (/failed to fetch|network/i.test(error?.message ?? '')) return new Error('Sem ligação à internet. Tenta novamente.')
  return new Error(error?.message || 'Não foi possível guardar.')
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
  const row = sanitizeRow({ ...pick(book, BOOK_FIELDS), ...pick(userData, USER_FIELDS) })
  let { data, error } = await supabase.from('books').insert(row).select().single()
  // Bases de dados criadas antes de existir a fonte "bnp" (ver supabase/schema.sql):
  // guarda como "manual" em vez de falhar.
  if (error?.code === '23514' && /source/.test(error.message ?? '') && row.source === 'bnp') {
    ;({ data, error } = await supabase.from('books').insert({ ...row, source: 'manual' }).select().single())
  }
  if (error) throw friendlyError(error, { duplicate: 'Este livro já está na tua estante.' })
  patchCache((rows) => [data, ...rows])
  return data
}

export async function updateBook(id, changes) {
  const row = sanitizeRow(pick(changes, [...BOOK_FIELDS, ...USER_FIELDS]))
  const { data, error } = await supabase.from('books').update(row).eq('id', id).select().single()
  if (error) throw friendlyError(error, { duplicate: 'Já tens outro livro com este ISBN.' })
  patchCache((rows) => rows.map((b) => (b.id === id ? data : b)))
  return data
}

export async function deleteBook(id) {
  const { error } = await supabase.from('books').delete().eq('id', id)
  if (error) throw error
  patchCache((rows) => rows.filter((b) => b.id !== id))
}
