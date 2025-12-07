// src/routes/aniversariantes_routes.js
import { Router } from "express";
import AniversariantesController from "../controllers/AniversariantesController.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

/**
 * @openapi
 * /aniversariantes:
 *   get:
 *     tags:
 *       - Aniversariantes
 *     summary: Lista aniversariantes do mês
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retorna todos os aniversariantes do mês informado.  
 *       Se nenhum mês for passado, usa o mês atual.  
 *       (RF-026 – Destaque de aniversariantes do mês)
 *     parameters:
 *       - in: query
 *         name: mes
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         required: false
 *         description: Mês desejado (1–12). Se omitido, considera o mês atual.
 *     responses:
 *       200:
 *         description: Lista de aniversariantes do mês
 */
router.get("/", authenticate, AniversariantesController.aniversariantesMes);

/**
 * @openapi
 * /aniversariantes/ano-atual:
 *   get:
 *     tags:
 *       - Aniversariantes
 *     summary: Lista aniversariantes do ano atual
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Lista todos os aniversariantes do ano atual agrupados por mês,  
 *       ordenados por dia e nome.  
 *       (RF-032)
 *     responses:
 *       200:
 *         description: Lista anual agrupada
 */
router.get(
  "/ano-atual",
  authenticate,
  AniversariantesController.aniversariantesAnoAtual
);

/**
 * @openapi
 * /aniversariantes/hoje:
 *   get:
 *     tags:
 *       - Aniversariantes
 *     summary: Lista aniversariantes do dia
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retorna somente quem faz aniversário **hoje**.
 *     responses:
 *       200:
 *         description: Lista de aniversariantes do dia
 */
router.get(
  "/hoje",
  authenticate,
  AniversariantesController.aniversariantesHoje
);

export default router;
