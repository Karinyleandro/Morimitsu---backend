import { Router } from "express";
import GraduacaoController from "../controllers/GraduacaoController.js";

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Graduações
 *   description: Endpoints relacionados ao sistema de graduação dos alunos
 */

/**
 * @swagger
 * /graduacao/aptos:
 *   get:
 *     summary: Identificar alunos aptos à graduação
 *     tags: [Graduações]
 *     description: >
 *       Retorna todos os alunos com:
 *       - idade calculada
 *       - faixa atual
 *       - próxima faixa
 *       - presenças acumuladas
 *       - se estão aptos ou não à graduação
 *     responses:
 *       200:
 *         description: Lista de alunos aptos e não aptos retornada com sucesso.
 *       500:
 *         description: Erro interno no servidor.
 */
router.get("/aptos", GraduacaoController.identificarAptos);

/**
 * @swagger
 * /graduacao:
 *   post:
 *     summary: Graduar um aluno
 *     tags: [Graduações]
 *     description: >
 *       Apenas coordenadores podem realizar uma graduação.
 *       O sistema valida automaticamente:
 *       - idade mínima necessária para a faixa
 *       - presenças acumuladas
 *       - proibição de pular faixas
 *       - aprovação obrigatória do mestre
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alunoId
 *               - faixa_id
 *               - grau
 *               - aprovado_mestre
 *             properties:
 *               alunoId:
 *                 type: number
 *                 example: 12
 *               faixa_id:
 *                 type: number
 *                 example: 3
 *               grau:
 *                 type: number
 *                 example: 0
 *               aprovado_mestre:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Aluno graduado com sucesso.
 *       400:
 *         description: >
 *           Regras não atendidas. Exemplos:
 *           - Idade mínima não alcançada
 *           - Presenças insuficientes
 *           - Tentativa de pular faixas
 *           - Faltam campos obrigatórios
 *       403:
 *         description: Apenas coordenadores podem graduar alunos.
 *       404:
 *         description: Aluno ou faixa não encontrada.
 *       500:
 *         description: Erro interno no servidor.
 */
router.post("/", GraduacaoController.graduar);

/**
 * @swagger
 * /graduacao/historico/{alunoId}:
 *   get:
 *     summary: Listar histórico de graduações de um aluno
 *     tags: [Graduações]
 *     parameters:
 *       - in: path
 *         name: alunoId
 *         required: true
 *         description: ID do aluno
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Histórico retornado com sucesso.
 *       404:
 *         description: Nenhum histórico encontrado para este aluno.
 *       500:
 *         description: Erro interno no servidor.
 */
router.get("/historico/:alunoId", GraduacaoController.listarHistorico);

/**
 * @swagger
 * /graduacao/atual/{alunoId}:
 *   get:
 *     summary: Obter a graduação atual do aluno
 *     tags: [Graduações]
 *     parameters:
 *       - in: path
 *         name: alunoId
 *         required: true
 *         description: ID do aluno
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Faixa atual encontrada e retornada.
 *       404:
 *         description: Nenhuma graduação encontrada para este aluno.
 *       500:
 *         description: Erro interno no servidor.
 */
router.get("/atual/:alunoId", GraduacaoController.obterAtual);

export default router;
