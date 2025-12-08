import { Router } from "express";
import GraduacaoController from "../controllers/GraduacaoController.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = Router();

/* -------------------------------------------------------------------------- */
/*                                   SWAGGER                                  */
/* -------------------------------------------------------------------------- */

/**
 * @swagger
 * tags:
 *   name: Graduações
 *   description: Endpoints do sistema de graduação dos alunos.
 */

/* -------------------------------------------------------------------------- */
/*                               LISTAR APTOS                                 */
/* -------------------------------------------------------------------------- */

/**
 * @swagger
 * /graduacao/aptos:
 *   get:
 *     summary: Identifica alunos aptos ou próximos à graduação
 *     tags: [Graduações]
 *     responses:
 *       200:
 *         description: Lista de alunos com status PRONTO ou PROXIMO
 *       403:
 *         description: Acesso não autorizado
 *       500:
 *         description: Erro interno
 */
router.get(
  "/aptos",
  authenticate,
  authorize("ADMIN", "COORDENADOR", "PROFESSOR", "ALUNO_PROFESSOR"),
  GraduacaoController.listarAptos
);

/* -------------------------------------------------------------------------- */
/*                                GRADUAR ALUNO                               */
/* -------------------------------------------------------------------------- */

/**
 * @swagger
 * /graduacao/{alunoId}:
 *   post:
 *     summary: Realiza a graduação de um aluno
 *     tags: [Graduações]
 *     parameters:
 *       - in: path
 *         name: alunoId
 *         required: true
 *         description: UUID do aluno
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "9e5261f6-5bbd-4d34-94fa-0b1faed31c91"
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               observacao:
 *                 type: string
 *     responses:
 *       200:
 *         description: Aluno graduado com sucesso
 *       400:
 *         description: Regras não atendidas (aulas, tempo mínimo, etc.)
 *       403:
 *         description: Apenas coordenadores podem graduar alunos
 *       404:
 *         description: Aluno não encontrado
 *       500:
 *         description: Erro interno
 */
router.post(
  "/:alunoId",
  authenticate,
  authorize("ADMIN", "COORDENADOR"),
  GraduacaoController.graduarAluno
);

/* -------------------------------------------------------------------------- */
/*                                   HISTÓRICO                                */
/* -------------------------------------------------------------------------- */

/**
 * @swagger
 * /graduacao/historico/{alunoId}:
 *   get:
 *     summary: Lista histórico de graduações do aluno
 *     tags: [Graduações]
 *     parameters:
 *       - in: path
 *         name: alunoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "9e5261f6-5bbd-4d34-94fa-0b1faed31c91"
 *     responses:
 *       200:
 *         description: Histórico encontrado
 *       404:
 *         description: Não encontrado
 *       500:
 *         description: Erro interno
 */
router.get(
  "/historico/:alunoId",
  authenticate,
  authorize("ADMIN", "COORDENADOR", "PROFESSOR", "ALUNO_PROFESSOR"),
  GraduacaoController.listarHistorico
);

/* -------------------------------------------------------------------------- */
/*                                GRADUAÇÃO ATUAL                             */
/* -------------------------------------------------------------------------- */

/**
 * @swagger
 * /graduacao/atual/{alunoId}:
 *   get:
 *     summary: Retorna graduação atual do aluno
 *     tags: [Graduações]
 *     parameters:
 *       - in: path
 *         name: alunoId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *           example: "9e5261f6-5bbd-4d34-94fa-0b1faed31c91"
 *     responses:
 *       200:
 *         description: Dados retornados
 *       404:
 *         description: Usuário não encontrado
 *       500:
 *         description: Erro interno
 */
router.get(
  "/atual/:alunoId",
  authenticate,
  authorize("ADMIN", "COORDENADOR", "PROFESSOR", "ALUNO_PROFESSOR"),
  GraduacaoController.graduacaoAtual
);

export default router;
