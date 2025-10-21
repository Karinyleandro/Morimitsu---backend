import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const html = `
  <div style="
    font-family: 'Arial', sans-serif;
    background-color: #111;
    color: #fff;
    padding: 30px;
    border-radius: 12px;
    max-width: 500px;
    margin: auto;
    border: 2px solid #b30000;
  ">
    <h1 style="
      color: #b30000;
      text-align: center;
      letter-spacing: 2px;
    ">
      🥋 MORIMITSU
    </h1>

    <p style="font-size: 16px; text-align: center;">
      Recebemos um pedido para redefinir sua senha.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" 
        style="
          background-color: #b30000;
          color: #fff;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          letter-spacing: 1px;
          display: inline-block;
          transition: background-color 0.2s;
        "
        onmouseover="this.style.backgroundColor='#ff0000'"
      >
        Redefinir Senha
      </a>
    </div>

    <p style="font-size: 14px; color: #ccc; text-align: center;">
      Este link expira em <b>1 hora</b>.  
      Se você não solicitou essa alteração, ignore este e-mail.
    </p>

    <hr style="border: none; border-top: 1px solid #333; margin: 25px 0;">
    
    <p style="text-align: center; font-size: 13px; color: #777;">
      © ${new Date().getFullYear()} <b>MORIMITSU</b> – Sistema de Gestão  
    </p>
  </div>
  `;

  await transporter.sendMail({
    from: `"MORIMITSU" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Recuperação de Senha - MORIMITSU",
    html,
  });
}
