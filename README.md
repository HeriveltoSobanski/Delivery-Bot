# Delivery-Bot

DeliveryBot é um projeto desenvolvido para a aula de **Desenvolvimento Web Mobile IV** (Tema 09), com foco no gerenciamento de pedidos de restaurante, fila de preparo para a cozinha e validação de área de entrega pelo CEP usando a API ViaCEP.

## Cenário

Restaurantes confirmam pedidos manualmente, um a um. O sistema permite:

- Cadastro de cardápio e pedidos
- Envio de confirmação do pedido, tempo estimado e aviso de "saiu para entrega"
- Fila de preparo visível para a cozinha
- Validação da área de entrega pelo CEP (2ª API: [ViaCEP](https://viacep.com.br/))

## Modelo do banco de dados (PostgreSQL)

| Tabela          | Descrição                                                  |
| --------------- | ----------------------------------------------------------- |
| `clientes`      | Nome, telefone, CEP, endereço, `discord_user_id` (vínculo) e `codigo_vinculo` (opt-in pendente) |
| `produtos`      | Itens do cardápio (nome, descrição, preço, disponibilidade) |
| `pedidos`       | Pedido de um cliente, com status e tempo estimado            |
| `itens_pedido`  | Produtos e quantidades de cada pedido                        |
| `fila_preparo`  | Fila de preparo da cozinha (posição e status)                 |
| `mensagens`     | Histórico de mensagens enviadas/recebidas (`direcao`) com status de envio (`status_envio`: `enfileirada`/`enviada`/`falha`/`respondida`) |

Schema versionado em [migrations/](migrations/) (aplicado com `node-pg-migrate`).

Fluxo de status do pedido: `recebido` → `confirmado` → `em_preparo` → `saiu_para_entrega` → `entregue`.

## Como rodar

### 1. Pré-requisitos

- Node.js
- PostgreSQL rodando localmente

### 2. Instalar dependências

```
npm install
```

### 3. Configurar variáveis de ambiente

Copie o template e preencha com as credenciais do seu Postgres local:

```
cp .env.example .env
```

Variáveis:

| Variável        | Descrição                                                             |
| --------------- | ---------------------------------------------------------------------- |
| `PGHOST`        | Host do Postgres (ex: `localhost`)                                     |
| `PGPORT`        | Porta do Postgres (padrão `5432`)                                      |
| `PGUSER`        | Usuário do Postgres                                                     |
| `PGPASSWORD`    | Senha do Postgres                                                       |
| `PGDATABASE`    | Nome do banco (crie-o antes: `createdb delivery_bot`)                   |
| `DATABASE_URL`  | String de conexão usada pelo `node-pg-migrate` (`postgresql://usuario:senha@host:porta/banco`) |
| `DELIVERY_UFS`  | UFs aceitas na área de entrega, separadas por vírgula (ex: `SP,PR`). Vazio aceita qualquer CEP válido. |

### 4. Aplicar as migrations

```
npm run migrate
```

As migrations ficam em [migrations/](migrations/), numeradas e versionadas (uma por mudança de schema). Para criar uma nova:
```
npm run migrate:create nome-da-migration
```

### 5. Rodar o servidor

```
npm start
```

Servidor disponível em `http://localhost:3000`.

## Rotas da API

### Cardápio (produtos)

| Método | Rota                 | Descrição            |
| ------ | --------------------- | --------------------- |
| GET    | `/api/produtos`        | Lista o cardápio      |
| POST   | `/api/produtos`        | Cadastra um produto   |
| PUT    | `/api/produtos/:id`    | Edita um produto      |
| DELETE | `/api/produtos/:id`    | Remove um produto     |

### Clientes

| Método | Rota                 | Descrição                                              |
| ------ | --------------------- | -------------------------------------------------------- |
| POST   | `/api/clientes`        | Cadastra cliente (valida o CEP e monta o endereço)        |
| GET    | `/api/clientes/:id`    | Consulta um cliente                                       |

### Pedidos

| Método | Rota                                  | Descrição                                                                 |
| ------ | -------------------------------------- | ---------------------------------------------------------------------------- |
| POST   | `/api/pedidos`                         | Cria pedido (valida CEP/área de entrega, monta itens, entra na fila e envia mensagem de confirmação) |
| GET    | `/api/pedidos/:id`                     | Consulta pedido, itens e histórico de mensagens                              |
| PUT    | `/api/pedidos/:id/confirmar`           | Restaurante confirma manualmente e define o tempo estimado                    |
| PUT    | `/api/pedidos/:id/saiu-para-entrega`   | Marca o pedido como saiu para entrega                                         |

### Fila de preparo (cozinha)

| Método | Rota                              | Descrição                                             |
| ------ | ----------------------------------- | -------------------------------------------------------- |
| GET    | `/api/fila-preparo`                | Lista a fila de preparo em ordem, com os itens de cada pedido |
| PUT    | `/api/fila-preparo/:id/status`      | Cozinha atualiza o status (`aguardando`, `preparando`, `pronto`) |

### CEP (ViaCEP)

| Método | Rota            | Descrição                          |
| ------ | ---------------- | ------------------------------------ |
| GET    | `/api/cep/:cep`  | Consulta endereço a partir de um CEP |

## Exemplo de fluxo completo

```powershell
# 1. Cadastrar produto
Invoke-RestMethod -Method Post http://localhost:3000/api/produtos -ContentType "application/json" -Body (@{ nome="Pizza Marguerita"; preco=39.90 } | ConvertTo-Json)

# 2. Cadastrar cliente
Invoke-RestMethod -Method Post http://localhost:3000/api/clientes -ContentType "application/json" -Body (@{ nome="João"; telefone="41999999999"; cep="80010000" } | ConvertTo-Json)

# 3. Criar pedido
Invoke-RestMethod -Method Post http://localhost:3000/api/pedidos -ContentType "application/json" -Body (@{ cliente_id=1; cep_entrega="80010000"; itens=@(@{produto_id=1; quantidade=2}) } | ConvertTo-Json -Depth 5)

# 4. Restaurante confirma
Invoke-RestMethod -Method Put http://localhost:3000/api/pedidos/1/confirmar -ContentType "application/json" -Body (@{ tempo_estimado_min=30 } | ConvertTo-Json)

# 5. Cozinha vê a fila e marca como preparando
Invoke-RestMethod http://localhost:3000/api/fila-preparo
Invoke-RestMethod -Method Put http://localhost:3000/api/fila-preparo/1/status -ContentType "application/json" -Body (@{ status="preparando" } | ConvertTo-Json)

# 6. Pedido sai para entrega
Invoke-RestMethod -Method Put http://localhost:3000/api/pedidos/1/saiu-para-entrega

# 7. Consultar histórico do pedido
Invoke-RestMethod http://localhost:3000/api/pedidos/1
```

## Testes automatizados

Os testes usam Jest + Supertest contra um banco de dados **de teste separado** (para não bagunçar os dados que você cria manualmente).

### 1. Criar o banco de teste

```
createdb delivery_bot_test
```

### 2. Configurar o `.env.test`

```
cp .env.test.example .env.test
```
Preencha com as mesmas credenciais do seu Postgres local (só o `PGDATABASE`/`DATABASE_URL` mudam para `delivery_bot_test`).

### 3. Rodar os testes

```
npm test
```

Isso aplica as migrations no banco de teste automaticamente (`pretest`) e roda os testes, que cobrem:
- CRUD de produtos (`test/produtos.test.js`)
- Fluxo completo de pedido: criação, validação de itens, confirmação, fila de preparo e "saiu para entrega" (`test/pedidos.test.js`)
- Validação de CEP e área de entrega (`test/viacep.test.js`)

Cada teste começa com o banco de teste limpo (`TRUNCATE` nas tabelas). A chamada real ao ViaCEP é mockada nos testes de pedidos para não depender de internet.
