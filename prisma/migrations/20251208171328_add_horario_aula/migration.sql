/*
  Warnings:

  - Added the required column `horario_aula` to the `Frequencia` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Frequencia" ADD COLUMN     "horario_aula" TEXT NOT NULL;
