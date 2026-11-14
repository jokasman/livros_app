import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/Layout.jsx'
import AddBook from '../components/AddBook.jsx'
import { lookupIsbnDetailed, SOURCE_NAMES } from '../lib/bookApi.js'
import { formatIsbn, toIsbn13 } from '../lib/isbn.js'

export default function IsbnLookup() {
  const { isbn: raw } = useParams()
  const isbn = toIsbn13(raw)
  const [state, setState] = useState({ loading: true, book: null, error: '', sources: null })

  useEffect(() => {
    if (!isbn) return setState({ loading: false, book: null, error: 'ISBN inválido.', sources: null })
    const ctrl = new AbortController()
    setState({ loading: true, book: null, error: '', sources: null })
    lookupIsbnDetailed(isbn, { signal: ctrl.signal })
      .then(({ book, sources }) => setState({ loading: false, book, error: '', sources }))
      .catch((e) => {
        if (e.name !== 'AbortError') setState({ loading: false, book: null, error: e.message, sources: null })
      })
    return () => ctrl.abort()
  }, [isbn])

  return (
    <div className="page">
      <PageHeader title={`ISBN ${formatIsbn(isbn ?? raw)}`} back />
      {state.loading && <p className="muted center">A procurar o livro…</p>}
      {!state.loading && state.book && (
        <>
          <AddBook book={state.book} />
          {state.sources && (
            <details className="sources-details small muted">
              <summary>Fontes consultadas</summary>
              <SourceReport sources={state.sources} />
            </details>
          )}
        </>
      )}
      {!state.loading && !state.book && (
        <div className="empty">
          <p>{state.error || 'Não encontrámos nenhum livro com este ISBN nas bases públicas.'}</p>
          {state.sources && <SourceReport sources={state.sources} />}
          <div className="button-row">
            {isbn && (
              <Link className="btn" to={`/manual?isbn=${isbn}`} replace>
                Adicionar manualmente
              </Link>
            )}
            <Link className="btn btn-secondary" to="/ler" replace>
              Ler outro código
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function describe(status) {
  if (status === 'found') return 'encontrou'
  if (status === 'empty') return 'não tem este livro'
  if (status === 'aborted') return 'cancelado'
  return `erro: ${status.error}`
}

/** Mostra o que cada base respondeu (ajuda a perceber porque o livro não aparece). */
function SourceReport({ sources }) {
  return (
    <ul className="source-report small">
      {Object.entries(sources).map(([key, status]) => (
        <li key={key} className={typeof status === 'object' ? 'error' : ''}>
          <strong>{SOURCE_NAMES[key]}</strong>: {describe(status)}
        </li>
      ))}
    </ul>
  )
}
