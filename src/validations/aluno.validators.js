import { z } from "zod";

// Cadastro de aluno
export const cadastrarAlunoSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),
  nome_social: z.string().optional(),
  cpf: z.string().length(11, "CPF deve ter 11 dígitos").optional(),
  dataNascimento: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  genero: z.enum(["MASCULINO", "FEMININO", "OUTRO"]).optional(),
  imagem_perfil_url: z.string().url().optional(),
  num_matricula: z.string().optional(),
  id_faixa: z.number().optional(),
  grau: z.number().optional()
});

// Edição de aluno
export const editarAlunoSchema = z.object({
  nome: z.string().min(3).optional(),
  nome_social: z.string().optional(),
  cpf: z.string().length(11).optional(),
  dataNascimento: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
  genero: z.enum(["MASCULINO", "FEMININO", "OUTRO"]).optional(),
  imagem_perfil_url: z.string().url().optional(),
  num_matricula: z.string().optional(),
  id_faixa: z.number().optional(),
  grau: z.number().optional()
});

// Promoção a professor
export const atribuirFuncaoProfessorSchema = z.object({
  alunoId: z.number()
});
