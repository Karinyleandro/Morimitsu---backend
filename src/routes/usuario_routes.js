import express from "express";
import multer from "multer";

import { validateBody } from "../middlewares/zodMiddleware.js";
import { authenticate } from "../middlewares/auth.middleware.js";

import { 
  listarUsuarios, 
  atualizarUsuario, 
  deletarUsuario, 
  atualizarFotoUsuario 
} from "../controllers/usuario.js";

import { atualizarUsuarioSchema } from "../validations/usuario.validators.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // configuração básica para upload de fotos

/**
 * @openapi
 * /usuarios:
 *   get:
 *     summary: Listar todos os usuários
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de usuários
 */
router.get("/", authenticate, listarUsuarios);

/**
 * @openapi
 * /usuarios/{id}:
 *   put:
 *     summary: Atualizar informações de um usuário (apenas campos obrigatórios)
 *     description: Atualiza os dados básicos obrigatórios de um usuário existente.
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do usuário a ser atualizado (hash)
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nome
 *               - email
 *               - dataNascimento
 *               - genero
 *               - tipo_usuario
 *             properties:
 *               nome:
 *                 type: string
 *                 example: João da Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao.silva@example.com
 *               dataNascimento:
 *                 type: string
 *                 format: date
 *                 example: "2000-05-10"
 *               genero:
 *                 type: string
 *                 enum: [MASCULINO, FEMININO, OUTRO, NAO_INFORMADO]
 *                 example: MASCULINO
 *               tipo_usuario:
 *                 type: string
 *                 enum: [ALUNO, PROFESSOR, COORDENADOR, USUARIO]
 *                 example: ALUNO
 *               endereco:
 *                 type: string
 *                 example: "Alameda jose"
 */
router.put("/:id", authenticate, validateBody(atualizarUsuarioSchema), atualizarUsuario);

/**
 * @openapi
 * /usuarios/{id}:
 *   delete:
 *     summary: Deletar um usuário
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do usuário (hash)
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário deletado com sucesso
 *       404:
 *         description: Usuário não encontrado
 */
router.delete("/:id", authenticate, deletarUsuario);

/**
 * @openapi
 * /usuarios/{id}/foto:
 *   put:
 *     summary: Atualizar foto de perfil do usuário via URL
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID do usuário (hash)
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fotoUrl
 *             properties:
 *               fotoUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL da nova foto do usuário
 *                 example: "https://exemplo.com/foto.jpg"
 */
router.put("/:id/foto", authenticate, atualizarFotoUsuario);

export default router;
