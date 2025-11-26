import prisma from "../prisma.js";

/**
 * GraduacaoController
 *
 * Implementa:
 * - listar, obterAtual, listarHistorico
 * - identificarAptos (RF-022)
 * - graduar (RF-023)
 * - atualizar, deletar (correções somente por COORDENADOR)
 *
 * Regras principais:
 * - Somente COORDENADOR pode criar/editar/deletar graduações
 * - Infantojuvenil (<=15 anos): segue sistema infantil (sem tempo mínimo obrigatório)
 * - Adulto (>=16): aplica tempos mínimos IBJJF/CBJJ (azul 2 anos, roxa 1.5, marrom 1 ano, preta graus etc.)
 * - Aprovação do mestre (campo aprovado_mestre=true) é obrigatória para graduar
 * - Registra log_Acao com usuário responsável
 * - Ao chegar na faixa 'Roxa' (case-insensitive) tenta conceder papel PROFESSOR ao usuário vinculado
 */

function diasEntre(dataA, dataB) {
  const msPorDia = 24 * 60 * 60 * 1000;
  return Math.floor((dataB.getTime() - dataA.getTime()) / msPorDia);
}

// Tempos mínimos em dias para adultos (IBJJF/CBJJ aproximações)
const TEMPOS_MINIMOS_ADULTOS_DIAS = {
  azul: 2 * 365, // 2 anos
  roxa: Math.floor(1.5 * 365), // 1 ano e meio
  marrom: 1 * 365, // 1 ano
  // preta -> promoção para preto tem regras de graus (tratadas separadamente)
};

// Define janela "próximo" (em dias). Se faltar <= PROXIMO_DIAS, consideramos "próximo".
const PROXIMO_DIAS = 90; // 3 meses

export default {
  // LISTAR GRADUAÇÕES (opcional filtro por alunoId)
  async listar(req, res) {
    try {
      const { alunoId } = req.query;
      const where = alunoId ? { alunoId: Number(alunoId) } : {};
      const grad = await prisma.graduacao.findMany({
        where,
        include: { aluno: true, faixa: true },
        orderBy: { data_graduacao: "desc" },
      });
      return res.json(grad);
    } catch (err) {
      console.error("Erro listar graduações:", err);
      return res.status(500).json({ message: "Erro interno ao listar graduações" });
    }
  },

  // OBTER GRADUAÇÃO ATUAL (última) de um aluno
  async obterAtual(req, res) {
    try {
      const alunoId = Number(req.params.alunoId);
      const ultima = await prisma.graduacao.findFirst({
        where: { alunoId },
        include: { faixa: true },
        orderBy: { data_graduacao: "desc" },
      });
      if (!ultima) return res.status(404).json({ message: "Nenhuma graduação encontrada para este aluno" });
      return res.json(ultima);
    } catch (err) {
      console.error("Erro obter atual:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  },

  // LISTAR HISTÓRICO (RF-024)
  async listarHistorico(req, res) {
    try {
      const alunoId = Number(req.params.alunoId);
      const historico = await prisma.graduacao.findMany({
        where: { alunoId },
        include: { faixa: true, aluno: true },
        orderBy: { data_graduacao: "desc" },
      });
      return res.json(historico);
    } catch (err) {
      console.error("Erro listar histórico:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  },

  // IDENTIFICAR APTOS / PRÓXIMOS À GRADUAÇÃO (RF-022)
  // Retorna lista de alunos com status: { alunoId, nome, faixaAtual, diasDesdeUltima, tempoMinimoDias, status }
  // status: "pronto", "proximo", "inapto"
  async identificarAptos(req, res) {
    try {
      // Filtros opcionais: turmaId, faixaAtualId
      const { turmaId } = req.query;

      // Busca todos os alunos (pode ser limitado/paginado em produção)
      // Se quiser filtrar por turma, troque por consulta em Aluno_Turma
      let alunos;
      if (turmaId) {
        // pegar alunos da turma (assume tabela Aluno_Turma existe)
        const enturmas = await prisma.aluno_Turma.findMany({
          where: { id_turma: Number(turmaId), ativo: true },
          include: { aluno: true },
        });
        alunos = enturmas.map(e => e.aluno);
      } else {
        alunos = await prisma.aluno.findMany({ include: { usuario: true } });
      }

      const resultados = [];

      for (const aluno of alunos) {
        // última graduação
        const ultima = await prisma.graduacao.findFirst({
          where: { alunoId: aluno.id },
          orderBy: { data_graduacao: "desc" },
          include: { faixa: true },
        });

        // se não tem graduação, faixa atual = Branca
        const faixaAtual = ultima?.faixa ?? await prisma.faixa.findFirst({ where: { nome: "Branca" } });

        // definir se infantojuvenil
        const dataNasc = aluno.dataNascimento ? new Date(aluno.dataNascimento) : null;
        const idade = dataNasc ? (new Date().getFullYear() - dataNasc.getFullYear() - ((new Date().getMonth() < dataNasc.getMonth() || (new Date().getMonth() === dataNasc.getMonth() && new Date().getDate() < dataNasc.getDate())) ? 1 : 0)) : null;
        const infanto = idade !== null && idade <= 15;

        // determinar próxima faixa (pela ordem)
        const faixaAtualObj = faixaAtual;
        const proximaFaixa = await prisma.faixa.findFirst({
          where: { ordem: faixaAtualObj.ordem + 1 }
        });

        let status = "inapto";
        let diasDesdeUltima = null;
        let tempoMinimoDias = null;

        if (!proximaFaixa) {
          // Sem próxima (ex: faixa máxima)
          status = "inapto";
        } else {
          // tempo mínimo se adulto
          if (!infanto) {
            const chave = proximaFaixa.nome.toLowerCase(); // azul, roxa, marrom, etc.
            tempoMinimoDias = TEMPOS_MINIMOS_ADULTOS_DIAS[chave] ?? null;
            if (tempoMinimoDias && ultima) {
              diasDesdeUltima = diasEntre(new Date(ultima.data_graduacao), new Date());
              if (diasDesdeUltima >= tempoMinimoDias) status = "pronto";
              else if (tempoMinimoDias - diasDesdeUltima <= PROXIMO_DIAS) status = "proximo";
              else status = "inapto";
            } else {
              // se não tem tempo definido (ex: branca->azul exame), usar critérios subjetivos
              // aqui vamos marcar como "proximo" se tiver > 1 ano de treino OU por presença alta
              // contagem de presenças
              const presencas = await prisma.frequencia.count({
                where: { id_aluno: aluno.id, presente: true },
              });
              diasDesdeUltima = ultima ? diasEntre(new Date(ultima.data_graduacao), new Date()) : null;
              if (presencas >= 100 || (diasDesdeUltima !== null && diasDesdeUltima >= 365 * 1)) status = "proximo";
              else status = "inapto";
            }
          } else {
            // infantojuvenil → depende de avaliação do mestre; usamos presença como indicador
            const presencas = await prisma.frequencia.count({
              where: { id_aluno: aluno.id, presente: true },
            });
            if (presencas >= 40) status = "proximo"; // heurística
            else status = "inapto";
          }
        }

        resultados.push({
          alunoId: aluno.id,
          nome: aluno.nome,
          faixaAtual: faixaAtualObj?.nome ?? "Branca",
          proximaFaixa: proximaFaixa?.nome ?? null,
          diasDesdeUltima,
          tempoMinimoDias,
          status,
        });
      }

      // opcional: filtrar só 'pronto' / 'proximo'
      const { apenas } = req.query; // 'pronto' | 'proximo'
      const filtrado = apenas ? resultados.filter(r => r.status === apenas) : resultados;

      return res.json(filtrado);
    } catch (err) {
      console.error("Erro identificar aptos:", err);
      return res.status(500).json({ message: "Erro interno ao identificar aptos" });
    }
  },

  // GRADUAR (RF-023) — exige aprovado_mestre = true no body
  async graduar(req, res) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Não autenticado" });
      if (user.tipo !== "COORDENADOR")
        return res.status(403).json({ message: "Apenas coordenadores podem graduar alunos" });

      const { alunoId, faixa_id, grau, observacao, aprovado_mestre } = req.body;
      if (!alunoId || !faixa_id || grau === undefined)
        return res.status(400).json({ message: "alunoId, faixa_id e grau são obrigatórios" });

      if (!aprovado_mestre)
        return res.status(400).json({ message: "Graduação deve ter aprovação do mestre (aprovado_mestre = true)" });

      // carrega aluno
      const aluno = await prisma.aluno.findUnique({
        where: { id: Number(alunoId) },
        include: { usuario: true },
      });
      if (!aluno) return res.status(404).json({ message: "Aluno não encontrado" });

      // idade e tipo de sistema
      const dataNasc = aluno.dataNascimento ? new Date(aluno.dataNascimento) : null;
      const idade = dataNasc ? (new Date().getFullYear() - dataNasc.getFullYear() - ((new Date().getMonth() < dataNasc.getMonth() || (new Date().getMonth() === dataNasc.getMonth() && new Date().getDate() < dataNasc.getDate())) ? 1 : 0)) : null;
      const infanto = idade !== null && idade <= 15;

      // faixa destino
      const faixaDestino = await prisma.faixa.findUnique({ where: { id: Number(faixa_id) }});
      if (!faixaDestino) return res.status(404).json({ message: "Faixa destino não encontrada" });

      // ultima graduacao
      const ultima = await prisma.graduacao.findFirst({
        where: { alunoId: Number(alunoId) },
        orderBy: { data_graduacao: "desc" },
      });
      const faixaAtual = ultima ? await prisma.faixa.findUnique({ where: { id: ultima.faixa_id }}) : null;

      // regra: não rebaixar
      if (faixaAtual && faixaDestino.ordem < faixaAtual.ordem)
        return res.status(400).json({ message: "Não é permitido rebaixar faixa" });

      // regra: não pular faixas (requer ordem sequencial)
      if (faixaAtual && faixaDestino.ordem > faixaAtual.ordem + 1)
        return res.status(400).json({ message: "Pular faixas não é permitido; promova para a próxima faixa na sequência" });

      // se adulto, verificar tempo mínimo (quando aplicável)
      if (!infanto) {
        const chave = faixaDestino.nome.toLowerCase();
        const tempoMin = TEMPOS_MINIMOS_ADULTOS_DIAS[chave] ?? null;

        if (tempoMin && ultima) {
          const dias = diasEntre(new Date(ultima.data_graduacao), new Date());
          if (dias < tempoMin) {
            return res.status(400).json({ message: `Tempo mínimo para ${faixaDestino.nome} não cumprido. Faltam ${tempoMin - dias} dias.`});
          }
        }
        // Para Branca -> Azul e transições que exigem exame, assumimos aprovado_mestre = true suficiente
      }

      // registrar graduacao
      const nova = await prisma.graduacao.create({
        data: {
          alunoId: Number(alunoId),
          faixa_id: Number(faixa_id),
          grau: Number(grau),
          observacao: observacao ?? null,
          data_graduacao: new Date(),
        },
        include: { faixa: true, aluno: true },
      });

      // log de ação
      try {
        await prisma.log_Acao.create({
          data: {
            usuario_id: user.id,
            acao: "GRADUACAO",
            descricao: `Graduou alunoId=${alunoId} faixa=${faixaDestino.nome} grau=${grau}`,
          },
        });
      } catch (logErr) {
        console.warn("Erro ao criar log de graduacao:", logErr);
      }

      // RF-001: promover para PROFESSOR ao atingir ROXA (mantendo ALUNO)
      let promovido = false;
      try {
        if (String(faixaDestino.nome).toLowerCase() === "roxa" && aluno.usuarioId) {
          // tenta atualizar o campo 'tipo' ou 'tipo_usuario'
          try {
            await prisma.usuario.update({
              where: { id: Number(aluno.usuarioId) },
              data: { tipo: "PROFESSOR" }, // se seu schema usar 'tipo_usuario', ajuste
            });
            promovido = true;
          } catch (e1) {
            try {
              await prisma.usuario.update({
                where: { id: Number(aluno.usuarioId) },
                data: { tipo_usuario: "PROFESSOR" },
              });
              promovido = true;
            } catch (e2) {
              console.warn("Não foi possível promover automaticamente (campos diferentes).", e2);
            }
          }
        }
      } catch (promoErr) {
        console.warn("Promoção falhou:", promoErr);
      }

      // opcional: notificar coordenador / professor — placeholder
      // await notifyCoordenador({ alunoId, faixaDestino, nova });

      return res.status(201).json({ message: "Aluno graduado com sucesso", graduacao: nova, promovido });
    } catch (err) {
      console.error("Erro graduar:", err);
      return res.status(500).json({ message: "Erro interno ao graduar" });
    }
  },

  // ATUALIZAR (correção) — apenas COORDENADOR
  async atualizar(req, res) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Não autenticado" });
      if (user.tipo !== "COORDENADOR")
        return res.status(403).json({ message: "Apenas coordenadores podem editar graduações" });

      const id = Number(req.params.id);
      const { faixa_id, grau, observacao } = req.body;
      const grad = await prisma.graduacao.findUnique({ where: { id }});
      if (!grad) return res.status(404).json({ message: "Graduação não encontrada" });

      const atualizada = await prisma.graduacao.update({
        where: { id },
        data: {
          faixa_id: faixa_id !== undefined ? Number(faixa_id) : undefined,
          grau: grau !== undefined ? Number(grau) : undefined,
          observacao: observacao ?? grad.observacao,
        },
        include: { faixa: true, aluno: true },
      });

      // log
      try {
        await prisma.log_Acao.create({
          data: {
            usuario_id: user.id,
            acao: "ATUALIZAR_GRADUACAO",
            descricao: `Atualizou graduacaoId=${id}`,
          },
        });
      } catch (err) { console.warn(err); }

      return res.json({ message: "Graduação atualizada", graduacao: atualizada });
    } catch (err) {
      console.error("Erro atualizar:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  },

  // DELETAR (apenas COORDENADOR)
  async deletar(req, res) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Não autenticado" });
      if (user.tipo !== "COORDENADOR")
        return res.status(403).json({ message: "Apenas coordenadores podem deletar graduações" });

      const id = Number(req.params.id);
      const grad = await prisma.graduacao.findUnique({ where: { id }});
      if (!grad) return res.status(404).json({ message: "Graduação não encontrada" });

      await prisma.graduacao.delete({ where: { id } });

      try {
        await prisma.log_Acao.create({
          data: { usuario_id: user.id, acao: "DELETAR_GRADUACAO", descricao: `Deletou graduacaoId=${id}` }
        });
      } catch (err) { console.warn(err); }

      return res.json({ message: "Graduação removida com sucesso" });
    } catch (err) {
      console.error("Erro deletar:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  }
};
