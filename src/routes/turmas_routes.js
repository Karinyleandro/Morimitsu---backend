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
 *           type: string
 *           format: uuid
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
 *               - responsavelId
 *               - faixaEtariaMin
 *               - faixaEtariaMax
 *             properties:
 *               nome:
 *                 type: string
 *               responsavelId:
 *                 type: string
 *                 format: uuid
 *               faixaEtariaMin:
 *                 type: integer
 *               faixaEtariaMax:
 *                 type: integer
 *               fotoTurmaUrl:
 *                 type: string
 *     responses:
 *       201:
 *         description: Turma criada com sucesso
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
 *           format: uuid
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
 *               fotoTurmaUrl:
 *                 type: string
 *               responsavelId:
 *                 type: string
 *                 format: uuid
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
 *           format: uuid
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
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - usuarioId
 *             properties:
 *               usuarioId:
 *                 type: string
 *                 format: uuid
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
 * /turmas/{id}/desenturmar/{usuarioId}:
 *   delete:
 *     summary: Remove aluno da turma
 *     tags: [Turmas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         schema:
 *           type: string
 *           format: uuid
 *       - name: usuarioId
 *         in: path
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Aluno removido da turma
 */
router.delete(
  "/:id/desenturmar/:usuarioId",
  authenticate,
  authorize("ADMIN", "COORDENADOR"),
  TurmaCtrl.desenturmarAluno
);


/**
 * @openapi
 * /turmas/{id}/frequencia:
 *   post:
 *     summary: Registra a frequência de uma aula para uma turma
 *     description: >
 *       Registra presenças e ausências dos alunos em uma data específica para a turma informada.
 *       O campo **id** no path deve ser o **UUID da turma**.
 *     tags: [Frequência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: UUID da turma na qual a frequência será registrada.
 *         schema:
 *           type: string
 *           format: uuid
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
 *                 format: date
 *                 example: "2025-02-20"
 *                 description: Data da aula.
 *               frequencias:
 *                 type: array
 *                 description: Lista de alunos com seu status de presença.
 *                 items:
 *                   type: object
 *                   required:
 *                     - alunoId
 *                     - presente
 *                   properties:
 *                     alunoId:
 *                       type: string
 *                       format: uuid
 *                       example: "4cbb1e73-d8f4-4d8f-9c4a-14cc74af39b6"
 *                     presente:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       201:
 *         description: Frequência registrada com sucesso.
 *       400:
 *         description: Payload inválido.
 *       403:
 *         description: Sem permissão ou não autorizado para a turma.
 *       404:
 *         description: Turma não encontrada.
 */
router.post(
  "/:id/frequencia",
  authenticate,
  authorize("ADMIN", "COORDENADOR", "PROFESSOR", "ALUNO_PROFESSOR"),
  TurmaCtrl.registrarFrequencia
);


/**
 * @openapi
 * /turmas/frequencias:
 *   get:
 *     summary: Consulta registros de frequência de uma turma
 *     description: >
 *       Retorna os registros de frequência associados à turma informada.  
 *       Apenas **turmaId** é utilizado na implementação atual.
 *     tags: [Frequência]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: turmaId
 *         required: true
 *         description: UUID da turma a ser consultada.
 *         schema:
 *           type: string
 *           format: uuid
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
 *         description: Registros de frequência encontrados.
 *       400:
 *         description: turmaId não informado.
 *       403:
 *         description: Sem permissão para acessar os dados da turma.
 *       404:
 *         description: Turma não encontrada.
 */
router.get(
  "/frequencias",
  authenticate,
  authorize("ADMIN", "COORDENADOR", "PROFESSOR", "ALUNO_PROFESSOR"),
  TurmaCtrl.consultarFrequencias
);

export default router;
