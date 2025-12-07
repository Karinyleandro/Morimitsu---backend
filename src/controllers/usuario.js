import bcrypt from "bcrypt";
import prisma from "../prisma.js";

// ==================== AUXILIARES ====================
const SALT_ROUNDS = 10;

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return 0;
  const birth = new Date(dataNascimento);
  const now = new Date();
  let idade = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) idade--;
  return idade;
}

// ==================== LISTAR USUÁRIOS ====================
export const listarUsuarios = async (req, res) => {
  try {
    // Apenas ADMIN pode listar todos
    if (!["ADMIN", "COORDENADOR"].includes(req.user.tipo)) {
  return res.status(403).json({ message: "Acesso negado" });
}


    const { nome, tipo, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filtro = {
      ...(nome ? { nome: { contains: nome, mode: "insensitive" } } : {}),
      ...(tipo ? { tipo } : {}),
    };

    const total = await prisma.usuario.count({ where: filtro });

    const usuarios = await prisma.usuario.findMany({
      where: filtro,
      skip,
      take: Number(limit),
      orderBy: { nome: "asc" },
      include: {
        responsaveis: true,
        turma_matriculas: { include: { turma: true } },
        faixa: true,
      },
    });

    res.json({
      sucesso: true,
      total,
      paginaAtual: Number(page),
      totalPaginas: Math.ceil(total / limit),
      dados: usuarios,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao listar usuários", detalhe: error.message });
  }
};

// ==================== OBTER DETALHADO ====================
export const obterUsuarioDetalhado = async (req, res) => {
  try {
    const { id } = req.params;

    // Se não for ADMIN, só pode ver seu próprio usuário
    if (!["ADMIN", "COORDENADOR"].includes(req.user.tipo) && req.user.sub !== id) {
  return res.status(403).json({ message: "Acesso negado" });
}


    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        responsaveis: true,
        turma_matriculas: { include: { turma: true } },
        faixa: true,
      },
    });

    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });

    res.json({ sucesso: true, usuario });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro interno", detalhe: error.message });
  }
};

// ==================== ATUALIZAR PERFIL DO USUÁRIO ====================
export const atualizarPerfil = async (req, res) => {
  try {
    const usuarioId = req.params.id; // ID do usuário que será atualizado
    const { id: logadoId, tipo: tipoLogado } = req.user; // usuário autenticado
    
    // Apenas usuários autorizados
    const tiposPermitidos = ["PROFESSOR", "COORDENADOR", "ALUNO_PROFESSOR"];
    if (!tiposPermitidos.includes(tipoLogado)) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // Só pode atualizar seu próprio perfil
    if (usuarioId !== logadoId) {
      return res.status(403).json({ message: "Você só pode atualizar seu próprio perfil" });
    }

    const {
      nome,
      dataNascimento,
      cpf,
      genero,
      email,
      endereco,
      password,
      telefone,
      imagem_perfil_url
    } = req.body;

    // Monta objeto de atualização dinamicamente
    const dataToUpdate = {};
    if (nome !== undefined) dataToUpdate.nome = nome;
    if (dataNascimento !== undefined) dataToUpdate.dataNascimento = new Date(dataNascimento);
    if (cpf !== undefined) dataToUpdate.cpf = cpf;
    if (genero !== undefined) dataToUpdate.genero = genero;
    if (email !== undefined) dataToUpdate.email = email;
    if (endereco !== undefined) dataToUpdate.endereco = endereco;
    if (telefone !== undefined) dataToUpdate.telefone = telefone;
    if (imagem_perfil_url !== undefined) dataToUpdate.imagem_perfil_url = imagem_perfil_url;
    if (password !== undefined) {
      dataToUpdate.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    }

    // Atualiza o usuário no banco
    const updatedUser = await prisma.usuario.update({
      where: { id: usuarioId },
      data: dataToUpdate,
      select: {
        id: true,
        nome: true,
        dataNascimento: true,
        cpf: true,
        genero: true,
        email: true,
        endereco: true,
        telefone: true,
        imagem_perfil_url: true
      }
    });

    return res.status(200).json({
      message: "Perfil atualizado com sucesso",
      user: updatedUser
    });

  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};

// ==================== ATUALIZAR USUÁRIO ====================
export const atualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nome,
      nome_social,
      tipo,
      endereco,
      dataNascimento,
      cpf,
      telefone,
      genero,
      responsaveis = [],
      id_faixa,
      grau,
      num_matricula,
      turmaIds = [],
      aulas,
      email,
      password,
      imagem_perfil_url,
      ativo,
    } = req.body;

    const tiposAlunos = ["ALUNO", "ALUNO_PROFESSOR"];

    // Calcula idade
    const idade = dataNascimento ? calcularIdade(dataNascimento) : null;

    // Valida responsáveis para alunos menores de 18 anos
    if (tiposAlunos.includes(tipo) && idade !== null && idade < 18) {
      if (!responsaveis || responsaveis.length === 0) {
        return res.status(400).json({
          message: "Aluno menor de 18 anos precisa de pelo menos um responsável",
        });
      }
    }

    // Prepara dados de responsáveis
    const responsaveisData =
      responsaveis.length > 0
        ? {
            deleteMany: {}, // remove os anteriores
            create: responsaveis.map((r) => ({
              telefone: r.telefone,
              nome: r.nome || null,
              email: r.email || null,
              grau_parentesco: "Responsável",
            })),
          }
        : undefined;

    // Prepara dados das turmas
    const turmaData =
      turmaIds.length > 0
        ? {
            deleteMany: {},
            create: turmaIds.map((turmaId) => ({
              turma: { connect: { id: turmaId } },
              ativo: true,
              frequencia_acumulada: 0,
            })),
          }
        : undefined;

    // Monta objeto data apenas com campos definidos
    const dataToUpdate = {};

    if (nome !== undefined) dataToUpdate.nome = nome;
    if (nome_social !== undefined) dataToUpdate.nome_social = nome_social;
    if (tipo !== undefined) dataToUpdate.tipo = tipo;
    if (endereco !== undefined) dataToUpdate.endereco = endereco;
    if (dataNascimento !== undefined)
      dataToUpdate.dataNascimento = new Date(dataNascimento);
    if (cpf !== undefined) dataToUpdate.cpf = cpf;
    if (telefone !== undefined) dataToUpdate.telefone = telefone;
    if (genero !== undefined) dataToUpdate.genero = genero;
    if (email !== undefined) dataToUpdate.email = email;
    if (password !== undefined)
      dataToUpdate.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    if (grau !== undefined) dataToUpdate.grau = grau;
    if (num_matricula !== undefined) dataToUpdate.num_matricula = num_matricula;
    if (aulas !== undefined) dataToUpdate.aulas = aulas;
    if (ativo !== undefined) dataToUpdate.ativo = ativo;
    if (imagem_perfil_url !== undefined)
      dataToUpdate.imagem_perfil_url = imagem_perfil_url;
    if (id_faixa !== undefined)
      dataToUpdate.faixa = { connect: { id: id_faixa } };
    if (responsaveisData !== undefined) dataToUpdate.responsaveis = responsaveisData;
    if (turmaData !== undefined) dataToUpdate.turma_matriculas = turmaData;

    // Atualiza usuário
    const updatedUser = await prisma.usuario.update({
      where: { id },
      data: dataToUpdate,
      include: {
        faixa: true,
        responsaveis: true,
        turma_matriculas: { include: { turma: true } },
      },
    });

    return res
      .status(200)
      .json({ message: "Usuário atualizado com sucesso", user: updatedUser });
  } catch (error) {
    console.error("Erro ao atualizar usuário:", error);
    return res
      .status(500)
      .json({ message: "Erro interno do servidor", error: error.message });
  }
};

// ==================== DELETAR USUÁRIO ====================
export const deletarUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // Apenas ADMIN pode deletar usuários
    if (!["ADMIN", "COORDENADOR"].includes(req.user.tipo)) {
  return res.status(403).json({ message: "Acesso negado" });
}


    await prisma.usuario.delete({ where: { id } });
    res.json({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao deletar usuário", detalhe: error.message });
  }
};

// ==================== ATUALIZAR FOTO ====================
export const atualizarFotoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { fotoUrl } = req.body;

    if (!fotoUrl) return res.status(400).json({ message: "Foto URL é obrigatória" });

    // Só ADMIN ou o próprio usuário podem atualizar
    if (req.user.tipo !== "ADMIN" && req.user.sub !== id) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    const usuarioAtualizado = await prisma.usuario.update({
      where: { id },
      data: { imagem_perfil_url: fotoUrl },
      include: {
        responsaveis: true,
        turma_matriculas: { include: { turma: true } },
        faixa: true,
      }
    });

    res.json({ sucesso: true, usuario: usuarioAtualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar foto do usuário", detalhe: error.message });
  }
};
