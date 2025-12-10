import prisma from "../prisma.js";
import bcrypt from "bcrypt";


// ==================== LISTAR ALUNOS ====================
export const listarAlunos = async (req, res) => {
  try {
    const alunos = await prisma.usuario.findMany({
      where: { tipo: { in: ["ALUNO", "ALUNO_PROFESSOR"] } },
      select: {
        id: true,
        nome: true,
        nome_social: true,
        email: true,
        telefone: true,
        dataNascimento: true,
        genero: true,
        turma_matriculas: {
          select: {
            turma: { select: { id: true, nome_turma: true } },
            ativo: true
          }
        }
      }
    });
    return res.status(200).json({ alunos });
  } catch (error) {
    console.error("Erro ao listar alunos:", error);
    return res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};

// ==================== LISTAR ALUNOS POR TURMA ====================
export const listarAlunosPorTurma = async (req, res) => {
  try {
    const { turmaId } = req.params;

    const alunos = await prisma.usuario.findMany({
      where: {
        tipo: { in: ["ALUNO", "ALUNO_PROFESSOR"] },
        turma_matriculas: { some: { id_turma: turmaId } }
      },
      select: {
        id: true,
        nome: true,
        nome_social: true,
        email: true,
        telefone: true,
        dataNascimento: true,
        genero: true,
        turma_matriculas: {
          select: {
            turma: { select: { id: true, nome_turma: true } },
            ativo: true
          }
        }
      }
    });

    return res.status(200).json({ alunos });
  } catch (error) {
    console.error("Erro ao listar alunos por turma:", error);
    return res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};

// ==================== DETALHES DO ALUNO ====================
export const detalhesAluno = async (req, res) => {
  try {
    const { id } = req.params;
    const aluno = await prisma.usuario.findUnique({
      where: { id },
      include: {
        faixa: true,
        responsaveis: true,
        turma_matriculas: { include: { turma: true } }
      }
    });

    if (!aluno || !["ALUNO", "ALUNO_PROFESSOR"].includes(aluno.tipo)) {
      return res.status(404).json({ message: "Aluno não encontrado" });
    }

    return res.status(200).json({ aluno });
  } catch (error) {
    console.error("Erro ao obter detalhes do aluno:", error);
    return res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};

// ==================== PROMOVER ALUNO ====================
export const promoverAlunoProfessor = async (req, res) => {
  try {
    const usuarioLogado = req.user; // quem está fazendo a requisição
    const { id } = req.params;      // id do aluno
    const { email, senha } = req.body; // json enviado no body

    /* ----------------------------- PERMISSÃO ----------------------------- */
    if (usuarioLogado.tipo !== "COORDENADOR") {
      return res.status(403).json({
        message: "Apenas COORDENADORES podem promover um aluno a ALUNO_PROFESSOR."
      });
    }

    /* ----------------------------- VALIDA BODY --------------------------- */
    if (!email || !senha) {
      return res.status(400).json({
        message: "É necessário enviar email e senha no body da requisição."
      });
    }

    /* ----------------------------- BUSCAR ALUNO -------------------------- */
    const aluno = await prisma.usuario.findUnique({ where: { id } });

    if (!aluno) {
      return res.status(404).json({ message: "Aluno não encontrado." });
    }

    if (aluno.tipo !== "ALUNO") {
      return res.status(400).json({
        message: "Este usuário não é um ALUNO ou já é ALUNO_PROFESSOR."
      });
    }

    /* --------------------------- GERAR HASH SENHA ------------------------ */
    const passwordHash = await bcrypt.hash(senha, 10);

    /* ----------------------------- ATUALIZAR ----------------------------- */
    const atualizado = await prisma.usuario.update({
      where: { id },
      data: {
        tipo: "ALUNO_PROFESSOR",
        email,
        passwordHash
      }
    });

    return res.status(200).json({
      message: "Aluno promovido a ALUNO_PROFESSOR com sucesso.",
      aluno: atualizado
    });

  } catch (error) {
    console.error("Erro ao promover aluno:", error);
    return res.status(500).json({
      message: "Erro interno do servidor",
      error: error.message
    });
  }
};

// ==================== CONSULTAR FREQUÊNCIAS ====================
export const consultarFrequencias = async (req, res) => {
  try {
    const { alunoId, turmaId } = req.params;

    const frequencias = await prisma.aluno_Turma.findUnique({
      where: { id_aluno_id_turma: { id_aluno: alunoId, id_turma: turmaId } },
      select: {
        frequencia_acumulada: true,
        ativo: true,
        aluno: { select: { aulas: true, nome: true, num_matricula: true } },
        turma: { select: { nome_turma: true, total_aulas: true } }
      }
    });

    if (!frequencias) {
      return res.status(404).json({ message: "Aluno ou turma não encontrado" });
    }

    return res.status(200).json({ frequencias });
  } catch (error) {
    console.error("Erro ao consultar frequências:", error);
    return res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};

// ==================== CONSULTAR HISTÓRICO DE FREQUÊNCIAS ====================
export const consultarHistoricoFrequencias = async (req, res) => {
  try {
    const { alunoId } = req.params;

    const historico = await prisma.frequencia.findMany({
      where: { id_aluno: alunoId },
      orderBy: { data_aula: "desc" },
      select: {
        id: true,
        data_aula: true,
        presente: true,
        turma: { select: { id: true, nome_turma: true, total_aulas: true } },
        registrador: { select: { id: true, nome: true } }
      }
    });

    return res.status(200).json({ historico });
  } catch (error) {
    console.error("Erro ao consultar histórico de frequências:", error);
    return res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};

