-- Up Migration

ALTER TABLE clientes ADD COLUMN discord_user_id VARCHAR(32) UNIQUE;
ALTER TABLE clientes ADD COLUMN codigo_vinculo VARCHAR(10) UNIQUE;

ALTER TABLE mensagens ALTER COLUMN pedido_id DROP NOT NULL;

ALTER TABLE mensagens DROP CONSTRAINT mensagens_tipo_check;
ALTER TABLE mensagens ADD CONSTRAINT mensagens_tipo_check
  CHECK (tipo IN ('confirmacao', 'tempo_estimado', 'saiu_para_entrega', 'vinculo'));

ALTER TABLE mensagens ADD COLUMN direcao VARCHAR(10) NOT NULL DEFAULT 'saida'
  CHECK (direcao IN ('entrada', 'saida'));

ALTER TABLE mensagens ADD COLUMN status_envio VARCHAR(20) NOT NULL DEFAULT 'enfileirada'
  CHECK (status_envio IN ('enfileirada', 'enviada', 'falha', 'respondida'));

ALTER TABLE mensagens ADD COLUMN discord_message_id VARCHAR(32);

-- Down Migration

ALTER TABLE mensagens DROP COLUMN discord_message_id;
ALTER TABLE mensagens DROP COLUMN status_envio;
ALTER TABLE mensagens DROP COLUMN direcao;

ALTER TABLE mensagens DROP CONSTRAINT mensagens_tipo_check;
ALTER TABLE mensagens ADD CONSTRAINT mensagens_tipo_check
  CHECK (tipo IN ('confirmacao', 'tempo_estimado', 'saiu_para_entrega'));

ALTER TABLE mensagens ALTER COLUMN pedido_id SET NOT NULL;

ALTER TABLE clientes DROP COLUMN codigo_vinculo;
ALTER TABLE clientes DROP COLUMN discord_user_id;
