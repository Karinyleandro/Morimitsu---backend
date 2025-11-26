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
 *     summary: Registrar um novo usuário do sistema
 *     description: |
 *       Apenas **COORDENADORES** podem criar novos usuários que têm acesso ao sistema.
 *
 *       Tipos permitidos:
 *       - **ADMIN**
 *       - **PROFESSOR**
 *       - **COORDENADOR**
 *
 *       ⚠ **Alunos não são criados aqui** → use `/alunos`.
 *
 *     tags:
 *       - auth
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - password
 *               - tipo
 *               - genero
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Renato José de Souza"
 *               nome_social:
 *                 type: string
 *                 nullable: true
 *                 example: "Renatinho"
 *               cpf:
 *                 type: string
 *                 example: "123.456.789-00"
 *               dataNascimento:
 *                 type: string
 *                 format: date
 *                 example: "2008-12-07"
 *               telefone:
 *                 type: string
 *                 example: "(88) 99583-8843"
 *               endereco:
 *                 type: string
 *                 example: "Rua Obi Juci Diniz, 153 - Prado"
 *               genero:
 *                 type: string
 *                 enum: [MASCULINO, FEMININO, OUTRO]
 *                 example: "MASCULINO"
 *               imagem_perfil_url:
 *                 type: string
 *                 nullable: true
 *                 example: "https://cdn.site.com/fotos/renato.png"
 *               email:
 *                 type: string
 *                 example: "renato@gmail.com"
 *               password:
 *                 type: string
 *                 example: "Senha@123"
 *               tipo:
 *                 type: string
 *                 enum: [ADMIN, PROFESSOR, COORDENADOR]
 *                 example: "PROFESSOR"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuário criado com sucesso
 *                 usuario:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "aj82hsg7127sgsj2"
 *                     nome:
 *                       type: string
 *                       example: "Renato José de Souza"
 *                     email:
 *                       type: string
 *                       example: "renato@gmail.com"
 *                     tipo:
 *                       type: string
 *                       example: "PROFESSOR"
 *       403:
 *         description: Apenas coordenadores podem criar usuários
 *       409:
 *         description: Já existe um usuário com esse email ou CPF
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
 *       🚫 Alunos não podem fazer login.
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
