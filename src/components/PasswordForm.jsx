import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { translateAuthError } from '../pages/Login.jsx'

/** Define ou altera a palavra-passe do utilizador autenticado. */
export default function PasswordForm({ submitLabel = 'Guardar', onDone }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('A palavra-passe deve ter pelo menos 8 caracteres.')
    if (password !== confirm) return setError('As palavras-passe não coincidem.')
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(translateAuthError(error))
    setPassword('')
    setConfirm('')
    onDone?.()
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label className="field">
        <span className="label">Nova palavra-passe</span>
        <input
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="field">
        <span className="label">Repetir palavra-passe</span>
        <input
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="btn btn-block" type="submit" disabled={busy}>
        {busy ? 'A guardar…' : submitLabel}
      </button>
    </form>
  )
}
