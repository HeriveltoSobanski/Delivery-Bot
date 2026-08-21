jest.mock('../utils/viacep', () => ({
  buscarEnderecoPorCep: jest.fn().mockResolvedValue({
    valido: true,
    endereco: { cep: '80010000', logradouro: 'Rua X', bairro: 'Centro', cidade: 'Curitiba', uf: 'PR' },
  }),
  dentroDaAreaDeEntrega: jest.fn().mockReturnValue(true),
}));

const request = require('supertest');
const app = require('../app');
const pool = require('../db');
const { resetDb } = require('./testDb');

beforeEach(resetDb);
afterAll(() => pool.end());

async function criarClienteEProduto() {
  const cliente = await request(app).post('/api/clientes').send({ nome: 'João', cep: '80010000' });
  const produto = await request(app).post('/api/produtos').send({ nome: 'Pizza', preco: 30 });
  return { clienteId: cliente.body.id, produtoId: produto.body.id };
}

describe('Fluxo completo de pedido', () => {
  test('cria pedido, confirma, prepara e sai para entrega', async () => {
    const { clienteId, produtoId } = await criarClienteEProduto();

    const pedido = await request(app)
      .post('/api/pedidos')
      .send({ cliente_id: clienteId, cep_entrega: '80010000', itens: [{ produto_id: produtoId, quantidade: 2 }] });

    expect(pedido.status).toBe(201);
    expect(pedido.body.status).toBe('recebido');
    expect(pedido.body.itens).toHaveLength(1);

    const pedidoId = pedido.body.id;

    const fila = await request(app).get('/api/fila-preparo');
    expect(fila.body).toHaveLength(1);
    const filaId = fila.body[0].id;

    const confirmar = await request(app)
      .put(`/api/pedidos/${pedidoId}/confirmar`)
      .send({ tempo_estimado_min: 30 });
    expect(confirmar.status).toBe(200);
    expect(confirmar.body.status).toBe('confirmado');

    const preparando = await request(app)
      .put(`/api/fila-preparo/${filaId}/status`)
      .send({ status: 'preparando' });
    expect(preparando.status).toBe(200);

    const pedidoEmPreparo = await request(app).get(`/api/pedidos/${pedidoId}`);
    expect(pedidoEmPreparo.body.status).toBe('em_preparo');

    const saiuParaEntrega = await request(app).put(`/api/pedidos/${pedidoId}/saiu-para-entrega`);
    expect(saiuParaEntrega.status).toBe(200);
    expect(saiuParaEntrega.body.status).toBe('saiu_para_entrega');

    const filaFinal = await request(app).get('/api/fila-preparo');
    expect(filaFinal.body).toHaveLength(0);

    const pedidoFinal = await request(app).get(`/api/pedidos/${pedidoId}`);
    expect(pedidoFinal.body.mensagens.map((m) => m.tipo)).toEqual([
      'confirmacao',
      'tempo_estimado',
      'saiu_para_entrega',
    ]);
  });

  test('recusa pedido com produto inexistente', async () => {
    const { clienteId } = await criarClienteEProduto();

    const pedido = await request(app)
      .post('/api/pedidos')
      .send({ cliente_id: clienteId, cep_entrega: '80010000', itens: [{ produto_id: 9999, quantidade: 1 }] });

    expect(pedido.status).toBe(400);
  });
});
