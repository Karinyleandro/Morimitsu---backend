/*
  Warnings:

  - The primary key for the `Aluno` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Aluno_Turma` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Frequencia` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Graduacao` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Log_Acao` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `PasswordResetToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Requisito_Grau` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Responsavel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `RevokedToken` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Turma` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `TurmaResponsavel` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Usuario` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `publicId` on the `Usuario` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Aluno" DROP CONSTRAINT "Aluno_usuarioId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Aluno_Turma" DROP CONSTRAINT "Aluno_Turma_id_aluno_fkey";

-- DropForeignKey
ALTER TABLE "public"."Aluno_Turma" DROP CONSTRAINT "Aluno_Turma_id_turma_fkey";

-- DropForeignKey
ALTER TABLE "public"."Frequencia" DROP CONSTRAINT "Frequencia_id_aluno_fkey";

-- DropForeignKey
ALTER TABLE "public"."Frequencia" DROP CONSTRAINT "Frequencia_id_registrador_fkey";

-- DropForeignKey
ALTER TABLE "public"."Frequencia" DROP CONSTRAINT "Frequencia_id_turma_fkey";

-- DropForeignKey
ALTER TABLE "public"."Graduacao" DROP CONSTRAINT "Graduacao_alunoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Log_Acao" DROP CONSTRAINT "Log_Acao_usuario_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Responsavel" DROP CONSTRAINT "Responsavel_alunoId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Turma" DROP CONSTRAINT "Turma_id_coordenador_fkey";

-- DropForeignKey
ALTER TABLE "public"."Turma" DROP CONSTRAINT "Turma_id_professor_fkey";

-- DropForeignKey
ALTER TABLE "public"."TurmaResponsavel" DROP CONSTRAINT "TurmaResponsavel_turmaId_fkey";

-- DropForeignKey
ALTER TABLE "public"."TurmaResponsavel" DROP CONSTRAINT "TurmaResponsavel_usuarioId_fkey";

-- DropIndex
DROP INDEX "public"."Usuario_publicId_key";

-- AlterTable
ALTER TABLE "Aluno" DROP CONSTRAINT "Aluno_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "usuarioId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Aluno_id_seq";

-- AlterTable
ALTER TABLE "Aluno_Turma" DROP CONSTRAINT "Aluno_Turma_pkey",
ALTER COLUMN "id_aluno" SET DATA TYPE TEXT,
ALTER COLUMN "id_turma" SET DATA TYPE TEXT,
ADD CONSTRAINT "Aluno_Turma_pkey" PRIMARY KEY ("id_aluno", "id_turma");

-- AlterTable
ALTER TABLE "Frequencia" DROP CONSTRAINT "Frequencia_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_turma" SET DATA TYPE TEXT,
ALTER COLUMN "id_aluno" SET DATA TYPE TEXT,
ALTER COLUMN "id_registrador" SET DATA TYPE TEXT,
ADD CONSTRAINT "Frequencia_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Frequencia_id_seq";

-- AlterTable
ALTER TABLE "Graduacao" DROP CONSTRAINT "Graduacao_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "alunoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Graduacao_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Graduacao_id_seq";

-- AlterTable
ALTER TABLE "Log_Acao" DROP CONSTRAINT "Log_Acao_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "usuario_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Log_Acao_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Log_Acao_id_seq";

-- AlterTable
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "userId" SET DATA TYPE TEXT,
ADD CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "PasswordResetToken_id_seq";

-- AlterTable
ALTER TABLE "Requisito_Grau" DROP CONSTRAINT "Requisito_Grau_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Requisito_Grau_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Requisito_Grau_id_seq";

-- AlterTable
ALTER TABLE "Responsavel" DROP CONSTRAINT "Responsavel_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "alunoId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Responsavel_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Responsavel_id_seq";

-- AlterTable
ALTER TABLE "RevokedToken" DROP CONSTRAINT "RevokedToken_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "RevokedToken_id_seq";

-- AlterTable
ALTER TABLE "Turma" DROP CONSTRAINT "Turma_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "id_professor" SET DATA TYPE TEXT,
ALTER COLUMN "id_coordenador" SET DATA TYPE TEXT,
ADD CONSTRAINT "Turma_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Turma_id_seq";

-- AlterTable
ALTER TABLE "TurmaResponsavel" DROP CONSTRAINT "TurmaResponsavel_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "turmaId" SET DATA TYPE TEXT,
ALTER COLUMN "usuarioId" SET DATA TYPE TEXT,
ADD CONSTRAINT "TurmaResponsavel_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "TurmaResponsavel_id_seq";

-- AlterTable
ALTER TABLE "Usuario" DROP CONSTRAINT "Usuario_pkey",
DROP COLUMN "publicId",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Usuario_id_seq";

-- AddForeignKey
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Responsavel" ADD CONSTRAINT "Responsavel_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_id_coordenador_fkey" FOREIGN KEY ("id_coordenador") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_id_professor_fkey" FOREIGN KEY ("id_professor") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurmaResponsavel" ADD CONSTRAINT "TurmaResponsavel_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurmaResponsavel" ADD CONSTRAINT "TurmaResponsavel_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluno_Turma" ADD CONSTRAINT "Aluno_Turma_id_aluno_fkey" FOREIGN KEY ("id_aluno") REFERENCES "Aluno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluno_Turma" ADD CONSTRAINT "Aluno_Turma_id_turma_fkey" FOREIGN KEY ("id_turma") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frequencia" ADD CONSTRAINT "Frequencia_id_registrador_fkey" FOREIGN KEY ("id_registrador") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frequencia" ADD CONSTRAINT "Frequencia_id_turma_fkey" FOREIGN KEY ("id_turma") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frequencia" ADD CONSTRAINT "Frequencia_id_aluno_fkey" FOREIGN KEY ("id_aluno") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Graduacao" ADD CONSTRAINT "Graduacao_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log_Acao" ADD CONSTRAINT "Log_Acao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
