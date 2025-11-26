import prisma from "../prisma.js";
import { validarCPF } from "../utils/validacao_cpf.js";
import { padraoRespostaErro } from "../utils/response.js";

async function checkCoordenador(req) {
  const userId = req.user?.id;
  if (!userId) throw { status: 401, message: "Usuário não autenticado" };

  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { tipo_usuario: true },
  });

  if (usuario?.tipo_usuario !== "COORDENADOR") {
    throw { status: 403, message: "Apenas coordenadores podem executar esta ação" };
  }

  return userId;
}

// Criar responsável
export async function criarResponsavel(req, res) {
  try {
    await checkCoordenador(req);

    const { id_aluno, nome, telefone, email, grau_parentesco, cpf } = req.body;

    if (!id_aluno || !nome || !grau_parentesco) {
      return res.status(400).json({
        message: "Campos obrigatórios: id_aluno, nome e grau_parentesco"
      });
    }

    const aluno = await prisma.usuario.findUnique({
      where: { id: id_aluno, tipo_usuario: "ALUNO" }
    });

    if (!aluno) {
      return res.status(404).json({ message: "Aluno não encontrado" });
    }

    if (cpf && !validarCPF(cpf)) {
      return res.status(400).json({ message: "CPF inválido" });
    }

    const responsavel = await prisma.responsavel.create({
      data: {
        id_aluno,
        nome,
        telefone,
        email,
        grau_parentesco,
        cpf
      }
    });

    return res.status(201).json({
      message: "Responsável criado com sucesso",
      responsavel
    });

  } catch (error) {
    console.error("Erro criar responsável:", error);
    return padraoRespostaErro(res, error.message || "Erro ao criar responsável", error.status || 500);
  }
}

// Atualizar responsável
export async function atualizarResponsavel(req, res) {
  try {
    await checkCoordenador(req);

    const id = parseInt(req.params.id);
    const { nome, telefone, email, grau_parentesco, cpf } = req.body;

    const existente = await prisma.responsavel.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ message: "Responsável não encontrado" });
    }

    if (cpf && !validarCPF(cpf)) {
      return res.status(400).json({ message: "CPF inválido" });
    }

    const atualizado = await prisma.responsavel.update({
      where: { id },
      data: {
        nome,
        telefone,
        email,
        grau_parentesco,
        cpf
      }
    });

    return res.json({
      message: "Responsável atualizado com sucesso",
      responsavel: atualizado
    });

  } catch (error) {
    console.error("Erro atualizar responsável:", error);
    return padraoRespostaErro(res, error.message || "Erro ao atualizar responsável", error.status || 500);
  }
}

// Deletar responsável
export async function deletarResponsavel(req, res) {
  try {
    await checkCoordenador(req);

    const id = parseInt(req.params.id);

    const existente = await prisma.responsavel.findUnique({ where: { id } });
    if (!existente) {
      return res.status(404).json({ message: "Responsável não encontrado" });
    }

    await prisma.responsavel.delete({ where: { id } });

    return res.json({ message: "Responsável deletado com sucesso" });

  } catch (error) {
    console.error("Erro deletar responsável:", error);
    return padraoRespostaErro(res, error.message || "Erro ao deletar responsável", error.status || 500);
  }
}

// Listar responsáveis
export async function listarResponsaveis(req, res) {
  try {
    const { id_aluno, nome } = req.query;

    const filtros = {};
    if (id_aluno) filtros.id_aluno = parseInt(id_aluno);
    if (nome) filtros.nome = { contains: nome, mode: "insensitive" };

    const responsaveis = await prisma.responsavel.findMany({
      where: filtros,
      orderBy: { nome: "asc" },
      include: {
        aluno: { select: { nome: true, id: true } }
      }
    });

    return res.json(responsaveis);

  } catch (error) {
    console.error("Erro listar responsáveis:", error);
    return padraoRespostaErro(res, "Erro ao listar responsáveis", 500);
  }
}

export default {
  criarResponsavel,
  atualizarResponsavel,
  deletarResponsavel,
  listarResponsaveis
};
