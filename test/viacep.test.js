const { buscarEnderecoPorCep, dentroDaAreaDeEntrega } = require('../utils/viacep');

describe('buscarEnderecoPorCep', () => {
  test('recusa CEP com tamanho inválido sem chamar a rede', async () => {
    const resultado = await buscarEnderecoPorCep('123');
    expect(resultado.valido).toBe(false);
  });
});

describe('dentroDaAreaDeEntrega', () => {
  const originalEnv = process.env.DELIVERY_UFS;

  afterEach(() => {
    process.env.DELIVERY_UFS = originalEnv;
  });

  test('aceita qualquer UF quando DELIVERY_UFS não está definido', () => {
    delete process.env.DELIVERY_UFS;
    expect(dentroDaAreaDeEntrega({ uf: 'SP' })).toBe(true);
  });

  test('aceita UF que está na lista', () => {
    process.env.DELIVERY_UFS = 'PR,SP';
    expect(dentroDaAreaDeEntrega({ uf: 'pr' })).toBe(true);
  });

  test('recusa UF fora da lista', () => {
    process.env.DELIVERY_UFS = 'PR';
    expect(dentroDaAreaDeEntrega({ uf: 'RJ' })).toBe(false);
  });
});
