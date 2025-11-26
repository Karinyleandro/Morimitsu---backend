import prisma from "../src/prisma.js";

async function main() {
  console.log(" Iniciando seed das faixas...");

  const faixas = [
    // FAIXAS PARA TODOS (INÍCIO)
    { nome: "Branca", ordem: 1, imagem_faixa_url: null },

    // FAIXAS ATÉ 15 ANOS
    { nome: "Cinza e Branca", ordem: 2, imagem_faixa_url: null },
    { nome: "Cinza", ordem: 3, imagem_faixa_url: null },
    { nome: "Cinza e Preta", ordem: 4, imagem_faixa_url: null },

    { nome: "Amarela e Branca", ordem: 5, imagem_faixa_url: null },
    { nome: "Amarela", ordem: 6, imagem_faixa_url: null },
    { nome: "Amarela e Preta", ordem: 7, imagem_faixa_url: null },

    { nome: "Laranja e Branca", ordem: 8, imagem_faixa_url: null },
    { nome: "Laranja", ordem: 9, imagem_faixa_url: null },
    { nome: "Laranja e Preta", ordem: 10, imagem_faixa_url: null },

    { nome: "Verde e Branca", ordem: 11, imagem_faixa_url: null },
    { nome: "Verde", ordem: 12, imagem_faixa_url: null },
    { nome: "Verde e Preta", ordem: 13, imagem_faixa_url: null },

    // FAIXAS ADULTO (16+)
    { nome: "Azul", ordem: 14, imagem_faixa_url: null },
    { nome: "Roxa", ordem: 15, imagem_faixa_url: null },
    { nome: "Marrom", ordem: 16, imagem_faixa_url: null },
    { nome: "Preta", ordem: 17, imagem_faixa_url: null },

    // FAIXAS DE MESTRE
    { nome: "Coral (Vermelho e Preto)", ordem: 18, imagem_faixa_url: null },
    { nome: "Vermelha (Grande Mestre)", ordem: 19, imagem_faixa_url: null },
  ];

  for (const faixa of faixas) {
    await prisma.faixa.upsert({
      where: { nome: faixa.nome },
      update: {},
      create: faixa,
    });
  }

  console.log(" Seed de faixas concluído!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
