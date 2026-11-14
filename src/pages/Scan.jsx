import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/Layout.jsx'
import Scanner from '../components/Scanner.jsx'
import { CameraIcon } from '../components/Icons.jsx'
import { toIsbn13 } from '../lib/isbn.js'
import { readIsbnFromFile } from '../lib/barcode.js'

export default function Scan() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [manual, setManual] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const go = (isbn) => navigate(`/isbn/${isbn}`)

  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setMessage('')
    try {
      const found = await readIsbnFromFile(file)
      if (found.isbn) return go(found.isbn)
      setMessage(
        found.text
          ? `O código lido (${found.text}) não é um ISBN.`
          : 'Não foi possível ler o código nesta foto. Tenta mais perto, com boa luz e o código direito.',
      )
    } catch {
      setMessage('Não foi possível ler esta imagem.')
    } finally {
      setBusy(false)
    }
  }

  const onManual = (e) => {
    e.preventDefault()
    const isbn = toIsbn13(manual)
    if (isbn) go(isbn)
    else setMessage('ISBN inválido. Confirma os 10 ou 13 dígitos.')
  }

  return (
    <div className="page page-scan">
      <PageHeader title="Ler ISBN" />
      <Scanner onDetected={go} />

      <div className="scan-alternatives">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
          <CameraIcon /> {busy ? 'A ler foto…' : 'Tirar foto ao código'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPhoto} />

        <form className="inline-form" onSubmit={onManual}>
          <input
            inputMode="numeric"
            placeholder="Ou escreve o ISBN"
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            aria-label="ISBN"
          />
          <button className="btn" type="submit" disabled={!manual.trim()}>
            Procurar
          </button>
        </form>
        {message && <p className="error">{message}</p>}
      </div>
    </div>
  )
}
