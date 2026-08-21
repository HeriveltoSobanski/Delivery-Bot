const express = require('express');
const pool = require('../db');
const { buscarEnderecoPorCep, dentroDaAreaDeEntrega } = require('../utils/viacep');

const router = express.Router();

router.post('/', async (req, res) => {
  const { cliente_id, cep_entrega, itens } = req.body;

  if (!cliente_id || !cep_entrega || !Array.isArray(itens) || itens.length === 0) {
    return res
      .status(400)
      .json({ erro: true, mensagem: 'cliente_id, cep_entrega e itens são obrigatórios' });
  }

  const cepValidado = await buscarEnderecoPorCep(cep_entrega);
  if (!cepValidado.valido) {
    return res.status(400).json({ erro: true, mensagem: cepValidado.motivo });
  }
  if (!dentroDaAreaDeEntrega(cepValidado.endereco)) {
    return res.status(400).json({ erro: true, mensagem: 'CEP fora da área de entrega' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const clienteResult = await client.query('SELECT id FROM clientes WHERE id = $1', [cliente_id]);
    if (clienteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ erro: true, mensagem: 'Cliente não encontrado' });
    }

    const pedidoResult = await client.query(
      'INSERT INTO pedidos (cliente_id, cep_entrega) VALUES ($1, $2) RETURNING *',
      [cliente_id, cepValidado.endereco.cep]
    );
    const pedido = pedidoResult.rows[0];

    const itensSalvos = [];
    for (const item of itens) {
      const produtoResult = await client.query(
        'SELECT id, preco, disponivel FROM produtos WHERE id = $1',
        [item.produto_id]
      );
      if (produtoResult.rows.length === 0) {
        throw new Error(`Produto ${item.produto_id} não encontrado`);
      }

      const produto = produtoResult.rows[0];
      if (!produto.disponivel) {
        throw new Error(`Produto ${item.produto_id} indisponível`);
      }

      const itemResult = await client.query(
        `INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [pedido.id, produto.id, item.quantidade, produto.preco]
      );
      itensSalvos.push(itemResult.rows[0]);
    }

    const posicaoResult = await client.query(
      'SELECT COALESCE(MAX(posicao), 0) + 1 AS proxima FROM fila_preparo'
    );
    await client.query('INSERT INTO fila_preparo (pedido_id, posicao) VALUES ($1, $2)', [
      pedido.id,
      posicaoResult.rows[0].proxima,
    ]);

    const mensagemConfirmacao = `Pedido #${pedido.id} recebido! Assim que o restaurante confirmar, você receberá o tempo estimado.`;
    await client.query(
      "INSERT INTO mensagens (pedido_id, tipo, conteudo) VALUES ($1, 'confirmacao', $2)",
      [pedido.id, mensagemConfirmacao]
    );

    await client.query('COMMIT');

    res.status(201).json({ ...pedido, itens: itensSalvos, mensagem: mensagemConfirmacao });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(400).json({ erro: true, mensagem: err.message });
  } finally {
    client.release();
  }
});

router.get('/:id', async (req, res) => {
  const { id } = req.params;

  const pedidoResult = await pool.query('SELECT * FROM pedidos WHERE id = $1', [id]);
  if (pedidoResult.rows.length === 0) {
    return res.status(404).json({ erro: true, mensagem: 'Pedido não encontrado' });
  }

  const itensResult = await pool.query(
    `SELECT ip.*, p.nome AS produto_nome FROM itens_pedido ip
     JOIN produtos p ON p.id = ip.produto_id
     WHERE ip.pedido_id = $1`,
    [id]
  );

  const mensagensResult = await pool.query(
    'SELECT * FROM mensagens WHERE pedido_id = $1 ORDER BY enviado_em',
    [id]
  );

  res.json({ ...pedidoResult.rows[0], itens: itensResult.rows, mensagens: mensagensResult.rows });
});

router.put('/:id/confirmar', async (req, res) => {
  const { id } = req.params;
  const { tempo_estimado_min } = req.body;

  if (!tempo_estimado_min) {
    return res.status(400).json({ erro: true, mensagem: 'tempo_estimado_min é obrigatório' });
  }

  const pedidoResult = await pool.query(
    `UPDATE pedidos SET status = 'confirmado', tempo_estimado_min = $1
     WHERE id = $2 AND status = 'recebido' RETURNING *`,
    [tempo_estimado_min, id]
  );

  if (pedidoResult.rows.length === 0) {
    return res.status(404).json({ erro: true, mensagem: 'Pedido não encontrado ou já confirmado' });
  }

  const mensagem = `Pedido #${id} confirmado! Tempo estimado: ${tempo_estimado_min} minutos.`;
  await pool.query(
    "INSERT INTO mensagens (pedido_id, tipo, conteudo) VALUES ($1, 'tempo_estimado', $2)",
    [id, mensagem]
  );

  res.json({ ...pedidoResult.rows[0], mensagem });
});

router.put('/:id/saiu-para-entrega', async (req, res) => {
  const { id } = req.params;

  const pedidoResult = await pool.query(
    `UPDATE pedidos SET status = 'saiu_para_entrega'
     WHERE id = $1 AND status IN ('confirmado', 'em_preparo') RETURNING *`,
    [id]
  );

  if (pedidoResult.rows.length === 0) {
    return res.status(404).json({ erro: true, mensagem: 'Pedido não encontrado ou em status inválido' });
  }

  const mensagem = `Pedido #${id} saiu para entrega!`;
  await pool.query(
    "INSERT INTO mensagens (pedido_id, tipo, conteudo) VALUES ($1, 'saiu_para_entrega', $2)",
    [id, mensagem]
  );

  await pool.query('DELETE FROM fila_preparo WHERE pedido_id = $1', [id]);

  res.json({ ...pedidoResult.rows[0], mensagem });
});

module.exports = router;
