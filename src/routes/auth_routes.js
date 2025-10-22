import express from "express";
import { validateBody } from "../middlewares/zodMiddleware.js";

import { 
    registerSchema, 
    loginSchema, 
    requestResetSchema, 
    resetPasswordSchema, 
    criarAlunoSchema 
} from "../validations/auth.validators.js";
import { 
    register, 
    login, 
    logout, 
    requestPasswordReset, 
    verifyResetCode, // ✅ adicionado
    resetPassword, 
    criarAluno 
} from "../controllers/auth.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Registrar um novo usuário (PROFESSOR ou COORDENADOR)
 *     description: Apenas coordenadores logados podem criar professores ou novos coordenadores
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
 *               - cpf
 *               - dataNascimento
 *               - tipo_usuario
 *               - password
 *               - genero
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 example: joao@email.com
 *               cpf:
 *                 type: string
 *                 example: 12345678909
 *               dataNascimento:
 *                 type: string
 *                 format: date
 *                 example: 1990-05-15
 *               tipo_usuario:
 *                 type: string
 *                 enum: [PROFESSOR, COORDENADOR]
 *                 example: PROFESSOR
 *               password:
 *                 type: string
 *                 example: Senha@123
 *               genero:
 *                 type: string
 *                 enum: [MASCULINO, FEMININO, OUTRO]
 *                 example: MASCULINO
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
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 1
 *                     nome:
 *                       type: string
 *                       example: João Silva
 *                     email:
 *                       type: string
 *                       example: joao@email.com
 *                     tipo_usuario:
 *                       type: string
 *                       example: PROFESSOR
 *                     genero:
 *                       type: string
 *                       example: MASCULINO
 */
router.post("/register", authenticate, validateBody(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login do usuário (CPF ou e-mail)
 *     description: Permite login utilizando CPF ou e-mail, juntamente com a senha.
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
 *                 description: Pode ser o e-mail ou o CPF do usuário.
 *                 oneOf:
 *                   - example: joao@email.com
 *                   - example: 89583367222
 *               password:
 *                 type: string
 *                 example: Senha@123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 expiresIn:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Credenciais inválidas
 *       403:
 *         description: Usuário sem acesso ao sistema
 *       500:
 *         description: Erro interno no servidor
 */
router.post("/login", validateBody(loginSchema), login);


/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Logout do usuário
 *     tags:
 *       - auth
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout efetuado
 */
router.post("/logout", authenticate, logout);

/**
 * @openapi
 * /auth/request-reset:
 *   post:
 *     summary: Solicitar redefinição de senha
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
 *                 example: joao@email.com
 *     responses:
 *       200:
 *         description: E-mail de recuperação enviado
 */
router.post("/request-reset", validateBody(requestResetSchema), requestPasswordReset);

/**
 * @openapi
 * /auth/verify-reset-code:
 *   post:
 *     summary: Verificar código de recuperação de senha
 *     description: Confirma se o código informado é válido, ainda não foi utilizado e não expirou.
 *     tags:
 *       - auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
<<<<<<< HEAD
 *               - codigoRecuperacao:
 *             properties:
 *               codigoRecuperacao:
=======
 *               - token
 *             properties:
 *               token:
>>>>>>> c23afbd (corrigindo doc-api)
 *                 type: string
 *                 example: "12345"
 *     responses:
 *       200:
 *         description: Código válido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Código válido
 *                 userId:
 *                   type: integer
 *                   example: 10
 *       400:
 *         description: Código inválido ou expirado
 */
router.post("/verify-reset-code", verifyResetCode);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     summary: Resetar senha do usuário
 *     tags:
 *       - auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
<<<<<<< HEAD
<<<<<<< HEAD
=======
 *               - codigoRecuperacao
>>>>>>> a46d2d5 (token com apenas numeros)
=======
>>>>>>> c23afbd (corrigindo doc-api)
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: "12345"
 *               codigoRecuperacao:
 *                 type: string
 *                 example: "69613"
 *               newPassword:
 *                 type: string
 *                 example: "NovaSenha@123"
 *               confirmPassword:
 *                 type: string
 *                 example: "NovaSenha@123"
 *             description: Informe **token** (do link) ou **codigoRecuperacao** (enviado por e-mail)
 *     responses:
 *       200:
 *         description: Senha atualizada com sucesso
 *       400:
 *         description: Dados inválidos ou código incorreto
 */
router.post("/reset-password", validateBody(resetPasswordSchema), resetPassword);


/**
 * @openapi
 * /alunos:
 *   post:
 *     summary: Criar um novo aluno (apenas coordenador)
 *     tags:
 *       - alunos
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
 *               - cpf
 *               - dataNascimento
 *               - genero
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João da Silva
 *               nome_social:
 *                 type: string
 *                 example: Joãozinho
 *               cpf:
 *                 type: string
 *                 example: 12345678909
 *               dataNascimento:
 *                 type: string
 *                 format: date
 *                 example: 2010-03-25
 *               genero:
 *                 type: string
 *                 enum: [MASCULINO, FEMININO, OUTRO]
 *                 example: MASCULINO
 *               num_matricula:
 *                 type: string
 *                 example: 20231001
 *               id_faixa:
 *                 type: number
 *                 example: 2
 *               cargo_aluno:
 *                 type: string
 *                 example: Aluno Regular
 *               telefone:
 *                 type: string
 *                 example: "+55 11 91234-5678"
 *               endereco:
 *                 type: string
 *                 example: "Rua Exemplo, 123, São Paulo"
 *               grau:
 *                 type: string
 *                 example: "Faixa Branca"
 *               imagem_perfil_url:
 *                 type: string
 *                 example: "https://link-da-imagem.com/foto.jpg"
 *               responsaveis:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     nome:
 *                       type: string
 *                     telefone:
 *                       type: string
 *                     grau_parentesco:
 *                       type: string
 *                     email:
 *                       type: string
 *               turmaIds:
 *                 type: array
 *                 items:
 *                   type: number
 *               acessoSistema:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Aluno cadastrado com sucesso
 */
router.post("/alunos", authenticate, authorize("COORDENADOR"), criarAluno);

export default router;
