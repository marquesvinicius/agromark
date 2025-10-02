/**
 * Utilitários para processamento e validação de texto.
 */

/**
 * Verifica se um texto extraído de um PDF é "escaneável" e provavalmente contém dados úteis.
 * 
 * @param {string} text O texto a ser analisado.
 * @param {object} options Opções de validação.
 * @param {number} options.minLength Comprimento mínimo que o texto deve ter.
 * @param {number} options.alphanumericRatio Proporção mínima de caracteres alfanuméricos.
 * @returns {boolean} Retorna `true` se o texto for considerado escaneável, `false` caso contrário.
 */
function isTextScannable(text, options = {}) {
  const { minLength = 50, alphanumericRatio = 0.5 } = options;

  // 1. Verifica se o texto é nulo, indefinido ou muito curto
  if (!text || text.trim().length < minLength) {
    return false;
  }

  // 2. Conta os caracteres alfanuméricos (letras e números)
  const alphanumericChars = text.match(/[a-zA-Z0-9]/g);

  // Se não houver nenhum caractere alfanumérico, o texto não é válido
  if (!alphanumericChars) {
    return false;
  }

  // 3. Calcula a proporção de caracteres alfanuméricos em relação ao total
  const currentRatio = alphanumericChars.length / text.length;

  // 4. Se a proporção for menor que o mínimo esperado, considera-se não escaneável
  if (currentRatio < alphanumericRatio) {
    return false;
  }

  return true;
}

module.exports = {
  isTextScannable,
};

