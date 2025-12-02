/*import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

export async function seedCoordenador() {
  const passwordHash = await bcrypt.hash("Morimitsu123", 10);

  const usuario = await prisma.usuario.upsert({
    where: { email: 'renato@gmail.com' },
    update: {},
    create: {
      nome: "Saulo",
      nome_social: "",
      cpf: "98962131862",
      dataNascimento: new Date("2008-12-07"),
      telefone: "(88) 99583-8843",
      endereco: "Rua Obi Juci Diniz, 153 - Prado",
      genero: "MASCULINO",
      imagem_perfil_url: "https://cdn.site.com/fotos/renato.png",
      email: "renato@gmail.com",
      password: passwordHash,
      tipo: "COORDENADOR",
    },
  });

  console.log("Usuário coordenador criado:", usuario.email);
}
*/