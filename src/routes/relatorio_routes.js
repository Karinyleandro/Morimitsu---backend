import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";

// Importa o controller inteiro (porque ele usa export default)
import RelatorioController from "../controllers/RelatorioController.js";

// Extrai os métodos da classe
const {
  rankingGeral,
  rankingPorTurma,
  metricasGerais
} = RelatorioController;

const router = express.Router();

/* =====================================================
   GET – MÉTRICAS GERAIS (RF-030)
===================================================== */
/**
 * @openapi
 * /relatorios/metricas:
 *   get:
 *     summary: Retorna métricas gerais do sistema
 *     tags:
 *       - relatórios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Métricas retornadas com sucesso
 */
router.get("/metricas", authenticate, metricasGerais);

/* =====================================================
   GET – RANKING GERAL (RF-033)
===================================================== */
/**
 * @openapi
 * /relatorios/ranking-geral:
 *   get:
 *     summary: Ranking geral (TOP 3) dos alunos
 *     tags:
 *       - relatórios
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Ranking retornado com sucesso
 */
router.get("/ranking-geral", authenticate, rankingGeral);

/* =====================================================
   GET – RANKING POR TURMA (RF-034)
===================================================== */
/**
 * @openapi
 * /relatorios/ranking-turma/{id_turma}:
 *   get:
 *     summary: Ranking TOP 3 de uma turma específica
 *     tags:
 *       - relatórios
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id_turma
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Ranking por turma retornado com sucesso
 */
router.get("/ranking-turma/:id_turma", authenticate, rankingPorTurma);

export default router;
