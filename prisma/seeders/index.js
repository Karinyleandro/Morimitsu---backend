import { seedUsuarios } from "./usuarios.js";
import { seedFaixas } from "./faixas.js";

async function main() {
  console.log(" Iniciando seeders...");

  await seedUsuarios();
  await seedFaixas();

  console.log(" Seeders finalizados!");
}

main();
