import express from "express";
const router = express.Router();
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
    verifyResetCode,
    resetPassword, 
    criarAluno 
} from "../controllers/auth.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Registrar um novo usuário (PROFESSOR, COORDENADOR ou ALUNO)
 *     description: 
 *       Apenas **coordenadores logados** podem criar novos usuários.  
 *       Permite cadastrar professores, coordenadores ou alunos (sem acesso ao sistema).  
 *       O campo **num_matricula** é opcional e pode ser informado manualmente pelo coordenador.
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
 *               - cpf
 *               - dataNascimento
 *               - tipo_usuario
 *               - genero
 *               - password
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João Silva
 *               cpf:
 *                 type: string
 *                 example: 12345678909
 *               dataNascimento:
 *                 type: string
 *                 format: date
 *                 example: 1990-05-15
 *               tipo_usuario:
 *                 type: string
 *                 enum: [PROFESSOR, COORDENADOR, ALUNO]
 *                 example: ALUNO
 *               genero:
 *                 type: string
 *                 enum: [MASCULINO, FEMININO, OUTRO]
 *                 example: MASCULINO
 *               password:
 *                 type: string
 *                 example: Senha@123
 *                 description: Necessário apenas se o usuário tiver acesso ao sistema.
 *               email:
 *                 type: string
 *                 nullable: true
 *                 example: joao@email.com
 *               nome_social:
 *                 type: string
 *                 nullable: true
 *                 example: Joãozinho Silva
 *               telefone:
 *                 type: string
 *                 nullable: true
 *                 example: "(11) 99999-9999"
 *               endereco:
 *                 type: string
 *                 nullable: true
 *                 example: "Rua das Flores, 123 - São Paulo/SP"
 *               grau:
 *                 type: integer
 *                 nullable: true
 *                 example: 2
 *               imagem_perfil_url:
 *                 type: string
 *                 nullable: true
 *                 example: "https://cdn.morimitsu.com/perfis/joao.png"
 *               cargo_aluno:
 *                 type: string
 *                 nullable: true
 *                 enum: [ALUNO, ALUNO_PROFESSOR]
 *                 example: ALUNO
 *               num_matricula:
 *                 type: string
 *                 nullable: true
 *                 example: "20241023"
 *                 description: Número de matrícula opcional. Pode ser informado manualmente pelo coordenador.
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
 *                       example: "abc123xyz"
 *                     nome:
 *                       type: string
 *                       example: João Silva
 *                     tipo_usuario:
 *                       type: string
 *                       example: ALUNO
 *                     email:
 *                       type: string
 *                       example: joao@email.com
 *                     num_matricula:
 *                       type: string
 *                       example: "20241023"
 *                     genero:
 *                       type: string
 *                       example: MASCULINO
 *                     ativo:
 *                       type: boolean
 *                       example: true
 *       403:
 *         description: Acesso negado — apenas coordenadores podem registrar novos usuários
 */
router.post("/register", authenticate, authorize("COORDENADOR"), validateBody(registerSchema), register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Login do usuário (somente COORDENADOR ou PROFESSOR)
 *     description: |
 *       Permite login utilizando CPF, e-mail ou número de matrícula, juntamente com a senha.  
 *       Apenas usuários com o tipo **COORDENADOR** ou **PROFESSOR** podem acessar o sistema.  
 *       Alunos sem senha ou acesso não conseguem logar.
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
 *                 description: Pode ser o e-mail, CPF, nome ou número de matrícula do usuário.
 *                 examples:
 *                   email:
 *                     summary: Exemplo com e-mail
 *                     value: joao@email.com
 *                   cpf:
 *                     summary: Exemplo com CPF
 *                     value: "89583367222"
 *                   matricula:
 *                     summary: Exemplo com número de matrícula
 *                     value: "10001"
 *                   nome:
 *                     summary: Exemplo com nome de usuário
 *                     value: "João Silva"
 *               password:
 *                 type: string
 *                 example: Senha@123
 *     responses:
 *       200:
 *         description: "Login realizado com sucesso"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 expiresIn:
 *                   type: string
 *                   example: "1h"
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "user123"
 *                     nome:
 *                       type: string
 *                       example: "João Silva"
 *                     tipo_usuario:
 *                       type: string
 *                       example: "PROFESSOR"
 *                     email:
 *                       type: string
 *                       example: "joao@email.com"
 *                     genero:
 *                       type: string
 *                       example: "MASCULINO"
 *       401:
 *         description: "Credenciais inválidas"
 *       403:
 *         description: "Usuário sem acesso ao sistema (ex: ALUNO)"
 *       500:
 *         description: "Erro interno no servidor"
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
<<<<<<< HEAD
 *               - codigoRecuperacao:
 *             properties:
 *               codigoRecuperacao:
=======
 *               - token
 *             properties:
 *               token:
>>>>>>> c23afbd (corrigindo doc-api)
=======
 *               - codigoRecuperacao:
 *             properties:
 *               codigoRecuperacao:
>>>>>>> 1ff2d03 (organizando documentáção - ainda falta muitas coisinhas)
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
