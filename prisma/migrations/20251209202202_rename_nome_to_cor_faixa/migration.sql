/*
  Warnings:

  - You are about to drop the column `nome` on the `Faixa` table. All the data in the column will be lost.
  - Added the required column `corFaixa` to the `Faixa` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Faixa" DROP COLUMN "nome",
ADD COLUMN     "corFaixa" TEXT NOT NULL;
