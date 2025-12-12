import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prisma from "../prisma.js";
import dns from "node:dns";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { differenceInYears } from "date-fns";
//import twilio from "twilio";
//import { sendWhatsApp } from "../utils/whatsapp.js";

// eu tenho que separar os usuários (eu usei uma única table para associar os usuários soq o aluno vai ter que ser outra table)

const SALT_ROUNDS = 10;

const generoMap = {
  M: "MASCULINO",
  F: "FEMININO",
  O: "OUTRO"
};

function validarSenhaForte(senha) {
  if (typeof senha !== "string") return "Senha inválida";
  if (senha.length < 8) return "A senha deve ter no mínimo 8 caracteres";
  if (!/[A-Z]/.test(senha)) return "A senha deve ter pelo menos uma letra maiúscula";
  if (!/[a-z]/.test(senha)) return "A senha deve ter pelo menos uma letra minúscula";
  if (!/\d/.test(senha)) return "A senha deve conter pelo menos um número";
  return true;
}

// const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH);



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



// Função auxiliar para calcular idade
function calcularIdade(dataNascimento) {
  if (!dataNascimento) return 0;
  const birth = new Date(dataNascimento);
  const now = new Date();
  let idade = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    idade--;
  }
  return idade;
}

function validarCPF(cpf) {
  if (!cpf) return false;

  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  let resto;

  for (let i = 1; i <= 9; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(9, 10))) return false;

  soma = 0;
  for (let i = 1; i <= 10; i++) {
    soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }

  resto = (soma * 10) % 11;
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.substring(10, 11))) return false;

  return true;
}

export const register = async (req, res) => {
  try {
    const {
      nome,
      nome_social,
      tipo,
      endereco,
      dataNascimento,
      cpf,
      telefone,
      genero,
      responsaveis = [],
      id_faixa,
      grau,
      num_matricula,
      turmaIds = [],
      aulas,
      email,
      password,
    } = req.body;

    const tiposAlunos = ["ALUNO", "ALUNO_PROFESSOR"];

    // --- CPF ---
    if (cpf) {
      if (!validarCPF(cpf)) {
        return res.status(400).json({ message: "CPF inválido" });
      }

      const cpfExiste = await prisma.usuario.findUnique({ where: { cpf } });
      if (cpfExiste) {
        return res.status(400).json({ message: "CPF já cadastrado" });
      }
    }

    // Calcula idade
    const idade = dataNascimento ? calcularIdade(dataNascimento) : null;

    // Valida responsáveis para menores de 18 anos
    if (tiposAlunos.includes(tipo) && idade !== null && idade < 18) {
      if (!responsaveis || responsaveis.length === 0) {
        return res.status(400).json({ message: "Aluno menor de 18 anos precisa de pelo menos um responsável" });
      }
    }

    // Prepara responsáveis
    const responsaveisData = responsaveis && responsaveis.length > 0
      ? { create: responsaveis.map(r => ({
          telefone: r.telefone,
          nome: r.nome || null,
          email: r.email || null,
          grau_parentesco: "Responsável"
        })) }
      : undefined;

    // Prepara turmas
    const turmaData = turmaIds && turmaIds.length > 0
      ? { create: turmaIds.map(id => ({
          turma: { connect: { id } },
          ativo: true,
          frequencia_acumulada: 0
        })) }
      : undefined;

    // Cria usuário
    const user = await prisma.usuario.create({
      data: {
        nome,
        nome_social: nome_social || null,
        tipo,
        endereco: endereco || null,
        dataNascimento: dataNascimento ? new Date(dataNascimento) : null,
        cpf: cpf || null,
        telefone: telefone || null,
        genero: genero || null,
        email: email || null,
        passwordHash: password ? await bcrypt.hash(password, SALT_ROUNDS) : null,
        grau: grau || null,
        num_matricula: num_matricula || null,
        aulas: aulas || null,
        faixa: id_faixa ? { connect: { id: id_faixa } } : undefined,
        responsaveis: responsaveisData,
        turma_matriculas: turmaData
      },
      include: {
        faixa: true,
        responsaveis: true,
        turma_matriculas: { include: { turma: true } }
      }
    });

    res.status(201).json({ message: "Usuário criado com sucesso", user });

  } catch (error) {
    console.error("Erro ao criar usuário:", error);
    res.status(500).json({ message: "Erro interno do servidor", error: error.message });
  }
};



function tratarVazio(v) {
  if (typeof v === "string" && v.trim() === "") return undefined;
  return v;
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

    if (!["ADMIN", "PROFESSOR", "COORDENADOR", "ALUNO_PROFESSOR"].includes(user.tipo))
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
    subject: "Recuperação de senha — MORIMITSU",
    html,
  });
}

export async function requestPasswordReset(req, res) {
  try {
    const { identifier } = req.body;

    // Verifica se o usuário existe
    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: identifier },
          { cpf: identifier }
        ]
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "Nenhum usuário encontrado com este email ou CPF."
      });
    }

    // Apaga tokens antigos
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    const code = generateCode(5);

    // Cria novo token
    await prisma.passwordResetToken.create({
      data: {
        token: code,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      },
    });

    // Envia email
    await sendPasswordResetEmail(user.email, code);

    return res.json({
      message: "Um código de recuperação foi enviado para o email informado."
    });

  } catch (e) {
    console.error("Erro request:", e);
    return res.status(500).json({ message: "Erro interno no servidor." });
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
    const { code, newPassword, confirmPassword } = req.body;

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

/*
export const WhatsAppController = {
  async enviarCodigo(req, res) {
    try {
      const { phone } = req.body;

      if (!phone) {
        return res.status(400).json({ message: "Telefone é obrigatório." });
      }

      const user = await prisma.usuario.findFirst({
        where: { telefone: phone },
      });

      if (!user) {
        return res.json({ message: "Se o número for válido, enviaremos um código." });
      }

      await prisma.smsToken.deleteMany({
        where: { userId: user.id },
      });

      const code = generateCode(5);

      await prisma.smsToken.create({
        data: {
          token: code,
          userId: user.id,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      });

      const result = await sendWhatsApp(phone, `Seu código de verificação é: ${code}`);
      console.log("WhatsApp enviado:", result.sid, result.status);

      return res.json({ message: "Código enviado via WhatsApp." });
    } catch (e) {
      console.error("Erro ao enviar WhatsApp:", e);
      return res.status(500).json({ message: "Erro interno." });
    }
  },

  async validarCodigo(req, res) {
    try {
      const { phone, code } = req.body;

      if (!phone || !code) {
        return res.status(400).json({ message: "Telefone e código são obrigatórios." });
      }

      const user = await prisma.usuario.findFirst({
        where: { telefone: phone },
      });

      if (!user) return res.status(400).json({ message: "Código inválido ou expirado." });

      const token = await prisma.smsToken.findFirst({
        where: {
          userId: user.id,
          token: code,
          expiresAt: { gte: new Date() },
        },
      });

      if (!token) return res.status(400).json({ message: "Código inválido ou expirado." });

      // Pode deletar o token usado
      await prisma.smsToken.delete({ where: { id: token.id } });

      return res.json({ message: "Código válido." });
    } catch (e) {
      console.error("Erro ao validar WhatsApp:", e);
      return res.status(500).json({ message: "Erro interno." });
    }
  },
};*/



