import { z } from "zod";

export const registerSchema = z.object({
  nome: z.string().nonempty({ message: "Nome é obrigatório" }),
  email: z.string().email({ message: "Email inválido" }),
  cpf: z.string().length(11, { message: "CPF deve ter 11 caracteres" }),
  dataNascimento: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    { message: "Data inválida" }
  ),
  tipo_usuario: z.enum(["PROFESSOR", "COORDENADOR"]),
  password: z.string().min(8, { message: "Senha deve ter no mínimo 8 caracteres" }),
  genero: z.enum(["MASCULINO", "FEMININO", "OUTRO"]),
});

export const loginSchema = z.object({
  identifier: z.string().nonempty({ message: "Email, CPF ou nome é obrigatório" }),
  password: z.string().min(8, { message: "Senha deve ter no mínimo 8 caracteres" }),
});

export const requestResetSchema = z.object({
  identifier: z.string().nonempty({ message: "Email ou CPF é obrigatório" }),
});

export const resetPasswordSchema = z.object({
  token: z.string().nonempty({ message: "Token é obrigatório" }),
  newPassword: z.string().min(8, { message: "Nova senha deve ter no mínimo 8 caracteres" }),
});

export const criarAlunoSchema = z.object({
  nome: z.string().nonempty({ message: "Nome é obrigatório" }),
  nome_social: z.string().optional(),
  cpf: z.string().length(11, { message: "CPF deve ter 11 caracteres" }),
  dataNascimento: z.string().refine(
    (date) => !isNaN(Date.parse(date)),
    { message: "Data inválida" }
  ),
  genero: z.enum(["MASCULINO", "FEMININO", "OUTRO"]),
  num_matricula: z.string().optional(),
  id_faixa: z.number().optional(),
  cargo_aluno: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  grau: z.string().optional(),
  imagem_perfil_url: z.string().url().optional(),
  responsaveis: z.array(z.object({
    nome: z.string(),
    telefone: z.string(),
    grau_parentesco: z.string(),
    email: z.string().email().optional(),
  })).optional(),
  turmaIds: z.array(z.number()).optional(),
  acessoSistema: z.boolean().optional(),
});
