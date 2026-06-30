const path = require('path');
const fs   = require('fs');
const { execSync } = require('child_process');
const archiver = require('archiver');
const multer   = require('multer');
const unzipper = require('unzipper');
const db = require('../database/db');

const DATA_DIR = path.join(__dirname, '../../data');

// ── EXPORTAR ─────────────────────────────────────────────────────────────
exports.exportar = (req, res) => {
  try {
    const ts   = new Date().toISOString().slice(0,10);
    const nome = `backup_agrogestao_${ts}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', err => { throw err; });
    archive.pipe(res);

    // 1. banco SQLite
    const dbPath = path.join(DATA_DIR, 'agrogestao.db');
    if (fs.existsSync(dbPath)) archive.file(dbPath, { name: 'agrogestao.db' });

    // 2. uploads de documentos
    const uploadDir = path.join(DATA_DIR, 'uploads');
    if (fs.existsSync(uploadDir)) archive.directory(uploadDir, 'uploads');

    const docsDir = path.join(DATA_DIR, 'documentos');
    if (fs.existsSync(docsDir)) archive.directory(docsDir, 'documentos');

    const cfgDir = path.join(DATA_DIR, 'config');
    if (fs.existsSync(cfgDir)) archive.directory(cfgDir, 'config');

    // 3. dump JSON (legível e portável)
    const dump = {
      exportado_em: new Date().toISOString(),
      clientes:    db.prepare('SELECT * FROM clientes  WHERE ativo=1').all(),
      imoveis:     db.prepare('SELECT * FROM imoveis   WHERE ativo=1').all(),
      semoventes:  db.prepare('SELECT * FROM semoventes WHERE ativo=1').all(),
      usuarios:    db.prepare('SELECT id,nome,email,perfil,ativo,criado_em FROM usuarios').all(),
    };
    archive.append(JSON.stringify(dump, null, 2), { name: 'dados.json' });

    archive.finalize();
  } catch(e) {
    console.error('Erro exportar backup:', e);
    if (!res.headersSent) res.status(500).json({ erro: e.message });
  }
};

// ── IMPORTAR ─────────────────────────────────────────────────────────────
exports.importar = async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ erro: 'Arquivo não enviado' });

  try {
    const dir = await unzipper.Open.file(file.path);

    // Lê dados.json do ZIP
    const jsonEntry = dir.files.find(f => f.path === 'dados.json');
    if (!jsonEntry) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ erro: 'Arquivo de backup inválido (dados.json não encontrado)' });
    }

    const buf  = await jsonEntry.buffer();
    const dump = JSON.parse(buf.toString('utf8'));
    const resumo = { clientes: 0, imoveis: 0, semoventes: 0 };

    // Importa clientes
    const insCliente = db.prepare(`INSERT OR REPLACE INTO clientes
      (id,nome,cpf,rg,estado_civil,regime_casamento,nome_conjuge,cpf_conjuge,enquadramento,
       inscricao_estadual,endereco_logradouro,endereco_numero,endereco_complemento,
       endereco_bairro,endereco_cidade,endereco_uf,endereco_cep,telefone,email,observacoes,
       ativo,criado_em,atualizado_em)
      VALUES
      (@id,@nome,@cpf,@rg,@estado_civil,@regime_casamento,@nome_conjuge,@cpf_conjuge,@enquadramento,
       @inscricao_estadual,@endereco_logradouro,@endereco_numero,@endereco_complemento,
       @endereco_bairro,@endereco_cidade,@endereco_uf,@endereco_cep,@telefone,@email,@observacoes,
       @ativo,@criado_em,@atualizado_em)`);

    const importTx = db.transaction(() => {
      for (const c of (dump.clientes || [])) { insCliente.run(c); resumo.clientes++; }

      const insImovel = db.prepare(`INSERT OR REPLACE INTO imoveis
        (id,nome,area_total,logradouro,municipio,uf,cep,situacao,matricula,cri,data_registro,
         tipo_documento,documento_path,cib_nirf,ccir,sigef,latitude,longitude,car,
         area_consolidada,area_vegetacao_nativa,area_reserva_legal,area_servidao,
         roteiro_acesso,valor_avaliacao,data_valor_avaliacao,estado_conservacao,
         observacoes,proprietario_id,ativo,criado_em,atualizado_em)
        VALUES
        (@id,@nome,@area_total,@logradouro,@municipio,@uf,@cep,@situacao,@matricula,@cri,@data_registro,
         @tipo_documento,@documento_path,@cib_nirf,@ccir,@sigef,@latitude,@longitude,@car,
         @area_consolidada,@area_vegetacao_nativa,@area_reserva_legal,@area_servidao,
         @roteiro_acesso,@valor_avaliacao,@data_valor_avaliacao,@estado_conservacao,
         @observacoes,@proprietario_id,@ativo,@criado_em,@atualizado_em)`);
      for (const im of (dump.imoveis || [])) { insImovel.run(im); resumo.imoveis++; }

      const insSem = db.prepare(`INSERT OR REPLACE INTO semoventes
        (id,categoria,raca,cor,mesticagem,idade_meses,quantidade,preco_unitario,marca_ferro,
         imovel_id,proprietario_id,observacoes,ativo,criado_em,atualizado_em)
        VALUES
        (@id,@categoria,@raca,@cor,@mesticagem,@idade_meses,@quantidade,@preco_unitario,@marca_ferro,
         @imovel_id,@proprietario_id,@observacoes,@ativo,@criado_em,@atualizado_em)`);
      for (const s of (dump.semoventes || [])) { insSem.run(s); resumo.semoventes++; }
    });

    importTx();

    // Extrai arquivos binários (uploads, documentos)
    for (const entry of dir.files) {
      if (entry.type === 'Directory') continue;
      if (entry.path.startsWith('uploads/') || entry.path.startsWith('documentos/') || entry.path.startsWith('config/')) {
        const dest = path.join(DATA_DIR, entry.path);
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        const buf2 = await entry.buffer();
        fs.writeFileSync(dest, buf2);
      }
    }

    fs.unlinkSync(file.path);
    res.json({ mensagem: 'Backup restaurado com sucesso', resumo });
  } catch(e) {
    console.error('Erro importar backup:', e);
    if (file?.path && fs.existsSync(file.path)) try { fs.unlinkSync(file.path); } catch(_) {}
    res.status(500).json({ erro: e.message });
  }
};
