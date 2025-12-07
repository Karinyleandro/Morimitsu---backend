// src/controllers/RelatorioController.js
import prisma from "../prisma.js";

class RelatorioController {

  // -----------------------------------------------------------------------
  // MÉTRICAS GERAIS (RF-030)
  // -----------------------------------------------------------------------
  static async metricasGerais(req, res) {
    try {
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

      return res.json({
        totalAlunos,
        totalProfessores,
        totalCoordenadores,
        totalTurmas
      });

    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
      return res.status(500).json({ message: "Erro ao carregar métricas" });
    }
  }

  // -----------------------------------------------------------------------
  // RANKING GERAL DE AULAS (RF-033)
  // -----------------------------------------------------------------------
  static async rankingGeral(req, res) {
    try {
      // Soma a quantidade de presenças por aluno
      const ranking = await prisma.frequencia.groupBy({
        by: ["id_aluno"],
        where: { presente: true },
        _count: { id: true }
      });

      // Carrega os nomes
      const alunos = await prisma.usuario.findMany({
        where: {
          id: { in: ranking.map(r => r.id_aluno) }
        },
        select: {
          id: true,
          nome: true,
          tipo: true,
          ativo: true
        }
      });

      // Mescla dados
      const resultado = ranking.map(r => ({
        alunoId: r.id_aluno,
        nome: alunos.find(a => a.id === r.id_aluno)?.nome,
        totalAulas: r._count.id
      }))
      .sort((a, b) => {
        // 1 - Maior número de aulas
        if (b.totalAulas !== a.totalAulas) 
          return b.totalAulas - a.totalAulas;

        // 2 - Desempate pelo nome
        return a.nome.localeCompare(b.nome);
      })
      .slice(0, 3);  // Só top 3 (exigência do RF-033)

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

      // Soma presenças dentro daquela turma
      const ranking = await prisma.frequencia.groupBy({
        by: ["id_aluno"],
        where: {
          presente: true,
          id_turma: turmaId
        },
        _count: { id: true }
      });

      const alunos = await prisma.usuario.findMany({
        where: { id: { in: ranking.map(r => r.id_aluno) } },
        select: { id: true, nome: true }
      });

      const resultado = ranking.map(r => ({
        alunoId: r.id_aluno,
        nome: alunos.find(a => a.id === r.id_aluno)?.nome,
        totalAulas: r._count.id
      }))
      .sort((a, b) => {
        if (b.totalAulas !== a.totalAulas) 
          return b.totalAulas - a.totalAulas;
        return a.nome.localeCompare(b.nome);
      })
      .slice(0, 3); // Top 3 (RF-034)

      return res.json(resultado);

    } catch (error) {
      console.error("Erro no ranking por turma:", error);
      return res.status(500).json({ message: "Erro ao gerar ranking por turma" });
    }
  }

}

export default RelatorioController;
