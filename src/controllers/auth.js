import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prisma from "../prisma.js";
import dns from "node:dns";
import crypto from "crypto";
import nodemailer from "nodemailer";

// eu tenho que separar os usuários (eu usei uma única table para associar os usuários soq o aluno vai ter que ser outra table)

const SALT_ROUNDS = 10;

function validarSenhaForte(senha) {
  if (typeof senha !== "string") return "Senha inválida";
  if (senha.length < 8) return "A senha deve ter no mínimo 8 caracteres";
  if (!/[A-Z]/.test(senha)) return "A senha deve ter pelo menos uma letra maiúscula";
  if (!/[a-z]/.test(senha)) return "A senha deve ter pelo menos uma letra minúscula";
  if (!/\d/.test(senha)) return "A senha deve conter pelo menos um número";
  return true;
}

function createJwt(payload) {
  const jti = uuidv4();
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    jwtid: jti,
  });
  return { token, jti };
}

function verificarDominioEmail(email) {
  return new Promise((resolve) => {
    const dominio = email.split("@")[1];
    if (!dominio) return resolve(false);

    dns.resolveMx(dominio, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) return resolve(false);
      resolve(true);
    });
  });
}

function generateCode(length = 5) {
  const chars = "0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    token += chars[crypto.randomInt(0, chars.length)];
  }
  return token;
}

export async function register(req, res) {
  try {
    let {
      nome,
      nome_social,
      cpf,
      dataNascimento,
      telefone,
      endereco,
      genero,
      imagem_perfil_url,
      email,
      password,
      tipo,
    } = req.body;

    if (!nome || !email || !password || !tipo) {
      return res.status(400).json({
        message: "Campos obrigatórios: nome, email, tipo e password",
      });
    }

    tipo = tipo.trim().toUpperCase();
    if (!["ADMIN", "PROFESSOR", "COORDENADOR"].includes(tipo)) {
      return res.status(400).json({ message: "Tipo inválido" });
    }

    const senhaValida = validarSenhaForte(password);
    if (senhaValida !== true) return res.status(400).json({ message: senhaValida });

    const totalCoordenadores = await prisma.usuario.count({ where: { tipo: "COORDENADOR" } });

    if (totalCoordenadores > 0) {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(403).json({ message: "Acesso negado" });

      const token = authHeader.split(" ")[1];
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch {
        return res.status(401).json({ message: "Token inválido" });
      }

      if (decoded.tipo !== "COORDENADOR") {
        return res.status(403).json({ message: "Acesso negado" });
      }
    } else {
      if (tipo !== "COORDENADOR") {
        return res.status(400).json({ message: "O primeiro usuário deve ser COORDENADOR" });
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ message: "Formato de e-mail inválido" });

    const existingWhere = [{ email }];
    if (cpf) existingWhere.push({ cpf });

    const existente = await prisma.usuario.findFirst({
      where: { OR: existingWhere },
    });

    if (existente)
      return res.status(409).json({ message: "Já existe um usuário com esse email/CPF" });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.usuario.create({
      data: {
        nome,
        nome_social,
        cpf,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        telefone,
        endereco,
        genero,
        imagem_perfil_url,
        email,
        passwordHash,
        tipo,
      },
    });

    return res.status(201).json({
      message: "Usuário criado com sucesso",
      usuario: user, 
    });
  } catch (e) {
    console.error("Erro no registro:", e);
    return res.status(500).json({ message: "Erro interno" });
  }
}

export async function login(req, res) {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password)
      return res.status(400).json({ message: "Informe identificador e senha" });

    const user = await prisma.usuario.findFirst({
      where: { OR: [{ email: identifier }, { cpf: identifier }] },
    });

    if (!user || !user.passwordHash)
      return res.status(401).json({ message: "Credenciais inválidas" });

    if (!["ADMIN", "PROFESSOR", "COORDENADOR"].includes(user.tipo))
      return res.status(403).json({ message: "Usuário sem permissão de login" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Credenciais inválidas" });

    await prisma.usuario.update({
      where: { id: user.id },
      data: { ultimo_login: new Date() },
    });

    const { token } = createJwt({
      sub: user.id,
      tipo: user.tipo,
      nome: user.nome,
    });

    return res.status(200).json({
      token,
      expiresIn: process.env.JWT_EXPIRES_IN,
      user, // ← ID já é UUID
    });
  } catch (e) {
    console.error("Erro no login:", e);
    return res.status(500).json({ message: "Erro interno" });
  }
}

export async function logout(req, res) {
  try {
    const header = req.headers.authorization;
    if (!header) return res.status(400).json({ message: "Token não fornecido" });

    const token = header.split(" ")[1];
    const decoded = jwt.decode(token, { complete: true });

    const jti = decoded?.payload?.jti;
    const exp = decoded?.payload?.exp;

    if (!jti || !exp)
      return res.status(400).json({ message: "Token inválido" });

    await prisma.revokedToken.create({
      data: {
        jti,
        expiresAt: new Date(exp * 1000),
      },
    });

    return res.json({ message: "Logout realizado" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erro interno" });
  }
}


async function sendPasswordResetEmail(to, code) {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Usando a imagem que você enviou como background
  const IMAGE_URL = "https://media.istockphoto.com/id/1431895911/pt/foto/mma-karate-and-jiu-jitsu-with-two-female-athletes-practicing-training-and-sparring-in-fight.jpg";

  const html = `
  <!doctype html>
  <html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <title>Recuperação de Senha — MORIMITSU</title>
    <style>
      body,table,td,a{ -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
      table,td{ mso-table-lspace:0pt; mso-table-rspace:0pt; }
      img{ -ms-interpolation-mode:bicubic; }
      body { margin:0; padding:0; background-color:#0b0b0b; font-family: Helvetica, Arial, sans-serif; }
      .wrap { width:100%; table-layout:fixed; background-color:#0b0b0b; padding-bottom:40px; }
      .main { background-color:transparent; margin:0 auto; width:100%; max-width:600px; border-radius:8px; overflow:hidden; }

      .hero {
        padding:40px 20px;
        text-align:center;
        background-color: rgba(0,0,0,0.55);
        color:#fff;
      }
      .brand { font-size:34px; font-weight:800; letter-spacing:2px; color:#ff2b2b; margin:0 0 8px 0; text-transform:uppercase; }
      .headline { font-size:20px; color:#ffffff; margin:0 0 12px 0; }
      .code-box {
        margin:20px auto;
        display:inline-block;
        background: linear-gradient(180deg, #1b1b1b 0%, #0d0d0d 100%);
        border:2px solid #ff2b2b;
        border-radius:8px;
        padding:18px 28px;
        font-size:36px;
        font-weight:700;
        color:#ff2b2b;
        letter-spacing:4px;
      }
      .subtext { color:#cccccc; font-size:13px; margin-top:12px; }
      .btn {
        display:inline-block;
        margin-top:18px;
        padding:12px 22px;
        border-radius:6px;
        background: #ff2b2b;
        color: #111;
        text-decoration:none;
        font-weight:700;
      }
      .footer { font-size:12px; color:#9b9b9b; text-align:center; padding:18px 16px; }

      @media screen and (max-width:480px){
        .brand { font-size:28px; }
        .code-box { font-size:28px; padding:14px 18px; letter-spacing:3px; }
      }

    </style>
  </head>

  <body>
    <!--[if gte mso 9]>
      <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="true">
        <v:fill type="frame" src="${IMAGE_URL}" color="#0b0b0b" />
      </v:background>
    <![endif]-->

    <center class="wrap">
      <table role="presentation" class="main" width="100%" cellpadding="0" cellspacing="0" style="background-image: url('${IMAGE_URL}'); background-size: cover; background-position: center; background-repeat: no-repeat;">
        <tr>
          <td style="background-color: rgba(0,0,0,0.65);">
            <div class="hero">
              <h1 class="brand">MORIMITSU</h1>
              <div style="width:60px;height:4px;background:#ff2b2b;margin:8px auto 18px;border-radius:2px;"></div>
              <p class="headline">Recuperação de Senha</p>
              <p style="color:#e6e6e6;margin:0 auto;max-width:460px;">Você solicitou a recuperação de senha. Use o código abaixo para redefinir sua senha. O código expira em 1 hora.</p>

              <div class="code-box" role="text" aria-label="Código de recuperação">${code}</div>

              <p>
                <a class="btn" href="https://seusite.com/reset-password?code=${encodeURIComponent(code)}&email=${encodeURIComponent(to)}" target="_blank" rel="noopener">Redefinir Senha</a>
              </p>

              <p class="subtext">Se você não solicitou essa alteração, ignore este e-mail.</p>
            </div>
          </td>
        </tr>

        <tr>
          <td style="background:#070707;padding-top:8px;">
            <div class="footer">
              © ${new Date().getFullYear()} MORIMITSU — Todos os direitos reservados<br/>
              <span style="color:#6c6c6c;">Contato: contato@morimitsu.com</span>
            </div>
          </td>
        </tr>
      </table>
    </center>
  </body>
  </html>
  `;

  await transporter.sendMail({
    from: `"Morimitsu" <${process.env.EMAIL_USER}>`,
    to,
<<<<<<< HEAD
    subject: "Recuperação de Senha - Morimitsu",
    html: `
    <div style="font-family: 'Poppins', 'Arial', sans-serif; background: radial-gradient(circle at top left, #000000, #1a1a1a); color: #fff; padding: 40px 0; text-align: center;">
      <div style="max-width: 520px; margin: auto; background: #181818; border-radius: 16px; box-shadow: 0 8px 25px rgba(0,0,0,0.6); overflow: hidden; border-top: 5px solid #690808;">
        
        <div style="background: linear-gradient(90deg, #690808, #a00000); padding: 25px 0;">
          <h1 style="font-size: 34px; margin: 0; letter-spacing: 2px; color: #fff;">MORIMITSU</h1>
          <p style="font-size: 14px; margin-top: 6px; color: #ffe4e4;">
            Disciplina, força e superação — até na recuperação de senha!
          </p>
        </div>

        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #f5f5f5; margin-bottom: 10px;">Olá, guerreiro(a)!</p>
          <p style="font-size: 15px; line-height: 1.6; color: #ccc;">
            Você solicitou a redefinição da sua senha.<br>
            Use o código abaixo ou clique no botão para continuar no caminho do 🥋 <b>faixa preta</b>:
          </p>

          <div style="
            background: rgba(255, 0, 0, 0.1);
            border: 2px dashed #ff2b2b;
            border-radius: 10px;
            color: #ff2b2b;
            font-size: 40px;
            font-weight: 800;
            letter-spacing: 4px;
            margin: 25px 0;
            padding: 18px 0;
            transition: all 0.3s ease;
          ">
            ${token}
          </div>

          <a href="${resetLink}" style="
            display: inline-block;
            background: linear-gradient(90deg, #ff0000, #ff5e00);
            color: #fff;
            text-decoration: none;
            padding: 14px 36px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 4px 12px rgba(255,0,0,0.4);
            transition: all 0.3s ease;
          " target="_blank">
            Redefinir Senha
          </a>

          <p style="margin-top: 25px; font-size: 13px; color: #999;">
            ⏳ Este código expira em <b>1 hora</b>.<br>
            Se você não solicitou essa ação, ignore este e-mail — continue treinando firme!
          </p>
        </div>

        <div style="background: #111; padding: 15px; font-size: 12px; color: #666;">
          © ${new Date().getFullYear()} <b>Morimitsu Jiu-Jitsu</b>.<br>
          <span style="color: #ff2b2b;">Oss! Continue forte no caminho do guerreiro.</span>
        </div>
      </div>
    </div>
    `,
  };

  try {
<<<<<<< HEAD
    const oauth2Client = new OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    const accessToken = await oauth2Client.getAccessToken();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
        accessToken: accessToken?.token,
      },
      tls: { rejectUnauthorized: false },
    });

    const resetLink = `https://morimitsu.com.br/redefinir-senha?token=${token}`;

    const mailOptions = {
      from: `"Morimitsu Suporte" <${process.env.EMAIL_USER}>`,
      to,
      subject: "🥋 Recuperação de Senha - Morimitsu Jiu-Jitsu",
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #000; color: #fff; max-width: 600px; margin: auto; border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(255, 0, 0, 0.3);">

          <!-- Cabeçalho -->
          <div style="background-color: #b30000; text-align: center; padding: 25px 20px;">
            <h1 style="margin: 0; font-size: 28px; letter-spacing: 1px;">MORIMITSU</h1>
            <p style="margin: 5px 0 0; color: #fff; font-size: 14px;">
              Disciplina, força e superação — até na recuperação de senha!
            </p>
          </div>

          <!-- Corpo -->
          <div style="padding: 35px 25px; text-align: center;">
            <h2 style="margin-bottom: 10px; font-size: 20px;">Olá, guerreiro(a)!</h2>
            <p style="color: #ccc; font-size: 15px; margin-bottom: 25px;">
              Você solicitou a redefinição da sua senha.<br>
              Use o código abaixo ou clique no botão para continuar no caminho<br>
              da 🥋 <strong>faixa preta</strong>:
            </p>

            <!-- Código -->
            <div style="background-color: #1a1a1a; border: 2px dashed #e50914; border-radius: 8px; display: inline-block; padding: 15px 35px; margin-bottom: 25px;">
              <h1 style="color: #e50914; font-size: 36px; letter-spacing: 3px; margin: 0;">${token}</h1>
            </div>

            <!-- Botão -->
            <div>
              <a href="${resetLink}"
                style="background-color: #e50914; color: #fff; text-decoration: none;
                font-weight: bold; padding: 14px 40px; border-radius: 50px;
                display: inline-block; font-size: 15px; margin-top: 10px;
                box-shadow: 0 4px 10px rgba(255, 0, 0, 0.4);">
                REDEFINIR SENHA
              </a>
            </div>

            <p style="color: #999; font-size: 13px; margin-top: 25px;">
              ⏳ Este código expira em 1 hora.<br>
              Se você não solicitou essa ação, ignore este e-mail — continue treinando firme 💪
            </p>
          </div>

          <!-- Rodapé -->
          <div style="background-color: #0d0d0d; text-align: center; padding: 15px; border-top: 1px solid #1f1f1f;">
            <p style="font-size: 12px; color: #555; margin: 0;">
              © ${new Date().getFullYear()} Morimitsu Jiu-Jitsu — Todos os direitos reservados.
            </p>
          </div>
<<<<<<< HEAD
=======

export async function sendPasswordResetEmail(to, token) {
  // Configura o transporte SMTP usando variáveis de ambiente
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // true para porta 465, false para 587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  // Link de redefinição de senha
  const resetLink = `https://morimitsu.com.br/redefinir-senha?token=${token}`;

  // Configuração do e-mail
  const mailOptions = {
    from: `"Morimitsu Suporte" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Recuperação de Senha - Morimitsu",
    html: `
    <div style="font-family: 'Poppins', 'Arial', sans-serif; background: radial-gradient(circle at top left, #000000, #1a1a1a); color: #fff; padding: 40px 0; text-align: center;">
      <div style="max-width: 520px; margin: auto; background: #181818; border-radius: 16px; box-shadow: 0 8px 25px rgba(0,0,0,0.6); overflow: hidden; border-top: 5px solid #690808;">
        
        <div style="background: linear-gradient(90deg, #690808, #a00000); padding: 25px 0;">
          <h1 style="font-size: 34px; margin: 0; letter-spacing: 2px; color: #fff;">MORIMITSU</h1>
          <p style="font-size: 14px; margin-top: 6px; color: #ffe4e4;">
            Disciplina, força e superação — até na recuperação de senha!
          </p>
>>>>>>> c0385d1 (-correções)
=======
>>>>>>> 5368fc7 (-correções)
        </div>
      `,
    };

    console.log("📤 Enviando email para:", to);
=======
>>>>>>> 5ef40af (-correções na função de auth - recuperação de senha)
    await transporter.sendMail(mailOptions);
    console.log("✅ E-mail de recuperação enviado para:", to);
  } catch (error) {
<<<<<<< HEAD
    console.error("❌ Erro ao enviar email:", error);
    throw new Error(`Falha no envio: ${error.message}`);
<<<<<<< HEAD
=======
        <div style="padding: 30px;">
          <p style="font-size: 16px; color: #f5f5f5; margin-bottom: 10px;">Olá, guerreiro(a)!</p>
          <p style="font-size: 15px; line-height: 1.6; color: #ccc;">
            Você solicitou a redefinição da sua senha.<br>
            Use o código abaixo ou clique no botão para continuar no caminho do 🥋 <b>faixa preta</b>:
          </p>

          <div style="
            background: rgba(255, 0, 0, 0.1);
            border: 2px dashed #ff2b2b;
            border-radius: 10px;
            color: #ff2b2b;
            font-size: 40px;
            font-weight: 800;
            letter-spacing: 4px;
            margin: 25px 0;
            padding: 18px 0;
            transition: all 0.3s ease;
          ">
            ${token}
          </div>

          <a href="${resetLink}" style="
            display: inline-block;
            background: linear-gradient(90deg, #ff0000, #ff5e00);
            color: #fff;
            text-decoration: none;
            padding: 14px 36px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 4px 12px rgba(255,0,0,0.4);
            transition: all 0.3s ease;
          " target="_blank">
            Redefinir Senha
          </a>

          <p style="margin-top: 25px; font-size: 13px; color: #999;">
            ⏳ Este código expira em <b>1 hora</b>.<br>
            Se você não solicitou essa ação, ignore este e-mail — continue treinando firme!
          </p>
        </div>

        <div style="background: #111; padding: 15px; font-size: 12px; color: #666;">
          © ${new Date().getFullYear()} <b>Morimitsu Jiu-Jitsu</b>.<br>
          <span style="color: #ff2b2b;">Oss! Continue forte no caminho do guerreiro.</span>
        </div>
      </div>
    </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ E-mail de recuperação enviado para:", to);
  } catch (error) {
    console.error("❌ Erro ao enviar e-mail de recuperação:", error);
    throw new Error("Falha no envio do e-mail de recuperação.");
>>>>>>> c0385d1 (-correções)
=======
>>>>>>> 5368fc7 (-correções)
=======
    console.error("❌ Erro ao enviar e-mail de recuperação:", error);
    throw new Error("Falha no envio do e-mail de recuperação.");
>>>>>>> 5ef40af (-correções na função de auth - recuperação de senha)
  }
}

export async function verifyResetCode(req, res) {
  try {
<<<<<<< HEAD
<<<<<<< HEAD
    console.log("Body recebido:", req.body);

    // Aceita tanto 'codigoRecuperacao' quanto 'CodigoRecuperacao'
    const { token, codigoRecuperacao, CodigoRecuperacao } = req.body;
    const code = token || codigoRecuperacao || CodigoRecuperacao;

    if (!code) {
=======
    const { token } = req.body;

    if (!token) {
>>>>>>> c23afbd (corrigindo doc-api)
=======
    console.log("Body recebido:", req.body);

    // Aceita tanto 'codigoRecuperacao' quanto 'CodigoRecuperacao'
    const { token, codigoRecuperacao, CodigoRecuperacao } = req.body;
    const code = token || codigoRecuperacao || CodigoRecuperacao;

    if (!code) {
>>>>>>> 1ff2d03 (organizando documentáção - ainda falta muitas coisinhas)
      return res.status(400).json({ message: "Código não fornecido" });
    }

    const entry = await prisma.passwordResetToken.findUnique({
<<<<<<< HEAD
<<<<<<< HEAD
      where: { token: code },
      include: { user: true },
    });

    if (!entry) return res.status(400).json({ message: "Código inválido" });
    if (entry.used) return res.status(400).json({ message: "Código já utilizado" });
    if (entry.expiresAt < new Date()) return res.status(400).json({ message: "Código expirado" });
=======
      where: { token },
      include: { user: true },
    });

    if (!entry) {
      return res.status(400).json({ message: "Código inválido" });
    }

    if (entry.used) {
      return res.status(400).json({ message: "Código já utilizado" });
    }

    if (entry.expiresAt < new Date()) {
      return res.status(400).json({ message: "Código expirado" });
    }
>>>>>>> c23afbd (corrigindo doc-api)
=======
      where: { token: code },
      include: { user: true },
    });

    if (!entry) return res.status(400).json({ message: "Código inválido" });
    if (entry.used) return res.status(400).json({ message: "Código já utilizado" });
    if (entry.expiresAt < new Date()) return res.status(400).json({ message: "Código expirado" });
>>>>>>> 1ff2d03 (organizando documentáção - ainda falta muitas coisinhas)

    return res.json({
      message: "Código válido",
      userId: entry.userId,
    });
  } catch (e) {
<<<<<<< HEAD
<<<<<<< HEAD
    console.error("Erro em verifyResetCode:", e);
=======
    console.error(e);
>>>>>>> c23afbd (corrigindo doc-api)
=======
    console.error("Erro em verifyResetCode:", e);
>>>>>>> 1ff2d03 (organizando documentáção - ainda falta muitas coisinhas)
    return res.status(500).json({ message: "Erro interno" });
  }
}

// Função principal de requisição de reset de senha
=======
    subject: "Recuperação de senha — MORIMITSU",
    html,
  });
}

>>>>>>> 97963f4 (teste)
export async function requestPasswordReset(req, res) {
  try {
    const { identifier } = req.body;

    const user = await prisma.usuario.findFirst({
      where: { OR: [{ email: identifier }, { cpf: identifier }] },
    });

    if (!user) return res.json({ message: "Se existir, enviamos um email" });

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const code = generateCode(5);

    await prisma.passwordResetToken.create({
      data: {
        token: code,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await sendPasswordResetEmail(user.email, code);

    return res.json({ message: "Código enviado para o email" });
  } catch (e) {
    console.error("Erro request:", e);
    return res.status(500).json({ message: "Erro interno" });
  }
}

export async function verifyResetCode(req, res) {
  try {
    const { code } = req.body;

    const entry = await prisma.passwordResetToken.findUnique({
      where: { token: code },
    });

    if (!entry) return res.status(400).json({ message: "Código inválido" });
    if (entry.expiresAt < new Date())
      return res.status(400).json({ message: "Código expirado" });

    return res.json({ message: "Código válido", userId: entry.userId });
  } catch (e) {
    console.error("Erro verify:", e);
    return res.status(500).json({ message: "Erro interno" });
  }
}

export async function resetPassword(req, res) {
  try {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
    console.log("Body recebido:", req.body);
    const { token, codigoRecuperacao, newPassword, confirmPassword } = req.body;
    const code = token || codigoRecuperacao; 
=======
    console.log("Body recebido:", req.body); // 👈 Loga o corpo que realmente chega

    const { token, codigoRecuperacao, newPassword, confirmPassword } = req.body;
    const code = token || codigoRecuperacao; // Aceita qualquer um dos dois campos

>>>>>>> c23afbd (corrigindo doc-api)
=======
    console.log("Body recebido:", req.body);
    const { token, codigoRecuperacao, newPassword, confirmPassword } = req.body;
    const code = token || codigoRecuperacao; 
>>>>>>> 1ff2d03 (organizando documentáção - ainda falta muitas coisinhas)
    if (!code || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: "Preencha todos os campos" });
    }
=======
    const { code, newPassword, confirmPassword } = req.body;
>>>>>>> 97963f4 (teste)

    if (!code || !newPassword || !confirmPassword)
      return res.status(400).json({ message: "Preencha todos os campos" });

    if (newPassword !== confirmPassword)
      return res.status(400).json({ message: "As senhas não coincidem" });

    const entry = await prisma.passwordResetToken.findUnique({
      where: { token: code },
    });

    if (!entry) return res.status(400).json({ message: "Código inválido" });
    if (entry.expiresAt < new Date())
      return res.status(400).json({ message: "Código expirado" });

    const senhaValida = validarSenhaForte(newPassword);
    if (senhaValida !== true) return res.status(400).json({ message: senhaValida });

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.usuario.update({
      where: { id: entry.userId },
      data: { passwordHash: hash },
    });

    await prisma.passwordResetToken.delete({
      where: { id: entry.id },
    });

    return res.json({ message: "Senha atualizada com sucesso" });
  } catch (e) {
    console.error("Erro reset:", e);
    return res.status(500).json({ message: "Erro interno" });
  }
}
