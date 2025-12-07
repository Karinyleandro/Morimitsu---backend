// src/validations/graduacao.validators.js
import { z } from "zod";

export const graduarSchema = z.object({
  alunoId: z.number(),
  faixa_id: z.number(),
  grau: z.number(),
  aprovado_mestre: z.boolean()
});

export const atualizarGraduacaoSchema = z.object({
  grau: z.number().optional(),
  data_graduacao: z.string().optional(),
  faixa_id: z.number().optional()
});
