// src/routes/aniversariantes_routes.js
import { Router } from "express";
import AniversariantesController from "../controllers/AniversariantesController.js";
import { authenticate } from "../middlewares/auth.middleware.js";

const router = Router();

/* ===========================================================
   GET – ANIVERSARIANTES DO MÊS ATUAL + ALERTA HOJE
   /aniversariantes/mes-atual
=========================================================== */
/**
 * @openapi
 * /aniversariantes/mes-atual:
 *   get:
 *     summary: Lista aniversariantes do mês atual e destaca quem faz aniversário hoje
 *     tags:
 *       - Aniversariantes
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retorna todos os alunos que fazem aniversário **no mês atual**  
 *       e adiciona `isToday = true` para quem faz aniversário **HOJE**.
 *
 *       Essa rota é usada para exibir os aniversariantes do mês em tempo real.
 *
 *     responses:
 *       200:
 *         description: Lista dos aniversariantes do mês atual
 */
router.get(
  "/mes-atual",
  authenticate,
  AniversariantesController.aniversariantesDoMes
);


/* ===========================================================
   GET – ANIVERSARIANTES POR MÊS VIA QUERY (?mes=NUMBER)
   /aniversariantes/
=========================================================== */
/**
 * @openapi
 * /aniversariantes:
 *   get:
 *     summary: Lista aniversariantes de um mês específico
 *     tags:
 *       - Aniversariantes
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Lista aniversariantes do mês informado via query (?mes=5).  
 *       Caso não seja informado, usa o mês atual.
 *
 *       Essa rota **não destaca aniversariantes do dia**.
 *
 *     parameters:
 *       - in: query
 *         name: mes
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 12
 *         description: Mês desejado (1-12). Se omitido, pega o mês atual.
 *
 *     responses:
 *       200:
 *         description: Lista de aniversariantes do mês solicitado
 */
router.get(
  "/",
  authenticate,
  AniversariantesController.aniversariantesMes
);


/* ===========================================================
   GET – ANIVERSARIANTES DO DIA
   /aniversariantes/hoje
=========================================================== */
/**
 * @openapi
 * /aniversariantes/hoje:
 *   get:
 *     summary: Lista aniversariantes do dia atual
 *     tags:
 *       - Aniversariantes
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retorna somente os alunos que estão fazendo aniversário **hoje**.
 *
 *     responses:
 *       200:
 *         description: Lista dos aniversariantes do dia
 */
router.get(
  "/hoje",
  authenticate,
  AniversariantesController.aniversariantesHoje
);


/* ===========================================================
   GET – ANIVERSARIANTES DO ANO
   /aniversariantes/ano-atual
=========================================================== */
/**
 * @openapi
 * /aniversariantes/ano-atual:
 *   get:
 *     summary: Lista aniversariantes do ano inteiro
 *     tags:
 *       - Aniversariantes
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retorna todos os aniversariantes do ano atual,  
 *       agrupados por mês e ordenados por dia e nome.
 *
 *     responses:
 *       200:
 *         description: Lista anual agrupada por mês
 */
router.get(
  "/ano-atual",
  authenticate,
  AniversariantesController.aniversariantesAnoAtual
);


export default router;
