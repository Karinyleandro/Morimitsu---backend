/*import twilio from "twilio";

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);

export async function sendWhatsApp(to, message) {
  try {
    const result = await client.messages.create({
      from: "whatsapp:+14155238886", // número do Sandbox
      to: `whatsapp:${to}`,          // número do usuário
      body: message,
    });

    return result;
  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    throw error;
  }
}
*/