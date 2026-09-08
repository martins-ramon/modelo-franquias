# Modelo de Franquias · Foundation LYNN — Visão Executiva

Deck web interativo (9 slides) com mecanismo de colaboração (comentários, perguntas, ajustes e captura rápida de pedidos do Gustavo), persistido no Supabase Postgres.

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html` | Deck completo + UI de colaboração (arquivo único, sem build) |
| `server.js` | Servidor Node/Express: serve o deck e expõe a API `/api/comments` |
| `package.json` | Dependências (`express`, `pg`) |
| `.replit` | Configuração de execução no Replit |

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
