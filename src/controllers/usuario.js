import bcrypt from "bcrypt";
import prisma from "../prisma.js";
import { validarCPF } from "../utils/validacao_cpf.js";

const SALT_ROUNDS = 10;

async function hashId(id) {
  return await bcrypt.hash(id.toString(), SALT_ROUNDS);
}

async function encontrarUsuarioPorHash(hash) {
  const usuarios = await prisma.usuario.findMany();
  for (const u of usuarios) {
    const match = await bcrypt.compare(u.id.toString(), hash);
    if (match) return u;
  }
  return null;
}

export async function listarUsuarios(req, res) {
  try {
    const usuarioAtual = req.user;
    let usuarios;

    if (usuarioAtual.tipo_usuario === "COORDENADOR") {
      usuarios = await prisma.usuario.findMany({
        select: {
          id: true,
          nome: true,
          nome_social: true,
          email: true,
          tipo_usuario: true,
          genero: true,
          cpf: true,
          dataNascimento: true,
          telefone: true,
          endereco: true,
          grau: true,
          imagem_perfil_url: true,
          ativo: true,
          ultimo_login: true,
          passwordHash: true,
          criado_em: true,
          atualizado_em: true,
          num_matricula: true,
          id_faixa: true,
          cargo_aluno: true
        },
      });
    } else {
      usuarios = await prisma.usuario.findMany({
        where: { id: usuarioAtual.sub },
        select: {
          id: true,
          nome: true,
          nome_social: true,
          email: true,
          tipo_usuario: true,
          genero: true,
          cpf: true,
          dataNascimento: true,
          telefone: true,
          endereco: true,
          grau: true,
          imagem_perfil_url: true,
          ativo: true,
          ultimo_login: true,
          passwordHash: true,
          criado_em: true,
          atualizado_em: true,
          num_matricula: true,
          id_faixa: true,
          cargo_aluno: true
        },
      });
    }

    const usuariosFormatados = await Promise.all(
      usuarios.map(async u => ({
        ...u,
        id: await hashId(u.id),
      }))
    );

    res.json({ usuarios: usuariosFormatados });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
}

export const atualizarUsuario = async (req, res) => {
  const { id: hashIdParam } = req.params;
  const {
    nome,
    nome_social,
    email,
    cpf,
    num_matricula,
    dataNascimento,
    telefone,
    endereco,
    grau,
    genero,
    tipo_usuario,
    imagem_perfil_url,
    ativo,
    ultimo_login,
    id_faixa,
    cargo_aluno
  } = req.body;

  try {
    // Localiza o usuário pelo hash
    const usuarioExistente = await encontrarUsuarioPorHash(hashIdParam);
    if (!usuarioExistente) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Permissão: apenas o próprio usuário ou coordenador
    const usuarioAtual = req.user;
    if (usuarioAtual.sub !== usuarioExistente.id && usuarioAtual.tipo_usuario !== "COORDENADOR") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    // Gera objeto de atualização apenas com campos enviados
    const dataAtualizacao = {};

    if (nome) dataAtualizacao.nome = nome.trim();
    if (nome_social) dataAtualizacao.nome_social = nome_social.trim();

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Email inválido" });
      }
      dataAtualizacao.email = email.trim().toLowerCase();
    }

    if (cpf) {
      if (!validarCPF(cpf)) {
        return res.status(400).json({ message: "CPF inválido" });
      }
      dataAtualizacao.cpf = cpf;
    }

    if (num_matricula) dataAtualizacao.num_matricula = num_matricula;
    if (telefone) dataAtualizacao.telefone = telefone;
    if (endereco) dataAtualizacao.endereco = endereco.trim();
    if (grau) dataAtualizacao.grau = grau;

    if (dataNascimento) {
      const dataNasc = new Date(dataNascimento);
      if (isNaN(dataNasc)) {
        return res.status(400).json({ message: "dataNascimento inválida" });
      }
      dataAtualizacao.dataNascimento = dataNasc;
    }

    if (genero) {
      const generoMap = { MASCULINO: "M", FEMININO: "F", OUTRO: "O", NAO_INFORMADO: "N" };
      dataAtualizacao.genero = generoMap[genero] || genero;
    }

    if (tipo_usuario) {
      const tiposValidos = ["USUARIO", "COORDENADOR", "ALUNO", "PROFESSOR"];
      if (!tiposValidos.includes(tipo_usuario)) {
        return res.status(400).json({ message: "Tipo de usuário inválido" });
      }
      dataAtualizacao.tipo_usuario = tipo_usuario;
    }

    if (imagem_perfil_url) {
      try {
        new URL(imagem_perfil_url);
      } catch {
        return res.status(400).json({ message: "URL de imagem inválida" });
      }
      dataAtualizacao.imagem_perfil_url = imagem_perfil_url;
    }

    if (ativo !== undefined) dataAtualizacao.ativo = Boolean(ativo);
    if (ultimo_login) {
      const dataLogin = new Date(ultimo_login);
      if (isNaN(dataLogin)) {
        return res.status(400).json({ message: "Data de último login inválida" });
      }
      dataAtualizacao.ultimo_login = dataLogin;
    }

    if (id_faixa !== undefined) dataAtualizacao.id_faixa = id_faixa;
    if (cargo_aluno !== undefined) dataAtualizacao.cargo_aluno = cargo_aluno;

    // Verifica se algum campo foi realmente enviado
    if (Object.keys(dataAtualizacao).length === 0) {
      return res.status(400).json({ message: "Nenhum campo enviado para atualização" });
    }

    dataAtualizacao.atualizado_em = new Date();

    // Atualiza o usuário
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: usuarioExistente.id },
      data: dataAtualizacao,
    });

    res.status(200).json({
      message: "Usuário atualizado com sucesso",
      usuario: usuarioAtualizado,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao atualizar usuário", error: error.message });
  }
};

export async function deletarUsuario(req, res) {
  try {
    const { id: hashIdParam } = req.params;
    const usuarioAtual = req.user;

    if (usuarioAtual.tipo_usuario !== "COORDENADOR") {
      return res.status(403).json({ message: "Apenas coordenadores podem deletar usuários" });
    }

    const usuarioExistente = await encontrarUsuarioPorHash(hashIdParam);
    if (!usuarioExistente) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (usuarioAtual.sub === usuarioExistente.id) {
      return res.status(400).json({ message: "Não é possível deletar o próprio usuário" });
    }

    await prisma.usuario.delete({ where: { id: usuarioExistente.id } });

    res.json({ message: "Usuário deletado com sucesso" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
}

export async function atualizarFotoUsuario(req, res) {
  try {
    const { id: hashIdParam } = req.params;
    const { fotoUrl } = req.body;
    const usuarioAtual = req.user;

    const usuarioExistente = await encontrarUsuarioPorHash(hashIdParam);
    if (!usuarioExistente) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (usuarioAtual.sub !== usuarioExistente.id && usuarioAtual.tipo_usuario !== "COORDENADOR") {
      return res.status(403).json({ message: "Acesso negado" });
    }

    if (!fotoUrl) {
      return res.status(400).json({ message: "URL da imagem é obrigatória" });
    }

    try {
      new URL(fotoUrl);
    } catch {
      return res.status(400).json({ message: "URL inválida" });
    }

    const extensoesPermitidas = [".jpg", ".jpeg", ".png"];
    if (!extensoesPermitidas.some(ext => fotoUrl.toLowerCase().endsWith(ext))) {
      return res.status(400).json({ message: "Formato de imagem inválido" });
    }

    const usuario = await prisma.usuario.update({
      where: { id: usuarioExistente.id },
      data: { imagem_perfil_url: fotoUrl },
    });

    const usuarioFormatado = { ...usuario, id: await hashId(usuario.id) };

    res.json({ message: "Foto atualizada com sucesso", usuario: usuarioFormatado });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
}
