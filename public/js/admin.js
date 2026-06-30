// ── ADMIN ─────────────────────────────────────────────────────────────────
async function iniciarAdmin() {
  const el = document.getElementById('section-admin');
  el.innerHTML = `
    <div class="page-header">
      <h2 class="page-title"><span class="icon icon-md">${ICONS.settings}</span> Configurações do Sistema</h2>
    </div>

    <!-- TEXTOS DO PROJETO (Recomendações, Preservação, etc.) -->
    <div class="card card-body" style="margin-bottom:16px">
      <div class="card-title"><span class="icon icon-md">${ICONS.file}</span> Textos Padrão do Projeto Técnico</div>
      <p style="font-size:13px;color:var(--text-2);margin-bottom:20px">
        Estes textos aparecem automaticamente nas seções do projeto em PDF. Edite conforme necessário — serão salvos e usados em todos os novos projetos gerados.
      </p>

      <div style="display:flex;flex-direction:column;gap:18px;">

        <div class="form-group">
          <label style="font-weight:700;color:var(--verde-dark);text-transform:uppercase;font-size:12px;letter-spacing:.5px;display:flex;align-items:center;gap:6px">
            <span class="icon icon-sm">${ICONS.clipboard}</span> Recomendações Técnicas
          </label>
          <textarea id="txt-rec-tecnica" rows="4"
            placeholder="Texto sobre o estado da área produtiva, capacidade hídrica e parâmetros da propriedade..."
            style="resize:vertical;font-size:13px;line-height:1.55"></textarea>
        </div>

        <div class="form-group">
          <label style="font-weight:700;color:var(--verde-dark);text-transform:uppercase;font-size:12px;letter-spacing:.5px;display:flex;align-items:center;gap:6px">
            <span class="icon icon-sm">${ICONS.leaf}</span> Recomendação para Preservação do Meio Ambiente
          </label>
          <textarea id="txt-preservacao" rows="4"
            placeholder="Texto sobre orientações ambientais, reserva legal, mata ciliar, DCAA, outorga de uso de água..."
            style="resize:vertical;font-size:13px;line-height:1.55"></textarea>
        </div>

        <div class="form-group">
          <label style="font-weight:700;color:var(--verde-dark);text-transform:uppercase;font-size:12px;letter-spacing:.5px;display:flex;align-items:center;gap:6px">
            <span class="icon icon-sm">${ICONS.layers}</span> Conservação de Solo
          </label>
          <textarea id="txt-conservacao-solo" rows="3"
            placeholder="Texto sobre recomendações de manejo do solo e técnicas de conservação..."
            style="resize:vertical;font-size:13px;line-height:1.55"></textarea>
        </div>

        <div class="form-group">
          <label style="font-weight:700;color:var(--verde-dark);text-transform:uppercase;font-size:12px;letter-spacing:.5px;display:flex;align-items:center;gap:6px">
            <span class="icon icon-sm">${ICONS.map}</span> Croqui de Localização
          </label>
          <textarea id="txt-croqui" rows="2"
            placeholder="Texto informativo sobre o croqui de localização do imóvel..."
            style="resize:vertical;font-size:13px;line-height:1.55"></textarea>
        </div>

        <div class="form-group">
          <label style="font-weight:700;color:var(--verde-dark);text-transform:uppercase;font-size:12px;letter-spacing:.5px;display:flex;align-items:center;gap:6px">
            <span class="icon icon-sm">${ICONS.check_square}</span> Ateste
          </label>
          <textarea id="txt-ateste" rows="4"
            placeholder="Texto do ateste de acompanhamento técnico da ASTEC/ATNI..."
            style="resize:vertical;font-size:13px;line-height:1.55"></textarea>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px;padding-top:12px;border-top:1px solid var(--border)">
          <button class="btn" onclick="carregarTextosprojeto()"><span class="icon icon-sm">${ICONS.refresh}</span> Recarregar</button>
          <button class="btn btn-primary" onclick="salvarTextosprojeto()"><span class="icon icon-sm">${ICONS.save}</span> Salvar Textos do Projeto</button>
        </div>
      </div>
    </div>

    <!-- DADOS DA EMPRESA + LOGOMARCA -->
    <div class="card card-body" style="margin-bottom:16px">
      <div class="card-title"><span class="icon icon-md">${ICONS.settings}</span> Dados da Empresa / Logomarca</div>
      <p style="font-size:13px;color:var(--text-2);margin-bottom:20px">
        Essas informações aparecem no cabeçalho dos projetos e relatórios gerados em PDF.
      </p>

      <div style="display:grid;grid-template-columns:auto 1fr;gap:28px;align-items:start;flex-wrap:wrap">

        <!-- Logo -->
        <div style="display:flex;flex-direction:column;gap:10px;align-items:center">
          <div id="logo-preview" style="border:2px dashed var(--border);border-radius:12px;padding:14px;
               width:200px;min-height:100px;display:flex;align-items:center;justify-content:center;
               background:var(--bg)">
            <span style="color:var(--text-3);font-size:12px;text-align:center">Carregando...</span>
          </div>
          <input type="file" id="logo-input" accept=".png,.jpg,.jpeg,.gif,.webp"
                 style="font-size:12px;width:200px"/>
          <button class="btn btn-primary" style="width:200px" onclick="uploadLogomarca()"><span class="icon icon-sm">${ICONS.upload}</span> Enviar Logomarca</button>
          <button class="btn btn-danger btn-sm" id="btn-remover-logo" onclick="removerLogomarca()" style="display:none;width:200px"><span class="icon icon-sm">${ICONS.trash}</span> Remover Logo</button>
        </div>

        <!-- Campos da empresa -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
          <div class="form-group col-span-2">
            <label>Razão Social / Nome da Empresa</label>
            <input id="emp-razao" placeholder="Ex: GSO SERVIÇOS AGRONÔMICOS LTDA"/>
          </div>
          <div class="form-group col-span-2">
            <label>Nome Fantasia / Consultoria</label>
            <input id="emp-fantasia" placeholder="Ex: AGRIPEC CONSULTORIA"/>
          </div>
          <div class="form-group">
            <label>CNPJ</label>
            <input id="emp-cnpj" placeholder="00.000.000/0001-00"/>
          </div>
          <div class="form-group">
            <label>CREA / Registro</label>
            <input id="emp-crea" placeholder="Ex: CREA-MA: 0005462592"/>
          </div>
          <div class="form-group">
            <label>Telefone / WhatsApp</label>
            <input id="emp-fone" placeholder="Ex: 98 98118-8695"/>
          </div>
          <div class="form-group">
            <label>E-mail</label>
            <input id="emp-email" placeholder="agripec@empresa.com.br"/>
          </div>
          <div class="form-group col-span-2">
            <label>Endereço Completo</label>
            <input id="emp-endereco" placeholder="Ex: RUA SANTA CRUZ, 15 A, CENTRO - BOM JARDIM / MA"/>
          </div>
          <div class="form-group">
            <label>Responsável Técnico</label>
            <input id="emp-resp" placeholder="Nome do Engenheiro"/>
          </div>
          <div class="form-group">
            <label>Formação</label>
            <input id="emp-formacao" placeholder="Ex: Engenheiro Agrônomo"/>
          </div>
          <div class="form-group">
            <label>Conselho de Classe (ex: CREA-MA: 111.737.380-0)</label>
            <input id="emp-conselho" placeholder="CREA-MA: 000.000.000-0"/>
          </div>
          <div class="form-group">
            <label>RNP do Responsável</label>
            <input id="emp-rnp" placeholder="Ex: 1117373800"/>
          </div>
          <div class="col-span-2" style="display:flex;justify-content:flex-end;gap:10px;margin-top:4px">
            <button class="btn" onclick="carregarDadosEmpresa()"><span class="icon icon-sm">${ICONS.refresh}</span> Recarregar</button>
            <button class="btn btn-primary" onclick="salvarDadosEmpresa()"><span class="icon icon-sm">${ICONS.save}</span> Salvar Dados da Empresa</button>
          </div>
        </div>
      </div>
    </div>

    <!-- USUÁRIOS -->
    <div class="card">
      <div class="card-body" style="display:flex;justify-content:space-between;align-items:center">
        <div class="card-title"><span class="icon icon-md">${ICONS.users}</span> Usuários do Sistema</div>
        <button class="btn btn-primary" onclick="abrirFormUsuario()"><span class="icon icon-sm">${ICONS.plus}</span> Novo Usuário</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Ativo</th><th>Cadastrado em</th></tr></thead>
          <tbody id="admin-tbody"><tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-3)">Carregando...</td></tr></tbody>
        </table>
      </div>
    </div>`;

  carregarLogoPreview();
  carregarDadosEmpresa();
  carregarTextosprojeto();
  carregarUsuarios();
}

// ── Textos do Projeto ──────────────────────────────────────────────────────
const TEXTOS_PROJETO_DEFAULTS = {
  'txt_rec_tecnica':
    'A área produtiva da propriedade encontra-se em regular estado de conservação, boa capacidade hídrica, o que leva a bons parâmetros que possibilitam a aquisição de bezerros e sua respectiva produção.',
  'txt_preservacao_ambiental':
    'O proponente foi orientado em relação às leis ambientais vigentes, principalmente no que tange à reserva legal, mata ciliar e demais áreas de preservação permanente. Imóvel possui DCAA e Outorga de uso de água, conforme legislação do Estado do Maranhão.',
  'txt_conservacao_solo':
    'Serão recomendadas, caso necessário, a adoção de técnicas de manejo do solo que visem a melhoria deste, focando na garantia da produção.',
  'txt_croqui_localizacao':
    'Apresentado no dossiê da operação de crédito e no cadastro do cliente, no ambiente glebas geomapa.',
  'txt_ateste':
    'Fica dado ciência sobre o acompanhamento técnico da ASTEC/ATNI ao longo do contrato objeto do projeto ao imóvel beneficiado, com fins de produção de laudos, levantamento de execução de inversões financiadas, recomendações técnicas, eventuais prejuízos e demais ocorrências relevantes, inclusive eventuais irregularidades.',
};

async function carregarTextosprojeto() {
  try {
    const { config: cfg } = await API.get('/config');
    const set = (id, chave) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.value = (cfg[chave] !== undefined && cfg[chave] !== null)
        ? cfg[chave]
        : TEXTOS_PROJETO_DEFAULTS[chave] || '';
    };
    set('txt-rec-tecnica',       'txt_rec_tecnica');
    set('txt-preservacao',       'txt_preservacao_ambiental');
    set('txt-conservacao-solo',  'txt_conservacao_solo');
    set('txt-croqui',            'txt_croqui_localizacao');
    set('txt-ateste',            'txt_ateste');
  } catch(e) {
    // silencioso — config pode estar vazia, defaults já estão no textarea
  }
}

async function salvarTextosprojeto() {
  const campos = [
    ['txt-rec-tecnica',      'txt_rec_tecnica'],
    ['txt-preservacao',      'txt_preservacao_ambiental'],
    ['txt-conservacao-solo', 'txt_conservacao_solo'],
    ['txt-croqui',           'txt_croqui_localizacao'],
    ['txt-ateste',           'txt_ateste'],
  ];
  try {
    for (const [id, chave] of campos) {
      const el = document.getElementById(id);
      if (el) await API.post('/config', { chave, valor: el.value.trim() });
    }
    toast('Textos do projeto salvos com sucesso!');
  } catch(e) { toast('Erro ao salvar textos: ' + e.message, 'err'); }
}

// ── Logomarca ──────────────────────────────────────────────────────────────
async function carregarLogoPreview() {
  const preview = document.getElementById('logo-preview');
  const btnRemover = document.getElementById('btn-remover-logo');
  if (!preview) return;
  try {
    const res = await fetch('/api/config/logomarca', {
      headers: { 'Authorization': 'Bearer ' + API.token }
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      preview.innerHTML = `<img src="${url}" style="max-height:110px;max-width:180px;object-fit:contain;border-radius:6px"/>`;
      if (btnRemover) btnRemover.style.display = '';
    } else {
      preview.innerHTML = `<div style="text-align:center;color:var(--text-3);font-size:12px"><span class="icon icon-lg">${ICONS.image}</span><br>Sem logomarca</div>`;
      if (btnRemover) btnRemover.style.display = 'none';
    }
  } catch(e) {
    preview.innerHTML = `<div style="text-align:center;color:var(--text-3);font-size:12px"><span class="icon icon-lg">${ICONS.image}</span><br>Sem logomarca</div>`;
  }
}

async function uploadLogomarca() {
  const input = document.getElementById('logo-input');
  if (!input?.files[0]) { toast('Selecione uma imagem', 'err'); return; }
  const form = new FormData();
  form.append('logomarca', input.files[0]);
  try {
    await API.postF('/config/logomarca', form);
    toast('Logomarca atualizada!');
    input.value = '';
    carregarLogoPreview();
  } catch(e) { toast(e.message, 'err'); }
}

async function removerLogomarca() {
  if (!confirm('Remover a logomarca?')) return;
  try {
    await API.post('/config', { chave: 'logomarca_path', valor: null });
    toast('Logomarca removida');
    carregarLogoPreview();
  } catch(e) { toast(e.message, 'err'); }
}

// ── Dados da Empresa ───────────────────────────────────────────────────────
async function carregarDadosEmpresa() {
  try {
    const { config: cfg } = await API.get('/config');
    const set = (id, chave) => {
      const el = document.getElementById(id);
      if (el && cfg[chave]) el.value = cfg[chave];
    };
    set('emp-razao',    'emp_razao_social');
    set('emp-fantasia', 'emp_nome_fantasia');
    set('emp-cnpj',     'emp_cnpj');
    set('emp-crea',     'emp_crea');
    set('emp-fone',     'emp_fone');
    set('emp-email',    'emp_email');
    set('emp-endereco', 'emp_endereco');
    set('emp-resp',     'emp_responsavel');
    set('emp-formacao', 'emp_formacao');
    set('emp-conselho', 'emp_conselho');
    set('emp-rnp',      'emp_rnp');
  } catch(e) { /* silencioso – config pode estar vazia */ }
}

async function salvarDadosEmpresa() {
  const campos = [
    ['emp-razao',    'emp_razao_social'],
    ['emp-fantasia', 'emp_nome_fantasia'],
    ['emp-cnpj',     'emp_cnpj'],
    ['emp-crea',     'emp_crea'],
    ['emp-fone',     'emp_fone'],
    ['emp-email',    'emp_email'],
    ['emp-endereco', 'emp_endereco'],
    ['emp-resp',     'emp_responsavel'],
    ['emp-formacao', 'emp_formacao'],
    ['emp-conselho', 'emp_conselho'],
    ['emp-rnp',      'emp_rnp'],
  ];
  try {
    for (const [id, chave] of campos) {
      const el = document.getElementById(id);
      if (el) await API.post('/config', { chave, valor: el.value });
    }
    toast('Dados da empresa salvos com sucesso!');
  } catch(e) { toast('Erro ao salvar: ' + e.message, 'err'); }
}

// ── Usuários ───────────────────────────────────────────────────────────────
async function carregarUsuarios() {
  try {
    const { usuarios } = await API.get('/auth/usuarios');
    document.getElementById('admin-tbody').innerHTML = usuarios.map(u => `
      <tr>
        <td><strong>${u.nome}</strong></td>
        <td>${u.email}</td>
        <td>${u.perfil === 'admin' ? '<span class="badge badge-amber">Administrador</span>' : '<span class="badge badge-gray">Operador</span>'}</td>
        <td>${u.ativo ? '<span class="badge badge-green">Ativo</span>' : '<span class="badge badge-red">Inativo</span>'}</td>
        <td>${fmt.data(u.criado_em)}</td>
      </tr>`).join('');
  } catch(e) { toast('Erro ao carregar usuários', 'err'); }
}

function abrirFormUsuario() {
  const corpo = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      <div class="form-group"><label>Nome *</label><input id="f-nome" placeholder="Nome completo"/></div>
      <div class="form-group"><label>E-mail *</label><input id="f-email" type="email" placeholder="email@exemplo.com"/></div>
      <div class="form-group"><label>Senha *</label><input id="f-senha" type="password" placeholder="Mínimo 6 caracteres"/></div>
      <div class="form-group"><label>Perfil</label>
        <select id="f-perfil"><option value="operador">Operador</option><option value="admin">Administrador</option></select>
      </div>
    </div>`;
  abrirModal('Novo Usuário', corpo,
    `<button class="btn" onclick="fecharModal()">Cancelar</button>
     <button class="btn btn-primary" onclick="salvarUsuario()"><span class="icon icon-sm">${ICONS.save}</span> Criar</button>`, true);
}

async function salvarUsuario() {
  const body = { nome: formValue('f-nome'), email: formValue('f-email'), senha: formValue('f-senha'), perfil: formValue('f-perfil') };
  if (!body.nome || !body.email || !body.senha) { toast('Preencha todos os campos', 'err'); return; }
  try {
    await API.post('/auth/usuarios', body);
    fecharModal(); toast('Usuário criado!'); carregarUsuarios();
  } catch(e) { toast(e.message, 'err'); }
}
