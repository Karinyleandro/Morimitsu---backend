/*
  Warnings:

  - The primary key for the `Faixa` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[ordem]` on the table `Faixa` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."Aluno" DROP CONSTRAINT "Aluno_id_faixa_fkey";

-- DropForeignKey
ALTER TABLE "public"."Graduacao" DROP CONSTRAINT "Graduacao_faixa_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Requisito_Grau" DROP CONSTRAINT "Requisito_Grau_faixa_id_fkey";

-- AlterTable
ALTER TABLE "Aluno" ALTER COLUMN "id_faixa" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Faixa" DROP CONSTRAINT "Faixa_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Faixa_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Faixa_id_seq";

-- AlterTable
ALTER TABLE "Graduacao" ALTER COLUMN "faixa_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Requisito_Grau" ALTER COLUMN "faixa_id" SET DATA TYPE TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Faixa_ordem_key" ON "Faixa"("ordem");

-- AddForeignKey
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_id_faixa_fkey" FOREIGN KEY ("id_faixa") REFERENCES "Faixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisito_Grau" ADD CONSTRAINT "Requisito_Grau_faixa_id_fkey" FOREIGN KEY ("faixa_id") REFERENCES "Faixa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Graduacao" ADD CONSTRAINT "Graduacao_faixa_id_fkey" FOREIGN KEY ("faixa_id") REFERENCES "Faixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
