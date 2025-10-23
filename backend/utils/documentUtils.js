const DIGITS_ONLY = /\D/g;

function normalizeDocumento(value) {
  if (!value) return '';
  return String(value).replace(DIGITS_ONLY, '');
}

// Validação relaxada para ambiente acadêmico. Apenas verifica o comprimento.
function isValidCPF(value) {
  const cpf = normalizeDocumento(value);
  if (!cpf || cpf.length !== 11) {
    return false;
  }
  return true;
}

// Validação relaxada para ambiente acadêmico. Apenas verifica o comprimento.
function isValidCNPJ(value) {
  const cnpj = normalizeDocumento(value);
  if (!cnpj || cnpj.length !== 14) {
    return false;
  }
  return true;
}

module.exports = {
  normalizeDocumento,
  isValidCPF,
  isValidCNPJ
};

