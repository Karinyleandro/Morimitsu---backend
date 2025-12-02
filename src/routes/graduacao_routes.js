import express from "express";
const router = express.Router();

import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import GraduacaoController from "../controllers/graduacao.controller.js";
import { validateBody } from "../middlewares/zodMiddleware.js";
import { graduarSchema, atualizarGraduacaoSchema } from "../validations/graduacao.validators.js";

/**
 * @openapi
 * tags:
 *   - name: graduacao
 *     description: Endpoints relacionados às graduações dos alunos
 */

/**
 * @openapi
 * /graduacao:
 *   get:
 *     summary: Listar graduações
 *     description: Lista todas as graduações, podendo filtrar por alunoId.
 *     tags:
 *       - graduacao
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: alunoId
 *         schema:
 *           type: integer
 *         example: 12
 *     responses:
 *       200:
 *         description: Lista de graduações retornada com sucesso.
 */
router.get("/", authenticate, GraduacaoController.listar);

/**
 * @openapi
 * /graduacao/atual/{alunoId}:
 *   get:
 *     summary: Obter última graduação de um aluno
 *     tags:
 *       - graduacao
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alunoId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 7
 *     responses:
 *       200:
 *         description: Última graduação retornada
 *       404:
 *         description: Nenhuma graduação encontrada
 */
router.get("/atual/:alunoId", authenticate, GraduacaoController.obterAtual);

/**
 * @openapi
 * /graduacao/historico/{alunoId}:
 *   get:
 *     summary: Listar histórico completo de graduações
 *     tags:
 *       - graduacao
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alunoId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 7
 *     responses:
 *       200:
 *         description: Histórico retornado com sucesso
 */
router.get("/historico/:alunoId", authenticate, GraduacaoController.listarHistorico);

/**
 * @openapi
 * /graduacao/aptos:
 *   get:
 *     summary: Identificar alunos aptos ou próximos à graduação (RF-022)
 *     description: |
 *       Avalia cada aluno e retorna:
 *       - *pronto*
 *       - *proximo*
 *       - *inapto*
 *
 *       Para adultos (>=16): usa tempos mínimos IBJJF  
 *       Para crianças (<=15): usa lógica de frequência
 *
 *     tags:
 *       - graduacao
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: turmaId
 *         schema:
 *           type: integer
 *         example: 5
 *       - in: query
 *         name: apenas
 *         schema:
 *           type: string
 *           enum: [pronto, proximo]
 *     responses:
 *       200:
 *         description: Lista de aptos retornada
 */
router.get("/aptos", authenticate, GraduacaoController.identificarAptos);

/**
 * @openapi
 * /graduacao:
 *   post:
 *     summary: Graduar aluno (RF-023)
 *     description: |
 *       ⚠ **Apenas COORDENADOR pode graduar**  
 *
 *       Regras aplicadas automaticamente:
 *       - Valida aprovação do mestre  
 *       - Verifica tempo mínimo entre faixas (adultos)  
 *       - Impede pular faixas  
 *       - Pode promover automaticamente para *PROFESSOR* ao chegar na *Roxa*  
 *       - Registra log da ação  
 *
 *     tags:
 *       - graduacao
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/GraduarAlunoRequest"
 *
 *     responses:
 *       201:
 *         description: Aluno graduado com sucesso.
 *       400:
 *         description: Erro de validação ou regras não cumpridas.
 *       403:
 *         description: Acesso negado (apenas COORDENADOR)
 *       404:
 *         description: Aluno ou faixa não encontrada
 */
router.post(
  "/",
  authenticate,
  authorize("COORDENADOR"),
  validateBody(graduarSchema),
  GraduacaoController.graduar
);

/**
 * @openapi
 * /graduacao/{id}:
 *   put:
 *     summary: Atualizar informações de uma graduação (apenas coordenador)
 *     tags:
 *       - graduacao
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: "#/components/schemas/AtualizarGraduacaoRequest"
 *     responses:
 *       200:
 *         description: Graduação atualizada com sucesso.
 *       404:
 *         description: Graduação não encontrada.
 */
router.put(
  "/:id",
  authenticate,
  authorize("COORDENADOR"),
  validateBody(atualizarGraduacaoSchema),
  GraduacaoController.atualizar
);

/**
 * @openapi
 * /graduacao/{id}:
 *   delete:
 *     summary: Deletar uma graduação (apenas coordenador)
 *     tags:
 *       - graduacao
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 10
 *     responses:
 *       200:
 *         description: Graduação removida
 *       404:
 *         description: Não encontrada
 */
router.delete(
  "/:id",
  authenticate,
  authorize("COORDENADOR"),
  GraduacaoController.deletar
);

export default router;
