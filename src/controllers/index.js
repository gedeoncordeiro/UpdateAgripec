const db = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const JWT_SECRET = process.env.JWT_SECRET || 'agrogestao_secret_local_2024';
const now = () => new Date().toISOString();

// ── Validador de CPF (algoritmo oficial) ─────────────────────────────────
function validarCPF(cpf) {
  if (!cpf) return false;
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  // Rejeita sequências iguais
  if (/^(\d)\1{10}$/.test(digits)) return false;
  // Valida 1º dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let resto = (sum * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits[9])) return false;
  // Valida 2º dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  resto = (sum * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== parseInt(digits[10])) return false;
  return true;
}

// ── Formata CPF ──────────────────────────────────────────────────────────
function formatarCPF(cpf) {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11) return cpf;
  return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

// ── AUTH ─────────────────────────────────────────────────────────────────
exports.login = (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios' });
  const user = db.prepare('SELECT * FROM usuarios WHERE email=? AND ativo=1').get(email.toLowerCase().trim());
  if (!user || !bcrypt.compareSync(senha, user.senha))
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  const token = jwt.sign({ id: user.id, perfil: user.perfil }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, usuario: { id: user.id, nome: user.nome, email: user.email, perfil: user.perfil } });
};
exports.me = (req, res) => res.json({ usuario: req.usuario });
exports.listarUsuarios = (req, res) => {
  res.json({ usuarios: db.prepare('SELECT id,nome,email,perfil,ativo,criado_em FROM usuarios ORDER BY criado_em DESC').all() });
};
exports.criarUsuario = (req, res) => {
  const { nome, email, senha, perfil } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Nome, email e senha obrigatórios' });
  if (db.prepare('SELECT id FROM usuarios WHERE email=?').get(email.toLowerCase()))
    return res.status(409).json({ erro: 'Email já cadastrado' });
  db.prepare('INSERT INTO usuarios (id,nome,email,senha,perfil) VALUES (?,?,?,?,?)')
    .run(uuid(), nome, email.toLowerCase(), bcrypt.hashSync(senha, 10), perfil || 'operador');
  res.status(201).json({ mensagem: 'Usuário criado' });
};

// ── DASHBOARD ─────────────────────────────────────────────────────────────
exports.resumo = (req, res) => {
  const totalClientes = db.prepare('SELECT COUNT(*) as c FROM clientes WHERE ativo=1').get().c;
  const totalImoveis  = db.prepare('SELECT COUNT(*) as c, COALESCE(SUM(area_total),0) as area FROM imoveis WHERE ativo=1').get();
  const totalSem      = db.prepare('SELECT COALESCE(SUM(quantidade),0) as c FROM semoventes WHERE ativo=1').get().c;
  const valorPlantel  = db.prepare('SELECT COALESCE(SUM(quantidade*preco_unitario),0) as v FROM semoventes WHERE ativo=1').get().v;
  const porCategoria  = db.prepare(`SELECT categoria, SUM(quantidade) as total, SUM(quantidade*preco_unitario) as valor FROM semoventes WHERE ativo=1 GROUP BY categoria ORDER BY total DESC`).all();
  const porSituacao   = db.prepare(`SELECT situacao, COUNT(*) as total FROM imoveis WHERE ativo=1 GROUP BY situacao`).all();
  res.json({
    totais: { clientes: totalClientes, imoveis: totalImoveis.c, area_total: totalImoveis.area, cabecas: totalSem, valor_plantel: valorPlantel },
    graficos: { semoventes_por_categoria: porCategoria, imoveis_por_situacao: porSituacao },
  });
};

// ── CLIENTES ─────────────────────────────────────────────────────────────
exports.listarClientes = (req, res) => {
  const { busca = '', pagina = 1, limite = 20 } = req.query;
  const offset = (parseInt(pagina) - 1) * parseInt(limite);
  const like = `%${busca}%`;
  const total = db.prepare(`SELECT COUNT(*) as c FROM clientes WHERE ativo=1 AND (nome LIKE ? OR cpf LIKE ? OR email LIKE ?)`).get(like, like, like).c;
  const rows  = db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM imoveis i WHERE i.proprietario_id=c.id AND i.ativo=1) as total_imoveis
    FROM clientes c WHERE c.ativo=1 AND (c.nome LIKE ? OR c.cpf LIKE ? OR c.email LIKE ?)
    ORDER BY c.criado_em DESC LIMIT ? OFFSET ?
  `).all(like, like, like, parseInt(limite), offset);
  res.json({ clientes: rows, paginacao: { total, pagina: parseInt(pagina), limite: parseInt(limite) } });
};
exports.buscarCliente = (req, res) => {
  const c = db.prepare('SELECT * FROM clientes WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ erro: 'Não encontrado' });
  const imoveis = db.prepare('SELECT id,nome,area_total,municipio,uf,situacao FROM imoveis WHERE proprietario_id=? AND ativo=1').all(req.params.id);
  res.json({ cliente: c, imoveis });
};
exports.buscarClientePorCPF = (req, res) => {
  const cpfRaw = decodeURIComponent(req.params.cpf);
  const cpfLimpo = cpfRaw.replace(/\D/g, '');
  if (cpfLimpo.length !== 11) return res.status(400).json({ erro: 'CPF deve ter 11 dígitos' });
  // Busca ignorando formatação (., -)
  const c = db.prepare("SELECT * FROM clientes WHERE REPLACE(REPLACE(cpf,'.',''),'-','')=? AND ativo=1").get(cpfLimpo);
  if (!c) return res.status(404).json({ erro: 'Cliente não encontrado' });
  const imoveis = db.prepare('SELECT * FROM imoveis WHERE proprietario_id=? AND ativo=1').all(c.id);
  const semoventes = db.prepare(`
    SELECT s.*, i.nome as imovel_nome FROM semoventes s
    LEFT JOIN imoveis i ON i.id=s.imovel_id
    WHERE s.proprietario_id=? AND s.ativo=1 ORDER BY s.categoria
  `).all(c.id);
  res.json({ cliente: c, imoveis, semoventes });
};
exports.criarCliente = (req, res) => {
  const d = req.body;
  if (!d.nome || !d.cpf) return res.status(400).json({ erro: 'Nome e CPF obrigatórios' });
  const cpfLimpo = d.cpf.replace(/\D/g, '');
  if (!validarCPF(cpfLimpo)) return res.status(400).json({ erro: 'CPF inválido' });
  const cpfFormatado = formatarCPF(cpfLimpo);
  // Verifica duplicidade (com e sem formatação)
  const existente = db.prepare('SELECT id FROM clientes WHERE REPLACE(REPLACE(cpf,\'.\',\'\'),\'-\',\'\')=? AND id<>?').get(cpfLimpo, '');
  if (existente) return res.status(409).json({ erro: 'CPF já cadastrado' });
  const id = uuid();
  db.prepare(`INSERT INTO clientes (id,nome,cpf,rg,estado_civil,regime_casamento,nome_conjuge,cpf_conjuge,enquadramento,
    inscricao_estadual,endereco_logradouro,endereco_numero,endereco_complemento,endereco_bairro,
    endereco_cidade,endereco_uf,endereco_cep,telefone,email,observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id,d.nome,cpfFormatado,d.rg||null,d.estado_civil||null,d.regime_casamento||null,
      d.nome_conjuge||null,d.cpf_conjuge||null,d.enquadramento||'PRONAF',d.inscricao_estadual||null,
      d.endereco_logradouro||null,d.endereco_numero||null,d.endereco_complemento||null,
      d.endereco_bairro||null,d.endereco_cidade||null,d.endereco_uf||null,d.endereco_cep||null,
      d.telefone||null,d.email||null,d.observacoes||null);
  res.status(201).json({ cliente: db.prepare('SELECT * FROM clientes WHERE id=?').get(id) });
};
exports.atualizarCliente = (req, res) => {
  const d = req.body;
  const id = req.params.id;

  // Verifica se o cliente existe
  const existente = db.prepare('SELECT id FROM clientes WHERE id=?').get(id);
  if (!existente) return res.status(404).json({ erro: 'Cliente não encontrado' });

  // Se CPF foi enviado, valida e verifica duplicidade
  if (d.cpf !== undefined) {
    const cpfLimpo = String(d.cpf).replace(/\D/g, '');
    if (!validarCPF(cpfLimpo)) return res.status(400).json({ erro: 'CPF inválido' });
    const cpfFormatado = formatarCPF(cpfLimpo);
    d.cpf = cpfFormatado;
    // Verifica duplicidade excluindo o próprio cliente
    const duplicado = db.prepare('SELECT id FROM clientes WHERE REPLACE(REPLACE(cpf,\'.\',\'\'),\'-\',\'\')=? AND id<>?').get(cpfLimpo, id);
    if (duplicado) return res.status(409).json({ erro: 'CPF já cadastrado para outro cliente' });
  }

  const campos = ['nome','cpf','rg','estado_civil','regime_casamento','nome_conjuge','cpf_conjuge','enquadramento',
    'inscricao_estadual','endereco_logradouro','endereco_numero','endereco_complemento','endereco_bairro',
    'endereco_cidade','endereco_uf','endereco_cep','telefone','email','observacoes'];
  const sets = campos.filter(c => d[c] !== undefined).map(c => `${c}=?`);
  const vals = campos.filter(c => d[c] !== undefined).map(c => d[c] === '' ? null : d[c]);
  if (!sets.length) return res.status(400).json({ erro: 'Sem campos para atualizar' });
  db.prepare(`UPDATE clientes SET ${sets.join(',')},atualizado_em=? WHERE id=?`).run(...vals, now(), id);
  res.json({ cliente: db.prepare('SELECT * FROM clientes WHERE id=?').get(id) });
};
exports.removerCliente = (req, res) => {
  db.prepare('UPDATE clientes SET ativo=0,atualizado_em=? WHERE id=?').run(now(), req.params.id);
  res.json({ mensagem: 'Removido' });
};

// ── Conversão robusta de coordenadas (DMS ↔ Decimal) ────────────────────
// Aceita: -3.4521, -3,4521, 03°24'33,57"S, 03°24'33.57", 03°30'23,7",
//         03°24'33,57 (sem direção → assume S/O para Brasil), etc.
function parseCoordenada(valor, tipo) {
  if (valor === null || valor === undefined || valor === '') return null;
  const str = String(valor).trim();
  if (str === '') return null;

  // ── Se contém símbolo de grau (°), vai direto para DMS ──────────────
  // (parseFloat em "03°..." retornaria 3, mascarando o DMS)
  if (str.includes('°')) {
    // Vai para conversão DMS
  } else {
    // ── Tenta converter diretamente como decimal (com ponto ou vírgula) ─
    const comPonto = parseFloat(str.replace(',', '.'));
    if (!isNaN(comPonto)) return comPonto;
    // Não é decimal nem DMS → retorna null
    return null;
  }

  // ── Conversão DMS ───────────────────────────────────────────────────
  // Remove caracteres não essenciais, normaliza separadores
  let s = str
    .replace(/[°º]/g, ' ')      // grau → espaço
    .replace(/['´`]/g, ' ')     // minuto → espaço
    .replace(/["″"']/g, ' ')   // segundo → espaço
    .replace(/,/g, '.')         // vírgula decimal → ponto
    .replace(/\s+/g, ' ')       // múltiplos espaços → 1
    .trim();

  // ── Detecta e aplica direção (N/S/L/O/W) ──────────────────────────
  // Se não houver direção explicita, assume S (Sul) para latitude
  // e O (Oeste) para longitude (padrão brasileiro).
  let sinal = 1;
  const temDirecao = /[NSLOW]$/i.test(s);
  if (temDirecao) {
    const dir = s.slice(-1).toUpperCase();
    if (dir === 'S' || dir === 'O' || dir === 'W') sinal = -1;
    s = s.slice(0, -1).trim();
  } else {
    // Sem direção: geograficamente, coordenadas brasileiras são S/O
    // latitude (tipo='lat'): S = negativo; longitude (tipo='lng'): O = negativo
    sinal = (tipo === 'lng') ? -1 : -1; // ambas negativas para o Brasil
  }

  // ── Extrai graus, minutos, segundos ────────────────────────────────
  const partes = s.split(' ').filter(p => p !== '').map(p => parseFloat(p));
  if (partes.length === 0) return null;

  let graus = Math.abs(partes[0]); // sempre positivo antes de aplicar sinal
  let minutos = partes.length > 1 ? Math.abs(partes[1]) : 0;
  let segundos = partes.length > 2 ? Math.abs(partes[2]) : 0;

  // Normaliza overflow (ex: 75 minutos → 1 grau + 15 minutos)
  if (minutos >= 60) { graus += Math.floor(minutos / 60); minutos = minutos % 60; }
  if (segundos >= 60) { minutos += Math.floor(segundos / 60); segundos = segundos % 60; }

  const decimal = graus + (minutos / 60) + (segundos / 3600);
  return parseFloat((decimal * sinal).toFixed(10));
}

// ── Rota exclusiva para o mapa: retorna TODOS os imóveis com coordenadas ──
exports.listarImoveisMapa = (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT i.id, i.nome, i.area_total, i.municipio, i.uf, i.situacao,
             i.latitude, i.longitude, i.proprietario_id,
             c.nome AS proprietario_nome
      FROM imoveis i
      LEFT JOIN clientes c ON c.id = i.proprietario_id
      WHERE i.ativo = 1
        AND i.latitude IS NOT NULL AND i.latitude != ''
        AND i.longitude IS NOT NULL AND i.longitude != ''
      ORDER BY i.nome
    `).all();

    // Converte coordenadas e filtra apenas as válidas
    const imoveis = [];
    const erros = [];
    for (const im of rows) {
      const lat = parseCoordenada(im.latitude, 'lat');
      const lng = parseCoordenada(im.longitude, 'lng');
      if (lat === null || lng === null || (lat === 0 && lng === 0)) {
        erros.push({ id: im.id, nome: im.nome, lat_original: im.latitude, lng_original: im.longitude });
        continue;
      }
      imoveis.push({
        id: im.id,
        nome: im.nome,
        area_total: im.area_total,
        municipio: im.municipio,
        uf: im.uf,
        situacao: im.situacao,
        proprietario_nome: im.proprietario_nome,
        latitude: lat,
        longitude: lng,
      });
    }

    if (erros.length > 0) {
      console.warn(`[Mapa] ${erros.length} imóveis ignorados por coordenadas inválidas:`, erros.slice(0, 5));
    }

    res.json({
      total: imoveis.length,
      ignorados: erros.length,
      imoveis,
    });
  } catch (e) {
    console.error('Erro listarImoveisMapa:', e);
    res.status(500).json({ erro: 'Erro ao carregar imóveis para o mapa' });
  }
};

// ── IMÓVEIS ──────────────────────────────────────────────────────────────
exports.listarImoveis = (req, res) => {
  const { busca = '', situacao = '', pagina = 1, limite = 20 } = req.query;
  const offset = (parseInt(pagina) - 1) * parseInt(limite);
  const like = `%${busca}%`;
  let where = 'WHERE i.ativo=1 AND (i.nome LIKE ? OR i.municipio LIKE ?)';
  const params = [like, like];
  if (situacao) { where += ' AND i.situacao=?'; params.push(situacao); }
  const total = db.prepare(`SELECT COUNT(*) as c FROM imoveis i ${where}`).get(...params).c;
  const rows  = db.prepare(`SELECT i.*, c.nome as proprietario_nome FROM imoveis i
    LEFT JOIN clientes c ON c.id=i.proprietario_id ${where} ORDER BY i.criado_em DESC LIMIT ? OFFSET ?`)
    .all(...params, parseInt(limite), offset);
  res.json({ imoveis: rows, paginacao: { total, pagina: parseInt(pagina), limite: parseInt(limite) } });
};
exports.buscarImovel = (req, res) => {
  const im = db.prepare('SELECT i.*,c.nome as proprietario_nome FROM imoveis i LEFT JOIN clientes c ON c.id=i.proprietario_id WHERE i.id=?').get(req.params.id);
  if (!im) return res.status(404).json({ erro: 'Não encontrado' });
  const sem = db.prepare('SELECT * FROM semoventes WHERE imovel_id=? AND ativo=1').all(req.params.id);
  res.json({ imovel: im, semoventes: sem });
};
exports.criarImovel = (req, res) => {
  const d = req.body;
  if (!d.nome) return res.status(400).json({ erro: 'Nome obrigatório' });
  const id = uuid();
  db.prepare(`INSERT INTO imoveis (id,nome,area_total,logradouro,municipio,uf,cep,situacao,matricula,cri,
    data_registro,tipo_documento,documento_path,cib_nirf,ccir,sigef,latitude,longitude,
    car,area_consolidada,area_vegetacao_nativa,area_reserva_legal,area_servidao,
    roteiro_acesso,valor_avaliacao,data_valor_avaliacao,estado_conservacao,observacoes,proprietario_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id,d.nome,d.area_total||null,d.logradouro||null,d.municipio||null,d.uf||null,d.cep||null,
      d.situacao||'registrada',d.matricula||null,d.cri||null,d.data_registro||null,
      d.tipo_documento||null,req.file?.path||null,
      d.cib_nirf||null,d.ccir||null,d.sigef||null,d.latitude||null,d.longitude||null,
      d.car||null,d.area_consolidada||null,d.area_vegetacao_nativa||null,
      d.area_reserva_legal||null,d.area_servidao||null,
      d.roteiro_acesso||null,d.valor_avaliacao||null,d.data_valor_avaliacao||null,
      d.estado_conservacao||null,d.observacoes||null,d.proprietario_id||null);
  res.status(201).json({ imovel: db.prepare('SELECT * FROM imoveis WHERE id=?').get(id) });
};
exports.atualizarImovel = (req, res) => {
  const d = req.body;
  const id = req.params.id;
  const existente = db.prepare('SELECT id FROM imoveis WHERE id=?').get(id);
  if (!existente) return res.status(404).json({ erro: 'Imóvel não encontrado' });
  const campos = ['nome','area_total','logradouro','municipio','uf','cep','situacao','matricula','cri',
    'data_registro','tipo_documento','cib_nirf','ccir','sigef','latitude','longitude',
    'car','area_consolidada','area_vegetacao_nativa','area_reserva_legal','area_servidao',
    'roteiro_acesso','valor_avaliacao','data_valor_avaliacao','estado_conservacao','observacoes','proprietario_id'];
  const sets = campos.filter(c => d[c] !== undefined).map(c => `${c}=?`);
  const vals = campos.filter(c => d[c] !== undefined).map(c => d[c] === '' ? null : d[c]);
  if (req.file) { sets.push('documento_path=?'); vals.push(req.file.path); }
  if (!sets.length) return res.status(400).json({ erro: 'Sem campos para atualizar' });
  db.prepare(`UPDATE imoveis SET ${sets.join(',')},atualizado_em=? WHERE id=?`).run(...vals, now(), id);
  res.json({ imovel: db.prepare('SELECT * FROM imoveis WHERE id=?').get(id) });
};
exports.removerImovel = (req, res) => {
  db.prepare('UPDATE imoveis SET ativo=0,atualizado_em=? WHERE id=?').run(now(), req.params.id);
  res.json({ mensagem: 'Removido' });
};

// ── SEMOVENTES ───────────────────────────────────────────────────────────
exports.listarSemoventes = (req, res) => {
  const { categoria = '', imovel_id = '', pagina = 1, limite = 20 } = req.query;
  const offset = (parseInt(pagina) - 1) * parseInt(limite);
  let where = 'WHERE s.ativo=1';
  const params = [];
  if (categoria) { where += ' AND s.categoria=?'; params.push(categoria); }
  if (imovel_id) { where += ' AND s.imovel_id=?'; params.push(imovel_id); }
  const total = db.prepare(`SELECT COUNT(*) as c FROM semoventes s ${where}`).get(...params).c;
  const rows  = db.prepare(`
    SELECT s.*, (s.quantidade*s.preco_unitario) as valor_total,
      i.nome as imovel_nome, c.nome as proprietario_nome
    FROM semoventes s
    LEFT JOIN imoveis i ON i.id=s.imovel_id
    LEFT JOIN clientes c ON c.id=s.proprietario_id
    ${where} ORDER BY s.criado_em DESC LIMIT ? OFFSET ?
  `).all(...params, parseInt(limite), offset);
  res.json({ semoventes: rows, paginacao: { total, pagina: parseInt(pagina), limite: parseInt(limite) } });
};
exports.resumoSemoventes = (req, res) => {
  const rows = db.prepare(`SELECT categoria, SUM(quantidade) as total_cabecas,
    SUM(quantidade*preco_unitario) as valor_total, AVG(preco_unitario) as preco_medio, COUNT(*) as total_lotes
    FROM semoventes WHERE ativo=1 GROUP BY categoria ORDER BY total_cabecas DESC`).all();
  res.json({ resumo: rows });
};
exports.criarSemovente = (req, res) => {
  const d = req.body;
  if (!d.categoria || !d.quantidade) return res.status(400).json({ erro: 'Categoria e quantidade obrigatórios' });
  const id = uuid();
  db.prepare(`INSERT INTO semoventes (id,categoria,raca,cor,mesticagem,idade_meses,quantidade,
    preco_unitario,marca_ferro,foto_ferro,forma_local,imovel_id,proprietario_id,observacoes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(id,d.categoria,d.raca||null,d.cor||null,d.mesticagem||null,d.idade_meses||null,
      parseInt(d.quantidade),d.preco_unitario||null,d.marca_ferro||null,d.foto_ferro||null,
      d.forma_local||null,d.imovel_id||null,d.proprietario_id||null,d.observacoes||null);
  res.status(201).json({ semovente: db.prepare('SELECT * FROM semoventes WHERE id=?').get(id) });
};
exports.atualizarSemovente = (req, res) => {
  const d = req.body;
  const id = req.params.id;
  const existente = db.prepare('SELECT id FROM semoventes WHERE id=?').get(id);
  if (!existente) return res.status(404).json({ erro: 'Semovente não encontrado' });
  const campos = ['categoria','raca','cor','mesticagem','idade_meses','quantidade','preco_unitario',
    'marca_ferro','foto_ferro','forma_local','imovel_id','proprietario_id','observacoes'];
  const sets = campos.filter(c => d[c] !== undefined).map(c => `${c}=?`);
  const vals = campos.filter(c => d[c] !== undefined).map(c => d[c] === '' ? null : d[c]);
  if (!sets.length) return res.status(400).json({ erro: 'Sem campos para atualizar' });
  db.prepare(`UPDATE semoventes SET ${sets.join(',')},atualizado_em=? WHERE id=?`).run(...vals, now(), id);
  res.json({ semovente: db.prepare('SELECT * FROM semoventes WHERE id=?').get(id) });
};
exports.removerSemovente = (req, res) => {
  db.prepare('UPDATE semoventes SET ativo=0,atualizado_em=? WHERE id=?').run(now(), req.params.id);
  res.json({ mensagem: 'Removido' });
};
