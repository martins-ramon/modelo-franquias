# Modelo de Franquias · Foundation LYNN — Visão Executiva

Deck web interativo (9 slides) com mecanismo de colaboração (comentários, perguntas, ajustes e captura rápida de pedidos do Gustavo), persistido no Supabase Postgres.

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | Deck completo + UI de colaboração (arquivo único, sem build) |
| `server.js` | Servidor Node/Express: serve o deck e expõe a API `/api/comments` |
| `package.json` | Dependências (`express`, `pg`) |
| `vercel.json` | Preset Express e comandos de instalação/build da Vercel |
| `scripts/build.js` | Copia somente o deck e as imagens para `public/` |
| `.replit` | Configuração de execução no Replit |

## Deploy na Vercel (GitHub)

Envie estas alterações para a branch do GitHub que será importada. Na tela de importação da Vercel, use:

| Campo | Valor |
|---|---|
| **Root Directory** | `./` (raiz do repositório, onde está `package.json`) |
| **Application / Framework Preset** | **Express** |
| **Build Command** | `npm run build` (já configurado em `vercel.json`) |
| **Output Directory** | Deixe no padrão, com **Override desativado** |
| **Install Command** | `npm ci` (já configurado em `vercel.json`) |
| **Environment Variables** | `DATABASE_URL` = URI do **Transaction Pooler** do Supabase, porta **6543** |

O Node.js está fixado em **22.x** no `package.json`. Não use `npm start` como comando de build: a Vercel executa o Express como função e publica os arquivos de `public/` automaticamente. Não configure `public` ou `dist` como Output Directory; mantenha o padrão do preset Express.

No Supabase, abra **Connect**, selecione **Transaction pooler** e copie a URI do seu projeto. Substitua o marcador de senha pela senha do banco (codifique caracteres especiais da senha para uso em URL). Cadastre a URI somente como variável de ambiente na Vercel, nunca no código. O arquivo `.env.example` contém apenas um modelo.

Habilite a variável para **Production**. Se quiser colaboração nos deploys de **Preview**, configure-a também nesse ambiente, preferencialmente com um banco separado; a mesma URI compartilha os mesmos comentários. Não é necessário configurar `PORT`, chaves públicas do Supabase ou URL de API: o frontend usa `/api` no próprio domínio.

Clique em **Deploy**. Após a publicação:

1. Abra a URL e confira a apresentação e o logotipo.
2. Acesse `https://SEU-DOMINIO/api/health`: com o banco configurado, deve retornar `{"ok":true,"db":true}`.
3. Confira o selo **Colaboração online** e crie um comentário; ele deve aparecer em outro navegador.

Sem `DATABASE_URL`, a apresentação funciona, mas os comentários ficam no navegador, sem sincronização. Se `db` retornar `false` mesmo com a variável cadastrada, confira a URI/senha, o estado do projeto Supabase e os logs da função na Vercel. A aplicação cria a tabela e o índice automaticamente, então o usuário do banco precisa ter permissão para isso. Após alterar variáveis, faça um novo deploy e recarregue a página.

O servidor aguarda a inicialização do banco nas primeiras requisições de API e tenta novamente na próxima requisição se houver falha. O build não precisa de conexão com o banco. Apenas `index.html` e `assets/` são publicados como arquivos estáticos.

Referências: [Express na Vercel](https://vercel.com/docs/frameworks/backend/express) e [conexões PostgreSQL do Supabase](https://supabase.com/docs/guides/database/connecting-to-postgres).

## Deploy no Replit

1. Crie um Repl **Node.js** (ou importe este repositório).
2. Em **Secrets** (cadeado no menu lateral), adicione:
   - `DATABASE_URL` → string de conexão do Supabase no modo **Transaction Pooler (porta 6543)**.
     Exemplo: `postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`
3. Clique em **Run**. O servidor:
   - cria automaticamente a tabela `franquias_comments` no Supabase (não é preciso rodar SQL manual);
   - serve a apresentação na URL pública do Repl.
4. Compartilhe a URL com o grupo — sem login; cada pessoa informa o nome no primeiro comentário.

## Uso durante as discussões / apresentação

- **← / →** navegam entre slides; **C** abre o painel de comentários do slide; **G** abre a captura rápida "Pedido do Gustavo".
- Bolinhas de navegação mostram contadores de comentários abertos por slide.
- Botão **"Todos os comentários"** (rodapé): visão consolidada com filtros e **exportação em Markdown** (insumo para a próxima reunião de trabalho).
- Comentários sincronizam entre participantes a cada ~5s.

## Modo local (fallback)

Se o site for aberto sem servidor/banco (ex.: `index.html` direto no navegador), a colaboração funciona em **modo local** (localStorage) com export/import de JSON — indicado no selo no canto superior esquerdo.

## Rodar localmente

```bash
npm install
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres" npm start
# sem DATABASE_URL o site sobe igualmente, em modo local
open http://localhost:5000
```

Para verificar os ajustes de deploy, execute `npm test` e `npm run build`. O build gera `public/`, ignorado pelo Git e recriado pela Vercel a cada deploy. Continue editando o `index.html` e os arquivos de `assets/` na raiz.
