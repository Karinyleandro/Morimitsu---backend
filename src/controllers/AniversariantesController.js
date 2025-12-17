// src/controllers/AniversariantesController.js
import prisma from "../prisma.js";
import { Prisma } from "@prisma/client";

/**
 * Funções utilitárias
 */
function hasRole(user, allowed = []) {
  if (!user || !user.tipo) return false;
  return allowed.includes(user.tipo);
}

function calcularIdade(dataNascimentoIso, referencia = new Date()) {
  const n = new Date(dataNascimentoIso);
  const hoje = referencia;

  let idade = hoje.getFullYear() - n.getFullYear();

  const passouAniversario =
    hoje.getMonth() > n.getMonth() ||
    (hoje.getMonth() === n.getMonth() && hoje.getDate() >= n.getDate());

  if (!passouAniversario) idade--;

  return idade;
}

function calcularProximoAniversario(dataNascimentoIso) {
  const hoje = new Date();
  const nascimento = new Date(dataNascimentoIso);

  let prox = new Date(hoje.getFullYear(), nascimento.getMonth(), nascimento.getDate());

  // se o aniversário deste ano já passou → próximo ano
  if (prox < hoje) {
    prox = new Date(hoje.getFullYear() + 1, nascimento.getMonth(), nascimento.getDate());
  }

  return prox.toISOString().split("T")[0];
}

function mesDe(date) {
  return new Date(date).getMonth() + 1;
}
function diaDe(date) {
  return new Date(date).getDate();
}

class AniversariantesController {/**
 * GET /aniversariantes/mes
 * → Lista todos alunos que fazem aniversário no mês atual
 * → Destaca quem faz aniversário HOJE com isToday = true
 */
static async aniversariantesDoMes(req, res) {
  try {
    const requester = req.user;

    // 🔐 Permissões
    if (
      !["PROFESSOR", "COORDENADOR", "ADMIN", "ALUNO_PROFESSOR"].includes(
        requester?.tipo
      )
    ) {
      return res.status(403).json({ message: "Permissão negada" });
    }

    const FOTO_PADRAO = "/fotoperfilsvg/Frame.svg";

    // 📅 Data atual (UTC)
    // 📅 Data atual (local)
    const hoje = new Date();
    const mesAtual = hoje.getMonth() + 1; // Local time
    const diaHoje = hoje.getDate(); // Local time


    // 🔥 Busca alunos
    const alunos = await prisma.usuario.findMany({
      where: {
        OR: [
          { tipo: "ALUNO" },
          { tipo: "ALUNO_PROFESSOR" }
        ],
        ativo: true,
        dataNascimento: { not: null }
      },
      include: {
        turma_matriculas: {
          take: 1,
          select: {
            turma: {
              select: { nome_turma: true }
            }
          }
        }
      }
    });

    // 🔄 Processamento (HOJE → FIM DO MÊS)
    const aniversariantes = alunos
      .map(aluno => {
        const nasc = aluno.dataNascimento;
        if (!nasc) return null;

        const mes = nasc.getUTCMonth() + 1;
        const dia = nasc.getUTCDate();

        // ❌ Ignora outros meses
        if (mes !== mesAtual) return null;

        // ❌ Ignora aniversários já passados
        if (dia < diaHoje) return null;

        return {
          nome: aluno.nome,
          aniversario: `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`,
          turma:
            aluno.turma_matriculas?.[0]?.turma?.nome_turma ??
            "Sem turma",
          fotoPerfil: aluno.imagem_perfil_url || FOTO_PADRAO,
          isToday: dia === diaHoje
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const diaA = Number(a.aniversario.split("/")[0]);
        const diaB = Number(b.aniversario.split("/")[0]);

        return diaA - diaB || a.nome.localeCompare(b.nome);
      });

    return res.status(200).json({
      mesAtual,
      diaHoje,
      count: aniversariantes.length,
      aniversariantes
    });

  } catch (error) {
    console.error("Erro ao listar aniversariantes do mês:", error);
    return res.status(500).json({
      message: "Erro interno",
      error: error.message
    });
  }
}

  /**
   * GET /aniversariantes/ano-atual
   */
  static async aniversariantesAnoAtual(req, res) {
    try {
      const requester = req.user;

      // 🔐 Permissões
      if (
        !["PROFESSOR", "COORDENADOR", "ADMIN", "ALUNO_PROFESSOR"].includes(
          requester?.tipo
        )
      ) {
        return res.status(403).json({ message: "Permissão negada" });
      }

      const FOTO_PADRAO = "/fotoperfilsvg/Frame.svg";

      // 🔥 Busca alunos ativos com data de nascimento
      const alunos = await prisma.usuario.findMany({
        where: {
          OR: [
            { tipo: "ALUNO" },
            { tipo: "ALUNO_PROFESSOR" }
          ],
          ativo: true,
          dataNascimento: { not: null }
        },
        include: {
          turma_matriculas: {
            take: 1,
            select: {
              turma: {
                select: {
                  nome_turma: true
                }
              }
            }
          }
        }
      });

      // 🗓 Inicializa meses
      const meses = {};
      for (let m = 1; m <= 12; m++) {
        meses[m] = [];
      }

      // 🔄 Processa aniversariantes
      alunos.forEach(aluno => {
        const nasc = aluno.dataNascimento;
        if (!nasc) return;

        const mes = nasc.getUTCMonth() + 1;
        const dia = nasc.getUTCDate();

        meses[mes].push({
          nome: aluno.nome,
          aniversario: `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`,
          turma:
            aluno.turma_matriculas?.[0]?.turma?.nome_turma ??
            "Sem turma",
          fotoPerfil: aluno.imagem_perfil_url || FOTO_PADRAO
        });
      });

      // 🔢 Ordena por dia e nome
      for (let m = 1; m <= 12; m++) {
        meses[m].sort((a, b) => {
          const diaA = Number(a.aniversario.split("/")[0]);
          const diaB = Number(b.aniversario.split("/")[0]);
          return diaA - diaB || a.nome.localeCompare(b.nome);
        });
      }

      // ✅ Resposta final
      return res.status(200).json({
        ano: new Date().getUTCFullYear(),
        meses
      });

    } catch (error) {
      console.error("Erro ao buscar aniversariantes do ano:", error);
      return res.status(500).json({
        message: "Erro interno",
        error: error.message
      });
    }
  }

/*

static async aniversariantesHoje(req, res) {
  try {
    const requester = req.user;

    if (
      !hasRole(requester, [
        "PROFESSOR",
        "COORDENADOR",
        "ADMIN",
        "ALUNO_PROFESSOR"
      ])
    ) {
      return res.status(403).json({ message: "Permissão negada" });
    }

    const usuarios = await prisma.usuario.findMany({
      where: { dataNascimento: { not: null }, ativo: true },
      select: { id: true, nome: true, dataNascimento: true }
    });

    const hoje = new Date();
    const mesHoje = hoje.getUTCMonth() + 1;
    const diaHoje = hoje.getUTCDate();

    const lista = usuarios
      .map(u => {
        const nasc = u.dataNascimento;
        const mes = nasc.getUTCMonth() + 1;
        const dia = nasc.getUTCDate();

        return {
          id: u.id,
          nome: u.nome,
          aniversario: `${String(dia).padStart(2, "0")}/${String(mes).padStart(2, "0")}`
        };
      })
      .filter(u => u.mes === mesHoje && u.dia === diaHoje)
      .sort((a, b) => a.nome.localeCompare(b.nome));

    return res.status(200).json({
      data: `${String(diaHoje).padStart(2, "0")}/${String(mesHoje).padStart(2, "0")}`,
      count: lista.length,
      aniversariantes: lista
    });

  } catch (error) {
    console.error("Erro ao buscar aniversariantes de hoje:", error);
    return res.status(500).json({
      message: "Erro interno",
      error: error.message
    });
  }
}

*/
}

export default AniversariantesController;
