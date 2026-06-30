// ── LINKS ÚTEIS ─────────────────────────────────────────────────────────
const db = require('../database/db');
const { v4: uuid } = require('uuid');

exports.listar = (req, res) => {
  try {
    const links = db.prepare('SELECT * FROM links_uteis ORDER BY ordem ASC, criado_em ASC').all();
    res.json({ links });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.criar = (req, res) => {
  const { titulo, url, descricao, ordem } = req.body;
  if (!titulo || !url) return res.status(400).json({ erro: 'Título e URL são obrigatórios' });
  try {
    const id = uuid();
    db.prepare(`INSERT INTO links_uteis (id, titulo, url, descricao, ordem)
                VALUES (?, ?, ?, ?, ?)`)
      .run(id, titulo.trim(), url.trim(), descricao?.trim() || null, ordem || 0);
    const link = db.prepare('SELECT * FROM links_uteis WHERE id=?').get(id);
    res.json({ link });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.atualizar = (req, res) => {
  const { titulo, url, descricao, ordem } = req.body;
  if (!titulo || !url) return res.status(400).json({ erro: 'Título e URL são obrigatórios' });
  try {
    db.prepare(`UPDATE links_uteis SET titulo=?, url=?, descricao=?, ordem=? WHERE id=?`)
      .run(titulo.trim(), url.trim(), descricao?.trim() || null, ordem || 0, req.params.id);
    const link = db.prepare('SELECT * FROM links_uteis WHERE id=?').get(req.params.id);
    res.json({ link });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};

exports.remover = (req, res) => {
  try {
    db.prepare('DELETE FROM links_uteis WHERE id=?').run(req.params.id);
    res.json({ ok: true });
  } catch(e) { res.status(500).json({ erro: e.message }); }
};
