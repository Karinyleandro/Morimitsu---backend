// src/controllers/AniversariantesController.js
import prisma from "../prisma.js";

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

    if (!["PROFESSOR", "COORDENADOR", "ADMIN", "ALUNO_PROFESSOR"].includes(requester.tipo)) {
      return res.status(403).json({ message: "Permissão negada" });
    }

    // HOJE EM UTC PARA EVITAR BUG DE FUSO
    const hoje = new Date();
    const mesAtual = hoje.getUTCMonth() + 1;
    const diaHoje = hoje.getUTCDate();

    // corrigido: usar UTC
    function calcularProximoAniversario(dataNascimentoIso) {
      const hojeLocal = new Date();

      const nasc = new Date(dataNascimentoIso);

      let prox = new Date(
        hojeLocal.getUTCFullYear(),
        nasc.getUTCMonth(),
        nasc.getUTCDate()
      );

      const hojeUTC = new Date(
        hojeLocal.getUTCFullYear(),
        hojeLocal.getUTCMonth(),
        hojeLocal.getUTCDate()
      );

      if (prox < hojeUTC) {
        prox = new Date(
          hojeLocal.getUTCFullYear() + 1,
          nasc.getUTCMonth(),
          nasc.getUTCDate()
        );
      }

      const yyyy = prox.getUTCFullYear();
      const mm = String(prox.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(prox.getUTCDate()).padStart(2, "0");

      return `${yyyy}-${mm}-${dd}`;
    }

    function calcularIdade(dataNascimentoIso) {
      const hoje = new Date();
      const nasc = new Date(dataNascimentoIso);

      let idade = hoje.getUTCFullYear() - nasc.getUTCFullYear();

      const m = hoje.getUTCMonth() - nasc.getUTCMonth();
      if (m < 0 || (m === 0 && hoje.getUTCDate() < nasc.getUTCDate())) {
        idade--;
      }
      return idade;
    }

    // Buscar alunos
    const alunos = await prisma.usuario.findMany({
      where: {
        tipo: "ALUNO",
        ativo: true,
        dataNascimento: { not: null }
      },
      select: {
        id: true,
        nome: true,
        dataNascimento: true
      }
    });

    // Processar aniversariantes
    const lista = alunos
      .map(a => {
        const nasc = a.dataNascimento;

        // AQUI ESTÁ A CORREÇÃO!!!
        const mes = nasc.getUTCMonth() + 1;
        const dia = nasc.getUTCDate();

        return {
          id: a.id,
          nome: a.nome,
          dataNascimento: nasc.toISOString().split("T")[0],
          mes,
          dia,
          idade: calcularIdade(nasc),
          proximoAniversario: calcularProximoAniversario(nasc),
          isToday: mes === mesAtual && dia === diaHoje
        };
      })
      .filter(a => a.mes === mesAtual)
      .sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome));

    return res.status(200).json({
      mesAtual,
      count: lista.length,
      aniversariantes: lista
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
   * GET /aniversariantes?mes=NUMBER
   */
  static async aniversariantesMes(req, res) {
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

      const mesQuery = req.query.mes ? Number(req.query.mes) : null;
      const mesAlvo =
        mesQuery && mesQuery >= 1 && mesQuery <= 12
          ? mesQuery
          : new Date().getMonth() + 1;

      const usuarios = await prisma.usuario.findMany({
        where: { dataNascimento: { not: null }, ativo: true },
        select: { id: true, nome: true, dataNascimento: true }
      });

      const hoje = new Date();

      const lista = usuarios
        .map(u => {
          const mes = mesDe(u.dataNascimento);
          const dia = diaDe(u.dataNascimento);
          const isToday =
            mes === hoje.getMonth() + 1 && dia === hoje.getDate();

          return {
            id: u.id,
            nome: u.nome,
            dataNascimento: u.dataNascimento.toISOString().split("T")[0],
            mes,
            dia,
            idade: calcularIdade(u.dataNascimento, hoje),
            proximoAniversario: calcularProximoAniversario(u.dataNascimento),
            isToday
          };
        })
        .filter(u => u.mes === mesAlvo)
        .sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome));

      return res.status(200).json({
        mes: mesAlvo,
        count: lista.length,
        aniversariantes: lista
      });
    } catch (error) {
      console.error("Erro ao buscar aniversariantes do mês:", error);
      return res.status(500).json({ message: "Erro interno", error: error.message });
    }
  }

  /**
   * GET /aniversariantes/ano-atual
   */
  static async aniversariantesAnoAtual(req, res) {
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
      const agrupado = {};

      for (let m = 1; m <= 12; m++) agrupado[m] = [];

      usuarios.forEach(u => {
        const mes = mesDe(u.dataNascimento);
        agrupado[mes].push({
          id: u.id,
          nome: u.nome,
          dataNascimento: u.dataNascimento.toISOString().split("T")[0],
          mes,
          dia: diaDe(u.dataNascimento),
          idade: calcularIdade(u.dataNascimento, hoje),
          proximoAniversario: calcularProximoAniversario(u.dataNascimento)
        });
      });

      for (let m = 1; m <= 12; m++) {
        agrupado[m].sort((a, b) => a.dia - b.dia || a.nome.localeCompare(b.nome));
      }

      return res.status(200).json({
        ano: hoje.getFullYear(),
        meses: agrupado
      });
    } catch (error) {
      console.error("Erro ao buscar aniversariantes do ano:", error);
      return res.status(500).json({ message: "Erro interno", error: error.message });
    }
  }

  /**
   * GET /aniversariantes/hoje
   */
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
      const mesHoje = hoje.getMonth() + 1;
      const diaHoje = hoje.getDate();

      const lista = usuarios
        .map(u => ({
          id: u.id,
          nome: u.nome,
          dataNascimento: u.dataNascimento.toISOString().split("T")[0],
          mes: mesDe(u.dataNascimento),
          dia: diaDe(u.dataNascimento),
          idade: calcularIdade(u.dataNascimento, hoje)
        }))
        .filter(u => u.mes === mesHoje && u.dia === diaHoje)
        .sort((a, b) => a.nome.localeCompare(b.nome));

      return res.status(200).json({
        data: hoje.toISOString().split("T")[0],
        count: lista.length,
        aniversariantes: lista
      });
    } catch (error) {
      console.error("Erro ao buscar aniversariantes de hoje:", error);
      return res.status(500).json({ message: "Erro interno", error: error.message });
    }
  }
}

export default AniversariantesController;
