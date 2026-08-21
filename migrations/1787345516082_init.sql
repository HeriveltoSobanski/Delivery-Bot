-- Up Migration

CREATE TABLE IF NOT EXISTS clientes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  telefone VARCHAR(20),
  cep VARCHAR(8),
  endereco TEXT
);

CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(120) NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL,
  disponivel BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  cliente_id INTEGER NOT NULL REFERENCES clientes(id),
  status VARCHAR(20) NOT NULL DEFAULT 'recebido'
    CHECK (status IN ('recebido', 'confirmado', 'em_preparo', 'saiu_para_entrega', 'entregue')),
  tempo_estimado_min INTEGER,
  cep_entrega VARCHAR(8) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS itens_pedido (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  produto_id INTEGER NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(10,2) NOT NULL
);

CREATE TABLE IF NOT EXISTS fila_preparo (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  posicao INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aguardando'
    CHECK (status IN ('aguardando', 'preparando', 'pronto'))
);

CREATE TABLE IF NOT EXISTS mensagens (
  id SERIAL PRIMARY KEY,
  pedido_id INTEGER NOT NULL REFERENCES pedidos(id),
  tipo VARCHAR(30) NOT NULL
    CHECK (tipo IN ('confirmacao', 'tempo_estimado', 'saiu_para_entrega')),
  conteudo TEXT NOT NULL,
  enviado_em TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Down Migration

DROP TABLE IF EXISTS mensagens;
DROP TABLE IF EXISTS fila_preparo;
DROP TABLE IF EXISTS itens_pedido;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS produtos;
DROP TABLE IF EXISTS clientes;
