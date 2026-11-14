import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/Layout.jsx'
import { cachedShelf, listBooks } from '../lib/books.js'
import { aiLinks, buildSuggestionPrompt } from '../lib/suggestPrompt.js'

// Os browsers cortam URLs muito longos; acima disto usamos só copiar/partilhar.
const MAX_URL_PROMPT = 6000

export default function Suggestions() {
  const [books, setBooks] = useState(() => cachedShelf())
  const [wish, setWish] = useState('')
  const [includeWant, setIncludeWant] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    listBooks()
      .then(({ books }) => setBooks(books))
      .catch(() => {})
  }, [])

  const prompt = useMemo(() => buildSuggestionPrompt(books, { wish, includeWant }), [books, wish, includeWant])
  const links = aiLinks(prompt)
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function'
  const tooLongForUrl = prompt.length > MAX_URL_PROMPT
  const readCount = books.filter((b) => b.status === 'read').length

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setMessage('Texto copiado. Abre a app de IA e cola-o numa conversa nova.')
      return true
    } catch {
      setMessage('Não foi possível copiar automaticamente. Seleciona o texto abaixo e copia-o.')
      return false
    }
  }

  const share = async () => {
    setMessage('')
    try {
      await navigator.share({ text: prompt })
    } catch (e) {
      if (e?.name !== 'AbortError') copy()
    }
  }

  if (readCount === 0) {
    return (
      <div className="page">
        <PageHeader title="Sugestões" back />
        <div className="empty">
          <p>Para receberes sugestões, marca primeiro alguns livros como <strong>Lido</strong> e dá-lhes estrelas.</p>
          <Link className="btn" to="/ler">
            Ler ISBN
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <PageHeader title="Sugestões de leitura" back />
      <div className="stack">
        <p className="muted small">
          A app prepara um pedido com os teus livros e avaliações para enviares a uma IA (Claude, ChatGPT…). Nada é
          enviado sem escolheres a app.
        </p>

        <section className="card stack">
          <label className="field">
            <span className="label">O que te apetece agora? (opcional)</span>
            <input
              value={wish}
              placeholder="Ex.: algo leve para férias, um policial, livros para a minha filha de 7 anos"
              onChange={(e) => setWish(e.target.value)}
            />
          </label>
          <label className="toggle">
            <input type="checkbox" checked={includeWant} onChange={(e) => setIncludeWant(e.target.checked)} />
            <span>Incluir a lista "Quero ler" (para não repetir)</span>
          </label>
        </section>

        <div className="stack">
          {canShare && (
            <button type="button" className="btn btn-block" onClick={share}>
              Partilhar com uma app de IA
            </button>
          )}
          {!tooLongForUrl && (
            <div className="button-row">
              <a className="btn btn-secondary" href={links.claude} target="_blank" rel="noopener noreferrer">
                Abrir no Claude
              </a>
              <a className="btn btn-secondary" href={links.chatgpt} target="_blank" rel="noopener noreferrer">
                Abrir no ChatGPT
              </a>
            </div>
          )}
          <button type="button" className={`btn btn-block ${canShare ? 'btn-secondary' : ''}`} onClick={copy}>
            Copiar texto
          </button>
          {message && <p className="notice small">{message}</p>}
        </div>

        <details className="card prompt-preview">
          <summary>Ver o texto que vai ser enviado</summary>
          <pre>{prompt}</pre>
        </details>

        <p className="muted small">
          Quando receberes as sugestões, procura-as em <Link to="/pesquisar">Pesquisar</Link> e adiciona as que te
          interessarem a "Quero ler".
        </p>
      </div>
    </div>
  )
}
