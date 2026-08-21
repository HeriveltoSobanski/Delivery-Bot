const pool = require('../db');

async function resetDb() {
  await pool.query(
    'TRUNCATE TABLE mensagens, fila_preparo, itens_pedido, pedidos, produtos, clientes RESTART IDENTITY CASCADE'
  );
}

module.exports = { resetDb };
