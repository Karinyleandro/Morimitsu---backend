import prisma from "../prisma.js";
import { validarCPF } from "../utils/validacao_cpf.js";

/* 
    Controller de Alunos
    Regras:
    - Apenas COORDENADOR pode criar, atualizar ou deletar alunos
    - Alunos podem ser listados ou buscados

*/

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

export async function criarAluno(req, res) {
  try {
    await checkCoordenador(req);

    const {
      nome,
      nome_social,
      cpf,
      dataNascimento,
      genero,
      num_matricula,
      id_faixa,
      cargo_aluno,
      telefone,
      endereco,
      grau,
      imagem_perfil_url,
      responsaveis,
      turmaIds,
    } = req.body;

    if (!nome || !cpf || !dataNascimento || !genero) {
      return res.status(400).json({ message: "Campos obrigatórios: nome, cpf, dataNascimento, genero" });
    }

    if (!validarCPF(cpf)) return res.status(400).json({ message: "CPF inválido" });

    const existeAluno = await prisma.usuario.findFirst({ where: { cpf } });
    if (existeAluno) return res.status(409).json({ message: "Aluno já cadastrado" });

    const generoMap = { MASCULINO: "M", FEMININO: "F", OUTRO: "OUTRO" };

    const aluno = await prisma.usuario.create({
      data: {
        tipo_usuario: "ALUNO",
        cargo_aluno,
        nome,
        nome_social,
        cpf,
        dataNascimento: new Date(dataNascimento),
        genero: generoMap[genero],
        num_matricula,
        id_faixa,
        telefone,
        endereco,
        grau,
        imagem_perfil_url,
        ativo: true,
        email: `${cpf}@aluno.morimitsu.com.br`,
        responsaveis: responsaveis?.length
          ? { create: responsaveis.map(r => ({
              nome: r.nome,
              telefone: r.telefone,
              grau_parentesco: r.grau_parentesco,
              email: r.email
            })) }
          : undefined,
        aluno_turmas: turmaIds?.length
          ? { create: turmaIds.map(id_turma => ({ id_turma })) }
          : undefined,
      },
      include: {
        responsaveis: true,
        aluno_turmas: { include: { turma: true } },
        faixa: true,
      }
    });

    res.status(201).json({ message: "Aluno cadastrado com sucesso", aluno });
  } catch (error) {
    console.error("Erro criar aluno:", error);
    res.status(error.status || 500).json({ message: error.message || "Erro interno" });
  }
}

export async function atualizarAluno(req, res) {
  try {
    await checkCoordenador(req);

    const alunoId = parseInt(req.params.id);
    const {
      nome,
      nome_social,
      cpf,
      dataNascimento,
      genero,
      num_matricula,
      id_faixa,
      cargo_aluno,
      telefone,
      endereco,
      grau,
      imagem_perfil_url,
      responsaveis,
      turmaIds,
      ativo
    } = req.body;

    const alunoExistente = await prisma.usuario.findUnique({ where: { id: alunoId } });
    if (!alunoExistente) return res.status(404).json({ message: "Aluno não encontrado" });

    const generoMap = { MASCULINO: "M", FEMININO: "F", OUTRO: "OUTRO" };

    const alunoAtualizado = await prisma.usuario.update({
      where: { id: alunoId },
      data: {
        nome,
        nome_social,
        cpf,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
        genero: genero ? generoMap[genero] : undefined,
        num_matricula,
        id_faixa,
        cargo_aluno,
        telefone,
        endereco,
        grau,
        imagem_perfil_url,
        ativo,
        responsaveis: responsaveis?.length
          ? {
              deleteMany: {}, // remove antigos
              create: responsaveis.map(r => ({
                nome: r.nome,
                telefone: r.telefone,
                grau_parentesco: r.grau_parentesco,
                email: r.email
              }))
            }
          : undefined,
        aluno_turmas: turmaIds?.length
          ? {
              deleteMany: {}, // remove antigos
              create: turmaIds.map(id_turma => ({ id_turma }))
            }
          : undefined
      },
      include: {
        responsaveis: true,
        aluno_turmas: { include: { turma: true } },
        faixa: true,
      }
    });

    res.json({ message: "Aluno atualizado com sucesso", aluno: alunoAtualizado });
  } catch (error) {
    console.error("Erro atualizar aluno:", error);
    res.status(error.status || 500).json({ message: error.message || "Erro interno" });
  }
}

export async function deletarAluno(req, res) {
  try {
    await checkCoordenador(req);

    const alunoId = parseInt(req.params.id);
    const alunoExistente = await prisma.usuario.findUnique({ where: { id: alunoId } });
    if (!alunoExistente) return res.status(404).json({ message: "Aluno não encontrado" });

    await prisma.usuario.delete({ where: { id: alunoId } });
    res.json({ message: "Aluno deletado com sucesso" });
  } catch (error) {
    console.error("Erro deletar aluno:", error);
    res.status(error.status || 500).json({ message: error.message || "Erro interno" });
  }
}

export async function listarAlunos(req, res) {
  try {
    const { nome, id } = req.query;

    const filtros = {};
    if (nome) filtros.nome = { contains: nome, mode: "insensitive" };
    if (id) filtros.id = parseInt(id);

    const alunos = await prisma.usuario.findMany({
      where: { tipo_usuario: "ALUNO", ...filtros },
      include: {
        responsaveis: true,
        aluno_turmas: { include: { turma: true } },
        faixa: true,
      },
      orderBy: { nome: "asc" }
    });

    res.json(alunos);
  } catch (error) {
    console.error("Erro listar alunos:", error);
    res.status(500).json({ message: "Erro interno" });
  }
}

export async function listarAlunosPorTurma(req, res) {
  try {
    const turmaId = parseInt(req.params.id);
    const alunos = await prisma.aluno_Turma.findMany({
      where: { id_turma: turmaId, ativo: true },
      include: { usuario: { include: { responsaveis: true, faixa: true } }, turma: true },
    });

    res.json(alunos.map(a => a.usuario));
  } catch (error) {
    console.error("Erro listar alunos por turma:", error);
    res.status(500).json({ message: "Erro interno" });
  }
}
