/*
  Warnings:

  - A unique constraint covering the columns `[publicId]` on the table `Usuario` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "publicId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_publicId_key" ON "Usuario"("publicId");
