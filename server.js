const express = require('express');
const path = require('path');
const produtosRouter = require('./routes/produtos');
const clientesRouter = require('./routes/clientes');
const pedidosRouter = require('./routes/pedidos');
const filaPreparoRouter = require('./routes/filaPreparo');
const { buscarEnderecoPorCep } = require('./utils/viacep');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/produtos', produtosRouter);
app.use('/api/clientes', clientesRouter);
app.use('/api/pedidos', pedidosRouter);
app.use('/api/fila-preparo', filaPreparoRouter);

app.get('/api/cep/:cep', async (req, res) => {
  try {
    const resultado = await buscarEnderecoPorCep(req.params.cep);

    if (!resultado.valido) {
      return res.status(400).json({ erro: true, mensagem: resultado.motivo });
    }

    res.json(resultado.endereco);
  } catch (err) {
    res.status(500).json({ erro: true, mensagem: 'Falha ao consultar ViaCEP' });
  }
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
