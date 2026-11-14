import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && anonKey)

// Antes de o cliente processar o link do email, verificamos se é um convite
// ou recuperação de palavra-passe, para pedir ao utilizador uma nova palavra-passe.
const hash = typeof window !== 'undefined' ? window.location.hash : ''
export const arrivedFromEmailLink = /type=(invite|recovery)/.test(hash)

// Links de convite/recuperação inválidos chegam como #error=...&error_code=otp_expired
function readEmailLinkError() {
  const params = new URLSearchParams(hash.replace(/^#/, ''))
  const code = params.get('error_code') || params.get('error')
  if (!code) return null
  if (/otp_expired|access_denied/.test(code)) {
    return 'O link do email já foi usado ou expirou (só funciona uma vez e durante 24 horas; alguns serviços de email abrem-no sozinhos). Escreve o teu email abaixo para receberes um link novo e abre-o neste telemóvel.'
  }
  return `O link do email não é válido (${params.get('error_description') || code}). Pede um link novo abaixo.`
}

export const emailLinkError = readEmailLinkError()
if (emailLinkError && typeof window !== 'undefined') {
  history.replaceState(null, '', window.location.pathname + window.location.search)
}

export const supabase = isConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null
