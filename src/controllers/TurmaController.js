import { PrismaClient } from '@prisma/client';
import { padraoRespostaErro } from '../validations/turma.validators.js';



const prisma = new PrismaClient();

export const listarAlunosPorTurma = async (req, res) => {
  try {
    const { id: turmaId } = req.params;

    if (!turmaId) {
      return padraoRespostaErro(res, "Parâmetro turmaId é obrigatório", 400);
    }

    // Verifica se a turma existe
    const turma = await prisma.turma.findUnique({
      where: { id: turmaId }
    });

    if (!turma) {
      return padraoRespostaErro(res, "Turma não encontrada", 404);
    }

    const alunos = await prisma.aluno_Turma.findMany({
      where: { id_turma: turmaId },
      include: {
        aluno: {
          select: {
            id: true,
            nome: true,
            tipo: true,
            imagem_perfil_url: true,
            ativo: true
          }
        }
      },
      orderBy: {
        aluno: { nome: 'asc' }
      }
    });

    const alunosFormatados = alunos.map(a => ({
      id: a.aluno.id,
      nome: a.aluno.nome,
      tipo: a.aluno.tipo,
      imagem_perfil_url: a.aluno.imagem_perfil_url,
      ativo: a.aluno.ativo
    }));

    return res.json({
      turmaId,
      quantidade: alunosFormatados.length,
      alunos: alunosFormatados
    });

  } catch (err) {
    console.error("Erro listarAlunosPorTurma:", err);
    return padraoRespostaErro(res, "Erro ao listar alunos da turma", 500);
  }
};


export const listarTurmas = async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const where = {};
    if (q) where.nome_turma = { contains: q, mode: 'insensitive' };

    const turmas = await prisma.turma.findMany({
      where,
      select: {
        id: true,
        nome_turma: true,
        faixa_etaria_min: true,
        faixa_etaria_max: true,
        imagem_turma_url: true,

        responsaveis: {
          select: { usuario: { select: { nome: true } } }
        },

        professor: { select: { id: true, nome: true, tipo: true } },
        coordenador: { select: { id: true, nome: true, tipo: true } },

        aluno_turmas: { select: { id_aluno: true } }
      },
      skip,
      take: Number(limit),
      orderBy: [{ nome_turma: 'asc' }]
    });

    const turmasFormatadas = await Promise.all(
      turmas.map(async (t) => {
        const distinctAulas = await prisma.frequencia.findMany({
          where: { id_turma: t.id },
          distinct: ['data_aula'],
          select: { data_aula: true }
        });

        const totalAulas = distinctAulas.length;

        return {
          id: t.id, // UUID REAL! ✔
          nome_turma: t.nome_turma,
          imagem_turma_url: t.imagem_turma_url,
          faixa_etaria_min: t.faixa_etaria_min,
          faixa_etaria_max: t.faixa_etaria_max,
          totalAulasVistas: totalAulas,
          responsaveis: t.responsaveis.map((r) => r.usuario.nome),
          professor: t.professor,
          coordenador: t.coordenador,
          quantidadeAlunos: t.aluno_turmas.length
        };
      })
    );

    const total = await prisma.turma.count({ where });

    return res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      turmas: turmasFormatadas
    });

  } catch (err) {
    console.error('Erro listarTurmas:', err);
    return res.status(500).json({ mensagem: 'Erro ao listar turmas' });
  }
};

export const usuariosParaFiltro = async (req, res) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: { tipo: { in: ['PROFESSOR', 'COORDENADOR', "ALUNO_PROFESSOR"] }, ativo: true },
      select: { id: true, nome: true, tipo: true, imagem_perfil_url: true },
      orderBy: { nome: 'asc' }
    });

    return res.json({ usuarios });

  } catch (err) {
    console.error('Erro usuariosParaFiltro:', err);
    return res.status(500).json({ mensagem: 'Erro ao obter usuários' });
  }
};

export const criarTurma = async (req, res) => {
  try {
    if (!["COORDENADOR", "ADMIN"].includes(req.user.tipo))
      return padraoRespostaErro(res, "Sem permissão", 403);

    const {
      nome,
      responsavelId,
      faixaEtariaMin,
      faixaEtariaMax,
      fotoTurmaUrl
    } = req.body;

    if (!nome || !responsavelId || faixaEtariaMin == null || faixaEtariaMax == null)
      return padraoRespostaErro(res, "Campos obrigatórios faltando", 400);

    const nomeDuplicado = await prisma.turma.findFirst({
      where: { nome_turma: nome }
    });

    if (nomeDuplicado) {
      return padraoRespostaErro(res, "Já existe uma turma com esse nome", 400);
    }

    const resp = await prisma.usuario.findUnique({
      where: { id: responsavelId }
    });

    if (!resp)
      return padraoRespostaErro(res, "Responsável não encontrado", 404);

    if (!["PROFESSOR", "COORDENADOR"].includes(resp.tipo))
      return padraoRespostaErro(res, "Responsável deve ser PROFESSOR ou COORDENADOR", 400);

    const turma = await prisma.turma.create({
      data: {
        nome_turma: nome,
        faixa_etaria_min: Number(faixaEtariaMin),
        faixa_etaria_max: Number(faixaEtariaMax),
        data_criacao: new Date(),
        imagem_turma_url: fotoTurmaUrl ?? null,
        total_aulas: null,
        id_coordenador: req.user.tipo === "COORDENADOR" ? req.user.id : null,
        ativo: true
      }
    });

    await prisma.turmaResponsavel.create({
      data: {
        turmaId: turma.id,
        usuarioId: resp.id
      }
    });

    return res.status(201).json({
      mensagem: "Turma criada com sucesso",
      turma
    });

  } catch (err) {
    console.error("Erro criarTurma:", err);
    return padraoRespostaErro(res, "Erro ao criar turma", 500);
  }
};

export const editarTurma = async (req, res) => {
  try {
    if (!['COORDENADOR', 'ADMIN'].includes(req.user.tipo)) {
      return padraoRespostaErro(res, 'Sem permissão', 403);
    }

    const { id } = req.params;
    const body = req.body;

    const turmaExiste = await prisma.turma.findUnique({
      where: { id },
    });

    if (!turmaExiste) {
      return padraoRespostaErro(res, 'Turma não encontrada', 404);
    }

    // Sem ": any" no JS
    const updateData = {};

    if (body.nome) updateData.nome_turma = body.nome;
    if (body.faixaEtariaMin != null) updateData.faixa_etaria_min = Number(body.faixaEtariaMin);
    if (body.faixaEtariaMax != null) updateData.faixa_etaria_max = Number(body.faixaEtariaMax);
    if ('imagemTurmaUrl' in body) updateData.imagem_turma_url = body.imagemTurmaUrl;

    const turmaAtualizada = await prisma.turma.update({
      where: { id },
      data: updateData,
      include: {
        professor: true,
        coordenador: true,
        responsaveis: { include: { usuario: true } },
      },
    });

    if (body.responsavelId !== undefined) {
      await prisma.turmaResponsavel.deleteMany({ where: { turmaId: id } });

      if (body.responsavelId !== null) {
        await prisma.turmaResponsavel.create({
          data: {
            turmaId: id,
            usuarioId: body.responsavelId,
          },
        });
      }
    }

    return res.json({
      mensagem: 'Turma atualizada',
      turma: turmaAtualizada,
    });

  } catch (err) {
    console.error('Erro editarTurma:', err);
    return padraoRespostaErro(res, 'Erro ao editar turma', 500);
  }
};


export const removerTurma = async (req, res) => {
  try {
    if (!['COORDENADOR', 'ADMIN'].includes(req.user.tipo))
      return padraoRespostaErro(res, 'Sem permissão', 403);

    const { id } = req.params;

    const turma = await prisma.turma.findUnique({ where: { id } });
    if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    await prisma.aluno_Turma.deleteMany({ where: { id_turma: id } });
    await prisma.frequencia.deleteMany({ where: { id_turma: id } });
    await prisma.turmaResponsavel.deleteMany({ where: { turmaId: id } });
    await prisma.turma.delete({ where: { id } });

    return res.json({ mensagem: 'Turma removida com sucesso' });

  } catch (err) {
    console.error('Erro removerTurma:', err);
    return padraoRespostaErro(res, 'Erro ao remover turma', 500);
  }
};

// Função para validar UUID
const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

export const enturmarAluno = async (req, res) => {
  try {
    const { id: turmaId } = req.params;
    const { usuarioId } = req.body;

    if (!turmaId || !usuarioId) {
      return padraoRespostaErro(res, 'Parâmetros turmaId e usuarioId são obrigatórios', 400);
    }

    //Valida UUID
    if (!isUuid(turmaId) || !isUuid(usuarioId)) {
      return padraoRespostaErro(res, 'turmaId ou usuarioId inválidos', 400);
    }

    const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
    if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    const aluno = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!aluno) {
      return padraoRespostaErro(res, 'Aluno não encontrado', 404);
    }
    if (!['ALUNO', 'ALUNO_PROFESSOR'].includes(aluno.tipo)) {
      return padraoRespostaErro(res, 'Usuário não é do tipo ALUNO', 400);
    }

    const matriculaExistente = await prisma.aluno_Turma.findUnique({
      where: { id_aluno_id_turma: { id_aluno: usuarioId, id_turma: turmaId } },
    });
    if (matriculaExistente) {
      return padraoRespostaErro(res, 'Aluno já está matriculado nessa turma', 400);
    }

    const novaMatricula = await prisma.aluno_Turma.create({
      data: {
        id_aluno: usuarioId,
        id_turma: turmaId,
      },
    });

    return res.json({
      mensagem: 'Aluno matriculado com sucesso',
      matricula: novaMatricula,
    });

  } catch (err) {
    console.error('Erro enturmarAluno:', err);
    return padraoRespostaErro(res, 'Erro ao matricular aluno', 500);
  }
};


export const desenturmarAluno = async (req, res) => {
  try {
    const { id: turmaId, usuarioId } = req.params; // <- pega da URL

    // Verifica permissão
    if (!['COORDENADOR', 'ADMIN'].includes(req.user.tipo)) {
      return padraoRespostaErro(res, 'Sem permissão', 403);
    }

    // Verifica se a turma existe
    const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
    if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    // Verifica se a matrícula existe
    const matricula = await prisma.aluno_Turma.findUnique({
      where: { id_aluno_id_turma: { id_aluno: usuarioId, id_turma: turmaId } },
    });

    if (!matricula) {
      return padraoRespostaErro(res, 'Aluno não matriculado nessa turma', 404);
    }

    // Remove a matrícula
    await prisma.aluno_Turma.delete({
      where: { id_aluno_id_turma: { id_aluno: usuarioId, id_turma: turmaId } },
    });

    return res.json({ mensagem: 'Aluno removido da turma com sucesso' });

  } catch (err) {
    console.error('Erro desenturmarAluno:', err);
    return padraoRespostaErro(res, 'Erro ao desenturmar', 500);
  }
};

export const registrarFrequencia = async (req, res) => {
  try {
    const usuarioLogado = req.user;

    // Tipos de usuário permitidos
    const permitidos = ["PROFESSOR", "COORDENADOR", "ALUNO_PROFESSOR", "ADMIN"];
    if (!permitidos.includes(usuarioLogado.tipo)) {
      return padraoRespostaErro(res, "Sem permissão", 403);
    }

    const { id: turmaId } = req.params;
    const { data, horario, frequencias } = req.body;

    if (!turmaId || !data || !horario || !Array.isArray(frequencias)) {
      return padraoRespostaErro(
        res,
        "Payload inválido (data, horário e frequências são obrigatórios)",
        400
      );
    }

    // Buscar turma
    const turma = await prisma.turma.findUnique({ where: { id: turmaId } });
    if (!turma) return padraoRespostaErro(res, "Turma não encontrada", 404);

    // Validar professor/aluno-professor
    if (
      ["PROFESSOR", "ALUNO_PROFESSOR"].includes(usuarioLogado.tipo) &&
      turma.id_professor !== usuarioLogado.id
    ) {
      return padraoRespostaErro(res, "Não autorizado para registrar nesta turma", 403);
    }

    const dataAula = new Date(data);

    // Buscar registros existentes dessa aula
    const existentes = await prisma.frequencia.findMany({
      where: { id_turma: turmaId, data_aula: dataAula, horario_aula: horario }
    });
    const mapExistentes = new Map(existentes.map(e => [e.id_aluno, e]));

    // Buscar todos os alunos matriculados na turma
    const alunosTurma = await prisma.aluno_Turma.findMany({
      where: { id_turma: turmaId },
      select: { id_aluno: true }
    });
    const alunosValidos = new Set(alunosTurma.map(a => a.id_aluno));

    if (alunosValidos.size === 0) {
      return padraoRespostaErro(res, "Nenhum aluno matriculado na turma", 400);
    }

    const novos = [];
    const updates = [];

    for (const f of frequencias) {
      if (!f.alunoId || typeof f.presente !== "boolean") {
        return padraoRespostaErro(res, "Formato de frequência inválido", 400);
      }

      // Validar se o aluno pertence à turma
      if (!alunosValidos.has(f.alunoId)) {
        return padraoRespostaErro(
          res,
          `Aluno com ID ${f.alunoId} não está matriculado nesta turma`,
          400
        );
      }

      const jaExiste = mapExistentes.get(f.alunoId);

      if (jaExiste) {
        updates.push({
          where: { id: jaExiste.id },
          data: { presente: f.presente, id_registrador: usuarioLogado.id }
        });
      } else {
        novos.push({
          id_turma: turmaId,
          id_aluno: f.alunoId,
          id_registrador: usuarioLogado.id,
          presente: f.presente,
          data_aula: dataAula,
          horario_aula: horario
        });
      }
    }

    // Criar novos registros
    if (novos.length > 0) {
      await prisma.frequencia.createMany({ data: novos });
    }

    // Atualizar existentes
    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map(u => prisma.frequencia.update({ where: u.where, data: u.data }))
      );
    }

    return res.status(201).json({ mensagem: "Frequência registrada com sucesso" });

  } catch (err) {
    console.error("Erro registrarFrequencia:", err);
    return padraoRespostaErro(res, "Erro ao registrar frequência", 500);
  }
};




export const rankingFrequencia = async (req, res) => {
  try {
    const usuarioLogado = req.user;

    const permitidos = ["PROFESSOR", "COORDENADOR", "ALUNO_PROFESSOR", "ADMIN"];
    if (!permitidos.includes(usuarioLogado.tipo)) {
      return padraoRespostaErro(res, "Sem permissão", 403);
    }

    const { turmaId } = req.params;
    if (!turmaId) return padraoRespostaErro(res, "turmaId é obrigatório", 400);

    // Verifica se a turma existe
    const turma = await prisma.turma.findUnique({
      where: { id: turmaId },
      include: { aluno_turmas: { include: { aluno: true } } }
    });

    if (!turma) return padraoRespostaErro(res, "Turma não encontrada", 404);

    // Busca todas as frequências da turma
    const frequencias = await prisma.frequencia.findMany({
      where: { id_turma: turmaId }
    });

    // Prepara mapa para acumular
    const mapa = new Map();

    for (const at of turma.aluno_turmas) {
      mapa.set(at.id_aluno, {
        alunoId: at.id_aluno,
        nome: at.aluno?.nome ?? null,
        total: 0,
        presencas: 0
      });
    }

    // Computa presença e total
    for (const f of frequencias) {
      if (mapa.has(f.id_aluno)) {
        const obj = mapa.get(f.id_aluno);
        obj.total++;
        if (f.presente) obj.presencas++;
      }
    }

    // Transforma ranking
    const ranking = Array.from(mapa.values())
      .map((a) => ({
        ...a,
        percentual:
          a.total === 0 ? 0 : Number(((a.presencas / a.total) * 100).toFixed(2))
      }))
      .sort((a, b) => b.percentual - a.percentual);

    // <-- aqui: responder diretamente sem usar padraoSucesso (que não existe)
    return res.status(200).json({
      dados: ranking,
      total: ranking.length,
      turmaId
    });

  } catch (err) {
    console.error("Erro rankingFrequencia:", err);
    return padraoRespostaErro(res, "Erro ao gerar ranking", 500);
  }
};



export const consultarFrequencias = async (req, res) => {
  try {
    const usuarioLogado = req.user;

    const permitidos = ["PROFESSOR", "COORDENADOR", "ALUNO_PROFESSOR", "ADMIN"];
    if (!permitidos.includes(usuarioLogado.tipo)) {
      return res.status(403).json({ erro: 'Sem permissão' });
    }

    const { turmaId, page = 1, limit = 50 } = req.query;
    if (!turmaId) {
      return res.status(400).json({ erro: 'Parâmetro turmaId é obrigatório' });
    }

    const pageNumber = Number(page);
    const pageLimit = Number(limit);
    const skip = (pageNumber - 1) * pageLimit;

    const frequencias = await prisma.frequencia.findMany({
      where: { id_turma: turmaId },
      skip,
      take: pageLimit,
      orderBy: { data_aula: 'desc' },
      include: {
        aluno: true,
        turma: true,
        registrador: true
      }
    });

    const total = await prisma.frequencia.count({
      where: { id_turma: turmaId }
    });

    return res.json({
      dados: frequencias,
      total,
      page: pageNumber,
      limit: pageLimit
    });

  } catch (error) {
    console.error('Erro consultarFrequencias:', error);
    return res.status(500).json({ erro: 'Erro ao consultar frequências' });
  }
};



export default {
  listarTurmas,
  usuariosParaFiltro,
  criarTurma,
  editarTurma,
  removerTurma,
  enturmarAluno,
  desenturmarAluno,
  registrarFrequencia,
  consultarFrequencias,
  listarAlunosPorTurma 
};
