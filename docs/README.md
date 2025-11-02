# 🥋 MORIMITSU - BACKEND

API RESTful desenvolvida em **Node.js**, utilizando **Express** e **Prisma ORM**, com foco na gestão de usuários, turmas e autenticação para o sistema **Morimitsu**.

Hospedada na **Render** e integrada ao **Supabase (PostgreSQL)**.

---

## 🛠️ Tecnologias Principais

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![Zod](https://img.shields.io/badge/Zod-3066BE?style=for-the-badge)
![Dotenv](https://img.shields.io/badge/Dotenv-000000?style=for-the-badge&logo=dotenv&logoColor=white)
![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=black)

---

## 🧱 Arquitetura: MVC

O projeto segue o padrão **Model–View–Controller (MVC)**, garantindo separação clara entre responsabilidades:


---

## ⚙️ Ferramentas Utilizadas

| Categoria | Ferramenta |
|------------|-------------|
| **Linguagem** | JavaScript |
| **Servidor** | Express |
| **ORM** | Prisma |
| **Banco de Dados** | PostgreSQL (via Supabase) |
| **Validação** | Zod |
| **Documentação da API** | Swagger (swagger-ui-express + swagger-jsdoc) |
| **Variáveis de ambiente** | Dotenv |
| **Dev Tools** | ts-node-dev |
| **Hospedagem** | Render |

---
## 🚀 Como Rodar o Projeto

```yaml
setup:
  steps:
    - step: "1️⃣ Clonar o repositório"
      command: |
        git clone https://github.com/Karinyleandro/Morimitsu---backend.git
        cd Morimitsu---backend

    - step: "2️⃣ Instalar dependências"
      command: |
        npm install

    - step: "3️⃣ Configurar o ambiente"
      description: "Crie um arquivo .env na raiz do projeto com as seguintes variáveis:"
      env_file:
        DATABASE_URL: "postgresql://postgres.iwvzkazexfifcvdadyol:morimitsu123@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
        JWT_SECRET: "morimitsu123"
        JWT_EXPIRES_IN: "1h"
        PORT: 3000
        EMAIL_USER: "morimitsujiujitsu@gmail.com"
        EMAIL_PASS: "ggty llud wnjm vkjz"
        EMAIL_HOST: "smtp.gmail.com"
        EMAIL_PORT: 587

    - step: "4️⃣ Rodar as migrações do Prisma"
      command: |
        npx prisma migrate dev

    - step: "5️⃣ Iniciar o servidor"
      command: |
        node server.js
      note: "O servidor será iniciado em: http://localhost:3000"

documentation:
  swagger:
    local: "http://localhost:3000/docs"
    online: "https://morimitsu-backend.onrender.com/docs"
    description: "Inclui todos os endpoints, exemplos de requisição e resposta, e códigos de erro."

authentication:
  type: "JWT (JSON Web Token)"
  header:
    key: "Authorization"
    format: "Bearer <seu_token>"
  description: "A API utiliza JWT para autenticação e autorização. O token deve ser enviado no cabeçalho das requisições protegidas."

deploy:
  platform: "Render"
  database: "PostgreSQL (via Supabase)"
  env_variables:
    DATABASE_URL: "postgresql://postgres.iwvzkazexfifcvdadyol:morimitsu123@aws-1-us-east-2.pooler.supabase.com:5432/postgres"
    JWT_SECRET: "morimitsu123"
    JWT_EXPIRES_IN: "1h"
    PORT: 3000
    EMAIL_USER: "morimitsujiujitsu@gmail.com"
    EMAIL_PASS: "ggty llud wnjm vkjz"
    EMAIL_HOST: "smtp.gmail.com"
    EMAIL_PORT: 587
