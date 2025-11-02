import { z } from "zod";

export const registerSchema = z.object({
  nome: z.string().nonempty({ message: "Nome é obrigatório" }),
  email: z.string().email({ message: "Email inválido" }).optional().nullable(),
  cpf: z.string().length(11, { message: "CPF deve ter 11 caracteres" }),
  dataNascimento: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    { message: "Data inválida" }
  ),
  tipo_usuario: z.enum(["PROFESSOR", "COORDENADOR", "ALUNO"], {
    errorMap: () => ({ message: "Tipo de usuário inválido" }),
  }),
  password: z.string().min(8, { message: "Senha deve ter no mínimo 8 caracteres" }),
  genero: z.enum(["MASCULINO", "FEMININO", "OUTRO"], {
    errorMap: () => ({ message: "Gênero inválido" }),
  }),

  // Campos opcionais (aceitam "", null ou ausência)
  nome_social: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  grau: z.union([z.number(), z.string()]).optional().nullable(),
  imagem_perfil_url: z.string().optional().nullable(),
  cargo_aluno: z.string().optional().nullable(),
});


export const loginSchema = z.object({
  identifier: z.string().nonempty({ message: "Email, CPF ou nome é obrigatório" }),
  password: z.string().min(8, { message: "Senha deve ter no mínimo 8 caracteres" }),
});


export const requestResetSchema = z.object({
  identifier: z.string().nonempty({ message: "Email ou CPF é obrigatório" }),
});


export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Código obrigatório").optional(),
  codigoRecuperacao: z.string().min(1, "Código obrigatório").optional(),
  newPassword: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  confirmPassword: z.string().min(8, "Confirmação obrigatória"),
}).refine(data => data.token || data.codigoRecuperacao, {
  message: "É necessário informar o token ou o código de recuperação",
});


export const criarAlunoSchema = z.object({
  nome: z.string().nonempty({ message: "Nome é obrigatório" }),
  nome_social: z.string().optional().nullable(),
  cpf: z.string().length(11, { message: "CPF deve ter 11 caracteres" }),
  dataNascimento: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    { message: "Data inválida" }
  ),
  genero: z.enum(["MASCULINO", "FEMININO", "OUTRO"]),
  num_matricula: z.string().optional().nullable(),
  id_faixa: z.number().optional().nullable(),
  cargo_aluno: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  grau: z.union([z.number(), z.string()]).optional().nullable(),
  imagem_perfil_url: z.string().optional().nullable(),

  // Responsáveis (opcional)
  responsaveis: z.array(z.object({
    nome: z.string(),
    telefone: z.string(),
    grau_parentesco: z.string(),
    email: z.string().email().optional().nullable(),
  })).optional(),

  // Turmas associadas
  turmaIds: z.array(z.number()).optional(),

  // Controle de acesso opcional
  acessoSistema: z.boolean().optional().nullable(),
});
