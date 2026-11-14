import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanText, lookupPorbase, parsePorbaseResponse } from './porbase.js'
import { lookupIsbnDetailed } from './bookApi.js'

// Registo UNIMARC em MARCXchange, no formato servido por urn.porbase.org.
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<mx:collection xmlns:mx="info:lc/xmlns/marcxchange-v1">
<mx:record format="Unimarc" type="Bibliographic">
  <mx:leader>01234nam  2200277   450 </mx:leader>
  <mx:controlfield tag="001">1912345</mx:controlfield>
  <mx:datafield tag="010" ind1=" " ind2=" ">
    <mx:subfield code="a">978-989-707-123-2</mx:subfield>
    <mx:subfield code="b">enc.</mx:subfield>
  </mx:datafield>
  <mx:datafield tag="101" ind1="0" ind2=" "><mx:subfield code="a">por</mx:subfield></mx:datafield>
  <mx:datafield tag="200" ind1="1" ind2=" ">
    <mx:subfield code="a">&lt;&lt;O&gt;&gt; Elmer e o ursinho perdido</mx:subfield>
    <mx:subfield code="e">uma história de amizade</mx:subfield>
    <mx:subfield code="f">David McKee</mx:subfield>
    <mx:subfield code="g">trad. Ana Silva</mx:subfield>
  </mx:datafield>
  <mx:datafield tag="210" ind1=" " ind2=" ">
    <mx:subfield code="a">Lisboa</mx:subfield>
    <mx:subfield code="c">Nuvem de Letras</mx:subfield>
    <mx:subfield code="d">imp. 2019</mx:subfield>
  </mx:datafield>
  <mx:datafield tag="215" ind1=" " ind2=" ">
    <mx:subfield code="a">32 p.</mx:subfield>
    <mx:subfield code="c">il.</mx:subfield>
  </mx:datafield>
  <mx:datafield tag="330" ind1=" " ind2=" "><mx:subfield code="a">O Elmer ajuda o Wilbur a encontrar o ursinho</mx:subfield></mx:datafield>
  <mx:datafield tag="700" ind1=" " ind2="1">
    <mx:subfield code="a">McKee,</mx:subfield>
    <mx:subfield code="b">David,</mx:subfield>
    <mx:subfield code="f">1935-</mx:subfield>
    <mx:subfield code="4">070</mx:subfield>
  </mx:datafield>
  <mx:datafield tag="702" ind1=" " ind2="1">
    <mx:subfield code="a">Silva,</mx:subfield>
    <mx:subfield code="b">Ana</mx:subfield>
    <mx:subfield code="4">730</mx:subfield>
  </mx:datafield>
</mx:record>
</mx:collection>`

afterEach(() => vi.unstubAllGlobals())

describe('Biblioteca Nacional (UNIMARC)', () => {
  it('limpa marcas de não ordenação e pontuação ISBD', () => {
    expect(cleanText('<<A>> menina do mar /')).toBe('A menina do mar')
    expect(cleanText('\u0088O\u0089 principezinho :')).toBe('O principezinho')
    expect(cleanText('[Porto]')).toBe('Porto')
  })

  it('converte um registo em livro', () => {
    const b = parsePorbaseResponse(XML, '9789897071232')
    expect(b).toMatchObject({
      source: 'bnp',
      isbn13: '9789897071232',
      title: 'O Elmer e o ursinho perdido',
      subtitle: 'uma história de amizade',
      authors: ['David McKee'],
      publisher: 'Nuvem de Letras',
      published_date: '2019',
      page_count: 32,
      language: 'pt',
    })
    expect(b.description).toMatch(/^O Elmer ajuda/)
  })

  it('aceita XML sem prefixo de namespace', () => {
    const plain = XML.replace(/mx:/g, '')
    expect(parsePorbaseResponse(plain, '9789897071232').title).toBe('O Elmer e o ursinho perdido')
  })

  it('devolve null quando não há registos', () => {
    expect(parsePorbaseResponse('<html>Não encontrado</html>')).toBeNull()
    expect(parsePorbaseResponse('')).toBeNull()
  })

  it('tenta o ISBN-10 quando o ISBN-13 não está registado', async () => {
    const urls = []
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      urls.push(String(url))
      const body = String(url).endsWith('9720046120') ? XML.replace('978-989-707-123-2', '972-0-04612-0') : '<collection/>'
      return { ok: true, status: 200, text: async () => body }
    }))
    const b = await lookupPorbase('9789720046123')
    expect(urls.map((u) => u.split('id=')[1])).toEqual(['9789720046123', '9720046120'])
    expect(b.isbn13).toBe('9789720046123')
    expect(b.title).toBe('O Elmer e o ursinho perdido')
  })

  it('junta com as outras fontes na procura por ISBN', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const u = String(url)
      if (u.includes('porbase')) return { ok: true, status: 200, text: async () => XML }
      if (u.includes('googleapis')) return { ok: true, status: 200, json: async () => ({ totalItems: 0 }) }
      return { ok: true, status: 200, json: async () => ({}) }
    }))
    const { book, sources } = await lookupIsbnDetailed('978-989-707-123-2')
    expect(book.title).toBe('O Elmer e o ursinho perdido')
    expect(book.source).toBe('bnp')
    expect(book.cover_url).toContain('covers.openlibrary.org/b/isbn/9789897071232')
    expect(sources).toEqual({ google: 'empty', bnp: 'found', openlibrary: 'empty' })
  })
})
