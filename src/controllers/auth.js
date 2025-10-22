import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prisma from "../prisma.js";
import { validarCPF } from "../utils/validacao_cpf.js";
import crypto from "crypto";
import nodemailer from "nodemailer";

const SALT_ROUNDS = 10;

// Função para validar força da senha
function validarSenhaForte(senha) {
  if (typeof senha !== "string") return "Senha inválida";
  if (senha.length < 8) return "A senha deve ter no mínimo 8 caracteres";
  if (!/[A-Z]/.test(senha)) return "A senha deve ter pelo menos uma letra maiúscula";
  if (!/[a-z]/.test(senha)) return "A senha deve ter pelo menos uma letra minúscula";
  if (!/\d/.test(senha)) return "A senha deve conter pelo menos um número";
  if (!/[@$!%*?&]/.test(senha)) return "A senha deve conter pelo menos um caractere especial (@$!%*?&)";
  return true;
}

// Função para criar JWT
function createJwt(payload) {
  const jti = uuidv4();
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    jwtid: jti,
  });
  return { token, jti };
}

// Função para hash do ID
async function hashId(id) {
  return await bcrypt.hash(id.toString(), SALT_ROUNDS);
}

export async function register(req, res) {
  try {
    const { nome, email, cpf, dataNascimento, tipo_usuario, password, genero } = req.body;

    if (!nome || !email || !cpf || !dataNascimento || !tipo_usuario || !password || !genero) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios" });
    }

    if (!["PROFESSOR", "COORDENADOR"].includes(tipo_usuario)) {
      return res.status(400).json({ message: "Tipo de usuário não permitido" });
    }

    if (!["MASCULINO", "FEMININO", "OUTRO"].includes(genero)) {
      return res.status(400).json({ message: "Gênero inválido" });
    }

    if (!validarCPF(cpf)) return res.status(400).json({ message: "CPF inválido" });

    const senhaValida = validarSenhaForte(password);
    if (senhaValida !== true) return res.status(400).json({ message: senhaValida });

    const existing = await prisma.usuario.findFirst({ where: { OR: [{ email }, { cpf }] } });
    if (existing) return res.status(409).json({ message: "Email ou CPF já cadastrado" });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const generoMap = { MASCULINO: "M", FEMININO: "F", OUTRO: "OUTRO" };

    const user = await prisma.usuario.create({
      data: {
        nome,
        email,
        cpf,
        dataNascimento: new Date(dataNascimento),
        tipo_usuario,
        passwordHash,
        genero: generoMap[genero],
      },
      select: {
        id: true,
        nome: true,
        email: true,
        tipo_usuario: true,
        genero: true,
      },
    });

    const hashedId = await hashId(user.id);
    res.status(201).json({
      message: "Usuário criado com sucesso",
      user: { ...user, id: hashedId },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
}

export async function criarAluno(req, res) {
  try {
    await checkCoordenador(req);

    const {
      nome,
      nome_social,
      cpf,
      dataNascimento,
      genero,
      num_matricula,
      id_faixa,
      cargo_aluno,
      telefone,
      endereco,
      grau,
      imagem_perfil_url,
      responsaveis,
      turmaIds,
      acessoSistema = false, // Novo campo: define se o aluno terá acesso ao sistema
    } = req.body;

    if (!nome || !cpf || !dataNascimento || !genero) {
      return res.status(400).json({ message: "Campos obrigatórios: nome, cpf, dataNascimento, genero" });
    }

    if (!validarCPF(cpf)) return res.status(400).json({ message: "CPF inválido" });

    const existeAluno = await prisma.usuario.findFirst({ where: { cpf } });
    if (existeAluno) return res.status(409).json({ message: "Aluno já cadastrado" });

    const generoMap = { MASCULINO: "M", FEMININO: "F", OUTRO: "OUTRO" };

    const aluno = await prisma.usuario.create({
      data: {
        tipo_usuario: "ALUNO",
        cargo_aluno,
        nome,
        nome_social,
        cpf,
        dataNascimento: new Date(dataNascimento),
        genero: generoMap[genero],
        num_matricula,
        id_faixa,
        telefone,
        endereco,
        grau,
        imagem_perfil_url,
        ativo: true,
        email: acessoSistema ? `${cpf}@aluno.morimitsu.com.br` : null, // Só cria email se tiver acesso
        responsaveis: responsaveis?.length
          ? { create: responsaveis.map(r => ({
              nome: r.nome,
              telefone: r.telefone,
              grau_parentesco: r.grau_parentesco,
              email: r.email
            })) }
          : undefined,
        aluno_turmas: turmaIds?.length
          ? { create: turmaIds.map(id_turma => ({ id_turma })) }
          : undefined,
      },
      include: {
        responsaveis: true,
        aluno_turmas: { include: { turma: true } },
        faixa: true,
      }
    });

    res.status(201).json({ message: "Aluno cadastrado com sucesso", aluno });
  } catch (error) {
    console.error("Erro criar aluno:", error);
    res.status(error.status || 500).json({ message: error.message || "Erro interno" });
  }
}


export async function login(req, res) {
  try {
    const { identifier, password } = req.body;

    const user = await prisma.usuario.findFirst({
      where: { OR: [{ email: identifier }, { cpf: identifier }, { nome: identifier }] },
    });

    // Se não existe ou não tem senha (ex.: aluno sem acesso)
    if (!user || !user.passwordHash) 
      return res.status(401).json({ message: "Credenciais inválidas" });

    // Bloqueia alunos sem acesso ao sistema
    if (user.tipo_usuario === "ALUNO" && !user.passwordHash) {
      return res.status(403).json({ message: "Este aluno não possui acesso ao sistema" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Credenciais inválidas" });

    await prisma.usuario.update({ where: { id: user.id }, data: { ultimo_login: new Date() } });

    const payload = { sub: user.id, tipo_usuario: user.tipo_usuario, nome: user.nome };
    const { token } = createJwt(payload);

    const hashedId = await hashId(user.id);

    res.json({
      token,
      expiresIn: process.env.JWT_EXPIRES_IN,
      user: { ...user, id: hashedId },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
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

    if (!jti || !exp) return res.status(400).json({ message: "Token inválido" });

    await prisma.revokedToken.create({ data: { jti, expiresAt: new Date(exp * 1000) } });
    res.json({ message: "Logout efetuado" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
}

function generateToken(length = 5) {
  const chars = "0123456789";
  let token = "";
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    token += chars[randomIndex];
  }
  return token;
}

// Função para enviar o e-mail
async function sendPasswordResetEmail(to, token) {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

const resetLink = `https://morimitsu.com.br/redefinir-senha?token=${token}`;

const mailOptions = {
  from: `"Morimitsu Suporte" <${process.env.EMAIL_USER}>`,
  to,
  subject: "🥋 Recuperação de Senha - Morimitsu",
  html: `
  <div style="font-family: 'Poppins', 'Arial', sans-serif; background: radial-gradient(circle at top left, #000000, #1a1a1a); color: #fff; padding: 40px 0; text-align: center;">
    <div style="max-width: 520px; margin: auto; background: #181818; border-radius: 16px; box-shadow: 0 8px 25px rgba(0,0,0,0.6); overflow: hidden; border-top: 5px solid #ff2b2b;">
      
      <div style="background: linear-gradient(90deg, #ff0000, #a00000); padding: 25px 0;">
        <h1 style="font-size: 34px; margin: 0; letter-spacing: 2px; color: #fff;">
          🥋 MORIMITSU 🥋
        </h1>
        <p style="font-size: 14px; margin-top: 6px; color: #ffe4e4;">
          Disciplina, força e superação — até na recuperação de senha!
        </p>
      </div>

      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #f5f5f5; margin-bottom: 10px;">👊 Olá, guerreiro(a)!</p>
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
          Se você não solicitou essa ação, ignore este e-mail — continue treinando firme 💪
        </p>
      </div>

      <div style="background: #111; padding: 15px; font-size: 12px; color: #666;">
        © ${new Date().getFullYear()} <b>Morimitsu Jiu-Jitsu</b>.<br>
        <span style="color: #ff2b2b;">🥋 Oss! Continue forte no caminho do guerreiro.</span>
      </div>
    </div>
  </div>
  `,
};


  await transporter.sendMail(mailOptions);
}

// Função principal de requisição de reset de senha
export async function requestPasswordReset(req, res) {
  try {
    const { identifier } = req.body;

    // Procura usuário por e-mail ou CPF
    const user = await prisma.usuario.findFirst({
      where: { OR: [{ email: identifier }, { cpf: identifier }] },
    });

    if (!user) return res.json({ message: "Se existir, um e-mail foi enviado" });

    // Gera token seguro de 5 caracteres
    const token = generateToken(5);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // expira em 1 hora

    // Salva token no banco
    await prisma.passwordResetToken.create({ data: { token, userId: user.id, expiresAt } });

    // Envia e-mail
    await sendPasswordResetEmail(user.email, token);

    res.json({ message: "E-mail de recuperação enviado" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
}

export async function resetPassword(req, res) {
  try {
    const { token, newPassword } = req.body;

    const entry = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!entry || entry.used) return res.status(400).json({ message: "Token inválido" });
    if (entry.expiresAt < new Date()) return res.status(400).json({ message: "Token expirado" });

    const senhaValida = validarSenhaForte(newPassword);
    if (senhaValida !== true) return res.status(400).json({ message: senhaValida });

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.usuario.update({ where: { id: entry.userId }, data: { passwordHash: hash } });
    await prisma.passwordResetToken.update({ where: { id: entry.id }, data: { used: true } });

    res.json({ message: "Senha atualizada" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: "Erro interno" });
  }
}
