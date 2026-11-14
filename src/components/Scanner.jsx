import { useEffect, useRef, useState } from 'react'
import { readEanFromImageData } from '../lib/barcode.js'
import { FlashIcon } from './Icons.jsx'

const SCAN_INTERVAL_MS = 180
const MAX_SCAN_WIDTH = 1000

/**
 * Câmara ao vivo que procura um código de barras ISBN.
 * Chama onDetected(isbn13) uma única vez quando encontra um.
 */
export default function Scanner({ onDetected }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const trackRef = useRef(null)
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected

  const [state, setState] = useState('starting') // starting | scanning | error
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')
  const [torchAvailable, setTorchAvailable] = useState(false)
  const [torchOn, setTorchOn] = useState(false)

  useEffect(() => {
    let stopped = false
    let stream = null
    let timer = null
    let hintTimer = null

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error('unsupported'), { name: 'NotSupportedError' })
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      if (stopped) return stopStream()
      const video = videoRef.current
      video.srcObject = stream
      await video.play()
      const track = stream.getVideoTracks()[0]
      trackRef.current = track
      // Focagem contínua quando suportado (Android).
      const caps = track.getCapabilities?.() ?? {}
      if (caps.focusMode?.includes('continuous')) {
        track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
      }
      setTorchAvailable(Boolean(caps.torch))
      setState('scanning')
      loop()
    }

    function stopStream() {
      stream?.getTracks().forEach((t) => t.stop())
    }

    async function loop() {
      if (stopped) return
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState >= 2 && video.videoWidth) {
        // Analisa a faixa central (onde está a moldura), reduzida para ser rápido.
        const vw = video.videoWidth
        const vh = video.videoHeight
        const cropW = vw * 0.9
        const cropH = vh * 0.5
        const scale = Math.min(1, MAX_SCAN_WIDTH / cropW)
        canvas.width = Math.round(cropW * scale)
        canvas.height = Math.round(cropH * scale)
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(video, (vw - cropW) / 2, (vh - cropH) / 2, cropW, cropH, 0, 0, canvas.width, canvas.height)
        try {
          const found = await readEanFromImageData(ctx.getImageData(0, 0, canvas.width, canvas.height), true)
          if (stopped) return
          if (found.isbn) {
            stopped = true
            navigator.vibrate?.(80)
            stopStream()
            onDetectedRef.current(found.isbn)
            return
          }
          if (found.text) {
            setHint(`O código ${found.text} não é um ISBN. Procura o código de barras que começa por 978 ou 979.`)
            clearTimeout(hintTimer)
            hintTimer = setTimeout(() => setHint(''), 3500)
          }
        } catch (e) {
          console.warn('Erro ao ler código', e)
        }
      }
      timer = setTimeout(loop, SCAN_INTERVAL_MS)
    }

    start().catch((e) => {
      if (stopped) return
      stopStream()
      setState('error')
      setError(cameraErrorMessage(e))
    })

    return () => {
      stopped = true
      clearTimeout(timer)
      clearTimeout(hintTimer)
      stopStream()
    }
  }, [])

  const toggleTorch = async () => {
    const track = trackRef.current
    if (!track) return
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] })
      setTorchOn(!torchOn)
    } catch {
      setTorchAvailable(false)
    }
  }

  if (state === 'error') {
    return (
      <div className="scanner scanner-error">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="scanner">
      <video ref={videoRef} playsInline muted autoPlay />
      <canvas ref={canvasRef} hidden />
      <div className="scanner-overlay" aria-hidden="true">
        <div className="scanner-frame">
          <div className="scanner-line" />
        </div>
      </div>
      <p className="scanner-status">
        {state === 'starting' ? 'A abrir a câmara…' : hint || 'Aponta para o código de barras do livro'}
      </p>
      {torchAvailable && (
        <button
          type="button"
          className={`icon-btn scanner-torch ${torchOn ? 'on' : ''}`}
          onClick={toggleTorch}
          aria-label={torchOn ? 'Desligar lanterna' : 'Ligar lanterna'}
        >
          <FlashIcon />
        </button>
      )}
    </div>
  )
}

function cameraErrorMessage(e) {
  switch (e?.name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Sem autorização para usar a câmara. Permite o acesso à câmara nas definições do browser (no iPhone: Definições → Safari → Câmara) ou usa a opção "Tirar foto" abaixo.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Não foi encontrada nenhuma câmara neste dispositivo. Usa a opção "Tirar foto" ou escreve o ISBN.'
    case 'NotReadableError':
      return 'A câmara está a ser usada por outra app. Fecha-a e tenta de novo.'
    case 'NotSupportedError':
      return 'Este browser não permite abrir a câmara aqui (é preciso HTTPS). Usa a opção "Tirar foto" ou escreve o ISBN.'
    default:
      return 'Não foi possível abrir a câmara. Usa a opção "Tirar foto" ou escreve o ISBN.'
  }
}
