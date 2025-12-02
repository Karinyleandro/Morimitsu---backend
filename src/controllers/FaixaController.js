import { prisma } from "../database/database.js";

// Middleware simples para verificar roles
function requireRole(user, roles) {
  if (!roles.includes(user.role)) {
    throw { status: 403, message: "Acesso negado." };
  }
}

export const criarFaixa = async (req, res) => {
  try {
    requireRole(req.user, ["ADMIN", "COORDENADOR"]);

    const { nome, ordem, imagem_faixa_url } = req.body;

    if (!nome || ordem === undefined)
      return res.status(400).json({ message: "Nome e ordem são obrigatórios." });

    if (isNaN(Number(ordem)))
      return res.status(400).json({ message: "A ordem deve ser um número." });

    const existeOrdem = await prisma.faixa.findUnique({
      where: { ordem: Number(ordem) },
    });

    if (existeOrdem)
      return res.status(400).json({ message: "Já existe uma faixa com essa ordem." });

    const faixa = await prisma.faixa.create({
      data: { nome, ordem: Number(ordem), imagem_faixa_url },
    });

    return res.status(201).json(faixa);

  } catch (err) {
    console.error("Erro ao criar faixa:", err);
    return res.status(err.status || 500).json({ message: err.message || "Erro interno do servidor." });
  }
};

export const listarFaixas = async (req, res) => {
  try {
    const faixas = await prisma.faixa.findMany({
      orderBy: { ordem: "asc" },
      include: {
        requisitos: true,
        graduacoes: true,
        alunos: true,
      },
    });

    return res.json(faixas);

  } catch (err) {
    console.error("Erro ao listar faixas:", err);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }
};

export const obterFaixaPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const faixa = await prisma.faixa.findUnique({
      where: { id: Number(id) },
      include: {
        requisitos: true,
        graduacoes: true,
        alunos: true,
      },
    });

    if (!faixa)
      return res.status(404).json({ message: "Faixa não encontrada." });

    return res.json(faixa);

  } catch (err) {
    console.error("Erro ao buscar faixa:", err);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }
};

export const atualizarFaixa = async (req, res) => {
  try {
    requireRole(req.user, ["ADMIN", "COORDENADOR"]);

    const { id } = req.params;
    const { nome, ordem, imagem_faixa_url } = req.body;

    const faixa = await prisma.faixa.findUnique({
      where: { id: Number(id) },
    });

    if (!faixa)
      return res.status(404).json({ message: "Faixa não encontrada." });

    if (ordem !== undefined && ordem !== faixa.ordem) {
      if (isNaN(Number(ordem)))
        return res.status(400).json({ message: "A ordem deve ser numérica." });

      const existeOrdem = await prisma.faixa.findUnique({
        where: { ordem: Number(ordem) },
      });

      if (existeOrdem)
        return res.status(400).json({ message: "Já existe outra faixa com essa ordem." });
    }

    const faixaAtualizada = await prisma.faixa.update({
      where: { id: Number(id) },
      data: {
        ...(nome && { nome }),
        ...(ordem !== undefined && { ordem: Number(ordem) }),
        ...(imagem_faixa_url && { imagem_faixa_url }),
      }
    });

    return res.json(faixaAtualizada);

  } catch (err) {
    console.error("Erro ao atualizar faixa:", err);
    return res.status(err.status || 500).json({ message: err.message || "Erro interno do servidor." });
  }
};

export const deletarFaixa = async (req, res) => {
  try {
    requireRole(req.user, ["ADMIN", "COORDENADOR"]);

    const { id } = req.params;

    const faixa = await prisma.faixa.findUnique({
      where: { id: Number(id) },
    });

    if (!faixa)
      return res.status(404).json({ message: "Faixa não encontrada." });

    // Verificar alunos
    const alunos = await prisma.aluno.findMany({
      where: { faixaId: Number(id) },
    });

    if (alunos.length > 0)
      return res.status(400).json({
        message: "Não é possível excluir uma faixa com alunos vinculados.",
      });

    // Verificar requisitos e graduações
    const requisitos = await prisma.requisito.findMany({
      where: { faixaId: Number(id) },
    });

    const graduacoes = await prisma.graduacao.findMany({
      where: { faixaId: Number(id) },
    });

    if (requisitos.length > 0 || graduacoes.length > 0)
      return res.status(400).json({
        message: "Exclua requisitos e graduações antes de remover a faixa.",
      });

    await prisma.faixa.delete({
      where: { id: Number(id) },
    });

    return res.json({ message: "Faixa removida com sucesso." });

  } catch (err) {
    console.error("Erro ao deletar faixa:", err);
    return res.status(err.status || 500).json({ message: err.message || "Erro interno do servidor." });
  }
};
