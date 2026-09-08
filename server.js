/**
 * Modelo de Franquias · Foundation LYNN — servidor de apresentação + colaboração
 *
 * - Serve o deck (index.html) como estático
 * - API REST de comentários persistidos no Supabase Postgres
 * - Conexão via secret DATABASE_URL (Transaction Pooler, porta 6543)
 *
 * Endpoints:
 *   GET    /api/health            → { ok, db }
 *   GET    /api/comments          → lista completa
 *   POST   /api/comments          → cria comentário
 *   PATCH  /api/comments/:id      → atualiza status (aberto|resolvido)
 */

const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
app.use(express.json({ limit: '256kb' }));

const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;
let dbReady = false;

if (DATABASE_URL) {
  const isLocal = /localhost|127\.0\.0\.1/.test(DATABASE_URL);
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isLocal ? false : { rejectUnauthorized: false }, // Supabase pooler exige TLS
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  pool.on('error', (err) => console.error('[pg] pool error:', err.message));
}

const CATEGORIES = ['comentario', 'pergunta', 'ajuste', 'gustavo'];
const STATUSES = ['aberto', 'resolvido'];

async function bootstrap() {
  if (!pool) {
    console.warn('[db] DATABASE_URL não definido — API responderá db:false (frontend usa modo local).');
    return;
  }
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.franquias_comments (
        id         uuid PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now(),
        slide_id   text        NOT NULL,
        author     text        NOT NULL,
        category   text        NOT NULL,
        content    text        NOT NULL,
        status     text        NOT NULL DEFAULT 'aberto',
        parent_id  uuid        NULL REFERENCES public.franquias_comments(id) ON DELETE CASCADE
      );
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS franquias_comments_slide_idx
        ON public.franquias_comments (slide_id, created_at);
    `);
    dbReady = true;
    console.log('[db] conectado ao Supabase — tabela franquias_comments pronta.');
  } catch (err) {
    console.error('[db] falha ao inicializar:', err.message);
    dbReady = false;
    // tenta novamente em 15s (útil em cold start do pooler)
    setTimeout(bootstrap, 15000);
  }
}

/* ---------- API ---------- */

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: dbReady });
});

app.get('/api/comments', async (_req, res) => {
  if (!dbReady) return res.status(503).json({ error: 'db_unavailable' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM public.franquias_comments ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error('[api] GET comments:', err.message);
    res.status(500).json({ error: 'query_failed' });
  }
});

app.post('/api/comments', async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: 'db_unavailable' });
  const { id, slide_id, author, category, content, parent_id } = req.body || {};
  if (!id || !slide_id || !author || !content) {
    return res.status(400).json({ error: 'missing_fields' });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ error: 'invalid_category' });
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO public.franquias_comments
         (id, slide_id, author, category, content, status, parent_id)
       VALUES ($1,$2,$3,$4,$5,'aberto',$6)
       RETURNING *`,
      [id, String(slide_id).slice(0, 40), String(author).slice(0, 80),
       category, String(content).slice(0, 4000), parent_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[api] POST comment:', err.message);
    res.status(500).json({ error: 'insert_failed' });
  }
});

app.patch('/api/comments/:id', async (req, res) => {
  if (!dbReady) return res.status(503).json({ error: 'db_unavailable' });
  const { status } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'invalid_status' });
  try {
    const { rows } = await pool.query(
      'UPDATE public.franquias_comments SET status=$1 WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'not_found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[api] PATCH comment:', err.message);
    res.status(500).json({ error: 'update_failed' });
  }
});

/* ---------- estático ---------- */

app.use(express.static(path.join(__dirname), { index: 'index.html', extensions: ['html'] }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[web] apresentação disponível em http://0.0.0.0:${PORT}`);
  bootstrap();
});
