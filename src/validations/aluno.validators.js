import { z } from "zod";

// Cadastro de aluno
export const cadastrarAlunoSchema = z.object({
  nome: z.string().min(3, "Nome obrigatório"),

  nome_social: z.string().optional(),

  cpf: z.string()
    .length(11, "CPF deve ter 11 dígitos")
    .optional(), // controller valida

  dataNascimento: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),

  genero: z.enum(["MASCULINO", "FEMININO", "OUTRO"]).optional(),

  // Aceita string vazia ou URL
  imagem_perfil_url: z.string().optional(),

  num_matricula: z.string().optional(),

  id_faixa: z.string()
    .uuid("ID da faixa inválido")
    .optional(),

    grau: z.coerce.number().int().optional(),

  // não são enviados mas schema exigia → corrigido
  email: z.string().email("Email inválido").optional(),
  password: z.string().min(8, "Senha mínima 8 caracteres").optional(),

  tipo: z.enum(["ALUNO", "PROFESSOR"]).optional(),

  responsaveis: z
    .array(
      z.object({
        nome: z.string().min(3, "Nome do responsável obrigatório"),
        telefone: z.string().optional(),
        grau_parentesco: z.string().optional(),
        email: z.string().email("Email do responsável inválido").optional()
      })
    )
    .optional(),

  // VOCÊ ENVIA turmaIds, então adicionei
  turmaIds: z.array(z.string()).optional()
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
<<<<<<< HEAD
  imagem_perfil_url: z.string().url().optional(),
  num_matricula: z.string().optional(),
  id_faixa: z.number().optional(),
  grau: z.number().optional()
});

// Promoção a professor
=======
  imagem_perfil_url: z.string().optional(),
  num_matricula: z.string().optional(),
  id_faixa: z.string().uuid().optional(),

  grau: z.string().optional(),

  turmaIds: z.array(z.string()).optional()
});

// Schema para promoção a professor
>>>>>>> main
export const atribuirFuncaoProfessorSchema = z.object({
  alunoId: z.number()
});
