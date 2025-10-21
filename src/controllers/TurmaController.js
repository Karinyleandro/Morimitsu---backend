import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { padraoRespostaErro } from '../validations/turma.validators.js';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

async function hashId(id) {
  return await bcrypt.hash(id.toString(), SALT_ROUNDS);
}

async function encontrarTurmaPorHash(hash) {
  const turmas = await prisma.turma.findMany();
  for (const t of turmas) {
    if (await bcrypt.compare(t.id.toString(), hash)) return t;
  }
  return null;
}


const listarTurmas = async (req, res) => {
  try {
    const { faixaEtaria, nivelTecnico, q, page = 1, limit = 20 } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const where = {
      ...(faixaEtaria && {
        faixa_etaria_min: faixaEtaria === 'Infantil' ? 3 : faixaEtaria === 'Fundamental' ? 6 : undefined,
        faixa_etaria_max: faixaEtaria === 'Infantil' ? 5 : faixaEtaria === 'Fundamental' ? 10 : undefined,
      }),
      ...(q && { nome_turma: { contains: q, mode: 'insensitive' } }),
    };

    // Buscar turmas com include correto
    const turmas = await prisma.turma.findMany({
      where,
      include: {
        professor: { select: { id: true, nome: true, tipo_usuario: true } },
        coordenador: { select: { id: true, nome: true, tipo_usuario: true } },
        aluno_turmas: {
          include: {
            usuario: { select: { id: true, nome: true, grau: true } },
          },
        },
      },
      skip,
      take: Number(limit),
    });

    // Hash nos IDs das turmas
    const turmasFormatadas = await Promise.all(
      turmas.map(async t => ({ ...t, id: await hashId(t.id) }))
    );

    const total = await prisma.turma.count({ where });
    return res.json({ total, page: Number(page), limit: Number(limit), turmas: turmasFormatadas });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao listar turmas' });
  }
};

const criarTurma = async (req, res) => {
  try {
    if (!['COORDENADOR', 'ADMIN'].includes(req.user.tipo_usuario))
      return padraoRespostaErro(res, 'Apenas coordenador pode criar turma', 403);

    const { nome, faixaEtaria, totalAulas, professorResponsavel } = req.body;
    if (!nome || !faixaEtaria || totalAulas == null)
      return padraoRespostaErro(res, 'Campos obrigatórios faltando');

    let faixa_etaria_min, faixa_etaria_max;
    if (faixaEtaria === 'Infantil') {
      faixa_etaria_min = 3;
      faixa_etaria_max = 5;
    } else if (faixaEtaria === 'Fundamental') {
      faixa_etaria_min = 6;
      faixa_etaria_max = 10;
    } else return padraoRespostaErro(res, 'Faixa etária inválida', 400);

    let prof = null;
    if (professorResponsavel) {
      prof = await prisma.usuario.findUnique({ where: { id: Number(professorResponsavel) } });
      if (!prof) return padraoRespostaErro(res, 'Professor responsável não encontrado', 404);
    }

    const turma = await prisma.turma.create({
      data: {
        nome_turma: nome,
        faixa_etaria_min,
        faixa_etaria_max,
        total_aulas: Number(totalAulas),
        id_professor: prof ? prof.id : null,
        id_coordenador: req.user.id,
      },
    });

    const turmaFormatada = { ...turma, id: await hashId(turma.id) };
    return res.status(201).json({ mensagem: 'Turma criada com sucesso', turma: turmaFormatada });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao criar turma' });
  }
};

const editarTurma = async (req, res) => {
  try {
    if (!['COORDENADOR', 'ADMIN'].includes(req.user.tipo_usuario))
      return padraoRespostaErro(res, 'Apenas coordenador pode editar turma', 403);

    const { id: hashIdParam } = req.params;
    const turma = await encontrarTurmaPorHash(hashIdParam);
    if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    const atualizacoes = req.body;
    const dadosAtualizados = {};
    ['nome_turma', 'faixa_etaria_min', 'faixa_etaria_max', 'total_aulas', 'id_professor'].forEach(k => {
      if (atualizacoes[k] !== undefined) dadosAtualizados[k] = atualizacoes[k];
    });

    const turmaAtualizada = await prisma.turma.update({
      where: { id: turma.id },
      data: dadosAtualizados,
    });

    const turmaFormatada = { ...turmaAtualizada, id: await hashId(turmaAtualizada.id) };
    return res.json({ mensagem: 'Turma atualizada com sucesso', turma: turmaFormatada });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao editar turma' });
  }
};

const removerTurma = async (req, res) => {
  try {
    if (!['COORDENADOR', 'ADMIN'].includes(req.user.tipo_usuario))
      return res.status(403).json({ mensagem: 'Apenas coordenador pode remover turma' });

    const { id: hashIdParam } = req.params;
    const turma = await encontrarTurmaPorHash(hashIdParam);
    if (!turma) return res.status(404).json({ mensagem: 'Turma não encontrada' });

    // Deleta relacionamentos antes de remover a turma
    await prisma.aluno_Turma.deleteMany({ where: { id_turma: turma.id } });
    await prisma.frequencia.deleteMany({ where: { id_turma: turma.id } });

    // Deleta a turma de fato
    await prisma.turma.delete({ where: { id: turma.id } });

    return res.json({ mensagem: 'Turma deletada com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao deletar turma' });
  }
};


const adicionarAluno = async (req, res) => {
  try {
    if (!['COORDENADOR', 'ADMIN'].includes(req.user.tipo_usuario))
      return padraoRespostaErro(res, 'Apenas coordenador pode adicionar aluno a turma', 403);

    const { id: hashIdParam } = req.params;
    const { alunoId } = req.body;

    if (!alunoId) return padraoRespostaErro(res, 'AlunoId é obrigatório', 400);

    const turma = await encontrarTurmaPorHash(hashIdParam);
    if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    const aluno = await prisma.usuario.findUnique({ where: { id: Number(alunoId) } });
    if (!aluno) return padraoRespostaErro(res, 'Aluno não encontrado', 404);

    const jaExiste = await prisma.aluno_Turma.findFirst({
      where: { id_aluno: aluno.id, id_turma: turma.id },
    });
    if (jaExiste) return padraoRespostaErro(res, 'Aluno já vinculado a essa turma', 400);

    await prisma.aluno_Turma.create({ data: { id_aluno: aluno.id, id_turma: turma.id } });
    return res.json({ mensagem: 'Aluno adicionado à turma com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao adicionar aluno' });
  }
};

const removerAluno = async (req, res) => {
  try {
    if (!['COORDENADOR', 'ADMIN'].includes(req.user.tipo_usuario))
      return padraoRespostaErro(res, 'Apenas coordenador pode remover aluno da turma', 403);

    const { id: hashIdParam, alunoId } = req.params;

    const turma = await encontrarTurmaPorHash(hashIdParam);
    if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    const alunoTurma = await prisma.aluno_Turma.findFirst({
      where: { id_aluno: Number(alunoId), id_turma: turma.id },
    });
    if (!alunoTurma) return padraoRespostaErro(res, 'Relação aluno/turma não encontrada', 404);

    await prisma.aluno_Turma.delete({ where: { id: alunoTurma.id } });
    return res.json({ mensagem: 'Aluno removido da turma' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao remover aluno da turma' });
  }
};

const registrarFrequencia = async (req, res) => {
  try {
    if (!['COORDENADOR', 'PROFESSOR', 'ADMIN'].includes(req.user.tipo_usuario))
      return padraoRespostaErro(res, 'Apenas coordenador ou professor pode registrar frequência', 403);

    const { id: hashIdParam } = req.params;
    const { data, frequencias } = req.body;

    if (!data || !Array.isArray(frequencias) || frequencias.length === 0)
      return padraoRespostaErro(res, 'Payload inválido: data e frequencias são obrigatórios');

    const turma = await encontrarTurmaPorHash(hashIdParam);
    if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);

    const dataRef = new Date(data);
    if (isNaN(dataRef.getTime())) return padraoRespostaErro(res, 'Data inválida', 400);

    for (const f of frequencias) {
      if (!f.alunoId || typeof f.presente !== 'boolean') continue;

      const existente = await prisma.frequencia.findFirst({
        where: { id_turma: turma.id, id_aluno: f.alunoId, data: dataRef },
      });

      if (!existente) {
        await prisma.frequencia.create({
          data: {
            id_turma: turma.id,
            id_aluno: f.alunoId,
            presente: f.presente,
            data: dataRef,
            registrado_por: req.user.id,
          },
        });
      } else {
        await prisma.frequencia.update({
          where: { id: existente.id },
          data: { presente: f.presente, registrado_por: req.user.id },
        });
      }
    }

    return res.status(201).json({ mensagem: 'Frequências processadas com sucesso' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao registrar frequência' });
  }
};

const consultarFrequencias = async (req, res) => {
  try {
    if (!['COORDENADOR', 'PROFESSOR', 'ADMIN'].includes(req.user.tipo_usuario))
      return padraoRespostaErro(res, 'Apenas coordenador ou professor pode consultar frequência', 403);

    const { turmaId: hashTurmaId, alunoId, page = 1, limit = 50 } = req.query;
    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const where = {};
    if (hashTurmaId) {
      const turma = await encontrarTurmaPorHash(hashTurmaId);
      if (!turma) return padraoRespostaErro(res, 'Turma não encontrada', 404);
      where.id_turma = turma.id;
    }
    if (alunoId) where.id_aluno = Number(alunoId);

    const [total, registros] = await Promise.all([
      prisma.frequencia.count({ where }),
      prisma.frequencia.findMany({
        where,
        include: {
          aluno: { select: { id: true, nome: true } },
          turma: { select: { id: true, nome_turma: true } },
          registrado_por_usuario: { select: { id: true, nome: true } },
        },
        orderBy: { data: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);

    const registrosFormatados = await Promise.all(
      registros.map(async r => ({
        ...r,
        id_turma: await hashId(r.id_turma),
      }))
    );

    return res.json({ total, page: Number(page), limit: Number(limit), registros: registrosFormatados });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensagem: 'Erro ao consultar frequências' });
  }
};

export {
  listarTurmas,
  criarTurma,
  editarTurma,
  removerTurma,
  adicionarAluno,
  removerAluno,
  registrarFrequencia,
  consultarFrequencias,
};
