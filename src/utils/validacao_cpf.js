export function validarCPF(cpfRaw) {
  const cpf = String(cpfRaw ?? "")
    .normalize("NFKD")
    .replace(/[^\d]/g, "");

  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const calcularDigito = (tamanho) => {
    const numeros = cpf.slice(0, tamanho - 1).split("").map(Number);
    const soma = numeros.reduce((acc, num, i) => acc + num * (tamanho - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const digito1 = calcularDigito(10);
  const digito2 = calcularDigito(11);

  return digito1 === Number(cpf[9]) && digito2 === Number(cpf[10]);
}
