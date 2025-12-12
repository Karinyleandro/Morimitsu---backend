const DEFAULT_IMG = "/fotoperfilsvg/Frame.svg";

export function getFotoPerfil(imagem_perfil_url) {
  return imagem_perfil_url ?? DEFAULT_IMG;
}
