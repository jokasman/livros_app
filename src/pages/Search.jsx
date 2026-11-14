import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/Layout.jsx'
import Cover from '../components/Cover.jsx'
import { SearchIcon } from '../components/Icons.jsx'
import { SEARCH_MODES, searchBooks } from '../lib/bookApi.js'
import { cachedShelf } from '../lib/books.js'
import { looksLikeIsbn, toIsbn13 } from '../lib/isbn.js'

const STATE_KEY = 'livros:search-state'

function loadState() {
  try {
    return JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null')
  } catch {
    return null
  }
}

export default function Search() {
  const navigate = useNavigate()
  const saved = useRef(loadState()).current
  const [text, setText] = useState(saved?.text ?? '')
  const [mode, setMode] = useState(saved?.mode ?? 'all')
  const [results, setResults] = useState(saved?.results ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const ctrlRef = useRef(null)

  const owned = useMemo(() => new Set(cachedShelf().map((b) => b.isbn13).filter(Boolean)), [])

  useEffect(() => () => ctrlRef.current?.abort(), [])

  useEffect(() => {
    try {
      sessionStorage.setItem(STATE_KEY, JSON.stringify({ text, mode, results }))
    } catch {
      /* ignora */
    }
  }, [text, mode, results])

  const run = async (e) => {
    e?.preventDefault()
    const q = text.trim()
    if (!q) return
    // Um ISBN completo vai diretamente para a ficha do livro.
    if ((mode === 'all' || mode === 'isbn') && looksLikeIsbn(q)) {
      return navigate(`/isbn/${toIsbn13(q)}`)
    }
    ctrlRef.current?.abort()
    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    setLoading(true)
    setError('')
    try {
      const r = await searchBooks(q, mode, { signal: ctrl.signal })
      setResults(r)
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      if (ctrlRef.current === ctrl) setLoading(false)
    }
  }

  return (
    <div className="page">
      <PageHeader title="Pesquisar livros" />
      <form className="search-form" onSubmit={run}>
        <label className="search-box">
          <SearchIcon />
          <input
            type="search"
            enterKeyHint="search"
            placeholder={placeholderFor(mode)}
            inputMode={mode === 'isbn' ? 'numeric' : 'text'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus={!results}
          />
        </label>
        <div className="chips">
          {SEARCH_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              className={mode === m.value ? 'active' : ''}
              onClick={() => setMode(m.value)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <button className="btn btn-block" type="submit" disabled={!text.trim() || loading}>
          {loading ? 'A pesquisar…' : 'Pesquisar'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      {results && !loading && (
        <>
          <p className="muted small">
            {results.length === 0 ? 'Sem resultados.' : `${results.length} resultado${results.length === 1 ? '' : 's'}`}
          </p>
          <ul className="result-list">
            {results.map((b, i) => (
              <li key={`${b.source}-${b.source_id ?? i}`}>
                <button type="button" className="result" onClick={() => navigate('/adicionar', { state: { book: b } })}>
                  <Cover src={b.cover_url} title={b.title} author={b.authors?.[0]} size="sm" />
                  <span className="result-text">
                    <strong>{b.title}</strong>
                    {b.authors?.length > 0 && <span>{b.authors.join(', ')}</span>}
                    <span className="muted small">
                      {[b.publisher, b.published_date?.slice(0, 4)].filter(Boolean).join(' · ')}
                    </span>
                    {b.isbn13 && owned.has(b.isbn13) && <span className="badge badge-read">Na estante</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="center small manual-hint">
        Não encontras o livro?{' '}
        <Link to={`/manual${mode === 'title' && text ? `?titulo=${encodeURIComponent(text)}` : ''}`}>
          Adiciona-o manualmente
        </Link>
      </p>
    </div>
  )
}

function placeholderFor(mode) {
  return {
    title: 'Título do livro',
    author: 'Nome do autor',
    isbn: 'ISBN (10 ou 13 dígitos)',
    publisher: 'Nome da editora',
  }[mode] ?? 'Título, autor, ISBN…'
}
