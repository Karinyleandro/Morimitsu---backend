import express from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import * as TurmaCtrl from "../controllers/TurmaController.js";

const router = express.Router();

/**
 * @openapi
 * /turmas:
 *   get:
 *     summary: Lista todas as turmas
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: faixaEtaria
 *         schema:
 *           type: string
 *           enum: [Infantil, Fundamental]
 *         description: Filtra turmas por faixa etária
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Pesquisa pelo nome da turma
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de turmas retornada com sucesso
 */
router.get("/", authenticate, TurmaCtrl.listarTurmas);

/**
 * @openapi
 * /turmas:
 *   post:
 *     summary: Cria uma nova turma
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - faixaEtaria
 *               - totalAulas
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Turma Infantil A
 *               faixaEtaria:
 *                 type: string
 *                 enum: [Infantil, Fundamental]
 *                 example: Infantil
 *               totalAulas:
 *                 type: integer
 *                 example: 20
 *               professorResponsavel:
 *                 type: integer
 *                 description: ID do professor responsável (opcional)
 *     responses:
 *       201:
 *         description: Turma criada com sucesso
 */
router.post("/", authenticate, authorize("COORDENADOR", "ADMIN"), TurmaCtrl.criarTurma);

/**
 * @openapi
 * /turmas/{id}:
 *   put:
 *     summary: Atualiza os dados de uma turma
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Hash da turma a ser atualizada
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome_turma:
 *                 type: string
 *               faixa_etaria_min:
 *                 type: integer
 *               faixa_etaria_max:
 *                 type: integer
 *               total_aulas:
 *                 type: integer
 *               id_professor:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Turma atualizada com sucesso
 */
router.put("/:id", authenticate, authorize("COORDENADOR", "ADMIN"), TurmaCtrl.editarTurma);

/**
 * @openapi
 * /turmas/{id}:
 *   delete:
 *     summary: Remove uma turma (marca como removida e preserva histórico)
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hash da turma a ser removida
 *     responses:
 *       200:
 *         description: Turma removida com sucesso e histórico preservado
 */
router.delete("/:id", authenticate, authorize("COORDENADOR", "ADMIN"), TurmaCtrl.removerTurma);

/**
 * @openapi
 * /turmas/{id}/adicionar-aluno:
 *   post:
 *     summary: Adiciona um aluno a uma turma
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hash da turma
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alunoId
 *             properties:
 *               alunoId:
 *                 type: integer
 *                 description: ID do aluno a ser adicionado
 *     responses:
 *       200:
 *         description: Aluno adicionado à turma com sucesso
 */
router.post("/:id/adicionar-aluno", authenticate, authorize("COORDENADOR", "ADMIN"), TurmaCtrl.adicionarAluno);

/**
 * @openapi
 * /turmas/{id}/remover-aluno/{alunoId}:
 *   delete:
 *     summary: Remove um aluno de uma turma
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: alunoId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Aluno removido da turma com sucesso
 */
router.delete("/:id/remover-aluno/:alunoId", authenticate, authorize("COORDENADOR", "ADMIN"), TurmaCtrl.removerAluno);

/**
 * @openapi
 * /turmas/{id}/frequencia:
 *   post:
 *     summary: Registra frequência dos alunos em uma turma
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - data
 *               - frequencias
 *             properties:
 *               data:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-10-20T14:00:00Z"
 *               frequencias:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - alunoId
 *                     - presente
 *                   properties:
 *                     alunoId:
 *                       type: integer
 *                     presente:
 *                       type: boolean
 *     responses:
 *       201:
 *         description: Frequência registrada com sucesso
 */
router.post("/:id/frequencia", authenticate, authorize("COORDENADOR", "PROFESSOR", "ADMIN"), TurmaCtrl.registrarFrequencia);

/**
 * @openapi
 * /turmas/frequencias:
 *   get:
 *     summary: Consulta frequência de alunos por turma ou individualmente
 *     tags:
 *       - Turmas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: turmaId
 *         schema:
 *           type: string
 *         description: Filtra por hash da turma
 *       - in: query
 *         name: alunoId
 *         schema:
 *           type: integer
 *         description: Filtra por ID do aluno
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: Frequência retornada com sucesso
 */
router.get("/frequencias", authenticate, authorize("COORDENADOR", "PROFESSOR", "ADMIN"), TurmaCtrl.consultarFrequencias);

export default router;
