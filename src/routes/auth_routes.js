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
  resetPassword,
  //WhatsAppController
} from "../controllers/auth.js";

import { authenticate, authorize } from "../middlewares/auth.middleware.js";
/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Registrar um novo usuário
 *     description: "Registro contendo informações completas do usuário. Tipos com acesso ao sistema (email + senha): ADMIN, PROFESSOR, COORDENADOR e ALUNO_PROFESSOR."
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
 *             type: object
 *             required:
 *               - nome
 *               - tipo
 *               - cpf
 *               - dataNascimento
 *               - genero
 *
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Renato José de Souza"
 *
 *               nome_social:
 *                 type: string
 *                 example: "Ranni"
 *
 *               tipo:
 *                 type: string
 *                 enum: [ADMIN, COORDENADOR, PROFESSOR, ALUNO, ALUNO_PROFESSOR]
 *                 example: "ALUNO"
 *
 *               endereco:
 *                 type: string
 *                 example: "Rua Obi Jucá Diniz, 153 - Prado"
 *
 *               dataNascimento:
 *                 type: string
 *                 example: "2008-12-07"
 *
 *               cpf:
 *                 type: string
 *                 example: "03444483040"
 *
 *               telefone:
 *                 type: string
 *                 example: "(88)99583-8843"
 *
 *               genero:
 *                 type: string
 *                 enum: [M, F, O]
 *                 example: "F"
 *
 *               responsaveis:
 *                 type: array
 *                 description: "Apenas telefone será armazenado"
 *                 items:
 *                   type: object
 *                   properties:
 *                     telefone:
 *                       type: string
 *                       example: "(88)91234-5678"
 *
 *               id_faixa:
 *                 type: string
 *                 example: "4bb48c3d-62a3-41ca-8834-88d575d80d2c"
 *
 *               grau:
 *                 type: number
 *                 example: 1
 *
 *               num_matricula:
 *                 type: string
 *                 nullable: true
 *                 example: null
 *
 *               turmaIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["724fb34c-c53b-483f-988d-f8a79fcdc602"]
 *
 *               aulas:
 *                 type: number
 *                 nullable: true
 *                 example: null
 *
 *               email:
 *                 type: string
 *                 nullable: true
 *                 description: "Apenas para ADMIN, PROFESSOR, COORDENADOR e ALUNO_PROFESSOR"
 *
 *               password:
 *                 type: string
 *                 nullable: true
 *                 description: "Apenas para ADMIN, PROFESSOR, COORDENADOR e ALUNO_PROFESSOR"
 *
 *             example:
 *               nome: "Renato José de Souza"
 *               nome_social: "Ranni"
 *               tipo: "ALUNO"
 *               endereco: "Rua Obi Jucá Diniz, 153 - Prado"
 *               dataNascimento: "2008-12-07"
 *               cpf: "03444483040"
 *               telefone: "(88)99583-8843"
 *               genero: "F"
 *               responsaveis:
 *                 - telefone: "(88)91234-5678"
 *               id_faixa: "4bb48c3d-62a3-41ca-8834-88d575d80d2c"
 *               grau: 1
 *               num_matricula: null
 *               turmaIds: ["724fb34c-c53b-483f-988d-f8a79fcdc602"]
 *               aulas: null
 *               email: null
 *               password: null
 *
 *     responses:
 *       201:
 *         description: "Usuário criado com sucesso"
 */

router.post(
  "/register",
  authenticate,
  authorize("COORDENADOR"),
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
