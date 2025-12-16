
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();


/* ------------------------- FUNÇÕES AUXILIARES ------------------------- */

function formatarDataBR(data) {
  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}


function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;
  const hoje = new Date();
  const nasc = new Date(dataNascimento);

  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();

  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;

  return idade;
}

async function obterProximaFaixaAtual(usuario) {
  const faixaAtual = usuario.id_faixa
    ? await prisma.faixa.findUnique({ where: { id: usuario.id_faixa } })
    : await prisma.faixa.findFirst({ orderBy: { ordem: "asc" } });

  if (!faixaAtual) return { faixaAtual: null, proximaFaixa: null };

  const proximaFaixa = await prisma.faixa.findFirst({
    where: { ordem: { gt: faixaAtual.ordem } },
    orderBy: { ordem: "asc" },
  });

  return { faixaAtual, proximaFaixa };
}

async function contarAulasPresente(alunoId) {
  return prisma.frequencia.count({
    where: { id_aluno: alunoId, presente: true },
  });
}

async function obterRequisitoParaProximoGrau(usuario) {
  const nextGrau = (usuario.grau ?? 0) + 1;

  if (!usuario.id_faixa) return { requisito: null, nextGrau };

  const requisito = await prisma.requisito_Grau.findFirst({
    where: { faixa_id: usuario.id_faixa, grau: nextGrau },
  });

  return { requisito, nextGrau };
}

function aulasNecessarias(faixaNome, idade) {
  const faixa = faixaNome?.toLowerCase() ?? "branca";

  if (idade < 16) return 30; // infantil

  switch (faixa) {
    case "branca": return 40;
    case "azul": return 45;
    case "roxa": return 50;
    case "marrom": return 60;
    default: return 30;
  }
}

const padraoErro = (res, msg, status = 400) =>
  res.status(status).json({ erro: msg });

const padraoSucesso = (res, dados) => res.json(dados);

/* ------------------------------ CONTROLLER ------------------------------ */

const GraduacaoController = {

/* ------------------------ HOME — APTOS SIMPLES ------------------------ */
async listarAptosHome(req, res) {
  try {
    const alunos = await prisma.usuario.findMany({
      where: { tipo: { in: ["ALUNO", "ALUNO_PROFESSOR"] } },
      include: {
        faixa: true,
        graduacoes: { orderBy: { data_graduacao: "desc" } },
        turma_matriculas: {
          take: 1,
          select: {
            turma: {
              select: {
                nome_turma: true // <- CORRIGIDO: era 'nome'
              }
            }
          }
        }
      },
    });

    const resposta = [];

    for (const aluno of alunos) {
      const idade = calcularIdade(aluno.dataNascimento);
      const aulasPresente = await contarAulasPresente(aluno.id);
      const { requisito, nextGrau } = await obterRequisitoParaProximoGrau(aluno);
      const { faixaAtual, proximaFaixa } = await obterProximaFaixaAtual(aluno);

      const minimo =
        requisito?.requisito_aulas ??
        aulasNecessarias(faixaAtual?.nome, idade);

      // validar tempo mínimo entre graduações
      let tempoOk = true;
      if (requisito?.tempo_minimo_dias) {
        const ultima = aluno.graduacoes?.[0];
        if (ultima) {
          const dias = Math.floor(
            (Date.now() - new Date(ultima.data_graduacao)) / (1000 * 60 * 60 * 24)
          );
          tempoOk = dias >= requisito.tempo_minimo_dias;
        }
      }

      const faltam = Math.max(0, minimo - aulasPresente);

      // status baseado nas presenças
      let status = "Longe";
      if (faltam === 0 && tempoOk) status = "PRONTO";
      else if (faltam <= 5) status = "PRÓXIMO";

      if (status === "Longe") continue;

      resposta.push({
        nome: aluno.nome,
        turma: aluno.turma_matriculas?.[0]?.turma?.nome_turma ?? "Sem turma", // <- CORRIGIDO
        status,
        proximaFaixa: status === "PRONTO"
          ? { cor: proximaFaixa?.corFaixa ?? null }
          : null,
        aulasPresente,
        minimoAulas: minimo,
      });
    }

    return padraoSucesso(res, resposta);

  } catch (err) {
    console.error(err);
    return padraoErro(res, "Erro ao listar aptos (home).", 500);
  }
},

/* ------------------------ LISTAR APTOS — TELA GRADUAÇÃO (APENAS PRONTOS) ------------------------ */
async listarAptosGraduacao(req, res) {
  try {
    const FOTO_PADRAO = "/fotoperfilsvg/Frame.svg"; // caminho da imagem padrão

    const alunos = await prisma.usuario.findMany({
      where: { tipo: { in: ["ALUNO", "ALUNO_PROFESSOR"] } },
      include: {
        faixa: true,
        graduacoes: { orderBy: { data_graduacao: "desc" } },
        turma_matriculas: {
          take: 1,
          select: {
            turma: { select: { nome_turma: true } }
          }
        }
      }
    });

    const aptos = [];

    for (const aluno of alunos) {
      const idade = calcularIdade(aluno.dataNascimento);
      const aulasPresente = await contarAulasPresente(aluno.id);
      const { requisito } = await obterRequisitoParaProximoGrau(aluno);
      const { faixaAtual, proximaFaixa } = await obterProximaFaixaAtual(aluno);

      const minimo = requisito?.requisito_aulas ?? aulasNecessarias(faixaAtual?.nome, idade);

      let tempoOk = true;
      if (requisito?.tempo_minimo_dias) {
        const ultima = aluno.graduacoes?.[0];
        if (ultima) {
          const dias = Math.floor(
            (Date.now() - new Date(ultima.data_graduacao)) / (1000 * 60 * 60 * 24)
          );
          tempoOk = dias >= requisito.tempo_minimo_dias;
        }
      }

      const faltam = Math.max(0, minimo - aulasPresente);

      // Status apenas PRONTO (faltam 0 e tempoOk)
      if (faltam !== 0 || !tempoOk) continue;

      aptos.push({
        alunoId: aluno.id,
        nome: aluno.nome,
        imagemPerfil: aluno.imagem_perfil_url || FOTO_PADRAO,
        faixaAtual: {
          imagem: faixaAtual?.imagem_faixa_url ?? null
        },
        turma: aluno.turma_matriculas?.[0]?.turma?.nome_turma ?? "Sem turma",
      });
    }

    return padraoSucesso(res, aptos);
  } catch (err) {
    console.error(err);
    return padraoErro(res, "Erro ao listar aptos para graduação (tela).", 500);
  }
},


/* ---------------------- STATUS INDIVIDUAL ---------------------- */
async statusAluno(req, res) {
  try {
    const { alunoId } = req.params;

    const aluno = await prisma.usuario.findUnique({
      where: { id: alunoId },
      include: {
        faixa: true,
        graduacoes: { orderBy: { data_graduacao: "desc" } },
      },
    });

    if (!aluno)
      return padraoErro(res, "Aluno não encontrado.", 404);

    const idade = calcularIdade(aluno.dataNascimento);

    // dados auxiliares
    const aulasPresente = await contarAulasPresente(aluno.id);
    const { requisito, nextGrau } = await obterRequisitoParaProximoGrau(aluno);
    const { faixaAtual, proximaFaixa } = await obterProximaFaixaAtual(aluno);

    const minimo =
      requisito?.requisito_aulas ??
      aulasNecessarias(aluno.faixa?.nome, idade);

    // tempo mínimo entre graduações
    let tempoOk = true;

    if (requisito?.tempo_minimo_dias) {
      const ultima = aluno.graduacoes?.[0];
      if (ultima) {
        const dias = Math.floor(
          (Date.now() - new Date(ultima.data_graduacao)) /
            (1000 * 60 * 60 * 24)
        );
        tempoOk = dias >= requisito.tempo_minimo_dias;
      }
    }

    const faltam = Math.max(0, minimo - aulasPresente);

    // cálculo do status
    const percentual = aulasPresente / minimo;

    let status = "Longe";
    if (percentual >= 1 && tempoOk) {
      status = "Concluído";
    } else if (percentual >= 0.75) {
      status = "Próximo";
    }

    // cor opcional
    let corStatus;
    switch (status) {
      case "Concluído": corStatus = "green"; break;
      case "Próximo": corStatus = "orange"; break;
      default: corStatus = "red"; break;
    }

    return padraoSucesso(res, {
      alunoId: aluno.id,
      nome: aluno.nome,
      faixaAtual,
      grauAtual: aluno.grau ?? 0,
      proximoGrau: nextGrau,
      proximaFaixa,
      aulasPresente,
      minimoAulas: minimo,
      faltam,
      tempoOk,
      percentual,
      status,
      corStatus
    });

  } catch (err) {
    console.error(err);
    return padraoErro(res, "Erro ao consultar status do aluno.", 500);
  }
},

  /* ------------------------ LISTAR APTOS ------------------------ */
async listarAptos(req, res) {
  try {
    const alunos = await prisma.usuario.findMany({
      where: { tipo: { in: ["ALUNO", "ALUNO_PROFESSOR"] } },
      include: {
        faixa: true,
        graduacoes: { orderBy: { data_graduacao: "desc" } },
      },
    });

    const resultados = [];

    for (const aluno of alunos) {
      const idade = calcularIdade(aluno.dataNascimento);

      // executa em sequência, evitando explosão de conexões
      const aulasPresente = await contarAulasPresente(aluno.id);
      const reqObj = await obterRequisitoParaProximoGrau(aluno);
      const faixas = await obterProximaFaixaAtual(aluno);

      const { requisito, nextGrau } = reqObj;
      const { faixaAtual, proximaFaixa } = faixas;

      const minimo =
        requisito?.requisito_aulas ??
        aulasNecessarias(aluno.faixa?.nome, idade);

      let tempoOk = true;

      if (requisito?.tempo_minimo_dias) {
        const ultima = aluno.graduacoes?.[0];
        if (ultima) {
          const dias = Math.floor(
            (Date.now() - new Date(ultima.data_graduacao)) /
              (1000 * 60 * 60 * 24)
          );
          tempoOk = dias >= requisito.tempo_minimo_dias;
        }
      }

      const faltam = Math.max(0, minimo - aulasPresente);
      const status =
        faltam === 0 && tempoOk
          ? "PRONTO"
          : faltam <= 5
          ? "PROXIMO"
          : null;

      if (!status) continue;

      resultados.push({
        alunoId: aluno.id,
        nome: aluno.nome,
        idade,
        faixaAtual,
        grauAtual: aluno.grau ?? 0,
        proximoGrau: nextGrau,
        proximaFaixa,
        aulasPresente,
        minimoAulas: minimo,
        faltam,
        tempoOk,
        status,
      });
    }

    return padraoSucesso(res, resultados);
  } catch (err) {
    console.error(err);
    return padraoErro(res, "Erro ao listar aptos para graduação.", 500);
  }
},


/* ------------------------ GRADUAR ALUNO ------------------------ */
async graduarAluno(req, res) {
  try {
    const coordenadorId = req.user.id;
    const { alunoId } = req.params;
    const { observacao } = req.body;

    const aluno = await prisma.usuario.findUnique({
      where: { id: alunoId },
      include: {
        faixa: true,
        graduacoes: { orderBy: { data_graduacao: "desc" } },
      },
    });

    if (!aluno) return padraoErro(res, "Aluno não encontrado.", 404);
    if (!aluno.id_faixa) return padraoErro(res, "Aluno não possui faixa inicial definida.", 400);

    const idade = calcularIdade(aluno.dataNascimento);

    const [aulasPresente, reqObj] = await Promise.all([
      contarAulasPresente(aluno.id),
      obterRequisitoParaProximoGrau(aluno),
    ]);

    const { requisito, nextGrau } = reqObj;

    const minimo = requisito?.requisito_aulas ?? aulasNecessarias(aluno.faixa?.nome, idade);
    if (aulasPresente < minimo) return padraoErro(res, "Aluno não possui aulas suficientes.");

    if (requisito?.tempo_minimo_dias) {
      const ultima = aluno.graduacoes?.[0];
      if (ultima) {
        const dias = Math.floor((Date.now() - new Date(ultima.data_graduacao)) / (1000*60*60*24));
        if (dias < requisito.tempo_minimo_dias)
          return padraoErro(res, "Interstício mínimo não cumprido.");
      }
    }

    /* --------- NOVO GRAU / FAIXA -------- */
    const GRAU_MAX = 4;
    let novoGrau = nextGrau;
    let novaFaixaId = aluno.id_faixa;

    if (novoGrau > GRAU_MAX) {
      const proxima = await prisma.faixa.findFirst({
        where: { ordem: { gt: aluno.faixa?.ordem ?? 0 } },
        orderBy: { ordem: "asc" },
      });
      if (proxima) {
        novaFaixaId = proxima.id;
        novoGrau = 0;
      } else {
        novoGrau = GRAU_MAX;
      }
    }

    /* --------- ATUALIZA O USUÁRIO -------- */
    const usuarioAtualizado = await prisma.usuario.update({
      where: { id: aluno.id },
      data: { id_faixa: novaFaixaId, grau: novoGrau },
    });

    /* --------- CRIA A GRADUAÇÃO -------- */
    const registroGraduacao = await prisma.graduacao.create({
      data: {
        alunoId: aluno.id,
        faixa_id: novaFaixaId,
        grau: novoGrau,
        data_graduacao: new Date(),
        observacao: observacao ?? null,
      },
    });

    /* --------- ZERAR PRESENÇAS -------- */
    await prisma.frequencia.deleteMany({
      where: { id_aluno: aluno.id, presente: true },
    });

    /* --------- UPGRADE PARA ALUNO_PROFESSOR -------- */
    const faixaNova = await prisma.faixa.findUnique({ where: { id: novaFaixaId } });
    if (faixaNova?.nome?.toLowerCase().includes("roxa") && usuarioAtualizado.tipo === "ALUNO") {
      await prisma.usuario.update({ where: { id: aluno.id }, data: { tipo: "ALUNO_PROFESSOR" } });
    }

    /* --------- LOG -------- */
    await prisma.log_Acao.create({
      data: {
        usuario_id: coordenadorId,
        acao: "GRADUACAO",
        descricao: `Graduou usuário ${aluno.id} — ${faixaNova?.nome}, grau ${novoGrau}`,
      },
    });

    return padraoSucesso(res, {
      mensagem: "Graduação concluída e presenças zeradas.",
      graduacao: registroGraduacao,
    });

  } catch (err) {
    console.error(err);
    return padraoErro(res, "Erro ao graduar aluno.", 500);
  }
},

/* ---------------------- HISTÓRICO ---------------------- */
async listarHistorico(req, res) {
  try {
    const { alunoId } = req.params;

    const graduacoes = await prisma.graduacao.findMany({
      where: { alunoId },
      orderBy: { data_graduacao: "asc" },
      include: { faixa: true },
    });

    const historico = [];

    for (let i = 0; i < graduacoes.length; i++) {
      const atual = graduacoes[i];
      const anterior = graduacoes[i - 1];

      // ORIGEM: sempre uma faixa válida
      const faixaOrigem =
        anterior?.faixa?.corFaixa || atual.faixa.corFaixa;

      // DESTINO
      let destino;
      if (anterior && anterior.faixa_id !== atual.faixa_id) {
        destino = `Faixa ${atual.faixa.corFaixa}`;
      } else {
        destino = `${atual.grau}° Grau`;
      }

      historico.push({
        data: formatarDataBR(atual.data_graduacao),
        descricao: `Faixa ${faixaOrigem} → ${destino}`,
      });
    }

    // mais recente primeiro
    historico.reverse();

    return padraoSucesso(res, historico);
  } catch (err) {
    console.error(err);
    return padraoErro(res, "Erro ao listar histórico de graduações.", 500);
  }
},





/* ---------------------- GRADUAÇÃO ATUAL ---------------------- */
async graduacaoAtual(req, res) {
  try {
    const { alunoId } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { id: alunoId },
      include: { faixa: true }, // pega id_faixa -> faixa
    });

    if (!usuario)
      return padraoErro(res, "Usuário não encontrado.", 404);

    return padraoSucesso(res, {
      faixa: usuario.faixa
        ? {
            id: usuario.faixa.id,
            cor: usuario.faixa.corFaixa,              // ✔ certo
            ordem: usuario.faixa.ordem,               // ✔ certo
            imagem: usuario.faixa.imagem_faixa_url,   // ✔ certo
          }
        : null,
      grau: usuario.grau ?? 0,
      tipo: usuario.tipo,
    });
  } catch (err) {
    console.error(err);
    return padraoErro(res, "Erro ao consultar graduação atual.", 500);
  }
},

/* ---------------------- GRADUAÇÃO FUTURA ---------------------- */
async graduacaoFutura(req, res) {
  try {
    const { alunoId } = req.params;

    const usuario = await prisma.usuario.findUnique({
      where: { id: alunoId },
      include: { faixa: true },
    });

    if (!usuario)
      return padraoErro(res, "Usuário não encontrado.", 404);

    const faixaAtual = usuario.faixa;
    const grauAtual = usuario.grau ?? 0;

    let proximoGrau = null;
    let proximaFaixa = null;

    if (faixaAtual) {
      if (grauAtual < 4) {
        // sobe grau
        proximoGrau = grauAtual + 1;
        proximaFaixa = faixaAtual;
      } else {
        // muda faixa
        proximoGrau = 0;
        proximaFaixa = await prisma.faixa.findFirst({
          where: { ordem: faixaAtual.ordem + 1 },
        });
      }
    }

    return padraoSucesso(res, {
      proximoGrau,
      proximaFaixa: proximaFaixa
        ? {
            id: proximaFaixa.id,
            cor: proximaFaixa.corFaixa,
            ordem: proximaFaixa.ordem,
            imagem: proximaFaixa.imagem_faixa_url,
          }
        : null,
    });

  } catch (err) {
    console.error(err);
    return padraoErro(res, "Erro ao consultar graduação futura.", 500);
  }
}

};
export default GraduacaoController;
