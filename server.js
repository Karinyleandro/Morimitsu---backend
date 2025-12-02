import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import swaggerJsDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

import authRoutes from "./src/routes/auth_routes.js";
import usuarioRoutes from "./src/routes/usuario_routes.js";
import turmaRoutes from "./src/routes/turmas_routes.js";
import responsavelRoutes from "./src/routes/responsavel_routes.js";
import faixaRoutes from "./src/routes/turmas_routes.js";
//import graduacaoRoutes from "./src/routes/graduacao_routes.js";

// import alunoRoutes from "./src/routes/aluno_routes.js";

dotenv.config();

const app = express();


app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`\n[${req.method}] ${req.url}`);
  console.log("Headers:", req.headers["content-type"]);
  console.log("Body recebido:", req.body);
  next();
});

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "API Morimitsu",
      version: "1.0.0",
      description: "Documentação da API Morimitsu",
    },
    servers: [
     {url: process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 3000}`,},],
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
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/auth", authRoutes);
app.use("/usuarios", usuarioRoutes);
app.use("/turmas", turmaRoutes);
app.use("/responsaveis", responsavelRoutes);
app.use("/faixas", faixaRoutes);
//app.use("/graduacoes", graduacaoRoutes);
// app.use("/alunos", alunoRoutes);

app.get("/", (req, res) => {
  res.send(" API Morimitsu está rodando!");
});

app.use((req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
});

app.use((err, req, res, next) => {
  console.error(" Erro não tratado:", err);
  res.status(500).json({ message: "Erro interno do servidor" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n Servidor rodando na porta ${PORT}`);
  console.log(` Documentação Swagger disponível em ${process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`}/docs\n`);
});