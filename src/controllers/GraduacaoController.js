import prisma from "../prisma.js";

// Helper de idade
function calcularIdade(dataNascimento) {
  if (!dataNascimento) return null;
  const hoje = new Date();
  const nasc = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

// Regras de transição
const TRANSICOES_AULAS = {
  "Branca->Azul": { adulto: 40, infantil: 30 },
  "Azul->Roxa": 45,
  "Roxa->Marrom": 50,
  "Marrom->Preta": 60,
  "DEFAULT": 30
};

// Idades mínimas
const IDADES_MINIMAS_POR_FAIXA = {
  "Cinza": 4,
  "Amarela": 7,
  "Laranja": 10,
  "Verde": 13,
  "Azul": 16,
  "Roxa": 16,
  "Marrom": 18,
  "Preta": 19
};

// NOVO: regras de faixa por idade
function faixaPermitidaSistema(idade, ordemFaixa) {
  if (idade < 16) return ordemFaixa <= 13;   // só infantil
  return ordemFaixa >= 14;                  // só adulto
}

// Contar presenças desde data
async function contarPresencasDesde(alunoId, dataBase = null) {
  const where = { id_aluno: Number(alunoId), presente: true };
  if (dataBase) where.data = { gte: dataBase };
  return prisma.frequencia.count({ where });
}

export default {

  // ---------------------------------------------
  // RF-022 – IDENTIFICAR APTOS
  // ---------------------------------------------
  async identificarAptos(req, res) {
    try {
      const alunos = await prisma.aluno.findMany({ include: { usuario: true }});
      const faixas = await prisma.faixa.findMany();
      const resultados = [];

      for (const aluno of alunos) {
        const idade = calcularIdade(aluno.dataNascimento);
        const infantil = idade !== null && idade < 16;

        const ultimaGrad = await prisma.graduacao.findFirst({
          where: { alunoId: aluno.id },
          orderBy: { data_graduacao: "desc" }
        });

        const faixaAtual = ultimaGrad
          ? await prisma.faixa.findUnique({ where: { id: ultimaGrad.faixa_id }})
          : faixas.find(f => f.nome.toLowerCase() === "branca");

        // 🔥 NOVO: filtrar apenas faixas permitidas pelo sistema correto (infantil/adulto)
        const proxima = await prisma.faixa.findFirst({
          where: {
            ordem: faixaAtual.ordem + 1,
            AND: infantil
              ? { ordem: { lte: 13 } }
              : { ordem: { gte: 14 } }
          }
        });

        if (!proxima) continue;

        let dataBase = aluno.ultima_reset_frequencia
          ? new Date(aluno.ultima_reset_frequencia)
          : ultimaGrad?.data_graduacao
            ? new Date(ultimaGrad.data_graduacao)
            : null;

        const presencas = await contarPresencasDesde(aluno.id, dataBase);

        let aulasNecessarias = TRANSICOES_AULAS.DEFAULT;
        const chave = `${faixaAtual.nome}->${proxima.nome}`;

        if (chave === "Branca->Azul")
          aulasNecessarias = infantil
            ? TRANSICOES_AULAS["Branca->Azul"].infantil
            : TRANSICOES_AULAS["Branca->Azul"].adulto;
        else if (TRANSICOES_AULAS[chave])
          aulasNecessarias = TRANSICOES_AULAS[chave];

        resultados.push({
          alunoId: aluno.id,
          nome: aluno.nome,
          faixaAtual: faixaAtual.nome,
          proximaFaixa: proxima.nome,
          idade,
          presencas,
          aulasNecessarias,
          apto: presencas >= aulasNecessarias
        });
      }

      return res.json(resultados);

    } catch (err) {
      console.error("Erro identificarAptos:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  },


  // ---------------------------------------------
  // RF-023 – GRADUAR ALUNO
  // ---------------------------------------------
  async graduar(req, res) {
    try {
      const user = req.user;
      if (!user || user.tipo !== "COORDENADOR")
        return res.status(403).json({ message: "Apenas coordenador pode graduar" });

      const { alunoId, faixa_id, grau, aprovado_mestre } = req.body;
      if (!alunoId || !faixa_id || grau === undefined)
        return res.status(400).json({ message: "Campos obrigatórios faltando" });

      if (!aprovado_mestre)
        return res.status(400).json({ message: "É obrigatório aprovado_mestre = true" });

      const aluno = await prisma.aluno.findUnique({
        where: { id: Number(alunoId) },
        include: { usuario: true }
      });

      if (!aluno) return res.status(404).json({ message: "Aluno não encontrado" });

      const ultimaGrad = await prisma.graduacao.findFirst({
        where: { alunoId: aluno.id },
        orderBy: { data_graduacao: "desc" }
      });

      const faixaAtual = ultimaGrad
        ? await prisma.faixa.findUnique({ where: { id: ultimaGrad.faixa_id }})
        : await prisma.faixa.findFirst({ where: { nome: "Branca" }});

      const faixaDestino = await prisma.faixa.findUnique({
        where: { id: Number(faixa_id) }
      });

      if (!faixaDestino)
        return res.status(404).json({ message: "Faixa destino não encontrada" });

      const idade = calcularIdade(aluno.dataNascimento);
      const infantil = idade < 16;

      // 🔥 REGRA NOVA: criança só recebe faixa até ordem 13
      if (infantil && faixaDestino.ordem > 13)
        return res.status(400).json({ message: "Aluno infantil só pode faixas cinza/amarela/laranja/verde" });

      // 🔥 REGRA NOVA: adulto não pode pegar faixa infantil
      if (!infantil && faixaDestino.ordem <= 13)
        return res.status(400).json({ message: "Faixas infantis não são permitidas para alunos adultos" });

      // 🔥 Impedir pular faixas
      if (faixaDestino.ordem > faixaAtual.ordem + 1)
        return res.status(400).json({ message: "Não pode pular faixas" });

      // 🔥 Impedir rebaixar
      if (faixaDestino.ordem < faixaAtual.ordem)
        return res.status(400).json({ message: "Não pode rebaixar faixa" });

      // Idade mínima oficial
      const idadeMinima = IDADES_MINIMAS_POR_FAIXA[faixaDestino.nome];
      if (idadeMinima && idade < idadeMinima)
        return res.status(400).json({
          message: `Idade mínima para faixa ${faixaDestino.nome} é ${idadeMinima}`
        });

      let dataBase = aluno.ultima_reset_frequencia
        ? new Date(aluno.ultima_reset_frequencia)
        : ultimaGrad?.data_graduacao
          ? new Date(ultimaGrad.data_graduacao)
          : null;

      const presencas = await contarPresencasDesde(aluno.id, dataBase);

      let aulasNecessarias = TRANSICOES_AULAS.DEFAULT;
      const chave = `${faixaAtual.nome}->${faixaDestino.nome}`;

      if (chave === "Branca->Azul")
        aulasNecessarias = infantil
          ? TRANSICOES_AULAS["Branca->Azul"].infantil
          : TRANSICOES_AULAS["Branca->Azul"].adulto;
      else if (TRANSICOES_AULAS[chave])
        aulasNecessarias = TRANSICOES_AULAS[chave];

      if (presencas < aulasNecessarias)
        return res.status(400).json({
          message: `Presenças insuficientes: ${presencas}/${aulasNecessarias}`
        });

      const nova = await prisma.graduacao.create({
        data: {
          alunoId: aluno.id,
          faixa_id: faixaDestino.id,
          grau: Number(grau),
          data_graduacao: new Date()
        },
        include: { faixa: true, aluno: true }
      });

      // Quando aluno vira faixa roxa vira professor
      if (faixaDestino.nome === "Roxa" && aluno.usuarioId) {
        await prisma.usuario.update({
          where: { id: aluno.usuarioId },
          data: { tipo: "ALUNO,PROFESSOR" }
        });
      }

      return res.status(201).json({
        message: "Aluno graduado com sucesso",
        graduacao: nova
      });

    } catch (err) {
      console.error("Erro graduar:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  },


  // ---------------------------------------------
  // HISTÓRICO
  // ---------------------------------------------
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


  // ---------------------------------------------
  // CONSULTAR ATUAL
  // ---------------------------------------------
  async obterAtual(req, res) {
    try {
      const alunoId = Number(req.params.alunoId);
      const ultima = await prisma.graduacao.findFirst({
        where: { alunoId },
        include: { faixa: true },
        orderBy: { data_graduacao: "desc" }
      });
      if (!ultima)
        return res.status(404).json({ message: "Nenhuma graduacao encontrada" });
      return res.json(ultima);
    } catch (err) {
      console.error("Erro obterAtual:", err);
      return res.status(500).json({ message: "Erro interno" });
    }
  }
};
