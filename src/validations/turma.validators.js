// src/validations/turma.validators.js
import { z } from "zod";

/**
 * Retorna resposta padrão de erro
 */
export const padraoRespostaErro = (res, mensagem, status = 400) => {
  return res.status(status).json({ mensagem });
};

/**
 * Schema para criar turma
 */
export const criarTurmaSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome da turma deve ter pelo menos 2 caracteres."
  }),

  responsavelId: z.string().uuid({
    message: "O ID do responsável deve ser um UUID válido."
  }),

  faixaEtariaMin: z.number().int().min(1, {
    message: "A idade mínima deve ser positiva."
  }),

  faixaEtariaMax: z.number().int().min(1, {
    message: "A idade máxima deve ser positiva."
  }),

  fotoTurmaUrl: z.string().url().optional().nullable(),
});

/**
 * Schema para atualizar turma
 */
export const atualizarTurmaSchema = z.object({
  nome: z.string().min(2, {
    message: "O nome da turma deve ter pelo menos 2 caracteres."
  }).optional(),

  responsavelId: z.string().uuid().optional(),

  faixaEtariaMin: z.number().int().min(1).optional(),

  faixaEtariaMax: z.number().int().min(1).optional(),

  fotoTurmaUrl: z.string().url().optional().nullable(),
});

/**
 * Schema para adicionar aluno à turma
 */
export const adicionarAlunoTurmaSchema = z.object({
  alunoId: z.string().uuid({
    message: "ID de aluno inválido."
  }),
});

/**
 * Schema para registrar frequência
 */
export const registrarFrequenciaSchema = z.object({
  data: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Data inválida." }
  ),

  frequencias: z.array(
    z.object({
      alunoId: z.string().uuid(),
      presente: z.boolean(),
    })
  ).nonempty({
    message: "É necessário registrar ao menos uma frequência."
  }),
});

/**
 * Schema de filtro para listar turmas
 */
export const listarTurmasSchema = z.object({
  faixaEtaria: z.enum(["Infantil", "Fundamental"]).optional(),
  q: z.string().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
});
