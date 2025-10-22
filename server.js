import express from 'express';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth_routes.js';
import cors from 'cors';
import usuarioRoutes from './src/routes/usuario_routes.js'
import turmaRoutes from './src/routes/turmas_routes.js';
//import AlunoRoutes from './src/routes/aluno_routes.js'
import swaggerJsDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

dotenv.config();

const app = express();

// Middleware essencial para parsear JSON
app.use(express.json());

app.use(cors());

// Middleware para logar o body (opcional, útil para debug)
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url} - Body:`, req.body);
  next();
});

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Morimitsu",
      version: "1.0.0",
      description: "Documentação das rotas da API Morimitsu",
    },
    servers: [{ url: "http://localhost:3000" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.js"],
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Rotas da API
app.use('/auth', authRoutes);
app.use('/usuarios', usuarioRoutes);
app.use('/turmas', turmaRoutes);
//app.use('/alunos', AlunoRoutes);

// Rota raiz
app.get('/', (req, res) => {
  res.send('API Morimitsu está rodando!');
});

// Middleware para 404
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// Middleware global de erros (opcional, para capturar erros não tratados)
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ message: 'Erro interno' });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Documentação Swagger disponível em http://localhost:${PORT}/docs`);
});
