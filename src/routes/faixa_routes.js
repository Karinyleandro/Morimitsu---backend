import { Router } from "express";
import {
  criarFaixa,
  listarFaixas,
  obterFaixaPorId,
  atualizarFaixa,
  deletarFaixa,
} from "../controllers/faixa.controller.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Faixas
 *   description: Endpoints relacionados às faixas do sistema
 */

/**
 * @swagger
 * /faixas:
 *   post:
 *     summary: Criar uma nova faixa
 *     tags: [Faixas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - ordem
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Faixa Branca
 *               ordem:
 *                 type: number
 *                 example: 1
 *               imagem_faixa_url:
 *                 type: string
 *                 example: "https://url-da-imagem.com/faixa.png"
 *     responses:
 *       201:
 *         description: Faixa criada com sucesso.
 *       400:
 *         description: Dados inválidos ou ordem já existente.
 */
router.post("/", criarFaixa);

/**
 * @swagger
 * /faixas:
 *   get:
 *     summary: Listar todas as faixas
 *     tags: [Faixas]
 *     responses:
 *       200:
 *         description: Lista de faixas retornada com sucesso.
 */
router.get("/", listarFaixas);

/**
 * @swagger
 * /faixas/{id}:
 *   get:
 *     summary: Obter faixa por ID
 *     tags: [Faixas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da faixa
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Faixa encontrada.
 *       404:
 *         description: Faixa não encontrada.
 */
router.get("/:id", obterFaixaPorId);

/**
 * @swagger
 * /faixas/{id}:
 *   put:
 *     summary: Atualizar faixa existente
 *     tags: [Faixas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da faixa
 *         schema:
 *           type: number
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: Faixa Azul
 *               ordem:
 *                 type: number
 *                 example: 2
 *               imagem_faixa_url:
 *                 type: string
 *                 example: "https://url-da-imagem.com/faixa-azul.png"
 *     responses:
 *       200:
 *         description: Faixa atualizada com sucesso.
 *       404:
 *         description: Faixa não encontrada.
 *       400:
 *         description: Ordem duplicada.
 */
router.put("/:id", atualizarFaixa);

/**
 * @swagger
 * /faixas/{id}:
 *   delete:
 *     summary: Deletar faixa por ID
 *     tags: [Faixas]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID da faixa
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Faixa removida com sucesso.
 *       404:
 *         description: Faixa não encontrada.
 *       400:
 *         description: Não é possível excluir devido a vínculos com alunos.
 */
router.delete("/:id", deletarFaixa);

export default router;
