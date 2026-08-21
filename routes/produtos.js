const express = require('express');
const pool = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM produtos ORDER BY id');
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { nome, descricao, preco, disponivel } = req.body;

  if (!nome || preco === undefined) {
    return res.status(400).json({ erro: true, mensagem: 'nome e preco são obrigatórios' });
  }

  const { rows } = await pool.query(
    'INSERT INTO produtos (nome, descricao, preco, disponivel) VALUES ($1, $2, $3, COALESCE($4, TRUE)) RETURNING *',
    [nome, descricao || null, preco, disponivel]
  );
  res.status(201).json(rows[0]);
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, preco, disponivel } = req.body;

  const { rows } = await pool.query(
    `UPDATE produtos SET
      nome = COALESCE($1, nome),
      descricao = COALESCE($2, descricao),
      preco = COALESCE($3, preco),
      disponivel = COALESCE($4, disponivel)
     WHERE id = $5
     RETURNING *`,
    [nome, descricao, preco, disponivel, id]
  );

  if (rows.length === 0) {
    return res.status(404).json({ erro: true, mensagem: 'Produto não encontrado' });
  }
  res.json(rows[0]);
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query('DELETE FROM produtos WHERE id = $1', [id]);

  if (rowCount === 0) {
    return res.status(404).json({ erro: true, mensagem: 'Produto não encontrado' });
  }
  res.status(204).send();
});

module.exports = router;
