import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prisma from "../prisma.js";
import { validarCPF } from "../utils/validacao_cpf.js";
import crypto from "crypto";
import dns from "node:dns";
import nodemailer from "nodemailer";
import { authenticate, authorize } from "../middlewares/auth.middleware.js";

const SALT_ROUNDS = 10;

//Função para gerar número de matrícula automaticamente
async function gerarMatricula() {
  const ano = new Date().getFullYear();
  const ultimoUsuario = await prisma.usuario.findFirst({
    where: { num_matricula: { not: null } },
    orderBy: { num_matricula: "desc" },
    select: { num_matricula: true },
  });

  const base = ano * 10000;
  // Exemplo: 20250000
  const proximaMatricula = ultimoUsuario?.num_matricula
    ? ultimoUsuario.num_matricula + 1
    : base + 1;
  return proximaMatricula;
}

// Função para validar força da senha
function validarSenhaForte(senha) {
  if (typeof senha !== "string") return "Senha inválida";
  if (senha.length < 8) return "A senha deve ter no mínimo 8 caracteres";
  if (!/[A-Z]/.test(senha)) return "A senha deve ter pelo menos uma letra maiúscula";
  if (!/[a-z]/.test(senha)) return "A senha deve ter pelo menos uma letra minúscula";
  if (!/\d/.test(senha)) return "A senha deve conter pelo menos um número";
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

// Função para verificar domínio de e-mail
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

export async function register(req, res) {
  try {
    const {
      nome,
      nome_social,
      email,
      cpf,
      dataNascimento,
      tipo_usuario,
      password,
      genero,
      telefone,
      endereco,
      grau,
      imagem_perfil_url,
      id_faixa,
      cargo_aluno,
      ativo = true,
    } = req.body;

    if (!nome || !cpf || !dataNascimento || !tipo_usuario || !password || !genero) {
      return res.status(400).json({
        message: "Campos obrigatórios: nome, cpf, dataNascimento, tipo_usuario, password e genero",
      });
    }

    if (!["PROFESSOR", "COORDENADOR", "ALUNO"].includes(tipo_usuario)) {
      return res.status(400).json({ message: "Tipo de usuário inválido" });
    }

    if (!["MASCULINO", "FEMININO", "OUTRO"].includes(genero)) {
      return res.status(400).json({ message: "Gênero inválido" });
    }

    if (!validarCPF(cpf)) return res.status(400).json({ message: "CPF inválido" });

    const senhaValida = validarSenhaForte(password);
    if (senhaValida !== true) return res.status(400).json({ message: senhaValida });

    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Formato de e-mail inválido" });
      }

      const dominioValido = await verificarDominioEmail(email);
      if (!dominioValido) {
        return res.status(400).json({ message: "Domínio de e-mail inexistente ou inválido" });
      }
    }

    const existente = await prisma.usuario.findFirst({
      where: {
        OR: [
          { cpf },
          email ? { email } : undefined,
        ].filter(Boolean),
      },
    });

    if (existente) {
      return res.status(409).json({
        message: "Já existe um usuário com este CPF ou e-mail",
      });
    }

    //Gera número de matrícula automaticamente
    const num_matricula = await gerarMatricula();

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const generoMap = { MASCULINO: "M", FEMININO: "F", OUTRO: "OUTRO" };

    const usuario = await prisma.usuario.create({
      data: {
        tipo_usuario,
        cargo_aluno: tipo_usuario === "ALUNO" ? cargo_aluno || "ALUNO" : null,
        nome,
        nome_social: nome_social || null,
        num_matricula,
        cpf,
        dataNascimento: new Date(dataNascimento),
        telefone: telefone || null,
        endereco: endereco || null,
        grau: grau ? Number(grau) : null,
        email: email || null,
        genero: generoMap[genero],
        imagem_perfil_url: imagem_perfil_url || null,
        ativo: Boolean(ativo),
        id_faixa: id_faixa ? Number(id_faixa) : null,
        passwordHash,
      },
      include: {
        faixa: true,
        responsaveis: true,
        aluno_turmas: { include: { turma: true } },
      },
    });

    const hashedId = await hashId(usuario.id);

    res.status(201).json({
      message: "Usuário registrado com sucesso",
      usuario: { ...usuario, id: hashedId },
    });
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);
    res
      .status(error.status || 500)
      .json({ message: error.message || "Erro interno no servidor" });
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

    if (!identifier || !password) {
      return res.status(400).json({ message: "Informe o identificador e a senha" });
    }

    const user = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: identifier },
          { cpf: identifier },
          { nome: identifier },
          { num_matricula: isNaN(Number(identifier)) ? -1 : Number(identifier) },
        ],
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    //Apenas COORDENADOR e PROFESSOR podem logar
    if (!["COORDENADOR", "PROFESSOR"].includes(user.tipo_usuario)) {
      return res.status(403).json({ message: "Apenas coordenadores e professores podem acessar o sistema" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    // Atualiza último login
    await prisma.usuario.update({
      where: { id: user.id },
      data: { ultimo_login: new Date() },
    });

    // Gera JWT
    const payload = { sub: user.id, tipo_usuario: user.tipo_usuario, nome: user.nome };
    const { token } = createJwt(payload);
    const hashedId = await hashId(user.id);

    res.status(200).json({
      token,
      expiresIn: process.env.JWT_EXPIRES_IN,
      user: { ...user, id: hashedId },
    });

  } catch (e) {
    console.error("Erro no login:", e);
    res.status(500).json({ message: "Erro interno no servidor" });
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
  subject: " Recuperação de Senha - Morimitsu",
  html: `
  <div style="font-family: 'Poppins', 'Arial', sans-serif; background: radial-gradient(circle at top left, #000000, #1a1a1a); color: #fff; padding: 40px 0; text-align: center;">
    <div style="max-width: 520px; margin: auto; background: #181818; border-radius: 16px; box-shadow: 0 8px 25px rgba(0,0,0,0.6); overflow: hidden; border-top: 5px solid #690808;">
      
      <div style="background: linear-gradient(90deg, #690808, #a00000); padding: 25px 0;">
        <h1 style="font-size: 34px; margin: 0; letter-spacing: 2px; color: #fff;">
           MORIMITSU 
        </h1>
        <p style="font-size: 14px; margin-top: 6px; color: #ffe4e4;">
          Disciplina, força e superação — até na recuperação de senha!
        </p>
      </div>

      <div style="padding: 30px;">
        <p style="font-size: 16px; color: #f5f5f5; margin-bottom: 10px;"> Olá, guerreiro(a)!</p>
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
          Se você não solicitou essa ação, ignore este e-mail — continue treinando firme 
        </p>
      </div>

      <div style="background: #111; padding: 15px; font-size: 12px; color: #666;">
        © ${new Date().getFullYear()} <b>Morimitsu Jiu-Jitsu</b>.<br>
        <span style="color: #ff2b2b;"> Oss! Continue forte no caminho do guerreiro.</span>
      </div>
    </div>
  </div>
  `,
};


  await transporter.sendMail(mailOptions);
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

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: "As senhas não coincidem" });
    }

    const entry = await prisma.passwordResetToken.findUnique({
      where: { token: code },
      include: { user: true },
    });

    if (!entry || entry.used) {
      return res.status(400).json({ message: "Código inválido ou já usado" });
    }

    if (entry.expiresAt < new Date()) {
      return res.status(400).json({ message: "Código expirado" });
    }

    const senhaValida = validarSenhaForte(newPassword);
    if (senhaValida !== true) {
      return res.status(400).json({ message: senhaValida });
    }

    const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

    await prisma.usuario.update({
      where: { id: entry.userId },
      data: { passwordHash: hash },
    });

    await prisma.passwordResetToken.update({
      where: { id: entry.id },
      data: { used: true },
    });

    return res.json({ message: "Senha atualizada com sucesso" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: "Erro interno" });
  }
}