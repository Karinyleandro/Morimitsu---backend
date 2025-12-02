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
  nome: z.string().min(2, { message: "O nome da turma deve ter pelo menos 2 caracteres." }),
  faixaEtaria: z.enum(["Infantil", "Fundamental"], { 
    errorMap: () => ({ message: "Faixa etária inválida." }) 
  }),
  totalAulas: z.number().int().min(1, { message: "O total de aulas deve ser positivo." }),
  professorResponsavel: z.number().int().optional(),
});

/**
 * Schema para atualizar turma
 */
export const atualizarTurmaSchema = z.object({
  nome: z.string().min(2, { message: "O nome da turma deve ter pelo menos 2 caracteres." }).optional(),
  faixaEtaria: z.enum(["Infantil", "Fundamental"], { 
    errorMap: () => ({ message: "Faixa etária inválida." }) 
  }).optional(),
  totalAulas: z.number().int().min(1, { message: "O total de aulas deve ser positivo." }).optional(),
  professorResponsavel: z.number().int().optional(),
});

/**
 * Schema para adicionar aluno à turma
 */
export const adicionarAlunoTurmaSchema = z.object({
  alunoId: z.number().int({ message: "ID de aluno inválido." }),
});

/**
 * Schema para registrar frequência
 */
export const registrarFrequenciaSchema = z.object({
  data: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    { message: "Data inválida." }
  ),
  frequencias: z
    .array(
      z.object({
        alunoId: z.number().int(),
        presente: z.boolean(),
      })
    )
    .nonempty({ message: "É necessário registrar ao menos uma frequência." }),
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
