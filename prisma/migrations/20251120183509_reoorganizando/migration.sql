-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('M', 'F', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('ADMIN', 'PROFESSOR', 'COORDENADOR');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_social" TEXT,
    "cpf" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "telefone" TEXT,
    "endereco" TEXT,
    "genero" "Genero",
    "imagem_perfil_url" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "tipo" "TipoUsuario",
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aluno" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "nome_social" TEXT,
    "cpf" TEXT,
    "dataNascimento" TIMESTAMP(3),
    "telefone" TEXT,
    "endereco" TEXT,
    "genero" "Genero",
    "imagem_perfil_url" TEXT,
    "num_matricula" TEXT,
    "id_faixa" INTEGER,
    "grau" INTEGER,
    "usuarioId" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Aluno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responsavel" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "grau_parentesco" TEXT NOT NULL,
    "email" TEXT,
    "alunoId" INTEGER NOT NULL,

    CONSTRAINT "Responsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faixa" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "imagem_faixa_url" TEXT,

    CONSTRAINT "Faixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisito_Grau" (
    "id" SERIAL NOT NULL,
    "faixa_id" INTEGER NOT NULL,
    "grau" INTEGER NOT NULL,
    "requisito_aulas" INTEGER NOT NULL,
    "tempo_minimo_dias" INTEGER NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Requisito_Grau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turma" (
    "id" SERIAL NOT NULL,
    "nome_turma" TEXT NOT NULL,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "faixa_etaria_min" INTEGER NOT NULL,
    "faixa_etaria_max" INTEGER NOT NULL,
    "total_aulas" INTEGER NOT NULL,
    "id_professor" INTEGER,
    "id_coordenador" INTEGER,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aluno_Turma" (
    "id_aluno" INTEGER NOT NULL,
    "id_turma" INTEGER NOT NULL,
    "frequencia_acumulada" DOUBLE PRECISION DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Aluno_Turma_pkey" PRIMARY KEY ("id_aluno","id_turma")
);

-- CreateTable
CREATE TABLE "Frequencia" (
    "id" SERIAL NOT NULL,
    "id_turma" INTEGER NOT NULL,
    "id_aluno" INTEGER NOT NULL,
    "id_registrador" INTEGER NOT NULL,
    "data_aula" TIMESTAMP(3) NOT NULL,
    "presente" BOOLEAN NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Frequencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Graduacao" (
    "id" SERIAL NOT NULL,
    "alunoId" INTEGER NOT NULL,
    "faixa_id" INTEGER NOT NULL,
    "grau" INTEGER NOT NULL,
    "data_graduacao" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "Graduacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" SERIAL NOT NULL,
    "token" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevokedToken" (
    "id" SERIAL NOT NULL,
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log_Acao" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER,
    "acao" TEXT NOT NULL,
    "descricao" TEXT,
    "data_execucao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_Acao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_cpf_key" ON "Usuario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Aluno_cpf_key" ON "Aluno"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Aluno_num_matricula_key" ON "Aluno"("num_matricula");

-- CreateIndex
CREATE UNIQUE INDEX "Aluno_usuarioId_key" ON "Aluno"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "RevokedToken_jti_key" ON "RevokedToken"("jti");

-- AddForeignKey
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluno" ADD CONSTRAINT "Aluno_id_faixa_fkey" FOREIGN KEY ("id_faixa") REFERENCES "Faixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Responsavel" ADD CONSTRAINT "Responsavel_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Aluno"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisito_Grau" ADD CONSTRAINT "Requisito_Grau_faixa_id_fkey" FOREIGN KEY ("faixa_id") REFERENCES "Faixa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_id_coordenador_fkey" FOREIGN KEY ("id_coordenador") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_id_professor_fkey" FOREIGN KEY ("id_professor") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "Graduacao" ADD CONSTRAINT "Graduacao_faixa_id_fkey" FOREIGN KEY ("faixa_id") REFERENCES "Faixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log_Acao" ADD CONSTRAINT "Log_Acao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
