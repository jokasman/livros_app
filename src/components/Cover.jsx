import { useState } from 'react'

const PALETTE = ['#7c5c3b', '#3b5b7c', '#5b7c3b', '#7c3b5b', '#3b7c74', '#6b4f8a', '#8a6b2f']

function colorFor(text) {
  let h = 0
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}

/** Capa do livro, com uma capa "desenhada" quando não há imagem. */
export default function Cover({ src, title = '', author = '', size = 'md' }) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) {
    return (
      <img
        className={`cover cover-${size}`}
        src={src}
        alt={`Capa de ${title}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <div className={`cover cover-${size} cover-fallback`} style={{ background: colorFor(title) }} aria-hidden="true">
      <span className="cover-fallback-title">{title}</span>
      {author && <span className="cover-fallback-author">{author}</span>}
    </div>
  )
}
