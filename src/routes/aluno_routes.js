import express from "express";
import { validateBody } from "../middlewares/zodMiddleware.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  listarAlunos,
  listarAlunosPorTurma,
  detalhesAluno,
  promoverAlunoProfessor,
  consultarFrequencias,
  consultarHistoricoFrequencias
} from "../controllers/aluno_controller.js";

const router = express.Router();

/* =====================================================
   GET – LISTAR TODOS OS ALUNOS
===================================================== */
/**
 * @openapi
 * /alunos:
 *   get:
 *     summary: Lista todos os alunos
 *     tags:
 *       - alunos
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de alunos retornada com sucesso
 */
router.get("/", authenticate, listarAlunos);

/* =====================================================
   GET – LISTAR ALUNOS POR TURMA
===================================================== */
/**
 * @openapi
 * /alunos/turma/{turmaId}:
 *   get:
 *     summary: Lista alunos de uma turma específica
 *     tags:
 *       - alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: turmaId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID da turma
 *     responses:
 *       200:
 *         description: Lista de alunos por turma retornada com sucesso
 */
router.get("/turma/:turmaId", authenticate, listarAlunosPorTurma);

/* =====================================================
   GET – DETALHES DO ALUNO
===================================================== */
/**
 * @openapi
 * /alunos/{id}:
 *   get:
 *     summary: Obter detalhes de um aluno
 *     tags:
 *       - alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do aluno
 *     responses:
 *       200:
 *         description: Detalhes do aluno retornados com sucesso
 */
router.get("/:id", authenticate, detalhesAluno);

/* =====================================================
   PATCH – PROMOVER ALUNO A ALUNO_PROFESSOR
===================================================== */
/**
 * @openapi
 * /alunos/promover/{id}:
 *   patch:
 *     summary: Promover um aluno a ALUNO_PROFESSOR
 *     tags:
 *       - alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do aluno
 *     responses:
 *       200:
 *         description: Aluno promovido com sucesso
 */
router.patch("/promover/:id", authenticate, authorize("COORDENADOR"), promoverAlunoProfessor);

/* =====================================================
   GET – CONSULTAR FREQUÊNCIAS
===================================================== */
/**
 * @openapi
 * /alunos/{alunoId}/frequencias/{turmaId}:
 *   get:
 *     summary: Consultar frequência acumulada de um aluno em uma turma
 *     tags:
 *       - alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: alunoId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do aluno
 *       - name: turmaId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID da turma
 *     responses:
 *       200:
 *         description: Frequência do aluno retornada com sucesso
 */
router.get("/:alunoId/frequencias/:turmaId", authenticate, consultarFrequencias);

/* =====================================================
   GET – CONSULTAR HISTÓRICO DE FREQUÊNCIAS
===================================================== */
/**
 * @openapi
 * /alunos/{alunoId}/historico-frequencias:
 *   get:
 *     summary: Consultar histórico completo de frequências do aluno
 *     tags:
 *       - alunos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: alunoId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID do aluno
 *     responses:
 *       200:
 *         description: Histórico de frequências retornado com sucesso
 */
router.get("/:alunoId/historico-frequencias", authenticate, consultarHistoricoFrequencias);

export default router;
