const fetch = require('node-fetch');

async function buscarEnderecoPorCep(cepBruto) {
  const cep = String(cepBruto).replace(/\D/g, '');

  if (cep.length !== 8) {
    return { valido: false, motivo: 'CEP deve conter 8 dígitos' };
  }

  const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
  const data = await response.json();

  if (data.erro) {
    return { valido: false, motivo: 'CEP não encontrado' };
  }

  return {
    valido: true,
    endereco: {
      cep,
      logradouro: data.logradouro,
      bairro: data.bairro,
      cidade: data.localidade,
      uf: data.uf,
    },
  };
}

function dentroDaAreaDeEntrega(endereco) {
  const ufsPermitidas = (process.env.DELIVERY_UFS || '')
    .split(',')
    .map((uf) => uf.trim().toUpperCase())
    .filter(Boolean);

  if (ufsPermitidas.length === 0) return true;
  return ufsPermitidas.includes(endereco.uf.toUpperCase());
}

module.exports = { buscarEnderecoPorCep, dentroDaAreaDeEntrega };
