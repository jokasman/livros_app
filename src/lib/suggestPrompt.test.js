import { describe, expect, it } from 'vitest'
import { aiLinks, buildSuggestionPrompt, describeBook } from './suggestPrompt.js'

const books = [
  {
    title: 'A Fórmula de Deus', subtitle: null, authors: ['José Rodrigues dos Santos'], publisher: 'Gradiva',
    published_date: '2006-03-01', isbn13: '9789896164073', page_count: 568, status: 'read', rating: 5,
    finished_at: '2026-01-10', notes: 'Adorei a mistura\nde ciência e mistério.',
  },
  { title: 'Livro chato', authors: ['Autor X'], status: 'read', rating: 1, finished_at: '2026-02-01' },
  { title: 'Sem estrelas', authors: [], status: 'read', rating: null },
  { title: 'Memorial do Convento', authors: ['José Saramago'], publisher: 'Caminho', status: 'reading', started_at: '2026-11-01' },
  { title: 'O Principezinho', subtitle: 'edição ilustrada', authors: ['Antoine de Saint-Exupéry'], status: 'want' },
]

describe('pedido de sugestões', () => {
  it('descreve cada livro com todos os dados', () => {
    const d = describeBook(books[0])
    expect(d).toContain('- "A Fórmula de Deus"')
    expect(d).toContain('Autor(es): José Rodrigues dos Santos')
    expect(d).toContain('Edição: Gradiva, 2006')
    expect(d).toContain('ISBN: 978-9896164073')
    expect(d).toContain('Páginas: 568')
    expect(d).toContain('A minha avaliação: 5/5')
    expect(d).toContain('Lido em: 01/2026')
    expect(d).toContain('As minhas notas: "Adorei a mistura de ciência e mistério."')
    expect(describeBook(books[4])).toContain('"O Principezinho: edição ilustrada"')
    expect(describeBook(books[2])).toContain('sem avaliação')
    expect(describeBook(books[2])).toContain('Autor(es): desconhecido')
    expect(describeBook(books[3])).toContain('A ler desde: 11/2026')
  })

  it('organiza por estado, com os mais bem avaliados primeiro e um resumo das avaliações', () => {
    const p = buildSuggestionPrompt(books)
    expect(p).toContain('## Livros que já li (3; avaliações — 5/5: 1, 4/5: 0, 3/5: 0, 2/5: 0, 1/5: 1)')
    expect(p.indexOf('A Fórmula de Deus')).toBeLessThan(p.indexOf('Livro chato'))
    expect(p).toContain('## Estou a ler (1)')
    expect(p).toContain('## Já tenho na lista "quero ler" (1)')
    expect(p).toContain('português de Portugal')
  })

  it('permite excluir notas e a lista "quero ler", e acrescentar um desejo', () => {
    const p = buildSuggestionPrompt(books, { includeWant: false, includeNotes: false, wish: 'algo leve para férias' })
    expect(p).not.toContain('O Principezinho')
    expect(p).not.toContain('As minhas notas')
    expect(p).toContain('## O que me apetece agora\nalgo leve para férias')
  })

  it('inclui estantes grandes por inteiro', () => {
    const many = Array.from({ length: 400 }, (_, i) => ({ title: `Livro ${i}`, authors: ['A'], status: 'read', rating: 3 }))
    const p = buildSuggestionPrompt(many)
    expect(p.match(/^- "Livro/gm)).toHaveLength(400)
    expect(p).not.toContain('não couberam')
  })

  it('gera links para o Claude e o ChatGPT', () => {
    const l = aiLinks('olá mundo')
    expect(l.claude).toBe('https://claude.ai/new?q=ol%C3%A1%20mundo')
    expect(l.chatgpt).toBe('https://chatgpt.com/?q=ol%C3%A1%20mundo')
  })
})
