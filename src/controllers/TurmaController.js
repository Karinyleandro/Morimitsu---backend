import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { padraoRespostaErro } from '../validations/turma.validators.js';
import { v4 as uuid } from "uuid";


const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function hashId(id) {
  return bcrypt.hash(id.toString(), SALT_ROUNDS);
}

async function encontrarTurmaPorHash(hash) {
  const turmas = await prisma.turma.findMany({ select: { id: true } });
  for (const t of turmas) {
    if (await bcrypt.compare(t.id.toString(), hash)) return t;
  }
  return null;
}

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
        // Contar datas de aula distintas
        const distinctAulas = await prisma.frequencia.findMany({
          where: { id_turma: t.id },
          distinct: ['data_aula'],
          select: { data_aula: true }
        });
        const totalAulas = distinctAulas.length;

        return {
          id: await hashId(t.id),
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
    // Verifica permissão
    if (!["COORDENADOR", "ADMIN"].includes(req.user.tipo))
      return padraoRespostaErro(res, "Sem permissão", 403);

    // Extrai dados do body
    const {
      nome,
      responsavelId,
      faixaEtariaMin,
      faixaEtariaMax,
      fotoTurmaUrl
    } = req.body;

    // Valida campos obrigatórios
    if (!nome || !responsavelId || faixaEtariaMin == null || faixaEtariaMax == null)
      return padraoRespostaErro(res, "Campos obrigatórios faltando", 400);

    // Verifica se o responsável existe
    const resp = await prisma.usuario.findUnique({
      where: { id: responsavelId }
    });

    if (!resp)
      return padraoRespostaErro(res, "Responsável não encontrado", 404);

    // Verifica se o tipo do responsável é válido
    if (!["PROFESSOR", "COORDENADOR"].includes(resp.tipo))
      return padraoRespostaErro(res, "Responsável deve ser PROFESSOR ou COORDENADOR", 400);

    // Cria a turma
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

    // Associa o responsável à turma
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
    if (!['COORDENADOR', 'ADMIN'].includes(req.user.tipo))
      return padraoRespostaErro(res, 'Sem permissão', 403);

    const { id: hashTurma } = req.params;
    const turmaObj = await encontrarTurmaPorHash(hashTurma);
    if (!turmaObj) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    const id = turmaObj.id;
    const updateData = {};
    const body = req.body;

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
        responsaveis: { include: { usuario: true } }
      }
    });

    if (body.responsavelId !== undefined) {
      await prisma.turmaResponsavel.deleteMany({ where: { turmaId: id } });

      if (body.responsavelId !== null) {
        await prisma.turmaResponsavel.create({
          data: { turmaId: id, usuarioId: Number(body.responsavelId) }
        });
      }
    }

    return res.json({
      mensagem: 'Turma atualizada',
      turma: { ...turmaAtualizada, id: await hashId(id) }
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

    const { id: hashTurma } = req.params;
    const turmaObj = await encontrarTurmaPorHash(hashTurma);
    if (!turmaObj) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    const id = turmaObj.id;

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

export const enturmarAluno = async (req, res) => {
  try {
    const { id: hashTurma } = req.params;
    const { alunoId } = req.body;

    if (!['COORDENADOR', 'ADMIN'].includes(req.user.tipo))
      return padraoRespostaErro(res, 'Sem permissão', 403);

    if (!alunoId) return padraoRespostaErro(res, 'alunoId obrigatório', 400);

    const turma = await encontrarTurmaPorHash(hashTurma);
    if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    const aluno = await prisma.aluno.findUnique({ where: { id: Number(alunoId) } });
    if (!aluno) return padraoRespostaErro(res, 'Aluno não encontrado', 404);

    const jaExiste = await prisma.aluno_Turma.findFirst({
      where: { id_aluno: aluno.id, id_turma: turma.id }
    });

    if (jaExiste) return padraoRespostaErro(res, 'Aluno já está na turma', 400);

    await prisma.aluno_Turma.create({
      data: { id_aluno: aluno.id, id_turma: turma.id }
    });

    return res.json({ mensagem: 'Aluno adicionado' });
  } catch (err) {
    console.error('Erro enturmarAluno:', err);
    return padraoRespostaErro(res, 'Erro ao enturmar', 500);
  }
};

export const desenturmarAluno = async (req, res) => {
  try {
    const { id: hashTurma, alunoId } = req.params;

    if (!['COORDENADOR', 'ADMIN'].includes(req.user.tipo))
      return padraoRespostaErro(res, 'Sem permissão', 403);

    const turma = await encontrarTurmaPorHash(hashTurma);
    if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    await prisma.aluno_Turma.delete({
      where: {
        id_aluno_id_turma: {
          id_aluno: Number(alunoId),
          id_turma: turma.id
        }
      }
    });

    return res.json({ mensagem: 'Aluno removido' });
  } catch (err) {
    console.error('Erro desenturmarAluno:', err);
    return padraoRespostaErro(res, 'Erro ao desenturmar', 500);
  }
};

export const registrarFrequencia = async (req, res) => {
  try {
    const usuarioLogado = req.user;

    // Permissão
    if (!['PROFESSOR', 'COORDENADOR', 'ALUNO_PROFESSOR', 'ADMIN'].includes(usuarioLogado.tipo)) {
      return padraoRespostaErro(res, 'Sem permissão', 403);
    }

    // Agora é UUID real
    const { id: turmaId } = req.params;
    const { data, frequencias } = req.body;

    if (!turmaId || !data || !Array.isArray(frequencias)) {
      return padraoRespostaErro(res, 'Payload inválido', 400);
    }

    // Busca a turma diretamente por UUID
    const turma = await prisma.turma.findUnique({
      where: { id: turmaId }
    });

    if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    // Verificação de permissão
    if (
      ['PROFESSOR', 'ALUNO_PROFESSOR'].includes(usuarioLogado.tipo) &&
      turma.id_professor !== usuarioLogado.id
    ) {
      return padraoRespostaErro(res, 'Não autorizado para registrar nesta turma', 403);
    }

    const dataAula = new Date(data);

    // Loop de frequências
    for (const f of frequencias) {
      if (!f.alunoId || typeof f.presente !== 'boolean') continue;

      const existente = await prisma.frequencia.findFirst({
        where: {
          id_turma: turma.id,
          id_aluno: f.alunoId,
          data_aula: dataAula
        }
      });

      if (existente) {
        await prisma.frequencia.update({
          where: { id: existente.id },
          data: {
            presente: f.presente,
            id_registrador: usuarioLogado.id
          }
        });
      } else {
        await prisma.frequencia.create({
          data: {
            id_turma: turma.id,
            id_aluno: f.alunoId,
            id_registrador: usuarioLogado.id,
            presente: f.presente,
            data_aula: dataAula
          }
        });
      }
    }

    return res.status(201).json({ mensagem: 'Frequência registrada com sucesso' });
  } catch (err) {
    console.error('Erro registrarFrequencia:', err);
    return padraoRespostaErro(res, 'Erro ao registrar frequência', 500);
  }
};

export const consultarFrequencias = async (req, res) => {
  try {
    const { turmaId, page = 1, limit = 50 } = req.query;
    const usuarioLogado = req.user;

    if (!['PROFESSOR', 'COORDENADOR', 'ALUNO_PROFESSOR', 'ADMIN'].includes(usuarioLogado.tipo)) {
      return padraoRespostaErro(res, 'Sem permissão', 403);
    }

    if (!turmaId) return padraoRespostaErro(res, 'turmaId obrigatório', 400);

    const turma = await prisma.turma.findUnique({
      where: { id: turmaId }
    });

    if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    if (
      ['PROFESSOR', 'ALUNO_PROFESSOR'].includes(usuarioLogado.tipo) &&
      turma.id_professor !== usuarioLogado.id
    ) {
      return padraoRespostaErro(res, 'Não autorizado para esta turma', 403);
    }

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [total, registros] = await Promise.all([
      prisma.frequencia.count({ where: { id_turma: turma.id } }),

      prisma.frequencia.findMany({
        where: { id_turma: turma.id },
        include: {
          aluno: { select: { id: true, nome: true, num_matricula: true, aulas: true } },
          turma: { select: { id: true, nome_turma: true, total_aulas: true } },
          registrador: { select: { id: true, nome: true, tipo: true } }
        },
        orderBy: { data_aula: 'desc' },
        skip,
        take: Number(limit)
      })
    ]);

    return res.json({
      total,
      page: Number(page),
      limit: Number(limit),
      registros
    });

  } catch (err) {
    console.error('Erro consultarFrequencias:', err);
    return padraoRespostaErro(res, 'Erro ao consultar frequências', 500);
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
  consultarFrequencias
};
