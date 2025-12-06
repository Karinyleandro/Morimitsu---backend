import { z } from "zod";

export const registerSchema = z.object({
  nome: z.string().min(3),
  nome_social: z.string().optional().nullable(),
  cpf: z.string().min(11).max(11),
  dataNascimento: z.string(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  genero: z.enum(["M", "F", "O"]),
  imagem_perfil_url: z.string().optional().nullable(),
  email: z.string().email(),
  password: z.string().min(6),
  cargo: z.enum(["ADMIN", "COORDENADOR", "PROFESSOR", "ALUNO"]),
  num_matricula: z.string().optional().nullable(),
  grau: z.number().optional().nullable(),
  id_faixa: z.string().optional().nullable(),

  responsaveis: z
    .array(
      z.object({
        nome: z.string(),
        telefone: z.string(),
        grau_parentesco: z.string(),
        email: z.string().email().optional().nullable(),
      })
    )
    .optional(),

  turmaIds: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
  identifier: z.string(),
  password: z.string(),
});

export const requestResetSchema = z.object({
  identifier: z.string(),
});

export const verifyResetCodeSchema = z.object({
  code: z.string().length(5),
});

export const resetPasswordSchema = z.object({
  code: z.string().length(5),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
});
