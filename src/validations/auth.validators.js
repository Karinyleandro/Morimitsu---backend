import { z } from "zod";

// REGISTER
export const registerSchema = z
  .object({
    nome: z.string().min(1, "Nome é obrigatório"),
    nome_social: z.string().optional().nullable(),
    tipo: z.enum(["ADMIN", "COORDENADOR", "PROFESSOR", "ALUNO", "ALUNO_PROFESSOR"]),
    endereco: z.string().optional().nullable(),
    dataNascimento: z
      .string()
      .refine((date) => !isNaN(Date.parse(date)), { message: "Data inválida" }),
    cpf: z.string().min(1, "CPF é obrigatório"),
    telefone: z.string().optional().nullable(),
    genero: z.enum(["M", "F", "O"]),

    // Array de responsáveis (sempre array, nunca null)
    responsaveis: z
      .array(
        z.object({
          telefone: z.string().min(1, "Telefone do responsável é obrigatório"),
          nome: z.string().optional().nullable(),
          email: z.string().email().optional().nullable(),
        })
      )
      .optional()
      .default([]),

    id_faixa: z.string().optional().nullable(),
    grau: z.number().optional().nullable(),
    num_matricula: z.string().optional().nullable(),

    // Array de turmas (sempre array)
    turmaIds: z.array(z.string()).optional().default([]),

    aulas: z.number().optional().nullable(),

    email: z.string().email().nullable().optional(), // opcional para COORDENADOR/PROFESSOR
    password: z.string().nullable().optional(),      // opcional para COORDENADOR/PROFESSOR
  })
  .superRefine((data, ctx) => {
    // Apenas ADMIN e ALUNO_PROFESSOR precisam obrigatoriamente de login
    if (["ADMIN", "ALUNO_PROFESSOR"].includes(data.tipo)) {
      if (!data.email) {
        ctx.addIssue({
          path: ["email"],
          message: "Email é obrigatório para este tipo de usuário",
          code: z.ZodIssueCode.custom,
        });
      }
      if (!data.password) {
        ctx.addIssue({
          path: ["password"],
          message: "Senha é obrigatória para este tipo de usuário",
          code: z.ZodIssueCode.custom,
        });
      }
    }

    // Se for ALUNO menor de 18 anos, precisa de pelo menos 1 responsável
    if (["ALUNO", "ALUNO_PROFESSOR"].includes(data.tipo)) {
      const idade = data.dataNascimento
        ? new Date().getFullYear() - new Date(data.dataNascimento).getFullYear()
        : null;
      if (idade !== null && idade < 18 && (!data.responsaveis || data.responsaveis.length === 0)) {
        ctx.addIssue({
          path: ["responsaveis"],
          message: "Aluno menor de 18 anos precisa de pelo menos um responsável",
          code: z.ZodIssueCode.custom,
        });
      }
    }
  });

// LOGIN
export const loginSchema = z.object({
  identifier: z.string().min(1, "Identificador é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// REQUEST PASSWORD RESET
export const requestResetSchema = z.object({
  identifier: z.string().min(1, "Identificador é obrigatório"),
});

// VERIFY RESET CODE
export const verifyResetCodeSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
});

// RESET PASSWORD
export const resetPasswordSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  newPassword: z.string().min(1, "Nova senha é obrigatória"),
  confirmPassword: z.string().min(1, "Confirmação de senha é obrigatória"),
});
