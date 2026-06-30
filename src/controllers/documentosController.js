const db   = require('../database/db');
const path = require('path');
const fs   = require('fs');
const { v4: uuid } = require('uuid');

// ── TIPOS de documento do imóvel ──────────────────────────────────────────
const TIPOS_CERTIDAO = [
  'inteiro_teor',
  'cadeia_dominial',
  'onus',
  'situacao_juridica',
  'car',
  'ccir',
  'itr',
  'mapa_memorial',
  'outros',
];

exports.listarDocumentos = (req, res) => {
  const { imovel_id } = req.params;
  const docs = db.prepare(
    'SELECT * FROM imovel_documentos WHERE imovel_id=? ORDER BY tipo, criado_em DESC'
  ).all(imovel_id);
  res.json({ documentos: docs });
};

exports.adicionarDocumento = (req, res) => {
  const { imovel_id } = req.params;
  const { tipo, descricao } = req.body;

  if (!tipo) return res.status(400).json({ erro: 'Tipo obrigatório' });

  // Verifica se imóvel existe
  const im = db.prepare('SELECT id FROM imoveis WHERE id=? AND ativo=1').get(imovel_id);
  if (!im) return res.status(404).json({ erro: 'Imóvel não encontrado' });

  const id = uuid();
  let arquivo_path = null;
  let arquivo_nome = null;

  if (req.file) {
    arquivo_path = req.file.path;
    arquivo_nome = req.file.originalname;
  }

  db.prepare(
    `INSERT INTO imovel_documentos (id, imovel_id, tipo, descricao, arquivo_path, arquivo_nome)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, imovel_id, tipo, descricao || null, arquivo_path, arquivo_nome);

  res.status(201).json({
    documento: db.prepare('SELECT * FROM imovel_documentos WHERE id=?').get(id)
  });
};

exports.removerDocumento = (req, res) => {
  const { id } = req.params;
  const doc = db.prepare('SELECT * FROM imovel_documentos WHERE id=?').get(id);
  if (!doc) return res.status(404).json({ erro: 'Não encontrado' });

  // Remove arquivo físico se existir
  if (doc.arquivo_path && fs.existsSync(doc.arquivo_path)) {
    try { fs.unlinkSync(doc.arquivo_path); } catch(e) {}
  }

  db.prepare('DELETE FROM imovel_documentos WHERE id=?').run(id);
  res.json({ mensagem: 'Documento removido' });
};

exports.downloadDocumento = (req, res) => {
  const { id } = req.params;
  const doc = db.prepare('SELECT * FROM imovel_documentos WHERE id=?').get(id);
  if (!doc || !doc.arquivo_path) return res.status(404).json({ erro: 'Arquivo não encontrado' });
  if (!fs.existsSync(doc.arquivo_path)) return res.status(404).json({ erro: 'Arquivo não encontrado no servidor' });
  res.download(doc.arquivo_path, doc.arquivo_nome || path.basename(doc.arquivo_path));
};

// ── CONFIG DO SISTEMA (logomarca etc.) ────────────────────────────────────
exports.getConfig = (req, res) => {
  const rows = db.prepare('SELECT chave, valor FROM config_sistema').all();
  const config = {};
  for (const r of rows) config[r.chave] = r.valor;
  res.json({ config });
};

exports.salvarConfig = (req, res) => {
  const { chave, valor } = req.body;
  if (!chave) return res.status(400).json({ erro: 'Chave obrigatória' });
  db.prepare(
    `INSERT INTO config_sistema (chave, valor, atualizado_em) VALUES (?, ?, datetime('now'))
     ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor, atualizado_em=excluded.atualizado_em`
  ).run(chave, valor || null);
  res.json({ mensagem: 'Configuração salva' });
};

exports.uploadLogomarca = (req, res) => {
  if (!req.file) return res.status(400).json({ erro: 'Nenhum arquivo enviado' });

  // Remove logomarca anterior
  const atual = db.prepare("SELECT valor FROM config_sistema WHERE chave='logomarca_path'").get();
  if (atual?.valor && fs.existsSync(atual.valor)) {
    try { fs.unlinkSync(atual.valor); } catch(e) {}
  }

  const filePath = req.file.path;
  db.prepare(
    `INSERT INTO config_sistema (chave, valor, atualizado_em) VALUES ('logomarca_path', ?, datetime('now'))
     ON CONFLICT(chave) DO UPDATE SET valor=excluded.valor, atualizado_em=excluded.atualizado_em`
  ).run(filePath);

  res.json({ mensagem: 'Logomarca salva', path: filePath });
};

exports.getLogomarca = (req, res) => {
  const row = db.prepare("SELECT valor FROM config_sistema WHERE chave='logomarca_path'").get();
  if (!row?.valor || !fs.existsSync(row.valor)) return res.status(404).json({ erro: 'Sem logomarca' });
  res.sendFile(path.resolve(row.valor));
};
