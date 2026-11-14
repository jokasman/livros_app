import { useEffect, useState } from 'react'
import { useAuth } from '../auth.jsx'
import { PageHeader } from '../components/Layout.jsx'
import PasswordForm from '../components/PasswordForm.jsx'

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)
const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true

export default function Account() {
  const { user, signOut } = useAuth()
  const [changing, setChanging] = useState(false)
  const [done, setDone] = useState(false)
  const [installEvent, setInstallEvent] = useState(window.__installPrompt ?? null)

  useEffect(() => {
    const onPrompt = () => setInstallEvent(window.__installPrompt)
    window.addEventListener('installprompt-ready', onPrompt)
    return () => window.removeEventListener('installprompt-ready', onPrompt)
  }, [])

  const install = async () => {
    installEvent.prompt()
    await installEvent.userChoice
    window.__installPrompt = null
    setInstallEvent(null)
  }

  return (
    <div className="page">
      <PageHeader title="Conta" />

      <section className="card stack">
        <div>
          <span className="label">Sessão iniciada como</span>
          <p>
            <strong>{user?.email}</strong>
          </p>
        </div>
        {changing ? (
          <PasswordForm
            submitLabel="Alterar palavra-passe"
            onDone={() => {
              setChanging(false)
              setDone(true)
            }}
          />
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => { setChanging(true); setDone(false) }}>
            Alterar palavra-passe
          </button>
        )}
        {done && <p className="notice small">Palavra-passe alterada.</p>}
        <button type="button" className="btn btn-danger-text" onClick={signOut}>
          Terminar sessão
        </button>
      </section>

      {!isStandalone() && (
        <section className="card">
          <h3>Instalar no telemóvel</h3>
          {installEvent ? (
            <button type="button" className="btn btn-block" onClick={install}>
              Instalar a app
            </button>
          ) : isIos() ? (
            <p className="small">
              No Safari, toca em <strong>Partilhar</strong> (o quadrado com a seta) e depois em{' '}
              <strong>Adicionar ao ecrã principal</strong>.
            </p>
          ) : (
            <p className="small">
              No Chrome, abre o menu <strong>⋮</strong> e escolhe <strong>Instalar app</strong> ou{' '}
              <strong>Adicionar ao ecrã principal</strong>.
            </p>
          )}
        </section>
      )}

      <section className="card small muted">
        <p>
          Os teus livros são privados: só tu os vês. Dados dos livros fornecidos por Google Books e Open
          Library.
        </p>
        <p className="tiny">Versão {__APP_VERSION__}</p>
      </section>
    </div>
  )
}
