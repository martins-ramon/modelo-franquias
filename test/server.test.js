const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

// Carrega cada instância com ambiente e banco isolados, sem acessar o Supabase.
function loadApp(query) {
  const module = { exports: {} };
  class Pool {
    on() {}
    query(sql, params) { return query(sql, params); }
  }
  vm.runInNewContext(readFileSync(path.join(root, 'server.js'), 'utf8'), {
    require: (name) => name === 'pg' ? { Pool } : require(name),
    module,
    __dirname: root,
    process: { env: query ? { DATABASE_URL: 'postgresql://localhost/test' } : {} },
    console: { log() {}, warn() {}, error() {} },
  });
  return module.exports;
}

async function serve(t, app) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return `http://127.0.0.1:${server.address().port}`;
}

test('sem banco: serve apresentação e imagens, mantém fallback e não expõe arquivos internos', async t => {
  const base = await serve(t, loadApp());
  for (const url of ['/', '/index.html', '/assets/totvs-logo-transparente.png']) {
    assert.equal((await fetch(base + url)).status, 200, url);
  }
  for (const url of ['/server.js', '/package.json', '/README.md', '/ai-context/starship_modelo_de_franquias_transcricao.md']) {
    assert.equal((await fetch(base + url)).status, 404, url);
  }
  const health = await fetch(base + '/api/health');
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await health.json(), { ok: true, db: false });
  assert.equal((await fetch(base + '/api/comments')).status, 503);
});

test('cold start: requisições simultâneas aguardam uma única inicialização do banco', async t => {
  let release;
  const ready = new Promise(resolve => { release = resolve; });
  let tableCreates = 0;
  let indexCreates = 0;
  const base = await serve(t, loadApp(async sql => {
    if (sql.includes('CREATE TABLE')) { tableCreates++; await ready; }
    if (sql.includes('CREATE INDEX')) indexCreates++;
    return { rows: [] };
  }));
  const requests = Promise.all([
    fetch(base + '/api/health'),
    fetch(base + '/api/health'),
    fetch(base + '/api/comments'),
  ]);
  t.after(() => release());
  // Simula latência real na conexão inicial.
  await new Promise(resolve => setTimeout(resolve, 50));
  release();
  const [first, second, comments] = await requests;
  assert.deepEqual(await first.json(), { ok: true, db: true });
  assert.deepEqual(await second.json(), { ok: true, db: true });
  assert.equal(comments.status, 200);
  assert.deepEqual(await comments.json(), []);
  assert.equal(tableCreates, 1);
  assert.equal(indexCreates, 1);
});

test('falha inicial: retorna fallback e recupera o banco na próxima requisição sem timer', async t => {
  let attempts = 0;
  const base = await serve(t, loadApp(async sql => {
    if (sql.includes('CREATE TABLE') && ++attempts === 1) throw new Error('pooler indisponível');
    return { rows: [] };
  }));
  assert.deepEqual(await (await fetch(base + '/api/health')).json(), { ok: true, db: false });
  assert.deepEqual(await (await fetch(base + '/api/health')).json(), { ok: true, db: true });
  assert.equal(attempts, 2);
});
