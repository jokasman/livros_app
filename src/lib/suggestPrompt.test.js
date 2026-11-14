import { describe, expect, it } from 'vitest'
import { aiLinks, buildSuggestionPrompt } from './suggestPrompt.js'

const books = [
  { title: 'A Fórmula de Deus', authors: ['José Rodrigues dos Santos'], status: 'read', rating: 5, finished_at: '2026-01-10' },
  { title: 'Livro chato', authors: ['Autor X'], status: 'read', rating: 1, finished_at: '2026-02-01' },
  { title: 'Memorial do Convento', authors: ['José Saramago'], status: 'reading' },
  { title: 'O Principezinho', authors: ['Antoine de Saint-Exupéry'], status: 'want' },
]

describe('pedido de sugestões', () => {
  it('lista os livros por estado, com estrelas, e os mais bem avaliados primeiro', () => {
    const p = buildSuggestionPrompt(books)
    expect(p).toContain('- A Fórmula de Deus — José Rodrigues dos Santos (★★★★★)')
    expect(p).toContain('- Livro chato — Autor X (★☆☆☆☆)')
    expect(p.indexOf('A Fórmula de Deus')).toBeLessThan(p.indexOf('Livro chato'))
    expect(p).toContain('Estou a ler:\n- Memorial do Convento')
    expect(p).toContain('O Principezinho')
    expect(p).toContain('português de Portugal')
  })

  it('permite excluir a lista "quero ler" e acrescentar um desejo', () => {
    const p = buildSuggestionPrompt(books, { includeWant: false, wish: 'algo leve para férias' })
    expect(p).not.toContain('O Principezinho')
    expect(p).toContain('O que me apetece agora: algo leve para férias')
  })

  it('limita o número de livros incluídos', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ title: `Livro ${i}`, authors: [], status: 'read', rating: 3 }))
    const p = buildSuggestionPrompt(many)
    expect(p.match(/^- Livro/gm)).toHaveLength(150)
    expect(p).toContain('Há mais 50 livros')
  })

  it('gera links para o Claude e o ChatGPT', () => {
    const l = aiLinks('olá mundo')
    expect(l.claude).toBe('https://claude.ai/new?q=ol%C3%A1%20mundo')
    expect(l.chatgpt).toBe('https://chatgpt.com/?q=ol%C3%A1%20mundo')
  })
})
