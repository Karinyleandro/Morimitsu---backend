import { z } from "zod";

export const registerSchema = z.object({
<<<<<<< HEAD
  nome: z.string().min(1, "Nome é obrigatório"),
  nome_social: z.string().optional().nullable(),
  cpf: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || /^\d{11}$/.test(val.replace(/\D/g, "")), {
      message: "CPF deve ter 11 dígitos",
    }),
  dataNascimento: z
    .string()
    .optional()
    .nullable()
    .refine((val) => !val || !isNaN(Date.parse(val)), {
      message: "Data de nascimento inválida",
    }),
  telefone: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  genero: z
    .enum(["MASCULINO", "FEMININO", "OUTRO"], {
      errorMap: () => ({ message: "Gênero inválido" }),
    })
    .transform((val) => {
      // Converte para enum do banco
      if (val === "MASCULINO") return "M";
      if (val === "FEMININO") return "F";
      return "OUTRO";
    }),
  imagem_perfil_url: z.string().optional().nullable(),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  tipo: z.enum(["ADMIN", "PROFESSOR", "COORDENADOR"], {
    errorMap: () => ({ message: "Tipo inválido" }),
  }),
});

export const loginSchema = z.object({
  identifier: z.string(),
  password: z.string(),
});

export const verifyResetCodeSchema = z.object({
  code: z.string().length(5, "Código deve ter 5 dígitos"),
=======
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
>>>>>>> main
});

export const requestResetSchema = z.object({
  identifier: z.string(),
});

<<<<<<< HEAD
export const resetPasswordSchema = z.object({
  code: z.string(),
  newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  confirmPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
=======
export const verifyResetCodeSchema = z.object({
  code: z.string().length(5),
});

export const resetPasswordSchema = z.object({
  code: z.string().length(5),
  newPassword: z.string().min(6),
  confirmPassword: z.string().min(6),
>>>>>>> main
});
