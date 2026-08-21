const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const filaResult = await pool.query(
    `SELECT fp.id, fp.pedido_id, fp.posicao, fp.status, p.status AS status_pedido, p.criado_em
     FROM fila_preparo fp
     JOIN pedidos p ON p.id = fp.pedido_id
     ORDER BY fp.posicao`
  );

  const fila = [];
  for (const item of filaResult.rows) {
    const itensResult = await pool.query(
      `SELECT ip.quantidade, pr.nome AS produto_nome
       FROM itens_pedido ip
       JOIN produtos pr ON pr.id = ip.produto_id
       WHERE ip.pedido_id = $1`,
      [item.pedido_id]
    );
    fila.push({ ...item, itens: itensResult.rows });
  }

  res.json(fila);
});

router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidos = ['aguardando', 'preparando', 'pronto'];
  if (!statusValidos.includes(status)) {
    return res
      .status(400)
      .json({ erro: true, mensagem: `status deve ser um de: ${statusValidos.join(', ')}` });
  }

  const filaResult = await pool.query(
    'UPDATE fila_preparo SET status = $1 WHERE id = $2 RETURNING *',
    [status, id]
  );

  if (filaResult.rows.length === 0) {
    return res.status(404).json({ erro: true, mensagem: 'Item da fila não encontrado' });
  }

  const item = filaResult.rows[0];

  if (status === 'preparando') {
    await pool.query(
      "UPDATE pedidos SET status = 'em_preparo' WHERE id = $1 AND status = 'confirmado'",
      [item.pedido_id]
    );
  }

  res.json(item);
});

module.exports = router;
