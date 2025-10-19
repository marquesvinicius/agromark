/**
 * Rate Limiter Middleware - AgroMark ESW424
 * Proteção básica contra spam de requisições
 */

// Cache simples em memória para rate limiting
const requestCounts = new Map();
const windowMs = 60 * 1000; // 1 minuto
const maxRequests = 100; // máximo 100 requests por minuto por IP

const transactionCounts = new Map();
const transactionWindowMs = 5 * 60 * 1000; // 5 minutos
const transactionMaxRequests = 20; // máximo 20 lançamentos em 5 minutos por IP

/**
 * Rate limiter básico por IP
 */
const rateLimiter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  // Limpar entradas antigas
  for (const [ip, data] of requestCounts.entries()) {
    if (now - data.firstRequest > windowMs) {
      requestCounts.delete(ip);
    }
  }
  
  // Verificar limite para este IP
  if (!requestCounts.has(clientIP)) {
    requestCounts.set(clientIP, {
      count: 1,
      firstRequest: now
    });
  } else {
    const data = requestCounts.get(clientIP);
    data.count++;
    
    if (data.count > maxRequests) {
      console.warn(`🚫 Rate limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Muitas requisições. Tente novamente em alguns minutos.',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
  }
  
  next();
};

const transactionRateLimiter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();

  for (const [ip, data] of transactionCounts.entries()) {
    if (now - data.firstRequest > transactionWindowMs) {
      transactionCounts.delete(ip);
    }
  }

  if (!transactionCounts.has(clientIP)) {
    transactionCounts.set(clientIP, {
      count: 1,
      firstRequest: now
    });
  } else {
    const data = transactionCounts.get(clientIP);
    data.count += 1;

    if (data.count > transactionMaxRequests) {
      console.warn(`🚫 Transaction rate limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Limite de lançamentos atingido. Tente novamente em alguns minutos.',
        retryAfter: Math.ceil(transactionWindowMs / 1000)
      });
    }
  }

  next();
};

/**
 * Rate limiter mais restritivo para endpoints sensíveis (LLM)
 */
const strictRateLimiter = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const strictWindowMs = 10 * 60 * 1000; // 10 minutos
  const strictMaxRequests = 10; // máximo 10 requests por 10 minutos
  
  // Cache separado para rate limiting restritivo
  if (!global.strictRequestCounts) {
    global.strictRequestCounts = new Map();
  }
  
  // Limpar entradas antigas
  for (const [ip, data] of global.strictRequestCounts.entries()) {
    if (now - data.firstRequest > strictWindowMs) {
      global.strictRequestCounts.delete(ip);
    }
  }
  
  // Verificar limite para este IP
  if (!global.strictRequestCounts.has(clientIP)) {
    global.strictRequestCounts.set(clientIP, {
      count: 1,
      firstRequest: now
    });
  } else {
    const data = global.strictRequestCounts.get(clientIP);
    data.count++;
    
    if (data.count > strictMaxRequests) {
      console.warn(`🚫 Strict rate limit exceeded for IP: ${clientIP}`);
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Limite de requisições para IA excedido. Aguarde 10 minutos.',
        retryAfter: Math.ceil(strictWindowMs / 1000)
      });
    }
  }
  
  next();
};

module.exports = {
  rateLimiter,
  strictRateLimiter,
  transactionRateLimiter
};


