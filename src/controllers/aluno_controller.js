import prisma from "../prisma.js";
import { validarCPF } from "../utils/validacao_cpf.js";
import { padraoRespostaErro } from "../utils/response.js";

async function checkCoordenador(req) {
  const userId = req.user?.id;
  if (!userId) throw { status: 401, message: "Você não está autenticado." };

  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    select: { tipo: true }
  });

  if (!usuario) throw { status: 404, message: "Usuário não encontrado." };
  if (usuario.tipo !== "COORDENADOR")
    throw { status: 403, message: "Somente coordenadores podem realizar essa operação." };

  return userId;
}

function calcularIdade(dataNascimento) {
  const hoje = new Date();
  const nasc = new Date(dataNascimento);
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return idade;
}

const generoMap = { MASCULINO: "M", FEMININO: "F", OUTRO: "OUTRO" };


export async function criarAluno(req, res) {
  try {
    console.log("===== [DEBUG] INÍCIO criarAluno =====");
    console.log("[DEBUG] Headers recebidos:", req.headers);
    console.log("[DEBUG] Body recebido:", req.body);
    console.log("[DEBUG] User recebido no req:", req.user);

    await checkCoordenador(req);
    console.log("[DEBUG] Passou checkCoordenador");

    // usamos let para permitir normalizações abaixo
    let {
      nome,
      nome_social,
      cpf,
      dataNascimento,
      genero,
      num_matricula,
      id_faixa,
      telefone,
      grau,
      endereco,
      imagem_perfil_url,
      responsaveis,
      turmaIds
    } = req.body;

    console.log("[DEBUG] Campos extraídos:");
    console.log({ nome, cpf, dataNascimento, genero, grau });

    if (!nome || !cpf || !dataNascimento || !genero) {
      console.log("[ERRO DEBUG] Faltam campos obrigatórios");
      return res.status(400).json({ message: "Campos obrigatórios ausentes." });
    }

    console.log("[DEBUG] Validando CPF...");
    if (!validarCPF(cpf)) {
      console.log("[ERRO DEBUG] CPF inválido:", cpf);
      return res.status(400).json({ message: "CPF inválido." });
    }

    console.log("[DEBUG] Validando gênero:", genero);
    if (!generoMap[genero]) {
      console.log("[ERRO DEBUG] Gênero inválido");
      return res.status(400).json({ message: "Gênero inválido." });
    }

    if (turmaIds && !Array.isArray(turmaIds)) {
      console.log("[ERRO DEBUG] turmaIds não é array");
      return res.status(400).json({ message: "turmaIds deve ser lista." });
    }

    if (responsaveis && !Array.isArray(responsaveis)) {
      console.log("[ERRO DEBUG] responsaveis não é array");
      return res.status(400).json({ message: "responsaveis deve ser lista." });
    }

    console.log("[DEBUG] Normalizando campos opcionais antes de salvar...");

    // Normalizar num_matricula: enviar undefined em vez de string vazia
    if (typeof num_matricula === "string" && num_matricula.trim() === "") num_matricula = undefined;

    // imagem_perfil_url: aceitar string vazia como undefined
    if (typeof imagem_perfil_url === "string" && imagem_perfil_url.trim() === "") imagem_perfil_url = undefined;

    // id_faixa: aceitar string vazia como undefined
    if (typeof id_faixa === "string" && id_faixa.trim() === "") id_faixa = undefined;

    // Converter grau para número se possível; enviar undefined se vazio/not provided
    if (grau !== undefined && grau !== null && grau !== "") {
      const grauNum = Number(grau);
      if (Number.isNaN(grauNum)) {
        // Se não for possível converter, rejeitamos a requisição
        console.log("[ERRO DEBUG] grau inválido, não é número:", grau);
        return res.status(400).json({ message: "Campo 'grau' deve ser numérico." });
      }
      grau = grauNum;
    } else {
      grau = undefined;
    }

    console.log("[DEBUG] Verificando se CPF já existe...");
    const jaExiste = await prisma.usuario.findFirst({ where: { cpf } });
    console.log("[DEBUG] Resultado CPF existente:", jaExiste);
    if (jaExiste) {
      console.log("[ERRO DEBUG] CPF já cadastrado");
      return res.status(409).json({ message: "CPF já cadastrado." });
    }

    console.log("[DEBUG] Calculando idade...");
    const idade = calcularIdade(dataNascimento);
    console.log("[DEBUG] Idade calculada:", idade);

    console.log("[DEBUG] Criando usuário...");
    const usuario = await prisma.usuario.create({
      data: {
        nome,
        nome_social,
        cpf,
        dataNascimento: new Date(dataNascimento),
        genero: generoMap[genero],
        telefone,
        endereco,
        imagem_perfil_url,
        email: `${cpf}@aluno.morimitsu.com.br`
      }
    });
    console.log("[DEBUG] Usuário criado:", usuario);

    console.log("[DEBUG] Preparando dados para criar aluno...");

    const alunoData = {
      usuarioId: usuario.id,
      nome,
      nome_social,
      cpf,
      dataNascimento: new Date(dataNascimento),
      genero: generoMap[genero],
      num_matricula,
      id_faixa,
      grau,
      telefone,
      endereco,
      imagem_perfil_url,
      tipo: "COMUM"
    };

    // responsaveis: criar apenas se menor de 18 e existir lista válida
    if (idade < 18 && responsaveis?.length) {
      alunoData.responsaveis = {
        create: responsaveis.map(r => ({
          nome: r.nome,
          telefone: r.telefone,
          grau_parentesco: r.grau_parentesco,
          email: r.email
        }))
      };
    }

    // turma_matriculas: criar se houver turmaIds válidos
    if (Array.isArray(turmaIds) && turmaIds.length) {
      alunoData.turma_matriculas = {
        create: turmaIds.map(id_turma => ({ id_turma }))
      };
    }

    console.log("[DEBUG] Criando aluno...");
    const aluno = await prisma.aluno.create({
      data: alunoData,
      include: {
        responsaveis: true,
        turma_matriculas: { include: { turma: true } },
        faixa: true,
        usuario: true
      }
    });

    console.log("[DEBUG] Aluno criado com sucesso:", aluno);
    console.log("===== [DEBUG] FIM criarAluno =====");

    res.status(201).json({ message: "Aluno cadastrado com sucesso", aluno });
  } catch (error) {
    console.error("===== [DEBUG ERRO criarAluno] =====");
    console.error("Mensagem de erro:", error.message);
    console.error("Erro completo:", error);
    console.error("===================================");
    return padraoRespostaErro(res, error.message, error.status || 500);
  }
}

export async function atualizarAluno(req, res) {
  try {
    await checkCoordenador(req);

    const alunoId = req.params.id;
    let {
      nome, nome_social, cpf, dataNascimento, genero,
      num_matricula, id_faixa, telefone,
      grau, endereco, imagem_perfil_url,
      responsaveis, turmaIds, ativo
    } = req.body;

    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
      include: { usuario: true }
    });
    if (!aluno) return res.status(404).json({ message: "Aluno não encontrado." });

    if (cpf && !validarCPF(cpf))
      return res.status(400).json({ message: "CPF inválido." });

    if (cpf && cpf !== aluno.cpf) {
      const duplicado = await prisma.usuario.findFirst({
        where: { cpf, NOT: { id: aluno.usuarioId || "" } }
      });
      if (duplicado) return res.status(409).json({ message: "CPF já está em uso." });
    }

    if (genero && !generoMap[genero])
      return res.status(400).json({ message: "Gênero inválido." });

    const idade = dataNascimento ? calcularIdade(dataNascimento) : calcularIdade(aluno.dataNascimento);

    // Normalizações semelhantes às do criarAluno
    if (typeof num_matricula === "string" && num_matricula.trim() === "") num_matricula = undefined;
    if (typeof imagem_perfil_url === "string" && imagem_perfil_url.trim() === "") imagem_perfil_url = undefined;
    if (typeof id_faixa === "string" && id_faixa.trim() === "") id_faixa = undefined;

    if (grau !== undefined && grau !== null && grau !== "") {
      const grauNum = Number(grau);
      if (Number.isNaN(grauNum)) {
        return res.status(400).json({ message: "Campo 'grau' deve ser numérico." });
      }
      grau = grauNum;
    } else {
      grau = undefined;
    }

    if (aluno.usuarioId) {
      await prisma.usuario.update({
        where: { id: aluno.usuarioId },
        data: {
          nome,
          nome_social,
          cpf,
          telefone,
          endereco,
          imagem_perfil_url,
          genero: genero ? generoMap[genero] : undefined,
          dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
          ativo: typeof ativo === "boolean" ? ativo : undefined
        }
      });
    }

    const atualizado = await prisma.aluno.update({
      where: { id: alunoId },
      data: {
        nome,
        nome_social,
        cpf,
        num_matricula,
        id_faixa,
        grau,
        telefone,
        endereco,
        imagem_perfil_url,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : undefined,
        genero: genero ? generoMap[genero] : undefined,
        responsaveis: idade < 18 && responsaveis?.length
          ? {
              deleteMany: {},
              create: responsaveis.map(r => ({
                nome: r.nome,
                telefone: r.telefone,
                grau_parentesco: r.grau_parentesco,
                email: r.email
              }))
            }
          : undefined,
        turma_matriculas: turmaIds?.length
          ? {
              deleteMany: {},
              create: turmaIds.map(id_turma => ({ id_turma }))
            }
          : undefined,
        ativo: typeof ativo === "boolean" ? ativo : undefined
      },
      include: {
        responsaveis: true,
        turma_matriculas: { include: { turma: true } },
        faixa: true,
        usuario: true
      }
    });

    res.json({ message: "Aluno atualizado com sucesso", aluno: atualizado });
  } catch (error) {
    console.error("Erro atualizar aluno:", error);
    return padraoRespostaErro(res, error.message, error.status || 500);
  }
}

export async function deletarAluno(req, res) {
  try {
    await checkCoordenador(req);

    const alunoId = req.params.id;

    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
      include: { usuario: true }
    });
    if (!aluno) return res.status(404).json({ message: "Aluno não encontrado." });

    const freq = await prisma.frequencia.count({ where: { id_aluno: alunoId } });
    if (freq > 0)
      return res.status(400).json({ message: "Aluno possui frequências registradas." });

    await prisma.aluno.delete({ where: { id: alunoId } });

    if (aluno.usuarioId) {
      try { await prisma.usuario.delete({ where: { id: aluno.usuarioId } }); }
      catch {}
    }

    res.json({ message: "Aluno deletado com sucesso" });
  } catch (error) {
    return padraoRespostaErro(res, error.message, error.status || 500);
  }
}

export async function listarAlunos(req, res) {
  try {
    const { nome, id, page = 1, limit = 50 } = req.query;

    const filtros = {};
    if (nome) filtros.nome = { contains: nome, mode: "insensitive" };
    if (id) filtros.id = id;

    const take = Math.min(Number(limit), 200) || 50;
    const skip = (Number(page) - 1) * take;

    const [alunos, total] = await Promise.all([
      prisma.aluno.findMany({
        where: filtros,
        include: {
          responsaveis: true,
          turma_matriculas: { include: { turma: true } },
          faixa: true,
          usuario: true
        },
        orderBy: { nome: "asc" },
        take,
        skip
      }),
      prisma.aluno.count({ where: filtros })
    ]);

    res.json({ data: alunos, meta: { total, page: Number(page), limit: take } });
  } catch (error) {
    return padraoRespostaErro(res, "Erro ao listar alunos", 500);
  }
}

export async function listarAlunosPorTurma(req, res) {
  try {
    const turmaId = req.params.id;
    if (!turmaId) return res.status(400).json({ message: "Informe a turma." });

    const rel = await prisma.aluno_Turma.findMany({
      where: { id_turma: turmaId, ativo: true },
      include: {
        aluno: {
          include: { responsaveis: true, faixa: true, usuario: true }
        },
        turma: true
      }
    });

    res.json(rel.map(r => r.aluno));
  } catch (error) {
    return padraoRespostaErro(res, "Erro ao listar alunos da turma", 500);
  }
}

export async function detalhesAluno(req, res) {
  try {
    const alunoId = req.params.id;
    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
      include: {
        responsaveis: true,
        turma_matriculas: { include: { turma: true } },
        faixa: true,
        usuario: true,
        frequencias: true
      }
    });

    if (!aluno) return res.status(404).json({ message: "Aluno não encontrado." });

    res.json(aluno);
  } catch (error) {
    return padraoRespostaErro(res, "Erro ao buscar aluno", 500);
  }
}
export async function promoverAluno(req, res) {
  try {
    await checkCoordenador(req);

    const alunoId = req.params.id;
    const aluno = await prisma.aluno.findUnique({ where: { id: alunoId }, include: { usuario: true } });

    if (!aluno) return res.status(404).json({ message: "Aluno não encontrado." });
    if (!aluno.usuario) return res.status(400).json({ message: "Aluno não possui usuário." });

    await prisma.usuario.update({
      where: { id: aluno.usuarioId },
      data: { tipo: "PROFESSOR" }
    });

    const atualizado = await prisma.aluno.update({
      where: { id: alunoId },
      data: { tipo: "ALUNO_PROFESSOR" },
      include: {
        responsaveis: true,
        turma_matriculas: { include: { turma: true } },
        faixa: true,
        usuario: true,
        frequencias: true
      }
    });

    res.json({ message: "Aluno promovido", aluno: atualizado });
  } catch (error) {
    return padraoRespostaErro(res, "Erro ao promover aluno", 500);
  }
}

export async function consultarFrequencias(req, res) {
  try {
    const alunoId = req.params.id;

    const freq = await prisma.frequencia.findMany({
      where: { id_aluno: alunoId },
      include: { turma: true }
    });

    res.json(freq);
  } catch (error) {
    return padraoRespostaErro(res, "Erro ao consultar frequências", 500);
  }
}

export async function consultarHistoricoFrequencias(req, res) {
  try {
    const alunoId = req.params.id;

    const historico = await prisma.frequencia.findMany({
      where: { id_aluno: alunoId },
      include: { turma: true }
    });

    res.json(historico);
  } catch (error) {
    return padraoRespostaErro(res, "Erro ao consultar histórico", 500);
  }
}

export default {
  criarAluno,
  atualizarAluno,
  deletarAluno,
  listarAlunos,
  listarAlunosPorTurma,
  detalhesAluno,
  promoverAluno,
  consultarFrequencias,
  consultarHistoricoFrequencias
};
