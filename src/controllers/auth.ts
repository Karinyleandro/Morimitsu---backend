/*import { Request, Response } from "express";
// import { UsuarioService } from "../services/usuario_service";
// import { AuthRequest } from "../middlewares/authorization_auth";

export class AuthController {
  // Cadastro de coordenador (usado só no setup inicial ou por admin)
  static async registerCoordinator(req: Request, res: Response) {
    try {
      const user = await UsuarioService.createCoordinator(req.body);
      return res.status(201).json({
        message: "Coordenador cadastrado com sucesso!",
        user
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  // Cadastro de professor (somente coordenador autenticado pode fazer)
  static async registerProfessor(req: AuthRequest, res: Response) {
    try {
      if (!req.user) return res.status(401).json({ error: "Usuário não autenticado" });

      const user = await UsuarioService.createProfessor(req.user.id, req.body);
      return res.status(201).json({
        message: "Professor cadastrado com sucesso!",
        user
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
  }

  // Login (por CPF ou email)
  static async login(req: Request, res: Response) {
    try {
      const { identifier, senha } = req.body; 
      if (!identifier || !senha)
        return res.status(400).json({ error: "CPF/email e senha são obrigatórios" });

      const { usuario, token } = await UsuarioService.loginByCpfOrEmail(identifier, senha);

      return res.status(200).json({
        message: "Login bem-sucedido!",
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          cargo: usuario.cargo,
          email: usuario.email,
          cpf: usuario.cpf
        }
      });
    } catch (err: any) {
      return res.status(401).json({ error: err.message });
    }
  }
}
*/