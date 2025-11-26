import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;

    if (!header || !header.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Token não fornecido" });
    }

    const token = header.split(" ")[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Token inválido ou expirado" });
    }

    // Verifica se foi revogado (logout)
    const revoked = await prisma.revokedToken.findUnique({
      where: { jti: payload.jti },
    });

    if (revoked) {
      return res.status(401).json({ message: "Token revogado" });
    }

    // Ajustado para bater com o token criado no controller
    req.user = {
      id: payload.sub,
      tipo: payload.tipo,
      nome: payload.nome,
    };

    next();
  } catch (err) {
    console.error("Erro no authenticate:", err);
    res.status(500).json({ message: "Erro interno" });
  }
}

export function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user)
      return res.status(401).json({ message: "Não autenticado" });

    // Correção: agora usa req.user.tipo
    if (!allowedRoles.includes(req.user.tipo)) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    next();
  };
}
