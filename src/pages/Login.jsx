import { useState } from 'react'
import { supabase } from '../lib/supabase.js'

const redirectTo = () => window.location.origin + import.meta.env.BASE_URL

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login') // login | reset
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setInfo('')
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectTo() })
        if (error) throw error
        setInfo('Se o email estiver registado, vais receber um link para definir uma nova palavra-passe.')
      }
    } catch (err) {
      setError(translateAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-brand">
        <img src={`${import.meta.env.BASE_URL}icons/icon-192.png`} alt="" width="72" height="72" />
        <h1>Livros</h1>
        <p className="muted">O registo dos livros que já leste.</p>
      </div>
      <form className="card stack" onSubmit={submit}>
        <label className="field">
          <span className="label">Email</span>
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode === 'login' && (
          <label className="field">
            <span className="label">Palavra-passe</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {error && <p className="error">{error}</p>}
        {info && <p className="notice">{info}</p>}
        <button className="btn btn-block" type="submit" disabled={busy}>
          {busy ? 'Aguarda…' : mode === 'login' ? 'Entrar' : 'Enviar link'}
        </button>
        <button
          type="button"
          className="link-btn center"
          onClick={() => {
            setMode(mode === 'login' ? 'reset' : 'login')
            setError('')
            setInfo('')
          }}
        >
          {mode === 'login' ? 'Esqueci-me da palavra-passe' : 'Voltar ao login'}
        </button>
      </form>
      <p className="muted small center">
        Acesso apenas por convite. Pede a quem gere a app que te envie um convite por email.
      </p>
    </main>
  )
}

export function translateAuthError(err) {
  const msg = err?.message ?? ''
  if (/invalid login credentials/i.test(msg)) return 'Email ou palavra-passe incorretos.'
  if (/email not confirmed/i.test(msg)) return 'Ainda não confirmaste o email. Procura o convite na tua caixa de correio.'
  if (/rate limit|too many/i.test(msg)) return 'Demasiadas tentativas. Espera um pouco e tenta de novo.'
  if (/password should be at least/i.test(msg)) return 'A palavra-passe deve ter pelo menos 8 caracteres.'
  if (/different from the old/i.test(msg)) return 'A nova palavra-passe tem de ser diferente da anterior.'
  if (/failed to fetch|network/i.test(msg)) return 'Sem ligação à internet.'
  return msg || 'Ocorreu um erro.'
}
