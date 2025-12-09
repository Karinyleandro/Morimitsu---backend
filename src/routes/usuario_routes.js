import express from "express";
import { validateBody } from "../middlewares/zodMiddleware.js";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";
import {
  listarUsuarios,
  obterUsuarioDetalhado,
  atualizarUsuario,
  deletarUsuario,
  atualizarFotoUsuario,
  atualizarPerfil,
  listarCoordenadoresProfessores

} from "../controllers/usuario.js";
import { atualizarUsuarioSchema, atualizarFotoSchema,  atualizarPerfilSchema } from "../validations/usuario.validators.js";

const router = express.Router();

/* =====================================================
   GET – LISTAR PROFESSORES E COORDENADORES
===================================================== */
/**
 * @openapi
 * /usuarios/cargos/docentes:
 *   get:
 *     summary: Lista usuários com cargo de Professor ou Coordenador (com filtro opcional por tipo)
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: nome
 *         schema:
 *           type: string
 *         description: Filtrar por nome
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [PROFESSOR, COORDENADOR]
 *         description: Filtrar pelo cargo (PROFESSOR ou COORDENADOR)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista retornada com sucesso
 */

router.get(
  "/cargos/docentes",
  authenticate,
  async (req, res) => {
    const { listarCoordenadoresProfessores } = await import("../controllers/usuario.js");
    return listarCoordenadoresProfessores(req, res);
  }
);



/* =====================================================
   GET – LISTAR USUÁRIOS
===================================================== */
/**
 * @openapi
 * /usuarios:
 *   get:
 *     summary: Lista todos os usuários (somente ADMIN)
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: nome
 *         schema:
 *           type: string
 *         description: Filtra usuários pelo nome
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [ADMIN, COORDENADOR, PROFESSOR, ALUNO, ALUNO_PROFESSOR]
 *         description: Filtra usuários por tipo
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de usuários retornada com sucesso
 */
router.get("/", authenticate, listarUsuarios);

/* =====================================================
   GET – DETALHADO
===================================================== */
/**
 * @openapi
 * /usuarios/{id}:
 *   get:
 *     summary: Obter usuário detalhado
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do usuário
 *     responses:
 *       200:
 *         description: Dados do usuário retornados com sucesso
 */
router.get("/:id", authenticate, obterUsuarioDetalhado);

/**
 * @openapi
 * /usuarios/perfil/{id}:
 *   patch:
 *     summary: Atualiza o próprio perfil do usuário
 *     tags:
 *       - Usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID do usuário autenticado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Renato José de Souza"
 *               nome_social:
 *                 type: string
 *                 example: "Ranni"
 *               dataNascimento:
 *                 type: string
 *                 format: date
 *                 example: "2008-12-07"
 *               cpf:
 *                 type: string
 *                 example: "03444483040"
 *               genero:
 *                 type: string
 *                 enum: [M, F, O]
 *                 example: "F"
 *               email:
 *                 type: string
 *                 example: "renato@example.com"
 *               endereco:
 *                 type: string
 *                 example: "Rua Obi Jucá Diniz, 153 - Prado"
 *               telefone:
 *                 type: string
 *                 example: "(88)99583-8843"
 *               password:
 *                 type: string
 *                 example: "minhaSenha123"
 *               imagem_perfil_url:
 *                 type: string
 *                 example: "https://meusite.com/fotos/renato.jpg"
 *               tipo:
 *                 type: string
 *                 enum: [ADMIN, COORDENADOR, PROFESSOR, ALUNO, ALUNO_PROFESSOR]
 *                 example: "ALUNO"
 *     responses:
 *       200:
 *         description: Perfil atualizado com sucesso
 */
router.patch(
  "/perfil/:id",
  authenticate,
  validateBody(atualizarPerfilSchema),
  atualizarPerfil
);


/* =====================================================
   PUT – ATUALIZAR USUÁRIO
===================================================== */
/**
 * @openapi
 * /usuarios/{id}:
 *   put:
 *     summary: Atualizar um usuário existente
 *     description: "Atualização contendo todas as informações do usuário. Mesmos campos que o registro."
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do usuário
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
 *             properties:
 *               nome:
 *                 type: string
 *                 example: "Renato José de Souza"
 *               nome_social:
 *                 type: string
 *                 example: "Ranni"
 *               tipo:
 *                 type: string
 *                 enum: [ADMIN, COORDENADOR, PROFESSOR, ALUNO, ALUNO_PROFESSOR]
 *                 example: "ALUNO"
 *               endereco:
 *                 type: string
 *                 example: "Rua Obi Jucá Diniz, 153 - Prado"
 *               dataNascimento:
 *                 type: string
 *                 example: "2008-12-07"
 *               cpf:
 *                 type: string
 *                 example: "03444483040"
 *               telefone:
 *                 type: string
 *                 example: "(88)99583-8843"
 *               genero:
 *                 type: string
 *                 enum: [M, F, OUTRO]
 *                 example: "F"
 *               responsaveis:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     telefone:
 *                       type: string
 *                       example: "(88)91234-5678"
 *               id_faixa:
 *                 type: string
 *                 example: "4bb48c3d-62a3-41ca-8834-88d575d80d2c"
 *               grau:
 *                 type: number
 *                 example: 1
 *               num_matricula:
 *                 type: string
 *                 nullable: true
 *                 example: "12345"
 *               turmaIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["724fb34c-c53b-483f-988d-f8a79fcdc602"]
 *               aulas:
 *                 type: number
 *                 nullable: true
 *                 example: 10
 *               email:
 *                 type: string
 *                 nullable: true
 *               password:
 *                 type: string
 *                 nullable: true
 *               ativo:
 *                 type: boolean
 *                 example: true
 *               imagem_perfil_url:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Usuário atualizado com sucesso
 */
router.put(
  "/:id",
  authenticate,
  authorize("COORDENADOR"), // apenas COORDENADOR ou ADMIN pode atualizar
  validateBody(atualizarUsuarioSchema),
  atualizarUsuario
);

/* =====================================================
   DELETE – DELETAR USUÁRIO
===================================================== */
/**
 * @openapi
 * /usuarios/{id}:
 *   delete:
 *     summary: Deletar usuário (somente ADMIN)
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do usuário
 *     responses:
 *       200:
 *         description: Usuário deletado com sucesso
 */
router.delete("/:id", authenticate, deletarUsuario);

/* =====================================================
   PUT – ATUALIZAR FOTO
===================================================== */
/**
 * @openapi
 * /usuarios/{id}/foto:
 *   put:
 *     summary: Atualizar foto do usuário
 *     tags:
 *       - usuários
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: UUID do usuário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AtualizarFoto'
 *           example:
 *             fotoUrl: "https://meusite.com/fotos/renato.jpg"
 *     responses:
 *       200:
 *         description: Foto atualizada com sucesso
 */
router.put("/:id/foto", authenticate, validateBody(atualizarFotoSchema), atualizarFotoUsuario);

export default router;
