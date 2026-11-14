// Intermediário para a Biblioteca Nacional de Portugal (PORBASE).
// Só é necessário se o browser não conseguir pedir diretamente a urn.porbase.org (CORS).
// Instalar: Supabase → Edge Functions → Deploy a new function → Via Editor,
// nome "porbase", colar este ficheiro e carregar em Deploy.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const isbn = (new URL(req.url).searchParams.get('isbn') ?? '').toUpperCase().replace(/[^0-9X]/g, '')
  if (isbn.length !== 10 && isbn.length !== 13) {
    return new Response('ISBN inválido', { status: 400, headers: CORS })
  }

  try {
    const res = await fetch(`https://urn.porbase.org/isbn/unimarc/marcxchange?id=${isbn}`, {
      headers: { Accept: 'application/xml, text/xml, */*' },
    })
    const body = await res.text()
    return new Response(res.status === 404 ? '' : body, {
      status: res.status === 404 ? 200 : res.status,
      headers: {
        ...CORS,
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new Response('A Biblioteca Nacional não respondeu', { status: 502, headers: CORS })
  }
})
