const db    = require('../database/db');
const { v4: uuid } = require('uuid');
const now   = () => new Date().toISOString();

// ── LISTAR ────────────────────────────────────────────────────────────────
exports.listar = (req, res) => {
  const { busca = '', pagina = 1, limite = 20 } = req.query;
  const off  = (parseInt(pagina) - 1) * parseInt(limite);
  const like = `%${busca}%`;
  const rows = db.prepare(`
    SELECT p.*, c.nome AS cliente_nome_atual
    FROM projetos p
    LEFT JOIN clientes c ON c.id = p.cliente_id
    WHERE p.cliente_nome LIKE ? OR p.titulo LIKE ? OR p.cliente_cpf LIKE ?
    ORDER BY p.atualizado_em DESC
    LIMIT ? OFFSET ?
  `).all(like, like, like, parseInt(limite), off);
  const total = db.prepare(`
    SELECT COUNT(*) as n FROM projetos
    WHERE cliente_nome LIKE ? OR titulo LIKE ? OR cliente_cpf LIKE ?
  `).get(like, like, like).n;
  res.json({ projetos: rows, paginacao: { total, pagina: parseInt(pagina), limite: parseInt(limite) } });
};

// ── BUSCAR ────────────────────────────────────────────────────────────────
exports.buscar = (req, res) => {
  const p = db.prepare('SELECT * FROM projetos WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ erro: 'Projeto não encontrado' });
  if (p.rebanho_json) try { p.rebanho = JSON.parse(p.rebanho_json); } catch(e) { p.rebanho = []; }
  if (p.imovel_json)  try { p.imovel  = JSON.parse(p.imovel_json);  } catch(e) { p.imovel  = {}; }
  res.json({ projeto: p });
};

// ── CRIAR ─────────────────────────────────────────────────────────────────
exports.criar = (req, res) => {
  const d = req.body;
  if (!d.cliente_nome) return res.status(400).json({ erro: 'Nome do cliente é obrigatório' });
  const id = uuid();
  db.prepare(`
    INSERT INTO projetos (
      id, cliente_id, cliente_nome, cliente_cpf, titulo, tipo,
      banco, safra, agencia, num_cc, valor, juros, prazo,
      data_reembolso, tipo_assistencia, financiada, rnp, endereco_astec,
      fiador_nome, fiador_cpf, atividade, fase_producao, sistema,
      animais_custeados, produtividade, produto,
      rebanho_json, imovel_json, status
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
    id,
    d.cliente_id || null,
    d.cliente_nome,
    d.cliente_cpf || '',
    d.titulo || `Projeto - ${d.cliente_nome}`,
    d.tipo || 'custeio',
    d.banco || '', d.safra || '', d.agencia || '', d.num_cc || '',
    parseFloat(d.valor) || 0,
    parseFloat(d.juros) || 6,
    parseInt(d.prazo)   || 20,
    d.data_reembolso || '',
    d.tipo_assistencia || '', d.financiada || 'Não',
    d.rnp || '', d.endereco_astec || '',
    d.fiador_nome || '', d.fiador_cpf || '',
    d.atividade || '', d.fase_producao || '', d.sistema || '',
    parseInt(d.animais_custeados) || 0,
    d.produtividade || '', d.produto || '',
    JSON.stringify(d.rebanho || []),
    JSON.stringify(d.imovel  || {}),
    d.status || 'rascunho'
  );
  res.status(201).json({ id, mensagem: 'Projeto salvo' });
};

// ── ATUALIZAR ─────────────────────────────────────────────────────────────
exports.atualizar = (req, res) => {
  const d = req.body;
  const existing = db.prepare('SELECT id FROM projetos WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ erro: 'Projeto não encontrado' });
  db.prepare(`
    UPDATE projetos SET
      cliente_id=?, cliente_nome=?, cliente_cpf=?, titulo=?, tipo=?,
      banco=?, safra=?, agencia=?, num_cc=?, valor=?, juros=?, prazo=?,
      data_reembolso=?, tipo_assistencia=?, financiada=?, rnp=?, endereco_astec=?,
      fiador_nome=?, fiador_cpf=?, atividade=?, fase_producao=?, sistema=?,
      animais_custeados=?, produtividade=?, produto=?,
      rebanho_json=?, imovel_json=?, status=?,
      atualizado_em=?
    WHERE id=?
  `).run(
    d.cliente_id || null,
    d.cliente_nome || '', d.cliente_cpf || '',
    d.titulo || '', d.tipo || 'custeio',
    d.banco || '', d.safra || '', d.agencia || '', d.num_cc || '',
    parseFloat(d.valor) || 0, parseFloat(d.juros) || 6, parseInt(d.prazo) || 20,
    d.data_reembolso || '', d.tipo_assistencia || '', d.financiada || 'Não',
    d.rnp || '', d.endereco_astec || '',
    d.fiador_nome || '', d.fiador_cpf || '',
    d.atividade || '', d.fase_producao || '', d.sistema || '',
    parseInt(d.animais_custeados) || 0,
    d.produtividade || '', d.produto || '',
    JSON.stringify(d.rebanho || []),
    JSON.stringify(d.imovel  || {}),
    d.status || 'rascunho',
    now(),
    req.params.id
  );
  res.json({ mensagem: 'Projeto atualizado' });
};

// ── REMOVER ───────────────────────────────────────────────────────────────
exports.remover = (req, res) => {
  const existing = db.prepare('SELECT id FROM projetos WHERE id=?').get(req.params.id);
  if (!existing) return res.status(404).json({ erro: 'Projeto não encontrado' });
  db.prepare('DELETE FROM projetos WHERE id=?').run(req.params.id);
  res.json({ mensagem: 'Projeto removido' });
};
