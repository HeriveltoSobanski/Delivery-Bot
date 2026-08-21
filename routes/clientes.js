const express = require('express');
const pool = require('../db');
const { buscarEnderecoPorCep } = require('../utils/viacep');

const router = express.Router();

router.post('/', async (req, res) => {
  const { nome, telefone, cep } = req.body;

  if (!nome || !cep) {
    return res.status(400).json({ erro: true, mensagem: 'nome e cep são obrigatórios' });
  }

  const resultado = await buscarEnderecoPorCep(cep);
  if (!resultado.valido) {
    return res.status(400).json({ erro: true, mensagem: resultado.motivo });
  }

  const { cep: cepFormatado, logradouro, bairro, cidade, uf } = resultado.endereco;
  const endereco = `${logradouro}, ${bairro}, ${cidade} - ${uf}`;

  const { rows } = await pool.query(
    'INSERT INTO clientes (nome, telefone, cep, endereco) VALUES ($1, $2, $3, $4) RETURNING *',
    [nome, telefone || null, cepFormatado, endereco]
  );

  res.status(201).json(rows[0]);
});

router.get('/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM clientes WHERE id = $1', [req.params.id]);

  if (rows.length === 0) {
    return res.status(404).json({ erro: true, mensagem: 'Cliente não encontrado' });
  }
  res.json(rows[0]);
});

module.exports = router;
