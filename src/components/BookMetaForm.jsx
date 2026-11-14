import { useRef, useState } from 'react'
import { photoToCoverDataUrl } from '../lib/image.js'
import { isbn13to10, toIsbn13 } from '../lib/isbn.js'
import Cover from './Cover.jsx'
import { CameraIcon } from './Icons.jsx'

/** Formulário com os dados bibliográficos (inserção manual ou correção). */
export default function BookMetaForm({ value, onChange }) {
  const fileRef = useRef(null)
  const [coverError, setCoverError] = useState('')
  const set = (field, v) => onChange({ ...value, [field]: v })

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setCoverError('')
    try {
      set('cover_url', await photoToCoverDataUrl(file))
    } catch {
      setCoverError('Não foi possível usar esta imagem.')
    }
  }

  return (
    <div className="meta-form">
      <div className="cover-picker">
        <Cover src={value.cover_url} title={value.title || 'Sem título'} size="lg" />
        <div className="cover-picker-actions">
          <button type="button" className="btn btn-secondary" onClick={() => fileRef.current?.click()}>
            <CameraIcon /> {value.cover_url ? 'Trocar capa' : 'Fotografar capa'}
          </button>
          {value.cover_url && (
            <button type="button" className="link-btn" onClick={() => set('cover_url', null)}>
              Remover capa
            </button>
          )}
          {coverError && <p className="error small">{coverError}</p>}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />
        </div>
      </div>

      <label className="field">
        <span className="label">Título *</span>
        <input required value={value.title ?? ''} onChange={(e) => set('title', e.target.value)} />
      </label>
      <label className="field">
        <span className="label">Subtítulo</span>
        <input value={value.subtitle ?? ''} onChange={(e) => set('subtitle', e.target.value)} />
      </label>
      <label className="field">
        <span className="label">Autor(es)</span>
        <input
          value={value.authorsText ?? (value.authors ?? []).join(', ')}
          placeholder="Separados por vírgulas"
          onChange={(e) => onChange({ ...value, authorsText: e.target.value })}
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span className="label">Editora</span>
          <input value={value.publisher ?? ''} onChange={(e) => set('publisher', e.target.value)} />
        </label>
        <label className="field narrow">
          <span className="label">Ano</span>
          <input
            inputMode="numeric"
            value={value.published_date ?? ''}
            onChange={(e) => set('published_date', e.target.value)}
          />
        </label>
      </div>
      <div className="field-row">
        <label className="field">
          <span className="label">ISBN</span>
          <input
            inputMode="numeric"
            value={value.isbnText ?? value.isbn13 ?? ''}
            placeholder="978…"
            onChange={(e) => onChange({ ...value, isbnText: e.target.value })}
          />
        </label>
        <label className="field narrow">
          <span className="label">Páginas</span>
          <input
            inputMode="numeric"
            value={value.page_count ?? ''}
            onChange={(e) => set('page_count', e.target.value.replace(/\D/g, '') || null)}
          />
        </label>
      </div>
      <label className="field">
        <span className="label">Sinopse</span>
        <textarea rows={4} value={value.description ?? ''} onChange={(e) => set('description', e.target.value)} />
      </label>
    </div>
  )
}

/**
 * Converte os valores do formulário para um objeto de livro.
 * Lança erro com mensagem amigável se algo estiver inválido.
 */
export function formToBook(form) {
  const title = (form.title ?? '').trim()
  if (!title) throw new Error('O título é obrigatório.')
  const authors =
    form.authorsText !== undefined
      ? form.authorsText.split(',').map((a) => a.trim()).filter(Boolean)
      : form.authors ?? []
  let isbn13 = form.isbn13 ?? null
  if (form.isbnText !== undefined) {
    const raw = form.isbnText.trim()
    isbn13 = raw ? toIsbn13(raw) : null
    if (raw && !isbn13) throw new Error('O ISBN não é válido. Confirma os dígitos.')
  }
  return {
    ...form,
    title,
    authors,
    isbn13,
    isbn10: isbn13 ? isbn13to10(isbn13) : null,
    page_count: form.page_count ? Number(form.page_count) : null,
  }
}
