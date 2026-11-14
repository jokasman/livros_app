import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '../components/Layout.jsx'
import BookInfo from '../components/BookInfo.jsx'
import BookMetaForm, { formToBook } from '../components/BookMetaForm.jsx'
import ReadingFields from '../components/ReadingFields.jsx'
import { deleteBook, getBook, updateBook } from '../lib/books.js'

const READING_KEYS = ['status', 'rating', 'started_at', 'finished_at', 'notes']
const pickReading = (b) => Object.fromEntries(READING_KEYS.map((k) => [k, b[k] ?? null]))
const sameReading = (a, b) => READING_KEYS.every((k) => (a[k] ?? '') === (b[k] ?? ''))

export default function BookDetail() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const [book, setBook] = useState(null)
  const [reading, setReading] = useState(null)
  const [editingMeta, setEditingMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [flash, setFlash] = useState(state?.justAdded ? 'Livro adicionado à tua estante.' : '')

  useEffect(() => {
    let alive = true
    getBook(id)
      .then((b) => {
        if (!alive) return
        setBook(b)
        setReading(b ? pickReading(b) : null)
      })
      .catch((e) => alive && setError(e.message))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [id])

  useEffect(() => {
    if (!flash) return
    const t = setTimeout(() => setFlash(''), 3000)
    return () => clearTimeout(t)
  }, [flash])

  if (loading) return <div className="page"><PageHeader title="" back /><p className="muted center">A carregar…</p></div>
  if (!book)
    return (
      <div className="page">
        <PageHeader title="Livro" back />
        <p className="empty">{error || 'Livro não encontrado.'}</p>
      </div>
    )

  const dirty = !sameReading(reading, pickReading(book))

  const save = async (changes) => {
    setSaving(true)
    setError('')
    try {
      const updated = await updateBook(book.id, changes)
      setBook(updated)
      setReading(pickReading(updated))
      setFlash('Alterações guardadas.')
      return true
    } catch (e) {
      setError(e.message || 'Não foi possível guardar.')
      return false
    } finally {
      setSaving(false)
    }
  }

  const saveMeta = async (e) => {
    e.preventDefault()
    let meta
    try {
      meta = formToBook(editingMeta)
    } catch (err) {
      return setError(err.message)
    }
    if (await save(meta)) setEditingMeta(null)
  }

  const remove = async () => {
    if (!window.confirm(`Remover "${book.title}" da tua estante?`)) return
    try {
      await deleteBook(book.id)
      navigate('/', { replace: true })
    } catch (e) {
      setError(e.message || 'Não foi possível remover.')
    }
  }

  return (
    <div className="page">
      <PageHeader title="" back>
        {!editingMeta && (
          <button type="button" className="link-btn" onClick={() => setEditingMeta({ ...book })}>
            Editar dados
          </button>
        )}
      </PageHeader>

      {flash && <p className="toast" role="status">{flash}</p>}

      {editingMeta ? (
        <form className="stack" onSubmit={saveMeta}>
          <section className="card">
            <BookMetaForm value={editingMeta} onChange={setEditingMeta} />
          </section>
          {error && <p className="error">{error}</p>}
          <div className="button-row">
            <button type="button" className="btn btn-secondary" onClick={() => { setEditingMeta(null); setError('') }}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={saving}>
              {saving ? 'A guardar…' : 'Guardar'}
            </button>
          </div>
        </form>
      ) : (
        <div className="stack">
          <BookInfo book={book} />
          <section className="card">
            <h3>A minha leitura</h3>
            <ReadingFields value={reading} onChange={setReading} />
            {error && <p className="error">{error}</p>}
            {dirty && (
              <div className="button-row">
                <button type="button" className="btn btn-secondary" onClick={() => setReading(pickReading(book))}>
                  Desfazer
                </button>
                <button type="button" className="btn" disabled={saving} onClick={() => save(reading)}>
                  {saving ? 'A guardar…' : 'Guardar alterações'}
                </button>
              </div>
            )}
          </section>
          <button type="button" className="btn btn-danger-text" onClick={remove}>
            Remover da estante
          </button>
        </div>
      )}
    </div>
  )
}
