const jwt = require('jsonwebtoken');
const db  = require('../database/db');
const JWT_SECRET = process.env.JWT_SECRET || 'agrogestao_secret_local_2024';

const auth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ erro: 'Token não fornecido' });

  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const user = db.prepare('SELECT id,nome,email,perfil,ativo FROM usuarios WHERE id=?').get(decoded.id);
    if (!user || !user.ativo) return res.status(401).json({ erro: 'Usuário inativo' });
    req.usuario = user;
    next();
  } catch {
    res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
};

const adminOnly = (req, res, next) =>
  req.usuario.perfil === 'admin' ? next() : res.status(403).json({ erro: 'Acesso restrito a admins' });

module.exports = { auth, adminOnly };
