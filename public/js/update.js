// ── UPDATE ONLINE ───────────────────────────────────────────────────────

async function iniciarUpdate() {
  const el = document.getElementById('section-update');
  if (!el) return;
  el.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">${icon('download','md')} Atualização do Sistema</h2>
        <p class="page-subtitle">Verifique e instale novas versões do AgroGestão</p>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      <!-- Card: Versão atual -->
      <div class="card card-body" id="card-versao-atual">
        <div class="card-title">${icon('info','md')} Versão Instalada</div>
        <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px">
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-2)">Versão:</span>
            <span id="up-ver-local" style="font-weight:700">—</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-2)">Build:</span>
            <span id="up-build-local" style="font-weight:600">—</span>
          </div>
          <div style="display:flex;justify-content:space-between">
            <span style="color:var(--text-2)">Última verificação:</span>
            <span id="up-ult-verif" style="font-size:12px">—</span>
          </div>
        </div>
      </div>

      <!-- Card: Ações -->
      <div class="card card-body" style="display:flex;flex-direction:column;gap:12px;justify-content:center">
        <button class="btn btn-primary btn-lg" onclick="verificarAtualizacao()" id="btn-check-update">
          ${icon('refresh','sm')} Verificar Atualizações
        </button>
        <div style="display:flex;gap:8px">
          <button class="btn" onclick="abrirConfigUpdate()" style="flex:1">
            ${icon('settings','sm')} Configurar URL
          </button>
          <button class="btn" onclick="verHistoricoUpdate()" style="flex:1">
            ${icon('clock','sm')} Histórico
          </button>
        </div>
      </div>
    </div>

    <!-- Resultado da verificação -->
    <div id="up-resultado" style="margin-top:16px;display:none"></div>

    <!-- Histórico -->
    <div id="up-historico" style="margin-top:16px;display:none"></div>
  `;
  carregarVersaoLocal();
}

// ── Carrega versão local ──────────────────────────────────────────────────
async function carregarVersaoLocal() {
  try {
    const data = await API.get('/update/check');
    document.getElementById('up-ver-local').textContent = data.versao_local?.versao || '—';
    document.getElementById('up-build-local').textContent = `#${data.versao_local?.build || 0}`;
    document.getElementById('up-ult-verif').textContent = fmt.data(new Date());
  } catch(e) {
    // Tenta ler do DOM ou deixa —
  }
}

// ── Verificar atualização ─────────────────────────────────────────────────
async function verificarAtualizacao() {
  const btn = document.getElementById('btn-check-update');
  const resEl = document.getElementById('up-resultado');
  const originalHTML = btn.innerHTML;

  btn.disabled = true;
  btn.innerHTML = `${icon('refresh','sm')} Verificando...`;
  resEl.style.display = 'block';
  resEl.innerHTML = `<div class="alert alert-info">${icon('info','sm')} Verificando atualizações...</div>`;

  try {
    const data = await API.get('/update/check');

    // Atualiza info local
    if (data.versao_local) {
      document.getElementById('up-ver-local').textContent = data.versao_local.versao || '—';
      document.getElementById('up-build-local').textContent = `#${data.versao_local.build || 0}`;
    }
    document.getElementById('up-ult-verif').textContent = fmt.data(new Date());

    if (data.offline) {
      resEl.innerHTML = `
        <div class="alert alert-warning">
          ${icon('alert','sm')} Não foi possível contactar o servidor de atualizações.<br/>
          <span style="font-size:12px;opacity:.7">${data.erro || 'Servidor offline ou URL inválida.'}</span>
        </div>
        <div style="margin-top:12px" class="card card-body">
          <p style="color:var(--text-2);font-size:13px">
            Configure a URL de verificação em <strong>Configurar URL</strong>.
            O sistema suporta qualquer endpoint JSON que retorne:
          </p>
          <pre style="font-size:11px;background:var(--bg-subtle);padding:12px;border-radius:8px;margin-top:8px;overflow-x:auto">
{
  "versao": "1.1.0",
  "nome": "AgroGestão v1.1.0",
  "download_url": "https://.../update.zip",
  "checksum": "sha256...",
  "body": "Notas da versão"
}</pre>
          <p style="font-size:12px;color:var(--text-3);margin-top:8px">
            Compatível também com formato <strong>GitHub Releases API</strong>.
          </p>
        </div>`;
      return;
    }

    if (data.tem_atualizacao && data.versao_remota) {
      const r = data.versao_remota;
      resEl.innerHTML = `
        <div class="card card-body" style="border-left:4px solid var(--g400)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
            <div>
              <div class="card-title" style="color:var(--g600)">
                ${icon('download','md')} Nova versão disponível!
              </div>
              <div style="margin-top:8px;display:flex;flex-direction:column;gap:6px">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
                  <span class="badge badge-green" style="font-size:14px;padding:4px 12px">
                    v${r.versao}
                  </span>
                  <span style="color:var(--text-2)">${r.nome || ''}</span>
                </div>
                ${r.publicado_em ? `<span style="font-size:12px;color:var(--text-3)">Publicada em: ${fmt.data(r.publicado_em)}</span>` : ''}
                ${r.size ? `<span style="font-size:12px;color:var(--text-3)">Tamanho: ${fmtarq(r.size)}</span>` : ''}
              </div>
              ${r.body ? `<div style="margin-top:12px;padding:12px;background:var(--bg-subtle);border-radius:8px;font-size:13px;color:var(--text-2);max-height:200px;overflow-y:auto;white-space:pre-wrap">${r.body}</div>` : ''}
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn" onclick="verificarAtualizacao()" title="Verificar novamente">
                ${icon('refresh','sm')}
              </button>
              <button class="btn btn-primary btn-lg" onclick="baixarAtualizacao('${r.download_url}','${r.checksum || ''}','${r.versao}')" id="btn-baixar-update">
                ${icon('download','sm')} Baixar & Instalar
              </button>
            </div>
          </div>
        </div>`;
    } else {
      resEl.innerHTML = `
        <div class="alert alert-ok">
          ${icon('check_circle','sm')} Você está usando a versão mais recente do sistema!
          <div style="font-size:12px;opacity:.7;margin-top:4px">${data.versao_local?.nome || 'AgroGestão v' + (data.versao_local?.versao || '—')}</div>
        </div>`;
    }
  } catch(e) {
    resEl.innerHTML = `<div class="alert alert-erro">${icon('x_circle','sm')} ${e.message}</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHTML;
  }
}

// ── Baixar atualização ────────────────────────────────────────────────────
let downloadProgress = false;

async function baixarAtualizacao(downloadUrl, checksum, versao) {
  if (downloadProgress) return;
  if (!confirm(`Baixar e instalar a versão ${versao}?\n\nO sistema fará uma cópia de segurança dos arquivos atuais antes de aplicar a atualização.`)) return;

  const resEl = document.getElementById('up-resultado');
  const btn = document.getElementById('btn-baixar-update');
  if (btn) btn.disabled = true;

  downloadProgress = true;

  try {
    // 1. Download
    resEl.innerHTML = `
      <div class="alert alert-info">
        ${icon('download','sm')} Baixando pacote de atualização...<br/>
        <div style="margin-top:8px;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
          <div id="progress-bar" style="height:100%;width:20%;background:var(--g400);border-radius:3px;transition:width .5s"></div>
        </div>
      </div>`;

    await delay(500);

    const resp = await fetch('/api/update/baixar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API.token,
      },
      body: JSON.stringify({ download_url: downloadUrl, checksum }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.erro || 'Erro no download');

    document.getElementById('progress-bar').style.width = '60%';

    // 2. Aplicar
    resEl.innerHTML = `
      <div class="alert alert-info">
        ${icon('upload','sm')} Aplicando atualização...<br/>
        <div style="margin-top:8px;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
          <div id="progress-bar" style="height:100%;width:60%;background:var(--g400);border-radius:3px;transition:width .5s"></div>
        </div>
      </div>`;

    await delay(500);

    const resp2 = await fetch('/api/update/aplicar', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + API.token,
      },
      body: JSON.stringify({ versao }),
    });
    const result = await resp2.json();
    if (!resp2.ok) throw new Error(result.erro || 'Erro ao aplicar');

    document.getElementById('progress-bar').style.width = '100%';

    // 3. Sucesso
    await delay(600);
    resEl.innerHTML = `
      <div class="alert alert-ok" style="border-left:4px solid var(--g500)">
        <div style="display:flex;align-items:center;gap:12px">
          <span style="font-size:28px">🎉</span>
          <div>
            <strong style="font-size:16px">${result.mensagem}</strong><br/>
            <span style="font-size:13px;opacity:.8">
              ${result.arquivos_atualizados} arquivos atualizados · ${result.backups_realizados} backups realizados
            </span>
          </div>
        </div>
        <div style="margin-top:16px;padding:12px;background:var(--bg-subtle);border-radius:8px;font-size:13px">
          ${icon('info','sm')} Recomenda-se recarregar a página para garantir que todos os módulos funcionem corretamente.
        </div>
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="btn btn-primary" onclick="recarregarApp()">
            ${icon('refresh','sm')} Recarregar Sistema
          </button>
          <button class="btn" onclick="verificarAtualizacao()">
            ${icon('check','sm')} Verificar versão
          </button>
        </div>
      </div>`;

    // Atualiza versão local na UI
    if (result.versao) {
      document.getElementById('up-ver-local').textContent = result.versao.versao || versao;
      document.getElementById('up-build-local').textContent = `#${result.versao.build || '?'}`;
    }

    toast('✅ Sistema atualizado com sucesso!');
  } catch(e) {
    resEl.innerHTML = `
      <div class="alert alert-erro">
        ${icon('x_circle','sm')} <strong>Erro na atualização:</strong> ${e.message}<br/>
        <span style="font-size:12px;opacity:.7">Use a opção de rollback se necessário.</span>
      </div>
      <div style="margin-top:8px;display:flex;gap:8px">
        <button class="btn btn-danger" onclick="fazerRollback()">
          ${icon('rotate_ccw','sm')} Reverter (Rollback)
        </button>
        <button class="btn" onclick="verificarAtualizacao()">
          ${icon('refresh','sm')} Tentar novamente
        </button>
      </div>`;
    toast('❌ ' + e.message, 'err');
  } finally {
    downloadProgress = false;
    if (btn) btn.disabled = false;
  }
}

// ── Rollback ──────────────────────────────────────────────────────────────
async function fazerRollback() {
  if (!confirm('Reverter para a versão anterior?\n\nEsta ação restaurará os arquivos da última atualização.')) return;

  const resEl = document.getElementById('up-resultado');
  resEl.style.display = 'block';
  resEl.innerHTML = `<div class="alert alert-info">${icon('rotate_ccw','sm')} Revertendo atualização...</div>`;

  try {
    const resp = await fetch('/api/update/rollback', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + API.token },
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.erro);

    resEl.innerHTML = `
      <div class="alert alert-ok">
        ${icon('check_circle','sm')} ${data.mensagem}
      </div>`;

    if (data.versao) {
      document.getElementById('up-ver-local').textContent = data.versao.versao || '—';
      document.getElementById('up-build-local').textContent = `#${data.versao.build || '?'}`;
    }

    toast('🔄 Rollback realizado!');
  } catch(e) {
    resEl.innerHTML = `<div class="alert alert-erro">${icon('x_circle','sm')} ${e.message}</div>`;
    toast(e.message, 'err');
  }
}

// ── Configurar URL de update ──────────────────────────────────────────────
async function abrirConfigUpdate() {
  let urlAtual = '';
  try {
    const data = await API.get('/update/config');
    urlAtual = data.update_url || '';
  } catch(_) {}

  const corpo = `
    <div style="display:flex;flex-direction:column;gap:14px">
      <p style="font-size:13px;color:var(--text-2)">
        Informe a URL do endpoint JSON que retorna as informações da versão disponível.
        Compatível com GitHub Releases API ou JSON personalizado.
      </p>
      <div class="form-group">
        <label>URL de verificação de atualizações</label>
        <input id="f-update-url" value="${urlAtual.replace(/"/g, '&quot;')}" placeholder="https://api.github.com/repos/usuario/repo/releases/latest"/>
      </div>
      <details style="font-size:12px;color:var(--text-2)">
        <summary style="cursor:pointer;font-weight:600">Formato esperado do JSON</summary>
        <pre style="margin-top:8px;padding:10px;background:var(--bg-subtle);border-radius:6px;overflow-x:auto;font-size:11px">
{
  "versao": "1.1.0",
  "nome": "AgroGestão v1.1.0",
  "download_url": "https://.../update.zip",
  "checksum": "sha256...",
  "body": "Notas da versão"
}</pre>
        <p style="margin-top:6px">Também aceita o formato padrão da API de Releases do GitHub.</p>
      </details>
    </div>`;

  abrirModal('Configurar URL de Atualização', corpo,
    `<button class="btn" onclick="fecharModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="salvarConfigUpdate()"><span class="icon icon-sm">${ICONS.save}</span> Salvar</button>`, true);
}

async function salvarConfigUpdate() {
  const url = document.getElementById('f-update-url')?.value?.trim();
  if (!url) { toast('Informe uma URL', 'err'); return; }
  try {
    await API.post('/update/config', { update_url: url });
    fecharModal();
    toast('URL de atualização salva!');
    verificarAtualizacao();
  } catch(e) { toast(e.message, 'err'); }
}

// ── Histórico ─────────────────────────────────────────────────────────────
async function verHistoricoUpdate() {
  const histEl = document.getElementById('up-historico');
  histEl.style.display = 'block';

  try {
    const data = await API.get('/update/versoes');
    const logs = data.historico || [];

    if (logs.length === 0) {
      histEl.innerHTML = `<div class="card card-body" style="text-align:center;color:var(--text-3);padding:32px">
        ${icon('clock','lg')}<br/>Nenhum registro de atualização encontrado.
      </div>`;
      return;
    }

    const statusBadge = (s) => {
      const map = {
        'sucesso': '<span class="badge badge-green">Sucesso</span>',
        'erro': '<span class="badge badge-red">Erro</span>',
        'rollback': '<span class="badge badge-amber">Rollback</span>',
        'pendente': '<span class="badge badge-gray">Pendente</span>',
      };
      return map[s] || `<span class="badge badge-gray">${s}</span>`;
    };

    histEl.innerHTML = `
      <div class="card">
        <div class="card-body">
          <div class="card-title">${icon('clock','md')} Histórico de Atualizações</div>
          <div style="margin-top:4px;font-size:12px;color:var(--text-2)">
            Versão atual: <strong>${data.versao_atual?.versao || '—'}</strong> (build #${data.versao_atual?.build || 0})
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Versão</th><th>Status</th><th>Detalhes</th></tr></thead>
            <tbody>
              ${logs.map(l => `
                <tr>
                  <td style="white-space:nowrap">${fmt.data(l.criado_em)}</td>
                  <td><strong>${l.versao}</strong></td>
                  <td>${statusBadge(l.status)}</td>
                  <td style="font-size:12px;color:var(--text-2);max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${l.detalhes || '—'}</td>
                </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;padding:16px">Nenhum registro</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>`;
  } catch(e) {
    histEl.innerHTML = `<div class="alert alert-erro">${icon('x_circle','sm')} ${e.message}</div>`;
  }
}

// ── Recarregar app ────────────────────────────────────────────────────────
function recarregarApp() {
  window.location.reload();
}

// ── Utilitários ───────────────────────────────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function fmtarq(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
