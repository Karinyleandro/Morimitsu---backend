import { z } from "zod";

export const registerSchema = z.object({
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
});

export const requestResetSchema = z.object({
  identifier: z.string(),
});

export const resetPasswordSchema = z.object({
  code: z.string(),
  newPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
  confirmPassword: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});
