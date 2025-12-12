// src/controllers/RelatorioController.js
import prisma from "../prisma.js";

// Função utilitária para desempate por nome
function compararNomes(a, b) {
  const nomeA = a.nome?.trim().split(" ") || [];
  const nomeB = b.nome?.trim().split(" ") || [];

  const primeiroA = nomeA[0]?.toLowerCase() || "";
  const primeiroB = nomeB[0]?.toLowerCase() || "";

  if (primeiroA !== primeiroB) {
    return primeiroA.localeCompare(primeiroB);
  }

  const sobrenomeA = nomeA[nomeA.length - 1]?.toLowerCase() || "";
  const sobrenomeB = nomeB[nomeB.length - 1]?.toLowerCase() || "";

  if (sobrenomeA !== sobrenomeB) {
    return sobrenomeA.localeCompare(sobrenomeB);
  }

  return a.nome.localeCompare(b.nome); // fallback final
}

class RelatorioController {

  // -----------------------------------------------------------------------
  // MÉTRICAS GERAIS (RF-030)
  // -----------------------------------------------------------------------
  static async metricasGerais(req, res) {
    try {
      // total de alunos, professores, coordenadores e turmas (existente)
      const totalAlunos = await prisma.usuario.count({
        where: { tipo: { in: ["ALUNO", "ALUNO_PROFESSOR"] }, ativo: true }
      });

      const totalProfessores = await prisma.usuario.count({
        where: { tipo: { in: ["PROFESSOR", "ALUNO_PROFESSOR"] }, ativo: true }
      });

      const totalCoordenadores = await prisma.usuario.count({
        where: { tipo: "COORDENADOR", ativo: true }
      });

      const totalTurmas = await prisma.turma.count({
        where: { ativo: true }
      });

      // novo: total de usuários ativos (qualquer tipo)
      const totalUsuarios = await prisma.usuario.count({
        where: { ativo: true }
      });

      // novo: total de aulas
      // 1) tenta contar pela tabela 'aula' (se existir)
      // 2) fallback: conta sessões distintas registradas em 'frequencia' (agrupando por turma+data)
      let totalAulas = 0;
      try {
        // se sua tabela de aulas for diferente, ajuste aqui
        totalAulas = await prisma.aula.count({
          where: { ativo: true } // opcional, remova se não existir o campo 'ativo'
        });
      } catch (err) {
        // fallback: calcular a partir de registros de frequência
        // ATENÇÃO: ajusta "data" caso o campo na sua tabela se chame diferente (ex: data_aula)
        try {
          const aulasAgrupadas = await prisma.frequencia.groupBy({
            by: ["id_turma", "data"], // 'data' = campo que representa a data/hora da aula
            _count: { id: true }
          });
          totalAulas = aulasAgrupadas.length;
        } catch (err2) {
          // Se o groupBy falhar por esquema diferente, tenta ao menos contar todos os registros de frequencia
          totalAulas = await prisma.frequencia.count();
        }
      }

      return res.json({
        totalAlunos,
        totalProfessores,
        totalCoordenadores,
        totalTurmas,
        totalUsuarios, // novo campo
        totalAulas     // novo campo
      });

    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
      return res.status(500).json({ message: "Erro ao carregar métricas" });
    }
  }

static async rankingGeral(req, res) {
  try {
    const ranking = await prisma.frequencia.groupBy({
      by: ["id_aluno"],
      where: { presente: true },
      _count: { id: true }
    });

    const alunos = await prisma.usuario.findMany({
      where: { id: { in: ranking.map(r => r.id_aluno) } },
      select: { 
        id: true, 
        nome: true,
        imagem_perfil_url: true
      }
    });

    const fotoPadrao = "/public/fotoperfilsvg/Frame.svg";

    const resultado = ranking.map(r => {
      const aluno = alunos.find(a => a.id === r.id_aluno);

      return {
        alunoId: r.id_aluno,
        nome: aluno?.nome || "",
        foto: aluno?.imagem_perfil_url ?? fotoPadrao,
        totalAulas: r._count.id
      };
    })
    .sort((a, b) => {
      if (b.totalAulas !== a.totalAulas)
        return b.totalAulas - a.totalAulas;

      return compararNomes(a, b);
    })
    .slice(0, 3);

    return res.json(resultado);

  } catch (error) {
    console.error("Erro no ranking geral:", error);
    return res.status(500).json({ message: "Erro ao gerar ranking geral" });
  }
}




  // -----------------------------------------------------------------------
  // RANKING POR TURMA (RF-034)
  // -----------------------------------------------------------------------
  static async rankingPorTurma(req, res) {
    try {
      const { turmaId } = req.params;

      const ranking = await prisma.frequencia.groupBy({
        by: ["id_aluno"],
        where: { presente: true, id_turma: turmaId },
        _count: { id: true }
      });

      const alunos = await prisma.usuario.findMany({
        where: { id: { in: ranking.map(r => r.id_aluno) } },
        select: { id: true, nome: true }
      });

      const resultado = ranking.map(r => ({
        alunoId: r.id_aluno,
        nome: alunos.find(a => a.id === r.id_aluno)?.nome || "",
        totalAulas: r._count.id
      }))
      .sort((a, b) => {
        if (b.totalAulas !== a.totalAulas)
          return b.totalAulas - a.totalAulas;

        return compararNomes(a, b);
      })
      .slice(0, 3);

      return res.json(resultado);

    } catch (error) {
      console.error("Erro no ranking por turma:", error);
      return res.status(500).json({ message: "Erro ao gerar ranking por turma" });
    }
  }
}

export default RelatorioController;
