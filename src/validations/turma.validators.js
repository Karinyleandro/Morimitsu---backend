// src/validations/turma.validators.js
import { z } from "zod";

/**
 * Retorna resposta padrão de erro
 * @param {import("express").Response} res
 * @param {string} mensagem
 * @param {number} status
 */
export const padraoRespostaErro = (res, mensagem, status = 400) => {
  return res.status(status).json({ mensagem });
};

/**
 * Schema para criar turma
 */
export const criarTurmaSchema = z.object({
  nome: z.string().min(2, "O nome da turma deve ter pelo menos 2 caracteres."),
  faixaEtaria: z.enum(["Infantil", "Fundamental"], "Faixa etária inválida."),
  totalAulas: z.number().int().min(1, "O total de aulas deve ser positivo."),
  professorResponsavel: z.number().int().optional(),
});

/**
 * Schema para atualizar turma
 */
export const atualizarTurmaSchema = z.object({
  nome: z.string().min(2, "O nome da turma deve ter pelo menos 2 caracteres.").optional(),
  faixaEtaria: z.enum(["Infantil", "Fundamental"], "Faixa etária inválida.").optional(),
  totalAulas: z.number().int().min(1, "O total de aulas deve ser positivo.").optional(),
  professorResponsavel: z.number().int().optional(),
});

/**
 * Schema para adicionar aluno à turma
 */
export const adicionarAlunoTurmaSchema = z.object({
  alunoId: z.number().int("ID de aluno inválido."),
});

/**
 * Schema para registrar frequência
 */
export const registrarFrequenciaSchema = z.object({
  data: z.string().datetime("Data inválida."),
  frequencias: z
    .array(
      z.object({
        alunoId: z.number().int(),
        presente: z.boolean(),
      })
    )
    .nonempty("É necessário registrar ao menos uma frequência."),
});

/**
 * Schema de filtro para listar turmas (opcional)
 */
export const listarTurmasSchema = z.object({
  faixaEtaria: z.enum(["Infantil", "Fundamental"]).optional(),
  q: z.string().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).optional(),
});
