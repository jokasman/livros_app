import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/Layout.jsx'
import AddBook from '../components/AddBook.jsx'
import { lookupIsbn } from '../lib/bookApi.js'
import { formatIsbn, toIsbn13 } from '../lib/isbn.js'

export default function IsbnLookup() {
  const { isbn: raw } = useParams()
  const isbn = toIsbn13(raw)
  const [state, setState] = useState({ loading: true, book: null, error: '' })

  useEffect(() => {
    if (!isbn) return setState({ loading: false, book: null, error: 'ISBN inválido.' })
    const ctrl = new AbortController()
    setState({ loading: true, book: null, error: '' })
    lookupIsbn(isbn, { signal: ctrl.signal })
      .then((book) => setState({ loading: false, book, error: '' }))
      .catch((e) => {
        if (e.name !== 'AbortError') setState({ loading: false, book: null, error: e.message })
      })
    return () => ctrl.abort()
  }, [isbn])

  return (
    <div className="page">
      <PageHeader title={`ISBN ${formatIsbn(isbn ?? raw)}`} back />
      {state.loading && <p className="muted center">A procurar o livro…</p>}
      {!state.loading && state.book && <AddBook book={state.book} />}
      {!state.loading && !state.book && (
        <div className="empty">
          <p>{state.error || 'Não encontrámos nenhum livro com este ISBN nas bases públicas.'}</p>
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
