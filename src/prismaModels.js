// src/prismaModels.js
import prisma from "./prisma.js";

export const Models = {
  Frequencia: prisma.frequencia,
  AlunoTurma: prisma.alunoTurma,
  Turma: prisma.turma,
  Usuario: prisma.usuario,
};
