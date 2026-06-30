const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'agrogestao.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    senha TEXT NOT NULL, perfil TEXT NOT NULL DEFAULT 'operador',
    ativo INTEGER DEFAULT 1, criado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS clientes (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL, cpf TEXT UNIQUE NOT NULL,
    rg TEXT, estado_civil TEXT, regime_casamento TEXT,
    nome_conjuge TEXT, cpf_conjuge TEXT, enquadramento TEXT DEFAULT 'PRONAF',
    inscricao_estadual TEXT, endereco_logradouro TEXT, endereco_numero TEXT,
    endereco_complemento TEXT, endereco_bairro TEXT, endereco_cidade TEXT,
    endereco_uf TEXT, endereco_cep TEXT, telefone TEXT, email TEXT, observacoes TEXT,
    ativo INTEGER DEFAULT 1, criado_em TEXT DEFAULT (datetime('now')),
    atualizado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS imoveis (
    id TEXT PRIMARY KEY, nome TEXT NOT NULL, area_total REAL,
    logradouro TEXT, municipio TEXT, uf TEXT, cep TEXT,
    situacao TEXT DEFAULT 'registrada', matricula TEXT, cri TEXT,
    data_registro TEXT, tipo_documento TEXT, documento_path TEXT,
    cib_nirf TEXT, ccir TEXT, sigef TEXT,
    latitude REAL, longitude REAL,
    car TEXT, area_consolidada REAL, area_vegetacao_nativa REAL,
    area_reserva_legal REAL, area_servidao REAL,
    roteiro_acesso TEXT, valor_avaliacao REAL,
    data_valor_avaliacao TEXT, estado_conservacao TEXT, observacoes TEXT,
    proprietario_id TEXT REFERENCES clientes(id),
    ativo INTEGER DEFAULT 1, criado_em TEXT DEFAULT (datetime('now')),
    atualizado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS imovel_documentos (
    id TEXT PRIMARY KEY,
    imovel_id TEXT NOT NULL REFERENCES imoveis(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL,
    descricao TEXT,
    arquivo_path TEXT,
    arquivo_nome TEXT,
    criado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS config_sistema (
    chave TEXT PRIMARY KEY,
    valor TEXT,
    atualizado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS semoventes (
    id TEXT PRIMARY KEY, categoria TEXT NOT NULL, raca TEXT, cor TEXT,
    mesticagem TEXT, idade_meses INTEGER, quantidade INTEGER NOT NULL DEFAULT 0,
    preco_unitario REAL, marca_ferro TEXT, foto_ferro TEXT,
    imovel_id TEXT REFERENCES imoveis(id),
    proprietario_id TEXT REFERENCES clientes(id),
    observacoes TEXT, ativo INTEGER DEFAULT 1,
    criado_em TEXT DEFAULT (datetime('now')), atualizado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS projetos (
    id TEXT PRIMARY KEY,
    cliente_id TEXT REFERENCES clientes(id),
    cliente_nome TEXT NOT NULL,
    cliente_cpf TEXT,
    titulo TEXT NOT NULL,
    tipo TEXT NOT NULL DEFAULT 'custeio',
    banco TEXT, safra TEXT, agencia TEXT, num_cc TEXT,
    valor REAL DEFAULT 0, juros REAL DEFAULT 6, prazo INTEGER DEFAULT 20,
    data_reembolso TEXT, tipo_assistencia TEXT, financiada TEXT DEFAULT 'Não',
    rnp TEXT, endereco_astec TEXT, fiador_nome TEXT, fiador_cpf TEXT,
    atividade TEXT, fase_producao TEXT, sistema TEXT,
    animais_custeados INTEGER, produtividade TEXT, produto TEXT,
    rebanho_json TEXT, imovel_json TEXT,
    status TEXT DEFAULT 'rascunho',
    criado_em TEXT DEFAULT (datetime('now')),
    atualizado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS orcamentos (
    id TEXT PRIMARY KEY,
    cliente_id TEXT REFERENCES clientes(id),
    cliente_nome TEXT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    validade_dias INTEGER DEFAULT 30,
    status TEXT DEFAULT 'aberto',
    observacoes TEXT,
    criado_em TEXT DEFAULT (datetime('now')),
    atualizado_em TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS orcamento_itens (
    id TEXT PRIMARY KEY,
    orcamento_id TEXT NOT NULL REFERENCES orcamentos(id) ON DELETE CASCADE,
    descricao TEXT NOT NULL,
    unidade TEXT DEFAULT 'un',
    quantidade REAL DEFAULT 1,
    preco_unitario REAL DEFAULT 0,
    desconto_pct REAL DEFAULT 0,
    ordem INTEGER DEFAULT 0
  );
`);

// Migrações não-destrutivas
const migs = [
  `ALTER TABLE clientes ADD COLUMN cpf_conjuge TEXT`,
  `ALTER TABLE clientes ADD COLUMN enquadramento TEXT DEFAULT 'PRONAF'`,
  `ALTER TABLE imoveis ADD COLUMN cib_nirf TEXT`,
  `ALTER TABLE imoveis ADD COLUMN ccir TEXT`,
  `ALTER TABLE imoveis ADD COLUMN sigef TEXT`,
  `ALTER TABLE imoveis ADD COLUMN car TEXT`,
  `ALTER TABLE imoveis ADD COLUMN area_consolidada REAL`,
  `ALTER TABLE imoveis ADD COLUMN area_vegetacao_nativa REAL`,
  `ALTER TABLE imoveis ADD COLUMN area_reserva_legal REAL`,
  `ALTER TABLE imoveis ADD COLUMN area_servidao REAL`,
  `ALTER TABLE imoveis ADD COLUMN roteiro_acesso TEXT`,
  `ALTER TABLE imoveis ADD COLUMN valor_avaliacao REAL`,
  `ALTER TABLE imoveis ADD COLUMN data_valor_avaliacao TEXT`,
  `ALTER TABLE imoveis ADD COLUMN estado_conservacao TEXT`,
  `ALTER TABLE semoventes ADD COLUMN foto_ferro TEXT`,
  `ALTER TABLE semoventes ADD COLUMN forma_local TEXT`,
];
for (const sql of migs) { try { db.exec(sql); } catch(e) {} }

// Tabela links úteis
db.exec(`CREATE TABLE IF NOT EXISTS links_uteis (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  url TEXT NOT NULL,
  descricao TEXT,
  ordem INTEGER DEFAULT 0,
  criado_em TEXT DEFAULT (datetime('now'))
)`);

// Tabela de log de atualizações
db.exec(`CREATE TABLE IF NOT EXISTS update_log (
  id TEXT PRIMARY KEY,
  versao TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  detalhes TEXT,
  criado_em TEXT DEFAULT (datetime('now'))
)`);

// Seed inicial
const jaTemAdmin = db.prepare('SELECT id FROM usuarios WHERE email=?').get('admin@agrogestao.com');
if (!jaTemAdmin) {
  const { v4: uuid } = require('uuid');
  db.prepare(`INSERT INTO usuarios (id,nome,email,senha,perfil) VALUES (?,?,?,?,?)`)
    .run(uuid(),'Administrador','admin@agrogestao.com',bcrypt.hashSync('admin123',10),'admin');
  db.prepare(`INSERT INTO usuarios (id,nome,email,senha,perfil) VALUES (?,?,?,?,?)`)
    .run(uuid(),'Operador Padrão','operador@agrogestao.com',bcrypt.hashSync('op123456',10),'operador');

  const cIds = [uuid(), uuid(), uuid()];
  db.prepare(`INSERT INTO clientes (id,nome,cpf,estado_civil,nome_conjuge,cpf_conjuge,enquadramento,endereco_cidade,endereco_uf,telefone)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(cIds[0],'João Antônio Ferreira','012.345.678-90','casado','Maria Ferreira','012.345.111-00','PRONAF','Vitória do Mearim','MA','(98) 99999-0001');
  db.prepare(`INSERT INTO clientes (id,nome,cpf,estado_civil,enquadramento,endereco_cidade,endereco_uf,telefone)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(cIds[1],'Maria Souza Lima','987.654.321-00','solteiro','MÉDIO','Arari','MA','(98) 98888-0002');
  db.prepare(`INSERT INTO clientes (id,nome,cpf,estado_civil,enquadramento,endereco_cidade,endereco_uf,telefone)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(cIds[2],'Carlos H. Mendes','111.222.333-44','viuvo','DEMAIS','Pedreiras','MA','(98) 97777-0003');

  const iIds = [uuid(), uuid()];
  db.prepare(`INSERT INTO imoveis (id,nome,area_total,municipio,uf,situacao,matricula,cri,cib_nirf,ccir,car,area_consolidada,area_vegetacao_nativa,area_reserva_legal,area_servidao,latitude,longitude,roteiro_acesso,estado_conservacao,proprietario_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(iIds[0],'Fazenda São João',1200,'Vitória do Mearim','MA','registrada','12345','CRI-001',
      'MA-123456','2024-000123','MA-1234567890123456789012',840,180,180,0,
      -3.4521,-44.8723,'Saindo de Vitória do Mearim sentido Arari, percorrer 15km pela BR-316.','regular',cIds[0]);
  db.prepare(`INSERT INTO imoveis (id,nome,area_total,municipio,uf,situacao,area_consolidada,area_vegetacao_nativa,area_reserva_legal,latitude,longitude,proprietario_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(iIds[1],'Sítio Bela Vista',340,'Arari','MA','posse',220,68,51,-3.8901,-44.7612,cIds[1]);

  const ins = db.prepare(`INSERT INTO semoventes (id,categoria,raca,cor,mesticagem,idade_meses,quantidade,preco_unitario,marca_ferro,imovel_id,proprietario_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)`);
  ins.run(uuid(),'vaca','Nelore','Branca','Puro',48,120,4500,'FSJ-01',iIds[0],cIds[0]);
  ins.run(uuid(),'boi','Nelore','Vermelho','Puro',36,80,5200,'FSJ-02',iIds[0],cIds[0]);
  ins.run(uuid(),'bezerro','Nelore','Amarelo','Puro',8,45,1800,'FSJ-03',iIds[0],cIds[0]);
  ins.run(uuid(),'novilho','Angus','Preto','Puro',24,60,3900,'SBV-01',iIds[1],cIds[1]);
  ins.run(uuid(),'vaca','Girolando','Parda','Mestiço',60,51,3615,'SBV-02',iIds[1],cIds[1]);
  ins.run(uuid(),'touro','Nelore','Branco','Puro',72,5,12000,'FSJ-04',iIds[0],cIds[0]);
  console.log('[DB] Banco inicializado com dados de exemplo.');
}

module.exports = db;
