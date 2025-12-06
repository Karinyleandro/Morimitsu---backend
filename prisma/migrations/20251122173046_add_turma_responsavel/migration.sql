-- CreateTable
CREATE TABLE "TurmaResponsavel" (
    "id" SERIAL NOT NULL,
    "turmaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurmaResponsavel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TurmaResponsavel_turmaId_usuarioId_key" ON "TurmaResponsavel"("turmaId", "usuarioId");

-- AddForeignKey
ALTER TABLE "TurmaResponsavel" ADD CONSTRAINT "TurmaResponsavel_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurmaResponsavel" ADD CONSTRAINT "TurmaResponsavel_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
