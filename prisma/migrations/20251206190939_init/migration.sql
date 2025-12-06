-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('M', 'F', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('ADMIN', 'PROFESSOR', 'COORDENADOR', 'ALUNO', 'ALUNO_PROFESSOR');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
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
    "tipo" "TipoUsuario" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimo_login" TIMESTAMP(3),
    "id_faixa" TEXT,
    "grau" INTEGER,
    "num_matricula" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Responsavel" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "grau_parentesco" TEXT NOT NULL,
    "email" TEXT,
    "alunoId" TEXT NOT NULL,

    CONSTRAINT "Responsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faixa" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "imagem_faixa_url" TEXT,

    CONSTRAINT "Faixa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisito_Grau" (
    "id" TEXT NOT NULL,
    "faixa_id" TEXT NOT NULL,
    "grau" INTEGER NOT NULL,
    "requisito_aulas" INTEGER NOT NULL,
    "tempo_minimo_dias" INTEGER NOT NULL,
    "descricao" TEXT,

    CONSTRAINT "Requisito_Grau_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turma" (
    "id" TEXT NOT NULL,
    "nome_turma" TEXT NOT NULL,
    "data_criacao" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "faixa_etaria_min" INTEGER NOT NULL,
    "faixa_etaria_max" INTEGER NOT NULL,
    "total_aulas" INTEGER,
    "id_professor" TEXT,
    "id_coordenador" TEXT,
    "ativo" BOOLEAN DEFAULT true,
    "imagem_turma_url" TEXT,

    CONSTRAINT "Turma_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurmaResponsavel" (
    "id" TEXT NOT NULL,
    "turmaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TurmaResponsavel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aluno_Turma" (
    "id_aluno" TEXT NOT NULL,
    "id_turma" TEXT NOT NULL,
    "frequencia_acumulada" DOUBLE PRECISION DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Aluno_Turma_pkey" PRIMARY KEY ("id_aluno","id_turma")
);

-- CreateTable
CREATE TABLE "Frequencia" (
    "id" TEXT NOT NULL,
    "id_turma" TEXT NOT NULL,
    "id_aluno" TEXT NOT NULL,
    "id_registrador" TEXT NOT NULL,
    "data_aula" TIMESTAMP(3) NOT NULL,
    "presente" BOOLEAN NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Frequencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Graduacao" (
    "id" TEXT NOT NULL,
    "alunoId" TEXT NOT NULL,
    "faixa_id" TEXT NOT NULL,
    "grau" INTEGER NOT NULL,
    "data_graduacao" TIMESTAMP(3) NOT NULL,
    "observacao" TEXT,

    CONSTRAINT "Graduacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevokedToken" (
    "id" TEXT NOT NULL,
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevokedToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log_Acao" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
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
CREATE UNIQUE INDEX "Usuario_num_matricula_key" ON "Usuario"("num_matricula");

-- CreateIndex
CREATE UNIQUE INDEX "Faixa_ordem_key" ON "Faixa"("ordem");

-- CreateIndex
CREATE UNIQUE INDEX "TurmaResponsavel_turmaId_usuarioId_key" ON "TurmaResponsavel"("turmaId", "usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "RevokedToken_jti_key" ON "RevokedToken"("jti");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_id_faixa_fkey" FOREIGN KEY ("id_faixa") REFERENCES "Faixa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Responsavel" ADD CONSTRAINT "Responsavel_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisito_Grau" ADD CONSTRAINT "Requisito_Grau_faixa_id_fkey" FOREIGN KEY ("faixa_id") REFERENCES "Faixa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_id_coordenador_fkey" FOREIGN KEY ("id_coordenador") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Turma" ADD CONSTRAINT "Turma_id_professor_fkey" FOREIGN KEY ("id_professor") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurmaResponsavel" ADD CONSTRAINT "TurmaResponsavel_turmaId_fkey" FOREIGN KEY ("turmaId") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurmaResponsavel" ADD CONSTRAINT "TurmaResponsavel_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluno_Turma" ADD CONSTRAINT "Aluno_Turma_id_aluno_fkey" FOREIGN KEY ("id_aluno") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aluno_Turma" ADD CONSTRAINT "Aluno_Turma_id_turma_fkey" FOREIGN KEY ("id_turma") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frequencia" ADD CONSTRAINT "Frequencia_id_registrador_fkey" FOREIGN KEY ("id_registrador") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frequencia" ADD CONSTRAINT "Frequencia_id_turma_fkey" FOREIGN KEY ("id_turma") REFERENCES "Turma"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Frequencia" ADD CONSTRAINT "Frequencia_id_aluno_fkey" FOREIGN KEY ("id_aluno") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Graduacao" ADD CONSTRAINT "Graduacao_alunoId_fkey" FOREIGN KEY ("alunoId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Graduacao" ADD CONSTRAINT "Graduacao_faixa_id_fkey" FOREIGN KEY ("faixa_id") REFERENCES "Faixa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log_Acao" ADD CONSTRAINT "Log_Acao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
