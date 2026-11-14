// Monta o pedido de sugestões de leitura para colar numa IA (Claude, ChatGPT, …).
// Cada livro leva todos os dados conhecidos (título completo, autores, editora,
// ano, ISBN, avaliação, datas e, opcionalmente, notas), para a IA não confundir
// obras ou edições.
import { formatIsbn } from './isbn.js'

// Limite de segurança para estantes enormes (o texto continua utilizável ao copiar/partilhar).
const MAX_BOOKS = 1000

function year(date) {
  return date?.match(/\d{4}/)?.[0] ?? null
}

function monthYear(date) {
  if (!date) return null
  const [y, m] = date.split('-')
  return m ? `${m}/${y}` : y
}

function oneLine(text) {
  return text.replace(/\s+/g, ' ').trim()
}

/** Uma entrada completa por livro, em linhas "campo: valor". */
export function describeBook(b, { includeNotes = true } = {}) {
  const title = b.subtitle ? `${b.title}: ${b.subtitle}` : b.title
  const details = []
  details.push(`Autor(es): ${b.authors?.length ? b.authors.join('; ') : 'desconhecido'}`)
  const edition = [b.publisher, year(b.published_date)].filter(Boolean).join(', ')
  if (edition) details.push(`Edição: ${edition}`)
  if (b.isbn13) details.push(`ISBN: ${formatIsbn(b.isbn13)}`)
  if (b.page_count) details.push(`Páginas: ${b.page_count}`)

  if (b.status === 'read') {
    details.push(b.rating ? `A minha avaliação: ${b.rating}/5` : 'A minha avaliação: sem avaliação')
    const when = monthYear(b.finished_at)
    if (when) details.push(`Lido em: ${when}`)
  } else if (b.status === 'reading') {
    const since = monthYear(b.started_at)
    if (since) details.push(`A ler desde: ${since}`)
  }

  if (includeNotes && b.notes?.trim()) details.push(`As minhas notas: "${oneLine(b.notes)}"`)

  return [`- "${title}"`, ...details.map((d) => `  ${d}`)].join('\n')
}

function byRatingThenRecent(a, b) {
  return (
    (b.rating ?? 0) - (a.rating ?? 0) ||
    (b.finished_at ?? b.updated_at ?? '').localeCompare(a.finished_at ?? a.updated_at ?? '')
  )
}

/**
 * @param {Array} books livros da estante
 * @param {{ wish?: string, includeWant?: boolean, includeNotes?: boolean, count?: number }} options
 */
export function buildSuggestionPrompt(
  books,
  { wish = '', includeWant = true, includeNotes = true, count = 10 } = {},
) {
  const read = books.filter((b) => b.status === 'read').sort(byRatingThenRecent)
  const reading = books.filter((b) => b.status === 'reading')
  const want = books.filter((b) => b.status === 'want')

  let budget = MAX_BOOKS
  const take = (list) => {
    const out = list.slice(0, Math.max(0, budget))
    budget -= out.length
    return out
  }
  const readShown = take(read)
  const readingShown = take(reading)
  const wantShown = includeWant ? take(want) : []
  const total = read.length + reading.length + (includeWant ? want.length : 0)
  const omitted = total - readShown.length - readingShown.length - wantShown.length
  const describe = (b) => describeBook(b, { includeNotes })

  const ratingCounts = [5, 4, 3, 2, 1].map((n) => `${n}/5: ${read.filter((b) => b.rating === n).length}`).join(', ')

  const parts = [
    'Sou leitor(a) em Portugal e quero sugestões de leitura personalizadas.',
    'Abaixo está a minha estante completa, com os dados de cada livro tal como estão registados (título, autores, edição, ISBN) e a minha avaliação de 1 a 5 (5 = adorei, 1 = não gostei).',
    'Usa o ISBN e a edição para identificares exatamente cada livro.',
    '',
  ]

  if (readShown.length) {
    parts.push(`## Livros que já li (${read.length}; avaliações — ${ratingCounts})`, ...readShown.map(describe), '')
  }
  if (readingShown.length) {
    parts.push(`## Estou a ler (${reading.length})`, ...readingShown.map(describe), '')
  }
  if (wantShown.length) {
    parts.push(`## Já tenho na lista "quero ler" (${want.length}) — não sugiras estes`, ...wantShown.map(describe), '')
  }
  if (omitted > 0) {
    parts.push(`(A estante tem mais ${omitted} livros que não couberam neste texto.)`, '')
  }
  if (wish.trim()) {
    parts.push('## O que me apetece agora', wish.trim(), '')
  }

  parts.push(
    '## O que peço',
    `Sugere-me ${count} livros que não estejam em nenhuma das listas acima (nem outras edições ou traduções dos mesmos livros). Por favor:`,
    '- dá mais peso aos livros com 4/5 e 5/5 e evita o estilo, temas ou autores dos que avaliei com 1/5 ou 2/5;',
    '- tem em conta as minhas notas, quando existirem;',
    '- prefere livros com edição em português, de preferência publicados em Portugal;',
    '- inclui uma ou duas sugestões um pouco diferentes do habitual, para descobrir coisas novas;',
    '- não inventes livros, títulos, autores nem ISBN: se não tiveres a certeza de um dado, omite-o.',
    '',
    'Para cada sugestão indica: título (da edição portuguesa, se existir), autor, editora portuguesa e ISBN apenas se tiveres a certeza, e uma ou duas frases a explicar porque achas que vou gostar, referindo os livros da minha estante em que te baseaste.',
    'Escreve a resposta em português de Portugal.',
  )

  return parts.join('\n')
}

/** Links para abrir o pedido diretamente nas apps/sites (o texto vai no URL). */
export function aiLinks(prompt) {
  const q = encodeURIComponent(prompt)
  return {
    claude: `https://claude.ai/new?q=${q}`,
    chatgpt: `https://chatgpt.com/?q=${q}`,
  }
}
