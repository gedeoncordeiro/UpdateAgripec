const path = require('path');
const fs   = require('fs');
const db   = require('../database/db');
const http = require('http');
const https = require('https');
const { createHash } = require('crypto');
const { execSync } = require('child_process');

const ROOT_DIR   = path.join(__dirname, '../..');
const DATA_DIR   = path.join(ROOT_DIR, 'data');
const VERSION_FILE = path.join(ROOT_DIR, 'version.json');
const BACKUP_DIR = path.join(DATA_DIR, 'updates', '_rollback');

// ── Utilitários ──────────────────────────────────────────────────────────

/** Lê o version.json local */
function getVersaoLocal() {
  try {
    return JSON.parse(fs.readFileSync(VERSION_FILE, 'utf8'));
  } catch {
    return { versao: '0.0.0', nome: 'Desconhecida', build: 0 };
  }
}

/** Salva version.json */
function salvarVersaoLocal(v) {
  fs.writeFileSync(VERSION_FILE, JSON.stringify(v, null, 2), 'utf8');
}

/** URL do repositório remoto para checagem de atualizações */
function getUpdateURL() {
  const row = db.prepare("SELECT valor FROM config_sistema WHERE chave='update_url'").get();
  return row?.valor || 'https://api.github.com/repos/agrogestao/agrogestao/releases/latest';
}

/** Cria diretório se não existir */
function garantirDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

/** Download de URL (suporta http e https) */
function baixarArquivo(url, destino) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(destino);
    mod.get(url, { headers: { 'User-Agent': 'AgroGestao-Update/1.0' } }, (res) => {
      // Seguir redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(destino);
        return baixarArquivo(res.headers.location, destino).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(destino);
        return reject(new Error(`HTTP ${res.statusCode} ao baixar ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      file.close();
      try { fs.unlinkSync(destino); } catch(_) {}
      reject(err);
    });
  });
}

/** Calcula SHA-256 de um arquivo */
function calcularHash(arquivo) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = fs.createReadStream(arquivo);
    stream.on('data', d => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/** Faz backup dos arquivos que serão substituídos antes da atualização */
function fazerBackupArquivos(manifest) {
  garantirDir(BACKUP_DIR);
  const backupInfo = [];

  for (const entry of manifest) {
    const destino = path.join(ROOT_DIR, entry);
    if (fs.existsSync(destino)) {
      const relPath = entry.replace(/\\/g, '/');
      const backupPath = path.join(BACKUP_DIR, relPath);
      garantirDir(path.dirname(backupPath));
      fs.copyFileSync(destino, backupPath);
      backupInfo.push({ arquivo: relPath, backup: relPath });
    }
  }

  // Salva metadados do backup
  const meta = {
    versao_anterior: getVersaoLocal(),
    criado_em: new Date().toISOString(),
    arquivos: backupInfo,
  };
  fs.writeFileSync(path.join(BACKUP_DIR, '_meta.json'), JSON.stringify(meta, null, 2));
  return backupInfo;
}

/** Gerencia o registro de versões no banco */
function registrarAtualizacao(versao, status, detalhes = '') {
  const { v4: uuid } = require('uuid');
  db.prepare(`INSERT INTO update_log (id, versao, status, detalhes, criado_em)
    VALUES (?, ?, ?, ?, datetime('now'))`)
    .run(uuid(), versao, status, detalhes);
}

// ── ENDPOINTS ────────────────────────────────────────────────────────────

/**
 * GET /api/update/check
 * Verifica se há atualização disponível comparando versão local com remota.
 * A URL de verificação pode ser configurada em config_sistema (chave: 'update_url').
 * Se for um JSON direto de release, espera-se o formato:
 * { "tag_name": "v1.2.0", "name": "Versão 1.2.0", "body": "...",
 *   "assets": [{ "name": "update.zip", "browser_download_url": "...", "size": 123 }] }
 * Ou se for um JSON simples de versão:
 * { "versao": "1.2.0", "nome": "Versão 1.2.0", "download_url": "...", "checksum": "sha256..." }
 */
exports.check = async (req, res) => {
  const local = getVersaoLocal();
  const updateUrl = getUpdateURL();

  try {
    const data = await new Promise((resolve, reject) => {
      const mod = updateUrl.startsWith('https') ? https : http;
      mod.get(updateUrl, { headers: { 'User-Agent': 'AgroGestao-Update/1.0', Accept: 'application/json' } }, (res) => {
        let body = '';
        res.on('data', c => body += c);
        res.on('end', () => {
          if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
          try { resolve(JSON.parse(body)); } catch(e) { reject(new Error('Resposta inválida do servidor')); }
        });
      }).on('error', reject);
    });

    let remoto;
    // Suporta formato GitHub Releases
    if (data.tag_name) {
      const asset = (data.assets || []).find(a => a.name.endsWith('.zip'));
      remoto = {
        versao: (data.tag_name || '').replace(/^v/, ''),
        nome: data.name || data.tag_name || '',
        body: data.body || '',
        download_url: asset?.browser_download_url || '',
        size: asset?.size || 0,
        checksum: '',
        publicado_em: data.published_at || data.created_at || '',
      };
    } else {
      remoto = {
        versao: data.versao || '0.0.0',
        nome: data.nome || '',
        body: data.body || '',
        download_url: data.download_url || '',
        size: data.size || 0,
        checksum: data.checksum || '',
        publicado_em: data.publicado_em || '',
      };
    }

    const localNum = parseInt(local.versao.replace(/\./g, '').padEnd(6, '0'));
    const remoteNum = parseInt(remoto.versao.replace(/\./g, '').padEnd(6, '0'));
    const temAtualizacao = remoteNum > localNum;

    res.json({
      versao_local: local,
      versao_remota: temAtualizacao ? remoto : null,
      tem_atualizacao: temAtualizacao,
      ultima_verificacao: new Date().toISOString(),
    });
  } catch (e) {
    // Se não conseguir contactar servidor, retorna sem erro — apenas offline
    res.json({
      versao_local: local,
      versao_remota: null,
      tem_atualizacao: false,
      erro: e.message,
      offline: true,
      ultima_verificacao: new Date().toISOString(),
    });
  }
};

/**
 * POST /api/update/baixar
 * Baixa o pacote de atualização para um diretório temporário.
 * Body: { download_url, checksum? }
 */
exports.baixar = async (req, res) => {
  const { download_url, checksum } = req.body;
  if (!download_url) return res.status(400).json({ erro: 'URL de download não informada' });

  const tmpDir = path.join(DATA_DIR, 'updates', '_tmp');
  garantirDir(tmpDir);

  // Limpa downloads anteriores
  const existing = fs.readdirSync(tmpDir);
  for (const f of existing) {
    try { fs.unlinkSync(path.join(tmpDir, f)); } catch(_) {}
  }

  const zipPath = path.join(tmpDir, 'update.zip');

  try {
    await baixarArquivo(download_url, zipPath);
    const stats = fs.statSync(zipPath);

    // Verifica checksum se fornecido
    if (checksum) {
      const hash = await calcularHash(zipPath);
      if (hash !== checksum.toLowerCase()) {
        fs.unlinkSync(zipPath);
        return res.status(400).json({ erro: 'Checksum inválido — o arquivo pode estar corrompido' });
      }
    }

    res.json({
      mensagem: 'Download concluído',
      tamanho: stats.size,
      caminho: zipPath,
    });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao baixar atualização: ' + e.message });
  }
};

/**
 * POST /api/update/aplicar
 * Aplica o pacote de atualização baixado.
 * Lê o arquivo update.zip da pasta tmp, extrai sobrepondo os arquivos,
 * faz backup dos arquivos anteriores e aplica migrações de BD se houver.
 */
exports.aplicar = async (req, res) => {
  const zipPath = path.join(DATA_DIR, 'updates', '_tmp', 'update.zip');
  if (!fs.existsSync(zipPath)) {
    return res.status(400).json({ erro: 'Nenhum pacote de atualização encontrado. Faça o download primeiro.' });
  }

  const local = getVersaoLocal();
  const versaoNova = req.body.versao || '0.0.0';

  try {
    const unzipper = require('unzipper');
    const dir = await unzipper.Open.file(zipPath);

    // Lê o manifest do update (lista de arquivos e manifest.json)
    const manifestEntry = dir.files.find(f => f.path === 'manifest.json');
    if (!manifestEntry) {
      return res.status(400).json({ erro: 'Pacote inválido: manifest.json não encontrado' });
    }

    const manifestBuf = await manifestEntry.buffer();
    const manifest = JSON.parse(manifestBuf.toString('utf8'));

    // Valida versão
    if (manifest.versao && manifest.versao !== versaoNova) {
      return res.status(400).json({
        erro: `Versão inconsistente: pacote="${manifest.versao}", esperada="${versaoNova}"`
      });
    }

    // 1. Backup dos arquivos atuais
    const fileList = manifest.arquivos || [];
    const backupInfo = fazerBackupArquivos(fileList);

    // 2. Extrai e aplica os arquivos
    const extraidos = [];
    for (const entry of dir.files) {
      if (entry.type === 'Directory') continue;
      if (entry.path === 'manifest.json') continue;

      const destino = path.join(ROOT_DIR, entry.path);
      garantirDir(path.dirname(destino));
      const buf = await entry.buffer();
      fs.writeFileSync(destino, buf);
      extraidos.push(entry.path);
    }

    // 3. Executa migrações de banco de dados (se houver script)
    if (manifest.migracoes_sql && Array.isArray(manifest.migracoes_sql)) {
      const tx = db.transaction(() => {
        for (const sql of manifest.migracoes_sql) {
          try { db.exec(sql); } catch (e) {
            console.warn('[UPDATE] Aviso em migração SQL:', e.message);
          }
        }
      });
      tx();
    }

    // 4. Atualiza version.json
    const novaVersao = {
      versao: manifest.versao || versaoNova,
      nome: manifest.nome || versaoNova,
      build: manifest.build || (local.build + 1),
      atualizado_em: new Date().toISOString(),
      notas: manifest.notas || '',
    };
    salvarVersaoLocal(novaVersao);

    // Registra log
    registrarAtualizacao(novaVersao.versao, 'sucesso', `Atualizado de ${local.versao} para ${novaVersao.versao}`);

    // Limpa
    try { fs.unlinkSync(zipPath); } catch(_) {}

    res.json({
      mensagem: `Sistema atualizado para versão ${novaVersao.versao}`,
      versao: novaVersao,
      arquivos_atualizados: extraidos.length,
      backups_realizados: backupInfo.length,
    });
  } catch (e) {
    registrarAtualizacao(versaoNova, 'erro', e.message);
    res.status(500).json({ erro: 'Erro ao aplicar atualização: ' + e.message });
  }
};

/**
 * POST /api/update/rollback
 * Reverte a última atualização usando os backups salvos.
 */
exports.rollback = async (req, res) => {
  const metaPath = path.join(BACKUP_DIR, '_meta.json');
  if (!fs.existsSync(metaPath)) {
    return res.status(400).json({ erro: 'Nenhum backup de rollback disponível' });
  }

  try {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const versaoAnterior = meta.versao_anterior;

    // Restaura cada arquivo
    for (const item of meta.arquivos) {
      const backupPath = path.join(BACKUP_DIR, item.backup);
      const destino = path.join(ROOT_DIR, item.arquivo);
      if (fs.existsSync(backupPath)) {
        garantirDir(path.dirname(destino));
        fs.copyFileSync(backupPath, destino);
      }
    }

    // Restaura version.json
    salvarVersaoLocal(versaoAnterior);

    // Remove backup
    try {
      const rimraf = (dir) => {
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach(f => {
            const p = path.join(dir, f);
            if (fs.lstatSync(p).isDirectory()) rimraf(p);
            else fs.unlinkSync(p);
          });
          fs.rmdirSync(dir);
        }
      };
      rimraf(BACKUP_DIR);
    } catch(_) {}

    registrarAtualizacao(versaoAnterior.versao, 'rollback', `Revertido para ${versaoAnterior.versao}`);

    res.json({
      mensagem: `Rollback realizado — sistema retornou para versão ${versaoAnterior.versao}`,
      versao: versaoAnterior,
    });
  } catch (e) {
    res.status(500).json({ erro: 'Erro ao fazer rollback: ' + e.message });
  }
};

/**
 * GET /api/update/versoes
 * Histórico de atualizações registradas no banco.
 */
exports.historico = (req, res) => {
  const logs = db.prepare(
    'SELECT * FROM update_log ORDER BY criado_em DESC LIMIT 50'
  ).all();
  res.json({ historico: logs, versao_atual: getVersaoLocal() });
};

/**
 * POST /api/update/config
 * Altera a URL de verificação de atualizações.
 */
exports.config = (req, res) => {
  const { update_url } = req.body;
  if (!update_url) return res.status(400).json({ erro: 'URL é obrigatória' });

  db.prepare("INSERT OR REPLACE INTO config_sistema (chave, valor, atualizado_em) VALUES ('update_url', ?, datetime('now'))")
    .run(update_url);
  res.json({ mensagem: 'URL de update configurada' });
};

/**
 * GET /api/update/config
 * Retorna a URL configurada.
 */
exports.getConfig = (req, res) => {
  const row = db.prepare("SELECT valor FROM config_sistema WHERE chave='update_url'").get();
  res.json({ update_url: row?.valor || '' });
};
