import { Router } from "express";

import {
  criarResponsavel,
  atualizarResponsavel,
  deletarResponsavel,
  listarResponsaveis
} from "../controllers/ResponsavelController.js";

import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Responsáveis
 *   description: Gerenciamento de responsáveis de alunos
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Responsavel:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         id_aluno:
 *           type: integer
 *         nome:
 *           type: string
 *         telefone:
 *           type: string
 *         email:
 *           type: string
 *         grau_parentesco:
 *           type: string
 *         cpf:
 *           type: string
 *
 *     CriarResponsavelInput:
 *       type: object
 *       required:
 *         - id_aluno
 *         - nome
 *         - grau_parentesco
 *       properties:
 *         id_aluno:
 *           type: integer
 *         nome:
 *           type: string
 *         telefone:
 *           type: string
 *         email:
 *           type: string
 *         grau_parentesco:
 *           type: string
 *         cpf:
 *           type: string
 *
 *     AtualizarResponsavelInput:
 *       type: object
 *       properties:
 *         nome:
 *           type: string
 *         telefone:
 *           type: string
 *         email:
 *           type: string
 *         grau_parentesco:
 *           type: string
 *         cpf:
 *           type: string
 */

//
// ─────────────────────────────────────────
//   LISTAR RESPONSÁVEIS
// ─────────────────────────────────────────
//

/**
 * @swagger
 * /responsaveis:
 *   get:
 *     tags: [Responsáveis]
 *     summary: Lista todos os responsáveis (pode filtrar)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: id_aluno
 *         schema:
 *           type: integer
 *       - in: query
 *         name: nome
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de responsáveis retornada com sucesso
 */
router.get("/", authenticate, listarResponsaveis);

//
// ─────────────────────────────────────────
//   CRIAR RESPONSÁVEL
// ─────────────────────────────────────────
//

/**
 * @swagger
 * /responsaveis:
 *   post:
 *     tags: [Responsáveis]
 *     summary: Cria um responsável vinculado a um aluno
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CriarResponsavelInput'
 *     responses:
 *       201:
 *         description: Responsável criado com sucesso
 *       400:
 *         description: Erro de validação
 *       401:
 *         description: Não autenticado
 *       403:
 *         description: Apenas COORDENADOR pode criar
 */
router.post("/", authenticate, criarResponsavel);

//
// ─────────────────────────────────────────
//   ATUALIZAR RESPONSÁVEL
// ─────────────────────────────────────────
//

/**
 * @swagger
 * /responsaveis/{id}:
 *   put:
 *     tags: [Responsáveis]
 *     summary: Atualiza os dados de um responsável
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AtualizarResponsavelInput'
 *     responses:
 *       200:
 *         description: Responsável atualizado com sucesso
 *       404:
 *         description: Responsável não encontrado
 */
router.put("/:id", authenticate, atualizarResponsavel);

//
// ─────────────────────────────────────────
//   DELETAR RESPONSÁVEL
// ─────────────────────────────────────────
//

/**
 * @swagger
 * /responsaveis/{id}:
 *   delete:
 *     tags: [Responsáveis]
 *     summary: Remove um responsável do aluno
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Responsável deletado com sucesso
 *       404:
 *         description: Responsável não encontrado
 */
router.delete("/:id", authenticate, deletarResponsavel);

export default router;
