import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '../components/Layout.jsx'
import BookMetaForm, { formToBook } from '../components/BookMetaForm.jsx'
import ReadingFields from '../components/ReadingFields.jsx'
import { addBook } from '../lib/books.js'

export default function ManualEntry() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [meta, setMeta] = useState({
    title: params.get('titulo') ?? '',
    isbnText: params.get('isbn') ?? '',
    authors: [],
    source: 'manual',
  })
  const [reading, setReading] = useState({ status: 'read', rating: null, notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const save = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const book = formToBook(meta)
      setSaving(true)
      const saved = await addBook(book, reading)
      navigate(`/livro/${saved.id}`, { replace: true, state: { justAdded: true } })
    } catch (err) {
      setError(err.message || 'Não foi possível guardar.')
      setSaving(false)
    }
  }

  return (
    <div className="page">
      <PageHeader title="Adicionar manualmente" back />
      <form className="stack" onSubmit={save}>
        <section className="card">
          <BookMetaForm value={meta} onChange={setMeta} />
        </section>
        <section className="card">
          <h3>A minha leitura</h3>
          <ReadingFields value={reading} onChange={setReading} />
        </section>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-block" type="submit" disabled={saving}>
          {saving ? 'A guardar…' : 'Guardar na estante'}
        </button>
      </form>
    </div>
  )
}
