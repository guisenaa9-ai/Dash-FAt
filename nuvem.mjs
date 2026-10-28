// O plano gratuito do Render apaga o disco ao hibernar. Com DATABASE_URL, o arquivo
// SQLite é restaurado do Postgres (Neon) ao iniciar e copiado de volta a cada alteração.
// shortcut: envia o banco inteiro e supõe uma única instância; troque por disco
// persistente ou Postgres nativo se o banco passar de ~100 MB ou houver várias instâncias.
import fs from 'node:fs';
import pg from 'pg';

const url = process.env.DATABASE_URL;
const pool = url ? new pg.Pool({connectionString: url, max: 1}) : null;

export async function restore(file) {
  if (!pool) return;
  // Uma falha aqui interrompe o início: nunca subir vazio e sobrescrever a cópia salva.
  await pool.query('CREATE TABLE IF NOT EXISTS dashboard_snapshot(id integer PRIMARY KEY, bytes bytea NOT NULL, saved_at timestamptz NOT NULL)');
  const {rows} = await pool.query('SELECT bytes, saved_at FROM dashboard_snapshot WHERE id = 1');
  if (!rows.length) return;
  if (fs.existsSync(file)) fs.renameSync(file, file + '.antes-da-restauracao-' + Date.now());
  for (const extra of [file + '-wal', file + '-shm']) fs.rmSync(extra, {force: true});
  fs.writeFileSync(file, rows[0].bytes, {mode: 0o600});
  console.log('Banco restaurado do Neon (cópia de ' + rows[0].saved_at.toISOString() + ').');
}

export function startSync(db, file) {
  if (!pool) return;
  const changes = () => db.prepare('SELECT total_changes() AS n').get().n;
  const temporary = file + '.envio';
  let saved = changes();
  let busy = false;

  async function save() {
    const current = changes();
    if (busy || current === saved) return;
    busy = true;
    try {
      fs.rmSync(temporary, {force: true});
      db.exec("VACUUM INTO '" + temporary.replaceAll("'", "''") + "'");
      await pool.query(
        'INSERT INTO dashboard_snapshot VALUES (1, $1, now()) ON CONFLICT (id) DO UPDATE SET bytes = excluded.bytes, saved_at = excluded.saved_at',
        [fs.readFileSync(temporary)]
      );
      saved = current;
    } catch (error) {
      console.error('Falha ao salvar o banco no Neon; nova tentativa em instantes:', error.message);
    } finally {
      fs.rmSync(temporary, {force: true});
      busy = false;
    }
  }

  setInterval(save, 2000).unref();
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, async () => {
      while (busy) await new Promise(resolve => setTimeout(resolve, 100));
      await save();
      process.exit(0);
    });
  }
}
