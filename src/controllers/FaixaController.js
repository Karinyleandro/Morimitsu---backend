import { prisma } from "../database/database.js";






/* 
para criar as faixas eu vou usar um arquivo dentro de seeds e usar para adicionar todas de uma vez, como tds sao padroes vai facilitar
obs: - criar um arquivo local para as imagens e colocar as imagens das faixas de acordo com o figma
obs 2: colocar verificação de somente o coordenador add uma faixa ou admin
obs 3: lembrar de evitar esquecer a verificação para ações, o professor so tem acesso ao relatório e a chamada

*/

export const criarFaixa = async (req, res) => {
  try {
    const { nome, ordem, imagem_faixa_url } = req.body;

    if (!nome || !ordem)
      return res.status(400).json({ message: "Nome e ordem são obrigatórios." });

    const existeOrdem = await prisma.faixa.findUnique({
      where: { ordem },
    });

    if (existeOrdem)
      return res.status(400).json({ message: "Já existe uma faixa com essa ordem." });

    const faixa = await prisma.faixa.create({
      data: { nome, ordem, imagem_faixa_url },
    });

    return res.status(201).json(faixa);
  } catch (err) {
    console.error("Erro ao criar faixa:", err);
    return res.status(500).json({ message: "Erro interno do servidor." });
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
    const { id } = req.params;
    const { nome, ordem, imagem_faixa_url } = req.body;

    const faixa = await prisma.faixa.findUnique({
      where: { id: Number(id) },
    });

    if (!faixa)
      return res.status(404).json({ message: "Faixa não encontrada." });

    // Se estiver alterando ordem, impedir duplicidade
    if (ordem && ordem !== faixa.ordem) {
      const existeOrdem = await prisma.faixa.findUnique({
        where: { ordem },
      });

      if (existeOrdem)
        return res.status(400).json({ message: "Já existe outra faixa com essa ordem." });
    }

    const faixaAtualizada = await prisma.faixa.update({
      where: { id: Number(id) },
      data: { nome, ordem, imagem_faixa_url },
    });

    return res.json(faixaAtualizada);
  } catch (err) {
    console.error("Erro ao atualizar faixa:", err);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }
};

export const deletarFaixa = async (req, res) => {
  try {
    const { id } = req.params;

    const faixa = await prisma.faixa.findUnique({
      where: { id: Number(id) },
    });

    if (!faixa)
      return res.status(404).json({ message: "Faixa não encontrada." });

    // Verificar se existem alunos vinculados a esta faixa
    const alunos = await prisma.aluno.findMany({
      where: { faixaId: Number(id) },
    });

    if (alunos.length > 0) {
      return res.status(400).json({
        message: "Não é possível excluir uma faixa que possui alunos vinculados.",
      });
    }

    await prisma.faixa.delete({
      where: { id: Number(id) },
    });

    return res.json({ message: "Faixa removida com sucesso." });
  } catch (err) {
    console.error("Erro ao deletar faixa:", err);
    return res.status(500).json({ message: "Erro interno do servidor." });
  }
};
