import prisma from "../prisma.js";

/**
 * GraduacaoController completo - implementa todas as regras pedidas pelo usuário.
 *
 * Observações importantes:
 * - Usa a tabela `frequencia` onde `id_aluno` e `presente` existem (ajuste se seu schema tiver nomes diferentes).
 * - Ao trocar faixa manualmente tentamos atualizar `aluno.ultima_reset_frequencia` (campo opcional).
 * - Verifique se os campos `usuario.tipo` ou `usuario.tipo_usuario` existem; o código tenta ambos.
 */

function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;
  const hoje = new Date();
  const nasc = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

// regras de aulas por transição (valores em número de aulas)
const TRANSICOES_AULAS = {
  "Branca->Azul": { adulto: 40, infantil: 30 },
  "Azul->Roxa": 45,
  "Roxa->Marrom": 50,
  "Marrom->Preta": 60,
  "DEFAULT": 30
};

// idades mínimas para faixas (quando aplicável)
// use nomes exatamente como estão na tabela faixa.nome (case-insensitive comparado abaixo)
const IDADES_MINIMAS_POR_FAIXA = {
  "Amarela": 7,
  "Laranja": 10,
  "Verde": 13,
  "Azul": 16,
  "Roxa": 16,
  "Marrom": 18,
  "Preta": 19,
  "Vermelha / Preta": 50,
  "Vermelha / Branca": 57,
  "Vermelha": 67
};

// helper: buscar próxima faixa pela ordem
async function obterProximaFaixaPorOrdem(ordemAtual) {
  return prisma.faixa.findFirst({ where: { ordem: ordemAtual + 1 }});
}

// helper: contar presenças desde uma data (se dataBase==null conta todas)
async function contarPresencasDesde(alunoId, dataBase = null) {
  const where = {
    id_aluno: Number(alunoId),
    presente: true
  };
  if (dataBase) where.data = { gte: dataBase };
  return prisma.frequencia.count({ where });
}

export default {
  // LISTAR GRADUAÇÕES (opcional filter pelo aluno)
  async listar(req, res) {
    try {
      const { alunoId } = req.query;
      const where = alunoId ? { alunoId: Number(alunoId) } : {};

      const lista = await prisma.graduacao.findMany({
        where,
        include: { aluno: true, faixa: true },
        orderBy: { data_graduacao: "desc" },
      });

      return res.json(lista);
    } catch (err) {
      console.error("Erro listar graduacoes:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  },

  // OBTER ÚLTIMA GRADUAÇÃO DO ALUNO
  async obterAtual(req, res) {
    try {
      const alunoId = Number(req.params.alunoId);
      const ultima = await prisma.graduacao.findFirst({
        where: { alunoId },
        include: { faixa: true },
        orderBy: { data_graduacao: "desc" },
      });
      if (!ultima) return res.status(404).json({ message: "Nenhuma graduacao encontrada" });
      return res.json(ultima);
    } catch (err) {
      console.error("Erro obterAtual:", err);
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
        orderBy: { data_graduacao: "desc" }
      });
      return res.json(historico);
    } catch (err) {
      console.error("Erro listarHistorico:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  },

  /**
   * IDENTIFICAR APTOS (RF-022)
   * Retorna para cada aluno:
   * { alunoId, nome, faixaAtual, proximaFaixa, presencasDesdeBase, aulasNecessarias, apto (bool) }
   *
   * Para presenças, conta desde a última graduação (data_graduacao) ou desde aluno.ultima_reset_frequencia se existir.
   */
  async identificarAptos(req, res) {
    try {
      // opcional: filtrar por turmaId no futuro
      const alunos = await prisma.aluno.findMany({ include: { usuario: true }});
      const faixas = await prisma.faixa.findMany();

      const resultados = [];

      for (const aluno of alunos) {
        const idade = calcularIdade(aluno.dataNascimento);
        const infantil = idade !== null && idade <= 15;

        const ultimaGrad = await prisma.graduacao.findFirst({
          where: { alunoId: aluno.id },
          orderBy: { data_graduacao: "desc" },
        });

        const faixaAtual = ultimaGrad
          ? await prisma.faixa.findUnique({ where: { id: ultimaGrad.faixa_id }})
          : faixas.find(f => f.nome.toLowerCase() === "branca") || null;

        const proxima = faixaAtual ? await prisma.faixa.findFirst({ where: { ordem: faixaAtual.ordem + 1 }}) : null;

        if (!proxima) {
          resultados.push({
            alunoId: aluno.id,
            nome: aluno.nome,
            faixaAtual: faixaAtual?.nome ?? "Branca",
            proximaFaixa: null,
            motivo: "Sem próxima faixa (já é máxima)"
          });
          continue;
        }

        // base para contar presenças: se aluno tiver campo ultima_reset_frequencia use ele, senão última graduação
        let dataBase = null;
        if (aluno.ultima_reset_frequencia) dataBase = new Date(aluno.ultima_reset_frequencia);
        else if (ultimaGrad && ultimaGrad.data_graduacao) dataBase = new Date(ultimaGrad.data_graduacao);

        const presencas = await contarPresencasDesde(aluno.id, dataBase);

        // decide aulas necessárias
        let aulasNecessarias = TRANSICOES_AULAS.DEFAULT;
        const chave = `${faixaAtual.nome}->${proxima.nome}`;

        if (chave.toLowerCase() === "branca->azul") {
          aulasNecessarias = infantil ? TRANSICOES_AULAS["Branca->Azul"].infantil : TRANSICOES_AULAS["Branca->Azul"].adulto;
        } else if (TRANSICOES_AULAS[chave]) {
          aulasNecessarias = TRANSICOES_AULAS[chave];
        } else {
          aulasNecessarias = TRANSICOES_AULAS.DEFAULT;
        }

        const apto = presencas >= aulasNecessarias;

        resultados.push({
          alunoId: aluno.id,
          nome: aluno.nome,
          faixaAtual: faixaAtual?.nome ?? "Branca",
          proximaFaixa: proxima.nome,
          idade,
          presencas,
          aulasNecessarias,
          apto
        });
      }

      return res.json(resultados);
    } catch (err) {
      console.error("Erro identificarAptos:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  },

  /**
   * GRADUAR (RF-023)
   * - exige req.user.tipo === "COORDENADOR"
   * - exige aprovado_mestre = true no body
   * - valida idade mínima da faixa destino (onde aplicável)
   * - valida presenças (conforme regras de aulas)
   * - registra log_Acao
   * - tenta promover para PROFESSOR ao atingir \"Roxa\"
   */
  async graduar(req, res) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Não autenticado" });
      if (user.tipo !== "COORDENADOR") return res.status(403).json({ message: "Apenas COORDENADOR pode graduar" });

      const { alunoId, faixa_id, grau, observacao, aprovado_mestre } = req.body;
      if (!alunoId || !faixa_id || grau === undefined) return res.status(400).json({ message: "alunoId, faixa_id e grau são obrigatórios" });
      if (!aprovado_mestre) return res.status(400).json({ message: "Graduacao deve ter aprovado_mestre = true" });

      const aluno = await prisma.aluno.findUnique({ where: { id: Number(alunoId) }, include: { usuario: true }});
      if (!aluno) return res.status(404).json({ message: "Aluno não encontrado" });

      const faixaDestino = await prisma.faixa.findUnique({ where: { id: Number(faixa_id) }});
      if (!faixaDestino) return res.status(404).json({ message: "Faixa destino não encontrada" });

      const ultima = await prisma.graduacao.findFirst({ where: { alunoId: Number(alunoId) }, orderBy: { data_graduacao: "desc" }});
      const faixaAtual = ultima ? await prisma.faixa.findUnique({ where: { id: ultima.faixa_id }}) : await prisma.faixa.findFirst({ where: { nome: "Branca" }});

      // não rebaixar
      if (faixaAtual && faixaDestino.ordem < faixaAtual.ordem) return res.status(400).json({ message: "Não é permitido rebaixar faixa" });

      // não pular faixas
      if (faixaAtual && faixaDestino.ordem > faixaAtual.ordem + 1) return res.status(400).json({ message: "Pular faixas não é permitido; promova para a próxima faixa na sequência" });

      // verificar idade mínima da faixa destino, quando aplicável
      const idade = calcularIdade(aluno.dataNascimento);
      const idadeMinima = IDADES_MINIMAS_POR_FAIXA[faixaDestino.nome] ?? null;
      if (idadeMinima !== null && idade !== null && idade < idadeMinima) {
        return res.status(400).json({ message: `Idade mínima para faixa ${faixaDestino.nome} é ${idadeMinima} anos. Aluno tem ${idade}.`});
      }

      // determinar base para contar presenças
      let dataBase = null;
      if (aluno.ultima_reset_frequencia) dataBase = new Date(aluno.ultima_reset_frequencia);
      else if (ultima && ultima.data_graduacao) dataBase = new Date(ultima.data_graduacao);

      const presencas = await contarPresencasDesde(aluno.id, dataBase);

      // determine aulas necessárias
      let aulasNecessarias = TRANSICOES_AULAS.DEFAULT;
      if (faixaAtual && faixaDestino) {
        const chave = `${faixaAtual.nome}->${faixaDestino.nome}`;
        if (chave.toLowerCase() === "branca->azul") {
          aulasNecessarias = (idade !== null && idade >= 16) ? TRANSICOES_AULAS["Branca->Azul"].adulto : TRANSICOES_AULAS["Branca->Azul"].infantil;
        } else if (TRANSICOES_AULAS[chave]) {
          aulasNecessarias = TRANSICOES_AULAS[chave];
        } else {
          aulasNecessarias = TRANSICOES_AULAS.DEFAULT;
        }
      }

      if (presencas < aulasNecessarias) {
        return res.status(400).json({ message: `Presenças insuficientes: ${presencas}/${aulasNecessarias}` });
      }

      // criar a graduacao
      const nova = await prisma.graduacao.create({
        data: {
          alunoId: Number(alunoId),
          faixa_id: Number(faixa_id),
          grau: Number(grau),
          observacao: observacao ?? null,
          data_graduacao: new Date()
        },
        include: { faixa: true, aluno: true }
      });

      // registrar log_Acao (tenta, mas não quebra se falhar)
      try {
        await prisma.log_Acao.create({
          data: {
            usuario_id: user.id,
            acao: "GRADUACAO",
            descricao: `Graduou alunoId=${alunoId} para faixa=${faixaDestino.nome} grau=${grau}`
          }
        });
      } catch (e) {
        console.warn("Falha ao criar log_Acao:", e);
      }

      // Reiniciar contagem de frequência: definimos última reset para hoje (se campo existir)
      try {
        await prisma.aluno.update({
          where: { id: Number(alunoId) },
          data: { ultima_reset_frequencia: new Date() } // se campo não existir, Prisma lança; capturamos abaixo
        });
      } catch (e) {
        // se seu schema não tiver esse campo, ignoramos (não deve quebrar)
      }

      // tentar promover para PROFESSOR se atingir ROXA (mantendo perfil ALUNO)
      let promovido = false;
      try {
        if (String(faixaDestino.nome).toLowerCase() === "roxa" && aluno.usuarioId) {
          // tenta atualizar usuario.tipo
          try {
            await prisma.usuario.update({
              where: { id: Number(aluno.usuarioId) },
              data: { tipo: "PROFESSOR" }
            });
            promovido = true;
          } catch (e1) {
            try {
              await prisma.usuario.update({
                where: { id: Number(aluno.usuarioId) },
                data: { tipo_usuario: "PROFESSOR" }
              });
              promovido = true;
            } catch (e2) {
              console.warn("Não foi possível marcar usuario como PROFESSOR automaticamente.", e2);
            }
          }
        }
      } catch (promoErr) {
        console.warn("Promoção automática falhou:", promoErr);
      }

      return res.status(201).json({ message: "Aluno graduado com sucesso", graduacao: nova, promovido });
    } catch (err) {
      console.error("Erro graduar:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  },

  /**
   * TROCAR FAIXA MANUAL (override)
   * - Permite trocar o aluno de faixa diretamente (sem criar registro de graduacao),
   * - Apenas COORDENADOR
   * - Reinicia contagem de frequência (tentativa)
   */
  async trocarFaixa(req, res) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Não autenticado" });
      if (user.tipo !== "COORDENADOR") return res.status(403).json({ message: "Apenas COORDENADOR pode trocar faixa" });

      const { alunoId, faixa_id } = req.body;
      if (!alunoId || !faixa_id) return res.status(400).json({ message: "alunoId e faixa_id são obrigatórios" });

      const aluno = await prisma.aluno.findUnique({ where: { id: Number(alunoId) }});
      if (!aluno) return res.status(404).json({ message: "Aluno não encontrado" });

      const faixaDestino = await prisma.faixa.findUnique({ where: { id: Number(faixa_id) }});
      if (!faixaDestino) return res.status(404).json({ message: "Faixa destino não encontrada" });

      // Atualiza o campo de faixa do aluno (supondo que exista aluno.faixaId)
      const atualizado = await prisma.aluno.update({
        where: { id: Number(alunoId) },
        data: { faixaId: Number(faixa_id), ultima_reset_frequencia: new Date() }
      });

      try {
        await prisma.log_Acao.create({
          data: {
            usuario_id: user.id,
            acao: "TROCAR_FAIXA",
            descricao: `Coordenador trocou faixa do alunoId=${alunoId} para faixa=${faixaDestino.nome}`
          }
        });
      } catch (e) {
        console.warn("Falha ao criar log na troca de faixa:", e);
      }

      return res.json({ message: "Faixa do aluno atualizada (override)", aluno: atualizado });
    } catch (err) {
      console.error("Erro trocarFaixa:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  },

  // ATUALIZAR (correção) — apenas COORDENADOR
  async atualizar(req, res) {
    try {
      const user = req.user;
      if (!user) return res.status(401).json({ message: "Não autenticado" });
      if (user.tipo !== "COORDENADOR") return res.status(403).json({ message: "Apenas COORDENADOR pode editar graduacoes" });

      const id = Number(req.params.id);
      const { faixa_id, grau, observacao } = req.body;
      const grad = await prisma.graduacao.findUnique({ where: { id }});
      if (!grad) return res.status(404).json({ message: "Graduacao nao encontrada" });

      const atualizada = await prisma.graduacao.update({
        where: { id },
        data: {
          faixa_id: faixa_id !== undefined ? Number(faixa_id) : undefined,
          grau: grau !== undefined ? Number(grau) : undefined,
          observacao: observacao ?? grad.observacao
        },
        include: { faixa: true, aluno: true }
      });

      try {
        await prisma.log_Acao.create({
          data: { usuario_id: user.id, acao: "ATUALIZAR_GRADUACAO", descricao: `Atualizou graduacaoId=${id}` }
        });
      } catch (e) { console.warn("Falha ao logar atualizacao:", e); }

      return res.json({ message: "Graduacao atualizada", graduacao: atualizada });
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
      if (user.tipo !== "COORDENADOR") return res.status(403).json({ message: "Apenas COORDENADOR pode deletar graduacoes" });

      const id = Number(req.params.id);
      const grad = await prisma.graduacao.findUnique({ where: { id }});
      if (!grad) return res.status(404).json({ message: "Graduacao nao encontrada" });

      await prisma.graduacao.delete({ where: { id }});

      try {
        await prisma.log_Acao.create({ data: { usuario_id: user.id, acao: "DELETAR_GRADUACAO", descricao: `Deletou graduacaoId=${id}` }});
      } catch (e) { console.warn("Falha ao logar exclusao:", e); }

      return res.json({ message: "Graduacao removida com sucesso" });
    } catch (err) {
      console.error("Erro deletar:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  }
};
