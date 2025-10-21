
// Schema para atualizar usuário
import { z } from "zod";

// Schema para atualizar usuário
export const atualizarUsuarioSchema = z.object({
  nome: z.string().optional(),
  nome_social: z.string().optional(),
  email: z.string().email().optional(),
  cpf: z.string().optional(),
  num_matricula: z.number().int().optional(),
  dataNascimento: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  grau: z.number().int().optional(),
  genero: z.enum(["MASCULINO", "FEMININO", "OUTRO", "NAO_INFORMADO"]).optional(),
  tipo_usuario: z.enum(["USUARIO", "ALUNO", "COORDENADOR", "PROFESSOR"]).optional(),
  imagem_perfil_url: z.string().url().optional(),
  ativo: z.boolean().optional(),
  ultimo_login: z.string().optional(),
  passwordHash: z.string().optional(),
  cargo_aluno: z.string().optional(),
  id_faixa: z.number().int().optional()
});


// Schema para atualizar foto de usuário
export const atualizarFotoSchema = z.object({
  // apenas para validação se necessário
});

