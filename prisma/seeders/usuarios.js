import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function seedUsuarios() {
  try {
    // Criar ou atualizar Admin
    const hashedAdmin = await bcrypt.hash('admin123', 10);
    const admin = await prisma.usuario.upsert({
      where: { email: "admin@admin.com" },
      update: {}, // não atualiza se já existir
      create: {
        nome: "Admin",
        nome_social: "",
        cpf: "87018656095",
        dataNascimento: new Date("2000-01-01"),
        telefone: null,
        endereco: null,
        genero: "OUTRO", // compatível com enum
        imagem_perfil_url: null,
        email: "admin@admin.com",
        passwordHash: hashedAdmin,
        tipo: "ADMIN",
        ativo: true,
        criado_em: new Date(),
        atualizado_em: new Date(),
      }
    });
    console.log("✅ Admin criado ou atualizado:", admin.email);

    // Criar ou atualizar Coordenador com dados detalhados
    const hashedCoord = await bcrypt.hash('coord123', 10);
    const coordenador = await prisma.usuario.upsert({
      where: { email: "renato@gmail.com" },
      update: {},
      create: {
        nome: "Saulo",
        nome_social: "",
        cpf: "98962131862",
        dataNascimento: new Date("2008-12-07"),
        telefone: "(88) 99583-8843",
        endereco: "Rua Obi Juci Diniz, 153 - Prado",
        genero: "M", // compatível com enum: M, F ou OUTRO
        imagem_perfil_url: "",
        email: "sauloboyna@gmail.com",
        passwordHash: hashedCoord,
        tipo: "COORDENADOR",
        ativo: true,
        criado_em: new Date(),
        atualizado_em: new Date(),
      }
    });
    console.log("✅ Coordenador criado ou atualizado:", coordenador.email);

  } catch (error) {
    console.error("❌ Erro ao criar usuários:", error);
  }
}
