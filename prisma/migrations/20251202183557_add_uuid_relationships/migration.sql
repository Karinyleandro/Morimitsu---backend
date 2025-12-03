-- CreateEnum
CREATE TYPE "TipoAluno" AS ENUM ('COMUM', 'ALUNO_PROFESSOR');

-- AlterTable
ALTER TABLE "Aluno" ADD COLUMN     "tipo" "TipoAluno" NOT NULL DEFAULT 'COMUM';

-- CreateIndex
CREATE INDEX "Aluno_usuarioId_idx" ON "Aluno"("usuarioId");
