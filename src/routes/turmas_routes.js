import express from "express";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import TurmaCtrl from "../controllers/TurmaController.js";

const router = express.Router();

/**
 * @openapi
 * /turmas:
 *   get:
 *     summary: Lista todas as turmas com filtros opcionais
 *     tags: [Turmas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Busca por nome da turma
 *       - in: query
 *         name: faixaEtariaMin
 *         schema:
 *           type: integer
 *       - in: query
 *         name: faixaEtariaMax
 *         schema:
 *           type: integer
 *       - in: query
 *         name: responsavelId
 *         schema:
 *           type: integer
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
 *         description: Lista de turmas
 */
router.get("/", authenticate, TurmaCtrl.listarTurmas);

/**
 * @openapi
 * /turmas/usuarios/filtro:
 *   get:
 *     summary: Lista professores e coordenadores para filtros
 *     tags: [Turmas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários retornada
 */
router.get("/usuarios/filtro", authenticate, TurmaCtrl.usuariosParaFiltro);

/**
 * @openapi
 * /turmas:
 *   post:
 *     summary: Cria uma nova turma
 *     tags: [Turmas]
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
 *               - responsavelNome
 *               - faixaEtariaMin
 *               - faixaEtariaMax
 *             properties:
 *               nome:
 *                 type: string
 *               responsavelNome:
 *                 type: string
 *               faixaEtariaMin:
 *                 type: integer
 *               faixaEtariaMax:
 *                 type: integer
 *               fotoTurmaUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Turma criada com sucesso
 *       400:
 *         description: Campos obrigatórios faltando
 *       403:
 *         description: Sem permissão
 */
router.post(
  "/",
  authenticate,
  authorize("ADMIN", "COORDENADOR"),
  TurmaCtrl.criarTurma
);

/**
 * @openapi
 * /turmas/{id}:
 *   put:
 *     summary: Atualiza dados de uma turma
 *     tags: [Turmas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               faixaEtariaMin:
 *                 type: integer
 *               faixaEtariaMax:
 *                 type: integer
 *               fotoTurma:
 *                 type: string
 *               responsaveisIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Turma atualizada com sucesso
 */
router.put(
  "/:id",
  authenticate,
  authorize("ADMIN", "COORDENADOR"),
  TurmaCtrl.editarTurma
);

/**
 * @openapi
 * /turmas/{id}:
 *   delete:
 *     summary: Remove uma turma
 *     tags: [Turmas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Turma removida com sucesso
 */
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN", "COORDENADOR"),
  TurmaCtrl.removerTurma
);

/**
 * @openapi
 * /turmas/{id}/enturmar:
 *   post:
 *     summary: Adiciona um aluno à turma
 *     tags: [Turmas]
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
 *               - alunoId
 *             properties:
 *               alunoId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Aluno adicionado à turma
 */
router.post(
  "/:id/enturmar",
  authenticate,
  authorize("ADMIN", "COORDENADOR"),
  TurmaCtrl.enturmarAluno
);

/**
 * @openapi
 * /turmas/{id}/desenturmar/{alunoId}:
 *   delete:
 *     summary: Remove aluno da turma
 *     tags: [Turmas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *       - name: alunoId
 *         in: path
 *         required: true
 *     responses:
 *       200:
 *         description: Aluno removido da turma
 */
router.delete(
  "/:id/desenturmar/:alunoId",
  authenticate,
  authorize("ADMIN", "COORDENADOR"),
  TurmaCtrl.desenturmarAluno
);

/**
 * @openapi
 * /turmas/{id}/frequencia:
 *   post:
 *     summary: Registra frequência de uma aula
 *     tags: [Frequência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
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
router.post(
  "/:id/frequencia",
  authenticate,
  authorize("ADMIN", "COORDENADOR", "PROFESSOR"),
  TurmaCtrl.registrarFrequencia
);

/**
 * @openapi
 * /turmas/frequencias:
 *   get:
 *     summary: Lista frequência por aluno ou turma
 *     tags: [Frequência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: turmaId
 *         schema:
 *           type: string
 *       - in: query
 *         name: alunoId
 *         schema:
 *           type: integer
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
 *         description: Frequências encontradas
 */
router.get(
  "/frequencias",
  authenticate,
  authorize("ADMIN", "COORDENADOR", "PROFESSOR"),
  TurmaCtrl.consultarFrequencias
);

export default router;
