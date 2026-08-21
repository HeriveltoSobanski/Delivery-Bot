const fs = require('fs');
const path = require('path');
const pool = require('./index');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('Schema aplicado com sucesso.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Falha ao aplicar schema:', err.message);
  process.exit(1);
});
