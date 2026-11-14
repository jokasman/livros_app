/** Classificação de 1 a 5 estrelas. Sem onChange é só leitura. */
export default function Stars({ value, onChange, size = 'md' }) {
  const v = value ?? 0
  if (!onChange) {
    if (!v) return null
    return (
      <span className={`stars stars-${size}`} aria-label={`${v} de 5 estrelas`}>
        {'★'.repeat(v)}
        <span className="stars-off">{'★'.repeat(5 - v)}</span>
      </span>
    )
  }
  return (
    <div className={`stars stars-input stars-${size}`} role="radiogroup" aria-label="Classificação">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={v === n}
          aria-label={`${n} estrela${n > 1 ? 's' : ''}`}
          className={n <= v ? 'on' : ''}
          // Tocar na estrela já escolhida remove a classificação.
          onClick={() => onChange(v === n ? null : n)}
        >
          ★
        </button>
      ))}
    </div>
  )
}
