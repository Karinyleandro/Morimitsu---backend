import express from "express";
const router = express.Router();

import { validateBody } from "../middlewares/zodMiddleware.js";

import {
  cadastrarAlunoSchema,
  editarAlunoSchema,
  atribuirFuncaoProfessorSchema
} from "../validations/aluno.validators.js";

import {
  criarAluno,
  atualizarAluno,
  deletarAluno,
  listarAlunos,
  detalhesAluno,
  promoverAluno,
  consultarFrequencias,
  consultarHistoricoFrequencias
} from "../controllers/aluno_controller.js";

import { authenticate, authorize } from "../middlewares/auth.middleware.js";

/**
 * @openapi
 * components:
 *   schemas:
 *     AlunoCadastro:
 *       type: object
 *       required:
 *         - nome
 *         - cpf
 *         - dataNascimento
 *         - genero
 *       properties:
 *         nome:
 *           type: string
 *           example: "Renato José de Souza"
 *         nome_social:
 *           type: string
 *           example: "Renatinho"
 *         cpf:
 *           type: string
 *           example: "12345678900"
 *         dataNascimento:
 *           type: string
 *           format: date
 *           example: "2008-12-07"
 *         genero:
 *           type: string
 *           example: "MASCULINO"
 *         telefone:
 *           type: string
 *           example: "(88) 99583-8843"
 *         endereco:
 *           type: string
 *           example: "Rua Obi Juci Diniz, 153 - Prado"
 *         imagem_perfil_url:
 *           type: string
 *           example: "https://cdn.site.com/fotos/renato.png"
 *         email:
 *           type: string
 *           example: "renato@gmail.com"
 *         password:
 *           type: string
 *           example: "Senha@123"
 *         tipo:
 *           type: string
 *           example: "COMUM"
 *         num_matricula:
 *           type: string
 *           example: "2025-001"
 *         id_faixa:
 *           type: integer
 *           example: 2
 *         cargo_aluno:
 *           type: string
 *           example: "ALUNO"
 *         responsaveis:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Maria Souza"
 *               telefone:
 *                 type: string
 *                 example: "(88) 99999-1111"
 *               grau_parentesco:
 *                 type: string
 *                 example: "MÃE"
 *               email:
 *                 type: string
 *                 example: "maria@gmail.com"
 *         turmaIds:
 *           type: array
 *           items:
 *             type: integer
 *           example: [1,2]
 * 
 *     AlunoEdicao:
 *       type: object
 *       properties:
 *         nome:
 *           type: string
 *           example: "Renato José de Souza"
 *         nome_social:
 *           type: string
 *           example: "Renatinho"
 *         cpf:
 *           type: string
 *           example: "12345678900"
 *         dataNascimento:
 *           type: string
 *           format: date
 *           example: "2008-12-07"
 *         genero:
 *           type: string
 *           example: "MASCULINO"
 *         telefone:
 *           type: string
 *           example: "(88) 99583-8843"
 *         endereco:
 *           type: string
 *           example: "Rua Obi Juci Diniz, 153 - Prado"
 *         imagem_perfil_url:
 *           type: string
 *           example: "https://cdn.site.com/fotos/renato.png"
 *         num_matricula:
 *           type: string
 *           example: "2025-001"
 *         id_faixa:
 *           type: integer
 *           example: 2
 *         cargo_aluno:
 *           type: string
 *           example: "ALUNO"
 *         ativo:
 *           type: boolean
 *           example: true
 *         responsaveis:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Maria Souza"
 *               telefone:
 *                 type: string
 *                 example: "(88) 99999-1111"
 *               grau_parentesco:
 *                 type: string
 *                 example: "MÃE"
 *               email:
 *                 type: string
 *                 example: "maria@gmail.com"
 *         turmaIds:
 *           type: array
 *           items:
 *             type: integer
 *           example: [1,2]
 * 
 *     AtribuirFuncaoProfessor:
 *       type: object
 *       required:
 *         - alunoId
 *       properties:
 *         alunoId:
 *           type: integer
 *           example: 5
 */

/**
 * @openapi
 * /alunos:
 *   post:
 *     summary: Cadastrar um novo aluno
 *     description: Apenas **COORDENADOR** ou **ADMIN** podem cadastrar alunos.
 *     tags:
 *       - Alunos
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlunoCadastro'
 *     responses:
 *       201:
 *         description: Aluno cadastrado com sucesso
 *       400:
 *         description: Dados inválidos ou CPF/matrícula já existente
 *       403:
 *         description: Sem permissão
 */
router.post(
  "/",
  authenticate,
  authorize("COORDENADOR", "ADMIN"),
  validateBody(cadastrarAlunoSchema),
  criarAluno
);

/**
 * @openapi
 * /alunos/{id}:
 *   put:
 *     summary: Editar dados de um aluno
 *     description: Apenas **COORDENADOR** ou **ADMIN** podem editar um aluno.
 *     tags:
 *       - Alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Hash do ID do aluno
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AlunoEdicao'
 *     responses:
 *       200:
 *         description: Aluno atualizado com sucesso
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Aluno não encontrado
 */
router.put(
  "/:id",
  authenticate,
  authorize("COORDENADOR", "ADMIN"),
  validateBody(editarAlunoSchema),
  atualizarAluno
);

/**
 * @openapi
 * /alunos/{id}:
 *   delete:
 *     summary: Remover um aluno
 *     description: Apenas **COORDENADOR** ou **ADMIN** podem remover um aluno.
 *     tags:
 *       - Alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Hash do ID do aluno
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Aluno removido com sucesso
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Aluno não encontrado
 */
router.delete("/:id", authenticate, authorize("COORDENADOR", "ADMIN"), deletarAluno);

/**
 * @openapi
 * /alunos:
 *   get:
 *     summary: Listar alunos
 *     description: Listagem de alunos com filtro por nome e paginação.
 *     tags:
 *       - Alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Buscar por nome do aluno
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Página da listagem
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Número de resultados por página
 *     responses:
 *       200:
 *         description: Lista de alunos
 *       403:
 *         description: Sem permissão
 */
router.get("/", authenticate, authorize("COORDENADOR", "ADMIN", "PROFESSOR"), listarAlunos);

/**
 * @openapi
 * /alunos/{id}:
 *   get:
 *     summary: Consultar detalhes de um aluno
 *     description: Visualizar dados completos de um aluno (apenas leitura).
 *     tags:
 *       - Alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Hash do ID do aluno
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dados completos do aluno
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Aluno não encontrado
 */
router.get("/:id", authenticate, authorize("COORDENADOR", "ADMIN", "PROFESSOR"), detalhesAluno);

/**
 * @openapi
 * /alunos/{id}/promover:
 *   post:
 *     summary: Promover aluno a professor
 *     description: Apenas **COORDENADOR** ou **ADMIN** podem atribuir a função de professor a um aluno.
 *     tags:
 *       - Alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Hash do ID do aluno
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AtribuirFuncaoProfessor'
 *     responses:
 *       200:
 *         description: Aluno promovido a professor com sucesso
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Aluno não encontrado
 */
router.post("/:id/promover", authenticate, authorize("COORDENADOR", "ADMIN"), promoverAluno);

/**
 * @openapi
 * /alunos/{id}/frequencias:
 *   get:
 *     summary: Consultar frequências de um aluno
 *     description: Apenas **COORDENADOR**, **ADMIN** ou **PROFESSOR** podem acessar.
 *     tags:
 *       - Alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Hash do ID do aluno
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de frequências do aluno
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Aluno não encontrado
 */
router.get("/:id/frequencias", authenticate, authorize("COORDENADOR", "ADMIN", "PROFESSOR"), consultarFrequencias);

/**
 * @openapi
 * /alunos/{id}/historico-frequencias:
 *   get:
 *     summary: Consultar histórico completo de frequências de um aluno
 *     description: Mantém todo o histórico mesmo após alterações.
 *     tags:
 *       - Alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Hash do ID do aluno
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Histórico completo de frequências do aluno
 *       403:
 *         description: Sem permissão
 *       404:
 *         description: Aluno não encontrado
 */
router.get(
  "/:id/historico-frequencias",
  authenticate,
  authorize("COORDENADOR", "ADMIN", "PROFESSOR"),
  consultarHistoricoFrequencias
);

export default router;
// o problema de os tipos serem COMUM E AUNOPROFESSOR