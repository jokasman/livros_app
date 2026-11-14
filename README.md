# Livros

PWA para registar os livros que já leste, estás a ler ou queres ler. Funciona em Android e iPhone (instala-se a partir do browser).

- Pesquisa por título, autor, editora ou ISBN na **Google Books** e na **Open Library**
- Leitura do **código de barras ISBN** com a câmara (ou a partir de uma foto)
- Estado (Quero ler / A ler / Lido), classificação, datas e notas
- Inserção manual, com foto da capa, para livros que não estão nas bases públicas
- Cada pessoa só vê os seus livros (Row Level Security no Supabase)
- Acesso só por convite

## Configuração (uma vez)

### 1. Supabase (base de dados + contas)

1. Cria uma conta em <https://supabase.com> e um projeto novo (o plano gratuito chega). A região mais próxima é `West EU (Ireland)` ou `Central EU (Frankfurt)`.
2. **SQL Editor → New query**: cola o conteúdo de [`supabase/schema.sql`](supabase/schema.sql) e carrega em **Run**.
3. **Authentication → Sign In / Providers**:
   - mantém **Email** ativo;
   - desativa **Allow new users to sign up** (assim só entra quem tu convidares).
4. **Authentication → URL Configuration**:
   - **Site URL**: `https://jokasman.github.io/livros_app/`
   - **Redirect URLs**: acrescenta `https://jokasman.github.io/livros_app/**` e `http://localhost:5173/**`
O URL e a chave pública (*publishable*) do projeto já estão em [`.env.production`](.env.production).

> A chave pública pode estar no código: sem sessão iniciada não dá acesso a nada, e com sessão só dá acesso aos livros do próprio utilizador. **Nunca** coloques aqui a *secret key* nem a *service_role*.

### 2. Publicação no GitHub Pages

1. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `push` para `main` compila e publica em `https://jokasman.github.io/livros_app/`. Também podes correr o workflow à mão em **Actions → Publicar no GitHub Pages → Run workflow**.

#### Chave da Google Books (recomendado)

A chave já está em `.env.production`. Sem chave, a Google limita o número de pesquisas por dia e por IP. Para criar uma chave gratuita: <https://console.cloud.google.com> → criar projeto → **APIs & Services → Library → Books API → Enable** → **Credentials → Create credentials → API key**. Em **restrições**, limita a chave a *HTTP referrers* `https://jokasman.github.io/*` e à *Books API*.

### 3. Convidar amigos

**Supabase → Authentication → Users → Add user → Send invitation**, com o email da pessoa. Ela recebe um link, abre-o, define uma palavra-passe e fica com a sua estante (vazia e privada).

Também te podes convidar a ti próprio da mesma forma.

## Instalar no telemóvel

- **iPhone (Safari)**: abre o site → botão **Partilhar** → **Adicionar ao ecrã principal**.
- **Android (Chrome)**: abre o site → menu **⋮** → **Instalar app** (ou usa o botão em *Conta*).

A câmara só funciona em HTTPS (o GitHub Pages já usa HTTPS). No iPhone, se a câmara não abrir, confirma em **Definições → Safari → Câmara**. Há sempre a alternativa de **tirar uma foto** ao código ou escrever o ISBN.

## Desenvolvimento

```bash
npm install
npm run dev                  # http://localhost:5173
npm test                     # testes unitários
npm run build                # compila para dist/
```

Para testar a câmara no telemóvel durante o desenvolvimento é preciso HTTPS (ex.: `npx vite --host` com um túnel HTTPS) ou usar a versão publicada.

### Estrutura

```
src/
  lib/isbn.js        validação e conversão ISBN-10/13
  lib/bookApi.js     pesquisa na Google Books + Open Library
  lib/barcode.js     leitura de EAN-13 com ZXing (WebAssembly)
  lib/books.js       tabela "books" no Supabase (+ cópia offline)
  components/        Scanner, capas, estrelas, formulários
  pages/             Estante, Pesquisar, Ler ISBN, Livro, Conta, Login
supabase/schema.sql  tabela, índices e regras de privacidade (RLS)
```

Os ícones são gerados a partir de `public/icons/favicon.svg` com `node scripts/make-icons.cjs` (precisa do Playwright).
