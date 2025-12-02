import { PrismaClient } from "@prisma/client";
import fs from "fs";

const prisma = new PrismaClient();

export async function seedFaixas() {
  console.log("→ Inserindo faixas...");

  const faixas = JSON.parse(fs.readFileSync("prisma/seeders/faixas.json", "utf8"));

  await prisma.faixa.createMany({
    data: faixas
  });

  console.log("✓ Faixas inseridas!");
}
