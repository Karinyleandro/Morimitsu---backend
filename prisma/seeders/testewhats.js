import 'dotenv/config';
import twilio from 'twilio';

// Carrega SID e Auth Token do .env
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

async function run() {
  const code = Math.floor(10000 + Math.random() * 90000); // código de 5 dígitos

  try {
    const msg = await client.messages.create({
      from: "whatsapp:+14155238886",  // número do sandbox
      to: "whatsapp:+5588993515702",  // seu número autorizado
      body: `Seu código de verificação é: ${code}`
    });

    console.log("SID da mensagem:", msg.sid);
    console.log("Status inicial:", msg.status);

  } catch (e) {
    console.error("Erro ao enviar WhatsApp:", e.message, e.code, e.moreInfo);
  }
}

run();
