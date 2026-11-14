// Monta o pedido de sugestões de leitura para colar numa IA (Claude, ChatGPT, …).

const MAX_BOOKS = 150

function line(b) {
  const authors = b.authors?.length ? ` — ${b.authors.join(', ')}` : ''
  const stars = b.rating ? ` (${'★'.repeat(b.rating)}${'☆'.repeat(5 - b.rating)})` : ''
  return `- ${b.title}${authors}${stars}`
}

function byRatingThenRecent(a, b) {
  return (b.rating ?? 0) - (a.rating ?? 0) || (b.finished_at ?? b.updated_at ?? '').localeCompare(a.finished_at ?? a.updated_at ?? '')
}

/**
 * @param {Array} books livros da estante
 * @param {{ wish?: string, includeWant?: boolean, count?: number }} options
 */
export function buildSuggestionPrompt(books, { wish = '', includeWant = true, count = 10 } = {}) {
  const read = books.filter((b) => b.status === 'read').sort(byRatingThenRecent)
  const reading = books.filter((b) => b.status === 'reading')
  const want = books.filter((b) => b.status === 'want')

  // Limita o tamanho: primeiro os lidos (mais bem avaliados), depois a ler, depois quero ler.
  let budget = MAX_BOOKS
  const take = (list) => {
    const out = list.slice(0, Math.max(0, budget))
    budget -= out.length
    return out
  }
  const readShown = take(read)
  const readingShown = take(reading)
  const wantShown = includeWant ? take(want) : []
  const omitted = read.length + reading.length + (includeWant ? want.length : 0) - readShown.length - readingShown.length - wantShown.length

  const parts = [
    `Sou leitor(a) em Portugal e quero sugestões de leitura com base nos livros que já li e nas minhas avaliações (1 a 5 estrelas).`,
    '',
  ]

  if (readShown.length) {
    parts.push('Livros que já li:', ...readShown.map(line), '')
  }
  if (readingShown.length) {
    parts.push('Estou a ler:', ...readingShown.map(line), '')
  }
  if (wantShown.length) {
    parts.push('Já tenho na lista "quero ler" (não sugiras estes):', ...wantShown.map(line), '')
  }
  if (omitted > 0) {
    parts.push(`(Há mais ${omitted} livros na minha estante que não incluí para o texto não ficar demasiado longo.)`, '')
  }
  if (wish.trim()) {
    parts.push(`O que me apetece agora: ${wish.trim()}`, '')
  }

  parts.push(
    `Sugere-me ${count} livros que ainda não estejam nas listas acima. Por favor:`,
    '- dá mais peso aos livros com 4 e 5 estrelas e evita o estilo dos que avaliei com 1 ou 2;',
    '- prefere livros com edição em português, de preferência publicados em Portugal;',
    '- inclui uma ou duas sugestões um pouco diferentes do habitual, para descobrir coisas novas;',
    '- não inventes livros: sugere apenas livros que tenhas a certeza de que existem.',
    '',
    'Para cada sugestão indica: título (em português), autor, editora portuguesa se souberes, e uma frase a explicar porque achas que vou gostar, ligada aos livros que li.',
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
