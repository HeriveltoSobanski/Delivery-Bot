const request = require('supertest');
const app = require('../app');
const pool = require('../db');
const { resetDb } = require('./testDb');

beforeEach(resetDb);
afterAll(() => pool.end());

describe('API de produtos', () => {
  test('cria e lista produtos', async () => {
    const criar = await request(app).post('/api/produtos').send({ nome: 'Pizza Marguerita', preco: 39.9 });

    expect(criar.status).toBe(201);
    expect(criar.body).toMatchObject({ nome: 'Pizza Marguerita', disponivel: true });

    const listar = await request(app).get('/api/produtos');
    expect(listar.status).toBe(200);
    expect(listar.body).toHaveLength(1);
  });

  test('exige nome e preco', async () => {
    const resposta = await request(app).post('/api/produtos').send({ descricao: 'sem nome nem preco' });
    expect(resposta.status).toBe(400);
  });

  test('edita produto', async () => {
    const criar = await request(app).post('/api/produtos').send({ nome: 'Coca-Cola', preco: 10 });

    const editar = await request(app).put(`/api/produtos/${criar.body.id}`).send({ preco: 12 });
    expect(editar.status).toBe(200);
    expect(Number(editar.body.preco)).toBe(12);
  });

  test('remove produto', async () => {
    const criar = await request(app).post('/api/produtos').send({ nome: 'Suco', preco: 8 });

    const deletar = await request(app).delete(`/api/produtos/${criar.body.id}`);
    expect(deletar.status).toBe(204);

    const listar = await request(app).get('/api/produtos');
    expect(listar.body).toHaveLength(0);
  });

  test('404 ao editar produto inexistente', async () => {
    const resposta = await request(app).put('/api/produtos/9999').send({ preco: 1 });
    expect(resposta.status).toBe(404);
  });
});
