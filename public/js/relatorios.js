// ── RELATÓRIOS ───────────────────────────────────────────────────────────
async function iniciarRelatorios() {
  const el = document.getElementById('section-relatorios');
  el.innerHTML = '<p style="color:var(--text-3);padding:20px">Carregando...</p>';
  try {
    const [{ totais, graficos }, { resumo }] = await Promise.all([
      API.get('/dashboard/resumo'),
      API.get('/semoventes/resumo/categorias'),
    ]);

    const maxVal = Math.max(...(graficos.semoventes_por_categoria||[]).map(c => c.total), 1);
    const barras = (graficos.semoventes_por_categoria||[]).map(c => {
      const cat = CATEGORIAS.find(x => x.v === c.categoria) || { l: c.categoria, cor: '#888' };
      const pct  = Math.round((c.total / maxVal) * 100);
      return `<div class="chart-col">
        <div class="chart-val">${fmt.num(c.total)}</div>
        <div class="chart-bar" style="height:${pct}%;min-height:4px;background:${cat.cor}"></div>
        <div class="chart-lbl">${cat.l}</div>
      </div>`;
    }).join('');

    const linhasResumo = resumo.map(c => {
      const cat = CATEGORIAS.find(x => x.v === c.categoria);
      return `<tr>
        <td>${badgeCategoria(c.categoria)}</td>
        <td style="text-align:right">${c.total_lotes}</td>
        <td style="text-align:right"><strong>${fmt.num(c.total_cabecas)}</strong></td>
        <td style="text-align:right">${fmt.moeda(c.preco_medio)}</td>
        <td style="text-align:right"><strong style="color:var(--green)">${fmt.moeda(c.valor_total)}</strong></td>
      </tr>`;
    }).join('');

    el.innerHTML = `
      <div class="page-header"><h2 class="page-title">${icon('relatorios','md')} Relatórios</h2></div>

      <div class="relat-grid">
        <div class="relat-card">
          <div class="relat-card-icon">${icon('users','lg')}</div>
          <div class="relat-card-title">Clientes</div>
          <div class="relat-card-desc">${totais.clientes} cadastrados</div>
          <div class="relat-card-btns">
            <button class="btn btn-sm btn-pdf" onclick="exportarPDF('clientes')">${icon('pdf')} PDF</button>
            <button class="btn btn-sm btn-csv" onclick="exportarClientesCSV()">${icon('download')} CSV</button>
          </div>
        </div>
        <div class="relat-card">
          <div class="relat-card-icon">${icon('home','lg')}</div>
          <div class="relat-card-title">Imóveis</div>
          <div class="relat-card-desc">${totais.imoveis} cadastrados · ${fmt.area(totais.area_total)}</div>
          <div class="relat-card-btns">
            <button class="btn btn-sm btn-pdf" onclick="exportarPDF('imoveis')">${icon('pdf')} PDF</button>
            <button class="btn btn-sm btn-csv" onclick="exportarImoveisCSV()">${icon('download')} CSV</button>
          </div>
        </div>
        <div class="relat-card">
          <div class="relat-card-icon">${icon('cow','lg')}</div>
          <div class="relat-card-title">Semoventes</div>
          <div class="relat-card-desc">${fmt.num(totais.cabecas)} cabeças · ${fmt.moeda(totais.valor_plantel)}</div>
          <div class="relat-card-btns">
            <button class="btn btn-sm btn-pdf" onclick="exportarPDF('semoventes')">${icon('pdf')} PDF</button>
            <button class="btn btn-sm btn-csv" onclick="exportarSemoventesCSV()">${icon('download')} CSV</button>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card card-body">
          <div class="card-title">${icon('cow','md')} Distribuição do Plantel</div>
          ${barras ? `<div class="chart-bars">${barras}</div>` : '<p style="color:var(--text-3)">Sem dados</p>'}
        </div>
        <div class="card card-body">
          <div class="card-title">${icon('area','md')} Resumo Geral</div>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div class="metric-card"><div class="metric-label">${icon('users','xs')} Clientes</div><div class="metric-value">${totais.clientes}</div></div>
            <div class="metric-card"><div class="metric-label">${icon('home','xs')} Área Total</div><div class="metric-value" style="font-size:20px">${fmt.area(totais.area_total)}</div></div>
            <div class="metric-card"><div class="metric-label">${icon('cow','xs')} Cabeças</div><div class="metric-value">${fmt.num(totais.cabecas)}</div></div>
            <div class="valor-box"><div class="label">Valor Estimado do Plantel</div><div class="valor">${fmt.moeda(totais.valor_plantel)}</div></div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-body"><div class="card-title">${icon('filter','md')} Detalhamento por Categoria</div></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Categoria</th><th style="text-align:right">Lotes</th><th style="text-align:right">Cabeças</th><th style="text-align:right">Preço Médio</th><th style="text-align:right">Valor Total</th></tr></thead>
            <tbody>${linhasResumo || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-3)">Sem dados</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  } catch(e) {
    el.innerHTML = `<div class="alert alert-erro">Erro: ${e.message}</div>`;
  }
}

async function exportarPDF(tipo) {
  try {
    const res = await fetch(`/api/relatorios/pdf/${tipo}`, {
      headers: { 'Authorization': 'Bearer ' + (API.token || localStorage.getItem('ag_token')) }
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ erro: res.statusText }));
      throw new Error(err.erro || res.statusText);
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${tipo}_${new Date().toISOString().slice(0,10)}.pdf`;
    a.click();
    toast(`PDF de ${tipo} exportado!`);
  } catch(e) { toast('Erro ao exportar: '+e.message, 'err'); }
}

// ── MAPAS ─────────────────────────────────────────────────────────────────
let mapaInst = null;
let mapaMarkers = []; // guarda referências dos marcadores para fitBounds

async function iniciarMapas() {
  const el = document.getElementById('section-mapas');

  // ── Verifica se Leaflet está disponível ───────────────────────────────
  if (typeof L === 'undefined') {
    el.innerHTML = `
      <div class="page-header"><h2 class="page-title">Mapa de Imóveis</h2></div>
      <div class="card card-body" style="text-align:center;padding:60px">
        <span class="icon icon-2xl" style="color:var(--text-3)">${ICONS.mapas}</span>
        <p style="margin-top:16px;color:var(--text-2);font-size:14px">
          Biblioteca de mapas (Leaflet) não pôde ser carregada.<br/>
          Verifique sua conexão com a internet ou tente novamente.
        </p>
        <button class="btn btn-primary" style="margin-top:12px" onclick="iniciarMapas()">
          <span class="icon icon-sm">${ICONS.backup}</span> Tentar novamente
        </button>
      </div>`;
    return;
  }

  // ── Renderiza layout ──────────────────────────────────────────────────
  el.innerHTML = `
    <div class="page-header"><h2 class="page-title">Mapa de Imóveis</h2></div>
    <div class="grid-2" style="align-items:start">
      <div class="card card-body">
        <div class="card-title">Imóveis com Coordenadas</div>
        <div id="mapa-lista" style="display:flex;flex-direction:column;gap:6px;max-height:380px;overflow-y:auto"></div>
      </div>
      <div><div id="map"></div></div>
    </div>`;

  // ── Busca TODOS os imóveis via rota exclusiva (sem limite/paginação) ──
  try {
    const data = await API.get('/imoveis/mapa');
    const imoveis = data.imoveis || [];
    const ignorados = data.ignorados || 0;

    const lista = document.getElementById('mapa-lista');
    if (!lista) return;

    // ── Lista lateral ─────────────────────────────────────────────────
    if (!imoveis.length) {
      lista.innerHTML = '<p style="color:var(--text-3);font-size:13px">Nenhum imóvel com coordenadas válidas cadastradas.</p>';
      if (ignorados > 0) {
        lista.innerHTML += `<p style="color:var(--text-3);font-size:11px;margin-top:8px">${ignorados} imóvel(is) ignorado(s) por coordenadas inválidas.</p>`;
      }
    } else {
      const listaHtml = imoveis.map(im => {
        // Usa data attributes para evitar problemas com aspas nos nomes
        const nomeEsc = (im.nome || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        return `<div class="mapa-item" data-lat="${im.latitude}" data-lng="${im.longitude}" data-nome="${nomeEsc}"
          style="padding:10px 12px;border:0.5px solid var(--border);border-radius:8px;cursor:pointer"
          onclick="focarImovelMapa(${im.latitude},${im.longitude})">
          <div style="font-weight:600;font-size:13px">${im.nome}</div>
          <div style="font-size:12px;color:var(--text-3)">${im.municipio||''}${im.uf ? ' – '+im.uf : ''} · ${badgeSituacao(im.situacao)}</div>
        </div>`;
      }).join('');
      lista.innerHTML = listaHtml;
      if (ignorados > 0) {
        lista.innerHTML += `<p style="color:var(--text-3);font-size:11px;margin-top:8px;padding:4px 12px">⚠️ ${ignorados} imóvel(is) ignorado(s) por coordenadas inválidas.</p>`;
      }
    }

    // ── Remove instância anterior do mapa ──────────────────────────────
    if (mapaInst) {
      try { mapaInst.remove(); } catch(e) {}
      mapaInst = null;
    }
    mapaMarkers = [];

    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;

    // ── Cria mapa ──────────────────────────────────────────────────────
    mapaInst = L.map('map', {
      zoomControl: true,
      attributionControl: true,
    });

    // ── Camada de tiles com fallback ───────────────────────────────────
    let tileOk = false;
    try {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapaInst);
      tileOk = true;
    } catch(e) {
      console.warn('Tile OSM falhou, tentando fallback:', e);
    }
    if (!tileOk) {
      try {
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          attribution: '&copy; Esri',
          maxZoom: 18,
        }).addTo(mapaInst);
      } catch(e) {
        console.error('Todos os tiles falharam:', e);
      }
    }

    // ── Adiciona marcadores (com try/catch individual!) ────────────────
    imoveis.forEach(im => {
      try {
        const lat = parseFloat(im.latitude);
        const lng = parseFloat(im.longitude);
        if (isNaN(lat) || isNaN(lng)) return; // segurança extra

        const marker = L.marker([lat, lng]).addTo(mapaInst);
        mapaMarkers.push(marker);

        // Popup seguro: usa data-* e textContent para evitar XSS/injeção
        const coordText = fmt.coordenada(lat, 'lat') + ' / ' + fmt.coordenada(lng, 'lng');
        const popupHtml = '<div style="font-size:13px;line-height:1.6">' +
          '<strong>' + escHtml(im.nome || 'Sem nome') + '</strong><br>' +
          (im.municipio ? escHtml(im.municipio) : '') + (im.uf ? ' – ' + escHtml(im.uf) : '') + '<br>' +
          '📍 ' + coordText + '<br>' +
          'Área: ' + fmt.area(im.area_total) + '<br>' +
          badgeSituacao(im.situacao || '') +
          '</div>';
        marker.bindPopup(popupHtml);
      } catch (errMarker) {
        // NUNCA interrompe o loop inteiro por causa de um marcador inválido
        console.warn('Erro ao criar marcador para:', im.nome, errMarker);
      }
    });

    // ── Ajusta zoom para mostrar TODOS os marcadores ───────────────────
    if (mapaMarkers.length > 0) {
      try {
        const group = L.featureGroup(mapaMarkers);
        mapaInst.fitBounds(group.getBounds().pad(0.1)); // padding 10%
      } catch(e) {
        // Fallback: centraliza no primeiro marcador
        const primeiro = mapaMarkers[0].getLatLng();
        mapaInst.setView([primeiro.lat, primeiro.lng], 9);
      }
    } else {
      // Nenhum marcador: mostra o estado do Maranhão
      mapaInst.setView([-3.6, -44.8], 7);
    }

    // ── Força recálculo do tamanho (importante após innerHTML) ─────────
    setTimeout(() => {
      if (mapaInst) mapaInst.invalidateSize();
    }, 400);

  } catch(e) {
    console.error('Erro no mapa:', e);
    const mapEl = document.getElementById('map');
    if (mapEl) {
      mapEl.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-3)">' +
        '<span class="icon icon-xl">' + ICONS.mapas + '</span>' +
        '<p style="margin-top:12px">Erro ao carregar mapa: ' + escHtml(e.message) + '</p>' +
        '<button class="btn btn-sm" style="margin-top:8px" onclick="iniciarMapas()">Tentar novamente</button>' +
        '</div>';
    }
    toast('Erro ao carregar mapa', 'err');
  }
}

// ── Foca em um imóvel específico no mapa ─────────────────────────────────
function focarImovelMapa(lat, lng) {
  if (!mapaInst) return;
  mapaInst.setView([lat, lng], 15);
  // Abre o popup do marcador correspondente
  mapaInst.eachLayer(layer => {
    if (layer instanceof L.Marker) {
      const pos = layer.getLatLng();
      if (Math.abs(pos.lat - lat) < 0.0001 && Math.abs(pos.lng - lng) < 0.0001) {
        layer.openPopup();
      }
    }
  });
}

// ── Helper para escapar HTML (evita XSS em popups e textos) ──────────────
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


