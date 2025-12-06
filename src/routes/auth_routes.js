import express from "express";
const router = express.Router();

import { validateBody } from "../middlewares/zodMiddleware.js";

import {
  registerSchema,
  loginSchema,
  requestResetSchema,
  resetPasswordSchema,
  verifyResetCodeSchema
} from "../validations/auth.validators.js";


import {
  register,
  login,
  logout,
  requestPasswordReset,
  verifyResetCode,
  resetPassword
} from "../controllers/auth.js";

import { authenticate, authorize } from "../middlewares/auth.middleware.js";

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Registrar um novo usuário (com ou sem vínculo de aluno)
 *     description: |
 *       Apenas **COORDENADORES** podem registrar novos usuários no sistema.
 *
 *       Tipos permitidos para o usuário:
 *       - **ADMIN**
 *       - **COORDENADOR**
 *       - **PROFESSOR**
 *       - **ALUNO**
 *
 *       Regras de criação:
 *       - **ADMIN** e **COORDENADOR** → não criam aluno
 *       - **ALUNO** → sempre cria aluno do tipo **COMUM**
 *       - **PROFESSOR**:
 *         - Se enviar dados de aluno → cria aluno do tipo **ALUNO_PROFESSOR**
 *         - Se não enviar → cria só o usuário professor
 *
 *     tags:
 *       - auth
 *     security:
 *       - bearerAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterUser'
 *
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso (com ou sem aluno)
 *       403:
 *         description: Apenas coordenadores podem criar usuários
 *       409:
 *         description: Email ou CPF já cadastrado
 */

/**
 * Rota de registro de usuário
 *
 * Middlewares:
 * - authenticate → exige token JWT válido
 * - authorize("COORDENADOR") → só COORDENADOR pode criar usuários
 * - validateBody(registerSchema) → valida o JSON do body
 * - register → controller que faz toda a lógica
 */
router.post(
  "/register",
  authenticate,
  authorize("COORDENADOR"),
  validateBody(registerSchema),
  register
);


/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login do usuário
 *     description: |
 *       Login permitido somente para:
 *       - **ADMIN**
 *       - **PROFESSOR**
 *       - **COORDENADOR**
 *
 *       Alunos não podem fazer login.
 *
 *       O usuário pode entrar usando:
 *       - Email  
 *       - CPF  
 *       - Matrícula  
 *       - Nome  
 *
 *     tags:
 *       - auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Email, CPF, matrícula ou nome
 *               password:
 *                 type: string
 *                 example: "Senha@123"
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *       401:
 *         description: Credenciais inválidas
 *       403:
 *         description: Usuário não possui permissão de acesso
 */
router.post("/login", validateBody(loginSchema), login);

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout do usuário
 *     description: Invalida o token atual.
 *     tags:
 *       - auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 */
router.post("/logout", authenticate, logout);

/**
 * @openapi
 * /auth/request-reset:
 *   post:
 *     summary: Solicitar código de recuperação de senha
 *     description: Envia um código de 5 dígitos para o email do usuário.
 *     tags:
 *       - auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: "renato@gmail.com"
 *     responses:
 *       200:
 *         description: Código de recuperação enviado
 */
router.post(
  "/request-reset",
  validateBody(requestResetSchema),
  requestPasswordReset
);

/**
 * @openapi
 * /auth/verify-reset-code:
 *   post:
 *     summary: Verificar validade do código de recuperação
 *     tags:
 *       - auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "12345"
 *     responses:
 *       200:
 *         description: Código válido
 *       400:
 *         description: Código inválido ou expirado
 */
router.post(
  "/verify-reset-code",
  validateBody(verifyResetCodeSchema),
  verifyResetCode
);


/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Resetar senha utilizando código enviado por e-mail
 *     tags:
 *       - auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               code:
 *                 type: string
 *                 example: "12345"
 *               newPassword:
 *                 type: string
 *                 example: "NovaSenha@123"
 *               confirmPassword:
 *                 type: string
 *                 example: "NovaSenha@123"
 *     responses:
 *       200:
 *         description: Senha atualizada com sucesso
 *       400:
 *         description: Código inválido ou senhas não coincidem
 */
router.post(
  "/reset-password",
  validateBody(resetPasswordSchema),
  resetPassword
);

export default router;
