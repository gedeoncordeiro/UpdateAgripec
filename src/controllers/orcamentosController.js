const db    = require('../database/db');
const { v4: uuid } = require('uuid');
const now   = () => new Date().toISOString();

// ── LISTAR ────────────────────────────────────────────────────────────────
exports.listar = (req, res) => {
  const { busca = '', pagina = 1, limite = 20 } = req.query;
  const off  = (parseInt(pagina) - 1) * parseInt(limite);
  const like = `%${busca}%`;
  const rows = db.prepare(`
    SELECT o.*,
      (SELECT SUM((oi.quantidade * oi.preco_unitario) * (1 - oi.desconto_pct/100.0))
       FROM orcamento_itens oi WHERE oi.orcamento_id = o.id) AS valor_total,
      (SELECT COUNT(*) FROM orcamento_itens oi WHERE oi.orcamento_id = o.id) AS total_itens
    FROM orcamentos o
    WHERE o.titulo LIKE ? OR o.cliente_nome LIKE ?
    ORDER BY o.atualizado_em DESC
    LIMIT ? OFFSET ?
  `).all(like, like, parseInt(limite), off);
  const total = db.prepare(`
    SELECT COUNT(*) as n FROM orcamentos WHERE titulo LIKE ? OR cliente_nome LIKE ?
  `).get(like, like).n;
  res.json({ orcamentos: rows, paginacao: { total, pagina: parseInt(pagina), limite: parseInt(limite) } });
};

// ── BUSCAR COM ITENS ───────────────────────────────────────────────────────
exports.buscar = (req, res) => {
  const o = db.prepare('SELECT * FROM orcamentos WHERE id=?').get(req.params.id);
  if (!o) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  o.itens = db.prepare('SELECT * FROM orcamento_itens WHERE orcamento_id=? ORDER BY ordem').all(req.params.id);
  res.json({ orcamento: o });
};

// ── CRIAR ─────────────────────────────────────────────────────────────────
exports.criar = (req, res) => {
  const { titulo, cliente_id, cliente_nome, descricao, validade_dias, status, observacoes, itens } = req.body;
  if (!titulo) return res.status(400).json({ erro: 'Título obrigatório' });
  const id = uuid();
  db.prepare(`
    INSERT INTO orcamentos (id, cliente_id, cliente_nome, titulo, descricao, validade_dias, status, observacoes)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(id, cliente_id || null, cliente_nome || '', titulo, descricao || '', parseInt(validade_dias) || 30, status || 'aberto', observacoes || '');

  if (Array.isArray(itens)) {
    const ins = db.prepare(`INSERT INTO orcamento_itens (id,orcamento_id,descricao,unidade,quantidade,preco_unitario,desconto_pct,ordem) VALUES (?,?,?,?,?,?,?,?)`);
    itens.forEach((it, i) => ins.run(uuid(), id, it.descricao, it.unidade || 'un', parseFloat(it.quantidade) || 1, parseFloat(it.preco_unitario) || 0, parseFloat(it.desconto_pct) || 0, i));
  }
  res.status(201).json({ id, mensagem: 'Orçamento criado' });
};

// ── ATUALIZAR ─────────────────────────────────────────────────────────────
exports.atualizar = (req, res) => {
  const { titulo, cliente_id, cliente_nome, descricao, validade_dias, status, observacoes, itens } = req.body;
  const existing = db.prepare('SELECT id FROM orcamentos WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ erro: 'Orçamento não encontrado' });

  db.prepare(`
    UPDATE orcamentos SET titulo=?, cliente_id=?, cliente_nome=?, descricao=?,
      validade_dias=?, status=?, observacoes=?, atualizado_em=?
    WHERE id=?
  `).run(titulo, cliente_id || null, cliente_nome || '', descricao || '', parseInt(validade_dias) || 30, status || 'aberto', observacoes || '', now(), req.params.id);

  // Re-insert items
  db.prepare('DELETE FROM orcamento_itens WHERE orcamento_id=?').run(req.params.id);
  if (Array.isArray(itens)) {
    const ins = db.prepare(`INSERT INTO orcamento_itens (id,orcamento_id,descricao,unidade,quantidade,preco_unitario,desconto_pct,ordem) VALUES (?,?,?,?,?,?,?,?)`);
    itens.forEach((it, i) => ins.run(uuid(), req.params.id, it.descricao, it.unidade || 'un', parseFloat(it.quantidade) || 1, parseFloat(it.preco_unitario) || 0, parseFloat(it.desconto_pct) || 0, i));
  }
  res.json({ mensagem: 'Orçamento atualizado' });
};

// ── REMOVER ───────────────────────────────────────────────────────────────
exports.remover = (req, res) => {
  const existing = db.prepare('SELECT id FROM orcamentos WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ erro: 'Orçamento não encontrado' });
  db.prepare('DELETE FROM orcamentos WHERE id=?').run(req.params.id);
  res.json({ mensagem: 'Orçamento removido' });
};
