import bcrypt from "bcrypt";
import prisma from "../prisma.js";
import { validarCPF } from "../utils/validacao_cpf.js";

const SALT_ROUNDS = 10;

// Gera hash seguro do ID (para não expor IDs reais na API)
async function hashId(id) {
  return await bcrypt.hash(id.toString(), SALT_ROUNDS);
}

// Busca usuário a partir de hash do ID
async function encontrarUsuarioPorHash(hash) {
  const usuarios = await prisma.usuario.findMany({ include: { aluno: true } });
  for (const u of usuarios) {
    if (await bcrypt.compare(u.id.toString(), hash)) return u;
  }
  return null;
}

export const obterUsuarioDetalhado = async (req, res) => {
  try {
    const { id } = req.params;

    // Buscar usuário ou aluno
    let usuario = await prisma.usuario.findUnique({
      where: { id },
      include: { aluno: { include: { faixa: true, historicoGraduacoes: true } } } // incluir faixa e histórico se aluno
    });

    let aluno = null;

    if (!usuario) {
      // Se não encontrar como usuário, buscar como aluno
      aluno = await prisma.aluno.findUnique({
        where: { id },
        include: { usuario: true, faixa: true, historicoGraduacoes: true }
      });

      if (!aluno) return res.status(404).json({ message: "Usuário/Aluno não encontrado" });
      usuario = aluno.usuario; // pode ser null se aluno não tiver usuário
    }

    // Montar objeto de resposta
    const dados = {
      id: usuario?.id || aluno.id,
      nome_completo: aluno?.nome || usuario?.nome,
      nome_social: aluno?.nome_social || usuario?.nome_social,
      cpf: aluno?.cpf || usuario?.cpf,
      data_nascimento: aluno?.dataNascimento || usuario?.dataNascimento,
      endereco: aluno?.endereco || usuario?.endereco,
      telefone: aluno?.telefone || usuario?.telefone,
      genero: aluno?.genero || usuario?.genero,
      cargo: usuario?.tipo || aluno?.tipo || "Aluno(a)",
      imagem_perfil_url: aluno?.imagem_perfil_url || usuario?.imagem_perfil_url || null,
      faixa_atual: aluno?.faixa?.nome || null,
      grau_atual: aluno?.grau || null,
      turma: aluno?.turma || null,
      matricula: aluno?.num_matricula || null,
      telefone_responsavel: aluno?.telefone_responsavel || null,
      historico_graduacoes: aluno?.historicoGraduacoes || []
    };

    res.json({ sucesso: true, dados });

  } catch (error) {
    console.error("Erro ao buscar usuário detalhado:", error);
    res.status(500).json({ sucesso: false, message: "Erro ao buscar usuário", detalhe: error.message });
  }
};


export const listarUsuarios = async (req, res) => {
  try {
    const { nome } = req.query;

    // Construir filtro para nome (caso seja fornecido)
    const filtroNome = nome
      ? {
          nome: {
            contains: nome,
            mode: "insensitive" // para não diferenciar maiúsculas/minúsculas
          }
        }
      : {};

    // Buscar todos os usuários incluindo aluno e faixa
    const usuarios = await prisma.usuario.findMany({
      where: filtroNome,
      include: {
        aluno: {
          include: {
            faixa: true
          }
        }
      }
    });

    // Buscar alunos que não possuem usuário, incluindo faixa
    const alunosSemUsuario = await prisma.aluno.findMany({
      where: { usuarioId: null, ...filtroNome },
      include: { faixa: true }
    });

    // Formatar usuários
    const usuariosFormatados = usuarios.map(u => {
      const imagemFaixa = u.aluno?.faixa?.imagem_faixa_url || null;
      return {
        id: u.id,
        nome: u.nome,
        cargo: u.tipo || u.aluno?.tipo || null,
        imagem_perfil_url: u.imagem_perfil_url || u.aluno?.imagem_perfil_url || null,
        imagem_faixa_url: imagemFaixa
      };
    });

    // Formatar alunos sem usuário
    const alunosFormatados = alunosSemUsuario.map(a => {
      const imagemFaixa = a.faixa?.imagem_faixa_url || null;
      return {
        id: a.id,
        nome: a.nome,
        cargo: a.tipo || null,
        imagem_perfil_url: a.imagem_perfil_url || null,
        imagem_faixa_url: imagemFaixa
      };
    });

    res.status(200).json({
      sucesso: true,
      total: usuariosFormatados.length + alunosFormatados.length,
      dados: [...usuariosFormatados, ...alunosFormatados]
    });

  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao buscar usuários.",
      detalhe: error.message
    });
  }
};

export const criarUsuario = async (req, res) => {
  try {
    const {
      nome, nome_social, email, cpf, dataNascimento, telefone,
      endereco, genero, tipo, imagem_perfil_url,
      num_matricula, grau, id_faixa, cargo_aluno
    } = req.body;

    if (!nome) return res.status(400).json({ message: "Campo 'nome' é obrigatório" });

    // Verificar CPF duplicado
    if (cpf) {
      if (!validarCPF(cpf)) return res.status(400).json({ message: "CPF inválido" });
      const cpfExistenteUsuario = await prisma.usuario.findUnique({ where: { cpf } });
      const cpfExistenteAluno = await prisma.aluno.findUnique({ where: { cpf } });
      if (cpfExistenteUsuario || cpfExistenteAluno) return res.status(409).json({ message: "CPF já cadastrado" });
    }

    // Criar usuário
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        nome_social,
        email,
        cpf,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
        telefone,
        endereco,
        genero,
        tipo,
        imagem_perfil_url,
      }
    });

    // Se enviar dados de aluno, criar aluno vinculado
    let aluno = null;
    if (num_matricula || grau || id_faixa || cargo_aluno) {
      aluno = await prisma.aluno.create({
        data: {
          nome,
          nome_social,
          cpf,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
          telefone,
          endereco,
          genero,
          num_matricula,
          grau,
          id_faixa,
          tipo: "COMUM",
          cargo: cargo_aluno,
          usuarioId: usuario.id
        }
      });
    }

    const resultado = await prisma.usuario.findUnique({ where: { id: usuario.id }, include: { aluno: true } });

    res.status(201).json({ message: "Usuário criado com sucesso", dados: resultado });
  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ message: "Erro ao criar usuário", detalhe: error.message });
  }
};

export const atualizarUsuario = async (req, res) => {
  const { id } = req.params;
  const {
    nome, nome_social, email, cpf, num_matricula, dataNascimento,
    telefone, endereco, grau, genero, tipo, imagem_perfil_url,
    ativo, ultimo_login, id_faixa, cargo_aluno
  } = req.body;

  try {
    // Buscar usuario ou aluno
    let usuarioExistente = await prisma.usuario.findUnique({
      where: { id },
      include: { aluno: true }
    });

    let alunoExistente = null;

    // Se não houver usuario, procurar aluno
    if (!usuarioExistente) {
      alunoExistente = await prisma.aluno.findUnique({ where: { id }, include: { usuario: true } });
      if (!alunoExistente) return res.status(404).json({ message: "Usuário/Aluno não encontrado" });
      usuarioExistente = alunoExistente.usuario;
    }

    const usuarioAtual = req.user;
    if (usuarioAtual.sub !== id && usuarioAtual.tipo !== "COORDENADOR") return res.status(403).json({ message: "Acesso negado" });

    const dataAtualizacaoUsuario = {};
    const dataAtualizacaoAluno = {};

    // Campos de usuario
    if (nome) dataAtualizacaoUsuario.nome = nome.trim();
    if (nome_social) dataAtualizacaoUsuario.nome_social = nome_social.trim();
    if (email && usuarioExistente) dataAtualizacaoUsuario.email = email.trim().toLowerCase();
    if (cpf) {
      if (!validarCPF(cpf)) return res.status(400).json({ message: "CPF inválido" });
      dataAtualizacaoUsuario.cpf = cpf;
      dataAtualizacaoAluno.cpf = cpf;
    }
    if (telefone) { dataAtualizacaoUsuario.telefone = telefone; dataAtualizacaoAluno.telefone = telefone; }
    if (endereco) { dataAtualizacaoUsuario.endereco = endereco.trim(); dataAtualizacaoAluno.endereco = endereco.trim(); }
    if (dataNascimento) { dataAtualizacaoUsuario.dataNascimento = new Date(dataNascimento); dataAtualizacaoAluno.dataNascimento = new Date(dataNascimento); }
    if (genero) { dataAtualizacaoUsuario.genero = genero; dataAtualizacaoAluno.genero = genero; }
    if (tipo && usuarioExistente) dataAtualizacaoUsuario.tipo = tipo;
    if (imagem_perfil_url) { dataAtualizacaoUsuario.imagem_perfil_url = imagem_perfil_url; dataAtualizacaoAluno.imagem_perfil_url = imagem_perfil_url; }
    if (ativo !== undefined && usuarioExistente) dataAtualizacaoUsuario.ativo = Boolean(ativo);
    if (ultimo_login && usuarioExistente) dataAtualizacaoUsuario.ultimo_login = new Date(ultimo_login);

    // Campos de aluno
    if (num_matricula !== undefined) dataAtualizacaoAluno.num_matricula = num_matricula;
    if (grau !== undefined) dataAtualizacaoAluno.grau = grau;
    if (id_faixa !== undefined) dataAtualizacaoAluno.id_faixa = id_faixa;
    if (cargo_aluno !== undefined) dataAtualizacaoAluno.cargo = cargo_aluno;

    // Transação
    await prisma.$transaction(async tx => {
      if (usuarioExistente && Object.keys(dataAtualizacaoUsuario).length > 0) {
        dataAtualizacaoUsuario.atualizado_em = new Date();
        await tx.usuario.update({ where: { id: usuarioExistente.id }, data: dataAtualizacaoUsuario });
      }

      if ((usuarioExistente?.aluno || alunoExistente) && Object.keys(dataAtualizacaoAluno).length > 0) {
        const alunoId = alunoExistente ? alunoExistente.id : usuarioExistente.aluno.id;
        dataAtualizacaoAluno.atualizado_em = new Date();
        await tx.aluno.update({ where: { id: alunoId }, data: dataAtualizacaoAluno });
      }
    });

    const atualizado = alunoExistente
      ? await prisma.aluno.findUnique({ where: { id: alunoExistente.id }, include: { usuario: true } })
      : await prisma.usuario.findUnique({ where: { id }, include: { aluno: true } });

    res.json({ message: "Usuário/Aluno atualizado com sucesso", dados: atualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar usuário/aluno", detalhe: error.message });
  }
};

export const deletarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const usuarioAtual = req.user;

    if (usuarioAtual.tipo !== "COORDENADOR") return res.status(403).json({ message: "Apenas coordenadores podem deletar usuários" });

    let usuarioExistente = await prisma.usuario.findUnique({ where: { id }, include: { aluno: true } });
    let alunoExistente = null;

    if (!usuarioExistente) {
      alunoExistente = await prisma.aluno.findUnique({ where: { id }, include: { usuario: true } });
      if (!alunoExistente) return res.status(404).json({ message: "Usuário/Aluno não encontrado" });
      usuarioExistente = alunoExistente.usuario;
    }

    // Deletar transação
    await prisma.$transaction(async tx => {
      if (alunoExistente) {
        await tx.aluno.delete({ where: { id: alunoExistente.id } });
      } else if (usuarioExistente?.aluno) {
        await tx.aluno.delete({ where: { id: usuarioExistente.aluno.id } });
      }
      if (usuarioExistente) {
        await tx.usuario.delete({ where: { id: usuarioExistente.id } });
      }
    });

    res.json({ message: "Usuário/Aluno deletado com sucesso" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
};

export const atualizarFotoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { fotoUrl } = req.body;
    const usuarioAtual = req.user;

    let usuarioExistente = await prisma.usuario.findUnique({ where: { id }, include: { aluno: true } });
    let alunoExistente = null;

    if (!usuarioExistente) {
      alunoExistente = await prisma.aluno.findUnique({ where: { id } });
      if (!alunoExistente) return res.status(404).json({ message: "Usuário/Aluno não encontrado" });
      usuarioExistente = alunoExistente.usuario;
    }

    if (usuarioAtual.sub !== id && usuarioAtual.tipo !== "COORDENADOR") return res.status(403).json({ message: "Acesso negado" });

    if (!fotoUrl) return res.status(400).json({ message: "URL da imagem é obrigatória" });
    try { new URL(fotoUrl); } catch { return res.status(400).json({ message: "URL inválida" }); }

    const extensoesPermitidas = [".jpg", ".jpeg", ".png"];
    if (!extensoesPermitidas.some(ext => fotoUrl.toLowerCase().endsWith(ext))) return res.status(400).json({ message: "Formato de imagem inválido" });

    // Atualizar transação
    await prisma.$transaction(async tx => {
      if (usuarioExistente) await tx.usuario.update({ where: { id: usuarioExistente.id }, data: { imagem_perfil_url: fotoUrl } });
      if (alunoExistente || usuarioExistente?.aluno) {
        const alunoId = alunoExistente ? alunoExistente.id : usuarioExistente.aluno.id;
        await tx.aluno.update({ where: { id: alunoId }, data: { imagem_perfil_url: fotoUrl } });
      }
    });

    res.json({ message: "Foto atualizada com sucesso" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
};

export default {
  obterUsuarioDetalhado,
  listarUsuarios,
  criarUsuario, 
  atualizarUsuario, 
  deletarUsuario, 
  atualizarFotoUsuario 
};
