// Biblioteca Nacional de Portugal (PORBASE): pesquisa por ISBN.
// Serviço público: https://urn.porbase.org/isbn/unimarc/marcxchange?id=<ISBN>
// Devolve registos UNIMARC em XML (MARCXchange). Não tem capas.
//
// O browser tenta primeiro o pedido direto. Se a BNP não permitir pedidos de
// outros sites (CORS), usa a função "porbase" do Supabase como intermediária
// (ver supabase/functions/porbase), se estiver instalada.
import { cleanIsbn, isbn13to10, toIsbn13 } from './isbn.js'

const PORBASE_URL = 'https://urn.porbase.org/isbn/unimarc/marcxchange'
const TIMEOUT_MS = 9000
const DIRECT_FAIL_KEY = 'livros:porbase-direct-fails'

export class PorbaseError extends Error {
  constructor(message, status = null) {
    super(message)
    this.source = 'Biblioteca Nacional'
    this.status = status
  }
}

// ---------- Leitura do XML (sem DOMParser, para funcionar também nos testes) ----------

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

/** Divide o XML em registos; cada registo é uma lista de { tag, sub: [[code, value], …] }. */
export function parseMarcXml(xml) {
  const records = []
  const recordRe = /<(?:[\w-]+:)?record\b[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?record>/g
  const fieldRe = /<(?:[\w-]+:)?datafield\b([^>]*)>([\s\S]*?)<\/(?:[\w-]+:)?datafield>/g
  const subRe = /<(?:[\w-]+:)?subfield\b[^>]*\bcode\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/(?:[\w-]+:)?subfield>/g
  let rm
  while ((rm = recordRe.exec(xml))) {
    const fields = []
    let fm
    fieldRe.lastIndex = 0
    while ((fm = fieldRe.exec(rm[1]))) {
      const tag = fm[1].match(/\btag\s*=\s*["'](\d{3})["']/)?.[1]
      if (!tag) continue
      const sub = []
      let sm
      subRe.lastIndex = 0
      while ((sm = subRe.exec(fm[2]))) sub.push([sm[1], decodeEntities(sm[2]).trim()])
      fields.push({ tag, sub })
    }
    if (fields.length) records.push(fields)
  }
  return records
}

// ---------- Conversão UNIMARC → livro ----------

/** Remove marcas de "não ordenar" (ex.: <<O>> principezinho) e pontuação ISBD final. */
export function cleanText(s) {
  if (!s) return null
  const out = s
    .replace(/[\u0088\u0089\u0098\u009c]/g, '')
    .replace(/<<|>>/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[\s/:;,=.]+$/, '')
    .replace(/^\[(.*)\]$/, '$1')
    .trim()
  return out || null
}

const first = (fields, tag, code) => {
  for (const f of fields) {
    if (f.tag !== tag) continue
    const v = f.sub.find(([c]) => c === code)?.[1]
    if (v) return v
  }
  return null
}

const all = (fields, tag, code) =>
  fields.filter((f) => f.tag === tag).flatMap((f) => f.sub.filter(([c]) => c === code).map(([, v]) => v))

function personName(field) {
  const get = (c) => field.sub.find(([k]) => k === c)?.[1]
  const surname = cleanText(get('a'))
  const forename = cleanText(get('b'))
  if (!surname) return null
  return forename ? `${forename} ${surname}` : surname
}

const relators = (field) => field.sub.filter(([c]) => c === '4').map(([, v]) => v)

/** Autores: 700/701 (responsabilidade principal); 702 só se for autor (070). Senão, 710/711. */
function authorsOf(fields) {
  const names = []
  for (const f of fields) {
    const isMain = f.tag === '700' || f.tag === '701'
    const isSecondaryAuthor = f.tag === '702' && relators(f).includes('070')
    if (isMain || isSecondaryAuthor) {
      const n = personName(f)
      if (n && !names.includes(n)) names.push(n)
    }
  }
  if (names.length) return names
  for (const f of fields) {
    if (f.tag === '710' || f.tag === '711') {
      const n = cleanText(f.sub.find(([c]) => c === 'a')?.[1])
      if (n && !names.includes(n)) names.push(n)
    }
  }
  if (names.length) return names
  // Último recurso: a menção de responsabilidade do título (200 $f), ex.: "texto de Ana Silva".
  const resp = cleanText(first(fields, '200', 'f'))
  return resp ? [resp.replace(/^(texto|textos|de|por|escrito por|adapt\.?|adaptação)\s+(de\s+)?/i, '')] : []
}

export function mapPorbaseRecord(fields, wantedIsbn13 = null) {
  const title = cleanText(first(fields, '200', 'a'))
  if (!title) return null

  const isbns = all(fields, '010', 'a').map((v) => toIsbn13(cleanIsbn(v))).filter(Boolean)
  const isbn13 = wantedIsbn13 && isbns.includes(wantedIsbn13) ? wantedIsbn13 : isbns[0] ?? wantedIsbn13 ?? null

  // Publicação: 210 (UNIMARC clássico) ou 214 (registos mais recentes).
  const publisher = cleanText(first(fields, '210', 'c') ?? first(fields, '214', 'c'))
  const date = first(fields, '210', 'd') ?? first(fields, '214', 'd')
  const year = date?.match(/\d{4}/)?.[0] ?? null
  const extent = first(fields, '215', 'a')
  const pages = extent?.match(/(\d+)\s*(?:p\b|pág|páginas|f\b)/i)?.[1] ?? null

  const subtitleParts = all(fields, '200', 'e').map(cleanText).filter(Boolean)
  const summary = cleanText(first(fields, '330', 'a'))

  return {
    source: 'bnp',
    source_id: null,
    isbn13,
    isbn10: isbn13 ? isbn13to10(isbn13) : null,
    title,
    subtitle: subtitleParts.length ? subtitleParts.join(' : ') : null,
    authors: authorsOf(fields),
    publisher,
    published_date: year,
    page_count: pages ? Number(pages) : null,
    language: first(fields, '101', 'a') === 'por' ? 'pt' : first(fields, '101', 'a'),
    description: summary ? `${summary}.` : null,
    cover_url: null,
  }
}

/** Converte a resposta XML no melhor livro (ou null se não houver registo). */
export function parsePorbaseResponse(xml, wantedIsbn13 = null) {
  const books = parseMarcXml(xml)
    .map((r) => mapPorbaseRecord(r, wantedIsbn13))
    .filter(Boolean)
  return books.find((b) => b.isbn13 === wantedIsbn13) ?? books[0] ?? null
}

// ---------- Pedidos ----------

function withTimeout(signal) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(new PorbaseError('A Biblioteca Nacional demorou demasiado a responder.')), TIMEOUT_MS)
  const onAbort = () => ctrl.abort(signal.reason)
  signal?.addEventListener('abort', onAbort, { once: true })
  return {
    signal: ctrl.signal,
    done: () => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    },
  }
}

function directFailed() {
  try {
    return sessionStorage.getItem(DIRECT_FAIL_KEY) === '1'
  } catch {
    return false
  }
}

function markDirectFailed() {
  try {
    sessionStorage.setItem(DIRECT_FAIL_KEY, '1')
  } catch {
    /* ignora */
  }
}

async function fetchDirect(isbn, signal) {
  const res = await fetch(`${PORBASE_URL}?id=${isbn}`, { signal })
  if (res.status === 404) return ''
  if (!res.ok) throw new PorbaseError(`A Biblioteca Nacional respondeu ${res.status}.`, res.status)
  return res.text()
}

async function fetchViaProxy(isbn, signal) {
  const { supabase } = await import('./supabase.js')
  if (!supabase) throw new PorbaseError('Sem intermediário configurado.')
  const { data: { session } = {} } = await supabase.auth.getSession()
  const base = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(`${base}/functions/v1/porbase?isbn=${isbn}`, {
    signal,
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  })
  if (res.status === 404 && !(res.headers.get('content-type') ?? '').includes('xml')) {
    throw new PorbaseError('A função "porbase" do Supabase não está instalada.', 404)
  }
  if (!res.ok) throw new PorbaseError(`O intermediário da Biblioteca Nacional respondeu ${res.status}.`, res.status)
  return res.text()
}

async function fetchRecord(isbn, signal) {
  if (!directFailed()) {
    try {
      return await fetchDirect(isbn, signal)
    } catch (e) {
      if (signal?.aborted || e instanceof PorbaseError) throw e
      // TypeError: bloqueado pelo browser (CORS) ou sem rede. Tenta o intermediário.
      markDirectFailed()
    }
  }
  return fetchViaProxy(isbn, signal)
}

/**
 * Procura um ISBN na Biblioteca Nacional. Devolve o livro ou null.
 * Livros antigos estão registados com ISBN-10, por isso tenta os dois formatos.
 */
export async function lookupPorbase(isbn13, { signal } = {}) {
  const t = withTimeout(signal)
  try {
    const xml = await fetchRecord(isbn13, t.signal)
    let book = parsePorbaseResponse(xml, isbn13)
    const isbn10 = isbn13to10(isbn13)
    if (!book && isbn10) {
      book = parsePorbaseResponse(await fetchRecord(isbn10, t.signal), isbn13)
    }
    return book ? { ...book, isbn13, isbn10: isbn10 ?? book.isbn10 } : null
  } catch (e) {
    if (t.signal.reason instanceof PorbaseError && !signal?.aborted) throw t.signal.reason
    if (e instanceof PorbaseError || e?.name === 'AbortError') throw e
    throw new PorbaseError('Não foi possível contactar a Biblioteca Nacional.')
  } finally {
    t.done()
  }
}
