// Gera os ícones PNG a partir de public/icons/favicon.svg (usa o Chromium do Playwright).
const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const dir = path.join(__dirname, '..', 'public', 'icons')
const svg = fs.readFileSync(path.join(dir, 'favicon.svg'), 'utf8')
const square = svg.replace('rx="112"', 'rx="0"')
// Ícone "maskable": desenho mais pequeno, com margem de segurança.
const maskable = square.replace('<g transform="translate(256 270)">', '<g transform="translate(256 266) scale(0.72)">')
const jobs = [
  ['icon-192.png', 192, svg],
  ['icon-512.png', 512, svg],
  ['icon-maskable-512.png', 512, maskable],
  ['apple-touch-icon.png', 180, square],
]
;(async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const [name, size, src] of jobs) {
    await page.setViewportSize({ width: size, height: size })
    await page.setContent(`<html><body style="margin:0;background:transparent">${src.replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`)
    await page.screenshot({ path: path.join(dir, name), omitBackground: true })
  }
  await browser.close()
})()
