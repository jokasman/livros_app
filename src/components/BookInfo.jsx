import { useState } from 'react'
import { formatIsbn } from '../lib/isbn.js'
import Cover from './Cover.jsx'

const SOURCE_LABEL = { google: 'Google Books', openlibrary: 'Open Library', manual: 'Inserido à mão' }

function year(date) {
  return date?.match(/\d{4}/)?.[0] ?? date
}

/** Cabeçalho com capa e dados bibliográficos de um livro. */
export default function BookInfo({ book }) {
  const [expanded, setExpanded] = useState(false)
  const authors = book.authors?.join(', ')
  const meta = [
    book.publisher,
    year(book.published_date),
    book.page_count ? `${book.page_count} páginas` : null,
  ].filter(Boolean)
  const long = (book.description?.length ?? 0) > 320

  return (
    <section className="book-info">
      <div className="book-info-head">
        <Cover src={book.cover_url} title={book.title} author={authors} size="lg" />
        <div className="book-info-text">
          <h2>{book.title}</h2>
          {book.subtitle && <p className="subtitle">{book.subtitle}</p>}
          {authors && <p className="authors">{authors}</p>}
          {meta.length > 0 && <p className="muted small">{meta.join(' · ')}</p>}
          {book.isbn13 && <p className="muted small">ISBN {formatIsbn(book.isbn13)}</p>}
          {book.source && <p className="muted tiny">Fonte: {SOURCE_LABEL[book.source] ?? book.source}</p>}
        </div>
      </div>
      {book.description && (
        <div className={`description ${long && !expanded ? 'clamped' : ''}`}>
          <p>{stripHtml(book.description)}</p>
          {long && (
            <button type="button" className="link-btn" onClick={() => setExpanded(!expanded)}>
              {expanded ? 'Mostrar menos' : 'Ler mais'}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function stripHtml(text) {
  return text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
}
