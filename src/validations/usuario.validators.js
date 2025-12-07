import { z } from "zod";

// ATUALIZAR USUÁRIO
export const atualizarUsuarioSchema = z
  .object({
    nome: z.string().optional(),
    nome_social: z.string().optional().nullable(),
    tipo: z.enum(["ADMIN", "COORDENADOR", "PROFESSOR", "ALUNO", "ALUNO_PROFESSOR"]).optional(),
    endereco: z.string().optional().nullable(),
    dataNascimento: z
      .string()
      .refine((date) => !date || !isNaN(Date.parse(date)), { message: "Data inválida" })
      .optional()
      .nullable(),
    cpf: z.string().optional().nullable(),
    telefone: z.string().optional().nullable(),
    genero: z.enum(["M", "F", "O"]).optional(),

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

    email: z.string().email().optional().nullable(),
    password: z.string().optional().nullable(),
    cargo_aluno: z.string().optional().nullable(),
    ativo: z.boolean().optional(),
    imagem_perfil_url: z.string().url().optional().nullable(),
    ultimo_login: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    // Tipos que precisam obrigatoriamente de email e senha
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

    // Responsáveis obrigatórios para alunos menores de 18 anos
    if (["ALUNO", "ALUNO_PROFESSOR"].includes(data.tipo) && data.dataNascimento) {
      const idade = new Date().getFullYear() - new Date(data.dataNascimento).getFullYear();
      if (idade < 18 && (!data.responsaveis || data.responsaveis.length === 0)) {
        ctx.addIssue({
          path: ["responsaveis"],
          message: "Aluno menor de 18 anos precisa de pelo menos um responsável",
          code: z.ZodIssueCode.custom,
        });
      }
    }
  });

// Schema separado para atualizar foto de usuário
export const atualizarFotoSchema = z.object({
  fotoUrl: z.string().url({ message: "URL inválida" })
});

// ==================== ATUALIZAR PERFIL ====================
export const atualizarPerfilSchema = z.object({
  nome: z.string().optional(),
  dataNascimento: z
    .string()
    .refine((date) => !date || !isNaN(Date.parse(date)), { message: "Data inválida" })
    .optional(),
  cpf: z.string().optional().nullable(),
  genero: z.enum(["M", "F", "O"]).optional(),
  email: z.string().email().optional().nullable(),
  endereco: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  password: z.string().optional().nullable(),
  imagem_perfil_url: z.string().url().optional().nullable(),
}).superRefine((data, ctx) => {
  // Valida senha mínima se enviada
  if (data.password && data.password.length < 6) {
    ctx.addIssue({
      path: ["password"],
      message: "A senha precisa ter pelo menos 6 caracteres",
      code: z.ZodIssueCode.custom,
    });
  }

  // Valida CPF se enviado
  if (data.cpf && !/^\d{11}$/.test(data.cpf.replace(/\D/g, ""))) {
    ctx.addIssue({
      path: ["cpf"],
      message: "CPF inválido, deve conter 11 dígitos",
      code: z.ZodIssueCode.custom,
    });
  }
});
