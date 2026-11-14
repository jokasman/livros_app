// Leitura de códigos de barras EAN-13 (ISBN) com ZXing compilado para WebAssembly.
// Funciona em Android e iPhone (o Safari não tem BarcodeDetector nativo).
import { prepareZXingModule, readBarcodes } from 'zxing-wasm/reader'
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import { toIsbn13 } from './isbn.js'

// Usa o ficheiro .wasm servido pela própria app (funciona offline, sem CDN).
prepareZXingModule({
  overrides: {
    locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasmUrl : prefix + path),
  },
})

const OPTIONS = {
  formats: ['EAN13'],
  tryHarder: true,
  tryRotate: true,
  tryInvert: false,
  maxNumberOfSymbols: 1,
}

/**
 * Lê um código EAN-13 a partir de ImageData.
 * Devolve { isbn, text }: isbn é o ISBN-13 (ou null se o código não for de um livro).
 */
export async function readEanFromImageData(imageData, fast = false) {
  const results = await readBarcodes(imageData, fast ? { ...OPTIONS, tryHarder: false } : OPTIONS)
  const text = results[0]?.text ?? null
  return { text, isbn: text ? toIsbn13(text) : null }
}

/** Lê o código de barras de uma fotografia (ficheiro). Tenta vários tamanhos. */
export async function readIsbnFromFile(file) {
  const bitmap = await loadBitmap(file)
  const sizes = [1600, 1000, 2400]
  for (const max of sizes) {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(bitmap, 0, 0, w, h)
    const found = await readEanFromImageData(ctx.getImageData(0, 0, w, h))
    if (found.text) return found
  }
  return { text: null, isbn: null }
}

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* alguns Safari antigos não aceitam opções: tenta via <img> */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return img
  } finally {
    URL.revokeObjectURL(url)
  }
}
