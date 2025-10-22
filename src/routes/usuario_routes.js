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
const upload = multer({ dest: "uploads/" }); // upload básico para futuras fotos

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
 *         description: Lista de usuários retornada com sucesso
 */
router.get("/", authenticate, listarUsuarios);

/**
 * @openapi
 * /usuarios/{id}:
 *   put:
 *     summary: Atualizar informações de um usuário
 *     description: Atualiza qualquer campo do usuário (exceto senha). Apenas o próprio usuário ou coordenadores podem editar.
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID hash do usuário
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "João da Silva"
 *               nome_social:
 *                 type: string
 *                 example: "Joãozinho"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "joao@example.com"
 *               cpf:
 *                 type: string
 *                 example: "12345678900"
 *               num_matricula:
 *                 type: string
 *                 example: "2025001"
 *               dataNascimento:
 *                 type: string
 *                 format: date
 *                 example: "2000-05-10"
 *               telefone:
 *                 type: string
 *                 example: "(11) 99999-8888"
 *               endereco:
 *                 type: string
 *                 example: "Rua das Flores, 123"
 *               grau:
 *                 type: string
 *                 example: "Faixa Preta"
 *               genero:
 *                 type: string
 *                 enum: [MASCULINO, FEMININO, OUTRO, NAO_INFORMADO]
 *                 example: "MASCULINO"
 *               tipo_usuario:
 *                 type: string
 *                 enum: [ALUNO, PROFESSOR, COORDENADOR, USUARIO]
 *                 example: "PROFESSOR"
 *               imagem_perfil_url:
 *                 type: string
 *                 format: uri
 *                 example: "https://exemplo.com/imagem.jpg"
 *               ativo:
 *                 type: boolean
 *                 example: true
 *               ultimo_login:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-10-22T18:25:52.722Z"
 *               id_faixa:
 *                 type: integer
 *                 example: 3
 *               cargo_aluno:
 *                 type: string
 *                 example: "Líder de turma"
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Usuário não encontrado
 */
router.put("/:id", authenticate, validateBody(atualizarUsuarioSchema), atualizarUsuario);

/**
 * @openapi
 * /usuarios/{id}:
 *   delete:
 *     summary: Deletar um usuário
 *     description: Apenas coordenadores podem deletar usuários.
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID hash do usuário
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Usuário deletado com sucesso
 *       400:
 *         description: Não é possível deletar o próprio usuário
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Usuário não encontrado
 */
router.delete("/:id", authenticate, deletarUsuario);

/**
 * @openapi
 * /usuarios/{id}/foto:
 *   put:
 *     summary: Atualizar foto de perfil do usuário via URL
 *     description: Atualiza o campo imagem_perfil_url de um usuário existente.
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         description: ID hash do usuário
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
 *                 example: "https://exemplo.com/foto.jpg"
 *     responses:
 *       200:
 *         description: Foto atualizada com sucesso
 *       400:
 *         description: URL inválida
 *       403:
 *         description: Acesso negado
 *       404:
 *         description: Usuário não encontrado
 */
router.put("/:id/foto", authenticate, atualizarFotoUsuario);

export default router;
