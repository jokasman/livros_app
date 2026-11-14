import { STATUSES } from '../lib/books.js'
import Stars from './Stars.jsx'

export const today = () => new Date().toISOString().slice(0, 10)

/** Campos pessoais de leitura: estado, classificação, datas e notas. */
export default function ReadingFields({ value, onChange }) {
  const set = (field, v) => onChange({ ...value, [field]: v })

  const setStatus = (status) => {
    const next = { ...value, status }
    if (status === 'reading' && !next.started_at) next.started_at = today()
    onChange(next)
  }

  return (
    <div className="reading-fields">
      <div className="segmented" role="radiogroup" aria-label="Estado">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            role="radio"
            aria-checked={value.status === s.value}
            className={value.status === s.value ? 'active' : ''}
            onClick={() => setStatus(s.value)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {value.status === 'read' && (
        <div className="field">
          <span className="label">A minha classificação</span>
          <Stars value={value.rating} onChange={(r) => set('rating', r)} size="lg" />
        </div>
      )}

      {value.status !== 'want' && (
        <div className="field-row">
          <label className="field">
            <span className="label">Comecei a ler</span>
            <input
              type="date"
              value={value.started_at ?? ''}
              max={today()}
              onChange={(e) => set('started_at', e.target.value || null)}
            />
          </label>
          {value.status === 'read' && (
            <div className="field">
              <span className="label label-with-action">
                <label htmlFor="finished_at">Terminei</label>
                {!value.finished_at && (
                  <button type="button" className="link-btn" onClick={() => set('finished_at', today())}>
                    Hoje
                  </button>
                )}
              </span>
              <input
                id="finished_at"
                type="date"
                value={value.finished_at ?? ''}
                max={today()}
                onChange={(e) => set('finished_at', e.target.value || null)}
              />
            </div>
          )}
        </div>
      )}

      <label className="field">
        <span className="label">Notas pessoais</span>
        <textarea
          rows={3}
          value={value.notes ?? ''}
          placeholder="O que achaste, citações, quem te recomendou…"
          onChange={(e) => set('notes', e.target.value)}
        />
      </label>
    </div>
  )
}
