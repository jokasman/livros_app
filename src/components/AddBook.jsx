import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { addBook, findByIsbn, statusLabel } from '../lib/books.js'
import BookInfo from './BookInfo.jsx'
import ReadingFields from './ReadingFields.jsx'

/** Mostra um livro encontrado e permite adicioná-lo à estante. */
export default function AddBook({ book }) {
  const navigate = useNavigate()
  const [reading, setReading] = useState({ status: 'read', rating: null, notes: '' })
  const [existing, setExisting] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    findByIsbn(book.isbn13).then((b) => alive && setExisting(b))
    return () => {
      alive = false
    }
  }, [book.isbn13])

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const saved = await addBook(book, reading)
      navigate(`/livro/${saved.id}`, { replace: true, state: { justAdded: true } })
    } catch (e) {
      setError(e.message || 'Não foi possível guardar.')
      setSaving(false)
    }
  }

  return (
    <div className="stack">
      <BookInfo book={book} />
      {existing ? (
        <div className="notice">
          <p>
            Este livro já está na tua estante (<strong>{statusLabel(existing.status)}</strong>).
          </p>
          <Link className="btn" to={`/livro/${existing.id}`} replace>
            Ver na estante
          </Link>
        </div>
      ) : (
        <section className="card">
          <h3>Adicionar à estante</h3>
          <ReadingFields value={reading} onChange={setReading} />
          {error && <p className="error">{error}</p>}
          <button type="button" className="btn btn-block" disabled={saving} onClick={save}>
            {saving ? 'A guardar…' : 'Adicionar à minha estante'}
          </button>
        </section>
      )}
    </div>
  )
}
