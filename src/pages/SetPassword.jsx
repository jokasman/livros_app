import { useAuth } from '../auth.jsx'
import PasswordForm from '../components/PasswordForm.jsx'

/** Mostrado quando a pessoa chega por um convite ou recuperação de palavra-passe. */
export default function SetPassword() {
  const { user, passwordDone } = useAuth()
  return (
    <main className="auth-page">
      <div className="auth-brand">
        <h1>Bem-vindo(a)!</h1>
        <p className="muted">
          Define uma palavra-passe para <strong>{user?.email}</strong>. Vais usá-la para entrar na app em
          qualquer dispositivo.
        </p>
      </div>
      <div className="card">
        <PasswordForm submitLabel="Definir palavra-passe e entrar" onDone={passwordDone} />
      </div>
    </main>
  )
}
