import { PrismaClient } from '@prisma/client';
import { seedUsuarios } from './usuarios.js'; // Importa corretamente a função

const prisma = new PrismaClient();

async function main() {
  console.log(" Iniciando seeders...");
  
  await seedUsuarios(); // Executa o seeder de usuários

  console.log(" Seeders finalizados!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
