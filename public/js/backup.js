// ── BACKUP & RESTORE ─────────────────────────────────────────────────────

async function iniciarBackup() {
  const el = document.getElementById('section-backup');
  el.innerHTML = `
    <div class="page-header">
      <div class="page-header-left">
        <h2 class="page-title">${icon('backup','md')} Backup & Restauração</h2>
        <p class="page-subtitle">Exporte e importe os dados cadastrados com segurança</p>
      </div>
    </div>

    <div class="backup-section">
      <div class="backup-card">
        <div class="backup-card-icon"><span class="icon icon-2xl">${ICONS.download}</span></div>
        <h3>Exportar Backup</h3>
        <p>
          Gera um arquivo <strong>.zip</strong> contendo todos os dados do sistema:
          clientes, imóveis, semoventes e documentos.<br/>
          Recomenda-se realizar backup periodicamente e guardar em local seguro.
        </p>
        <button class="btn btn-primary" onclick="exportarBackup()">
          ${icon('download')} Baixar Backup Completo
        </button>
      </div>

      <div class="backup-card">
        <div class="backup-card-icon"><span class="icon icon-2xl">${ICONS.upload}</span></div>
        <h3>Restaurar Backup</h3>
        <p>
          Importa um arquivo <strong>.zip</strong> de backup previamente exportado.
          <strong style="color:var(--r600)">Atenção:</strong> esta operação irá
          mesclar os dados importados com os dados existentes.
        </p>
        <label class="btn" style="cursor:pointer">
          ${icon('upload')} Selecionar arquivo .zip
          <input type="file" accept=".zip" style="display:none" onchange="importarBackup(this)"/>
        </label>
      </div>
    </div>

    <div id="backup-status" style="margin-top:16px"></div>

    <div class="backup-card" style="margin-top:16px;border-left:3px solid var(--primary)">
      <h3 style="font-size:14px">${icon('info','sm')} Boas práticas de backup</h3>
      <div style="font-size:13px;color:var(--text-2);line-height:1.8;margin-top:10px">
        <div>${icon('check','xs')} Faça backup semanalmente ou antes de qualquer importação</div>
        <div>${icon('check','xs')} Guarde cópias em pelo menos dois locais (HD externo + nuvem)</div>
        <div>${icon('check','xs')} O arquivo <code>data/agrogestao.db</code> é o banco de dados principal</div>
        <div>${icon('check','xs')} Nunca exclua a pasta <code>data/</code> sem ter um backup</div>
      </div>
    </div>`;
}

async function exportarBackup() {
  const statusEl = document.getElementById('backup-status');
  statusEl.innerHTML = `<div class="alert alert-info">${icon('info','sm')} Gerando backup, aguarde...</div>`;
  try {
    const resp = await fetch('/api/backup/exportar', {
      headers: { Authorization: 'Bearer ' + API.token }
    });
    if (!resp.ok) throw new Error((await resp.json()).erro || 'Erro ao gerar backup');
    const blob = await resp.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    const ts   = new Date().toISOString().slice(0,10);
    a.download = `backup_agrogestao_${ts}.zip`;
    a.click();
    URL.revokeObjectURL(url);
    statusEl.innerHTML = `<div class="alert alert-ok">${icon('check_circle','sm')} Backup exportado: <strong>backup_agrogestao_${ts}.zip</strong></div>`;
    toast('Backup gerado com sucesso!');
  } catch(e) {
    statusEl.innerHTML = `<div class="alert alert-erro">${icon('x_circle','sm')} ${e.message}</div>`;
    toast(e.message, 'err');
  }
}

async function importarBackup(input) {
  const file = input.files[0];
  if (!file) return;
  if (!file.name.endsWith('.zip')) { toast('Selecione um arquivo .zip válido', 'err'); return; }

  const statusEl = document.getElementById('backup-status');
  if (!confirm(`Restaurar backup de "${file.name}"?\n\nOs dados serão mesclados. Esta ação não pode ser desfeita.`)) {
    input.value = ''; return;
  }

  statusEl.innerHTML = `<div class="alert alert-info">${icon('info','sm')} Importando backup, aguarde...</div>`;
  const form = new FormData();
  form.append('backup', file);

  try {
    const resp = await fetch('/api/backup/importar', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + API.token },
      body: form,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.erro || 'Erro ao importar');
    statusEl.innerHTML = `
      <div class="alert alert-ok">
        ${icon('check_circle','sm')} Backup restaurado com sucesso!<br/>
        <span style="font-size:12px;opacity:.8">
          ${data.resumo?.clientes||0} clientes · 
          ${data.resumo?.imoveis||0} imóveis · 
          ${data.resumo?.semoventes||0} lotes de semoventes importados
        </span>
      </div>`;
    toast('Backup restaurado com sucesso!');
  } catch(e) {
    statusEl.innerHTML = `<div class="alert alert-erro">${icon('x_circle','sm')} ${e.message}</div>`;
    toast(e.message, 'err');
  }
  input.value = '';
}
