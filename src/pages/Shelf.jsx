import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Cover from '../components/Cover.jsx'
import Stars from '../components/Stars.jsx'
import { BarcodeIcon, PlusIcon, SearchIcon } from '../components/Icons.jsx'
import { cachedShelf, listBooks, STATUSES, statusLabel } from '../lib/books.js'

const FILTER_KEY = 'livros:shelf-filter'

const SORTS = {
  recent: { label: 'Mais recentes', fn: (a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? '') },
  title: { label: 'Título', fn: (a, b) => a.title.localeCompare(b.title, 'pt') },
  author: {
    label: 'Autor',
    fn: (a, b) => (a.authors?.[0] ?? '~').localeCompare(b.authors?.[0] ?? '~', 'pt'),
  },
  rating: { label: 'Classificação', fn: (a, b) => (b.rating ?? 0) - (a.rating ?? 0) },
  finished: {
    label: 'Data de leitura',
    fn: (a, b) => (b.finished_at ?? '').localeCompare(a.finished_at ?? ''),
  },
}

function loadFilter() {
  try {
    return { status: 'all', sort: 'recent', ...JSON.parse(localStorage.getItem(FILTER_KEY) || '{}') }
  } catch {
    return { status: 'all', sort: 'recent' }
  }
}

function normalize(s) {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function Shelf() {
  const [books, setBooks] = useState(() => cachedShelf())
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState(loadFilter)
  const [query, setQuery] = useState('')

  useEffect(() => {
    listBooks()
      .then(({ books, offline }) => {
        setBooks(books)
        setOffline(offline)
      })
      .catch((e) => setError(e.message || 'Não foi possível carregar a estante.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify(filter))
    } catch {
      /* ignora */
    }
  }, [filter])

  const counts = useMemo(() => {
    const c = { all: books.length, want: 0, reading: 0, read: 0 }
    for (const b of books) c[b.status] = (c[b.status] ?? 0) + 1
    return c
  }, [books])

  const readThisYear = useMemo(() => {
    const y = String(new Date().getFullYear())
    return books.filter((b) => b.status === 'read' && b.finished_at?.startsWith(y)).length
  }, [books])

  const visible = useMemo(() => {
    const q = normalize(query.trim())
    const digits = query.replace(/\D/g, '')
    return books
      .filter((b) => filter.status === 'all' || b.status === filter.status)
      .filter((b) => {
        if (!q) return true
        if (digits.length >= 4 && (b.isbn13?.includes(digits) || b.isbn10?.includes(digits))) return true
        return (
          normalize(b.title).includes(q) ||
          normalize(b.subtitle).includes(q) ||
          normalize(b.publisher).includes(q) ||
          (b.authors ?? []).some((a) => normalize(a).includes(q))
        )
      })
      .sort(SORTS[filter.sort]?.fn ?? SORTS.recent.fn)
  }, [books, filter, query])

  const set = (k, v) => setFilter((f) => ({ ...f, [k]: v }))

  return (
    <div className="page">
      <header className="page-header">
        <h1>A minha estante</h1>
      </header>

      {books.length > 0 && (
        <p className="muted small shelf-summary">
          {counts.read} lido{counts.read === 1 ? '' : 's'}
          {readThisYear > 0 && ` · ${readThisYear} este ano`}
          {counts.reading > 0 && ` · ${counts.reading} a ler`}
          {counts.want > 0 && ` · ${counts.want} por ler`}
        </p>
      )}

      {counts.read > 0 && (
        <Link to="/sugestoes" className="suggest-card">
          <span className="suggest-card-icon" aria-hidden="true">
            ✨
          </span>
          <span className="suggest-card-text">
            <strong>O que ler a seguir?</strong>
            <span>
              Pede sugestões a uma IA com base{' '}
              {counts.read === 1 ? 'no teu livro lido' : `nos teus ${counts.read} livros lidos`}
            </span>
          </span>
          <span className="suggest-card-arrow" aria-hidden="true">
            ›
          </span>
        </Link>
      )}

      {offline && <p className="notice small">Sem ligação: a mostrar a última cópia guardada.</p>}
      {error && <p className="error">{error}</p>}

      {books.length > 0 && (
        <>
          <div className="chips" role="tablist">
            <button role="tab" aria-selected={filter.status === 'all'} className={filter.status === 'all' ? 'active' : ''} onClick={() => set('status', 'all')}>
              Todos <span>{counts.all}</span>
            </button>
            {STATUSES.map((s) => (
              <button
                key={s.value}
                role="tab"
                aria-selected={filter.status === s.value}
                className={filter.status === s.value ? 'active' : ''}
                onClick={() => set('status', s.value)}
              >
                {s.label} <span>{counts[s.value]}</span>
              </button>
            ))}
          </div>

          <div className="shelf-tools">
            <label className="search-box">
              <SearchIcon />
              <input
                type="search"
                placeholder="Filtrar por título, autor, ISBN…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <select value={filter.sort} onChange={(e) => set('sort', e.target.value)} aria-label="Ordenar">
              {Object.entries(SORTS).map(([k, s]) => (
                <option key={k} value={k}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {!loading && books.length === 0 && !error && (
        <div className="empty">
          <h2>A tua estante está vazia</h2>
          <p>Lê o código de barras de um livro ou pesquisa pelo título para começar.</p>
          <div className="button-row">
            <Link className="btn" to="/ler">
              <BarcodeIcon /> Ler ISBN
            </Link>
            <Link className="btn btn-secondary" to="/pesquisar">
              <SearchIcon /> Pesquisar
            </Link>
          </div>
        </div>
      )}

      {loading && books.length === 0 && <p className="muted center">A carregar…</p>}

      {books.length > 0 && visible.length === 0 && <p className="muted center">Nenhum livro corresponde ao filtro.</p>}

      <ul className="book-grid">
        {visible.map((b) => (
          <li key={b.id}>
            <Link to={`/livro/${b.id}`} className="book-card">
              <Cover src={b.cover_url} title={b.title} author={b.authors?.[0]} />
              <div className="book-card-text">
                <strong className="book-card-title">{b.title}</strong>
                <span className="book-card-author">{b.authors?.join(', ')}</span>
                {b.status === 'read' ? (
                  <Stars value={b.rating} size="sm" />
                ) : (
                  <span className={`badge badge-${b.status}`}>{statusLabel(b.status)}</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {books.length > 0 && (
        <Link to="/manual" className="fab" aria-label="Adicionar livro manualmente" title="Adicionar manualmente">
          <PlusIcon />
        </Link>
      )}
    </div>
  )
}
