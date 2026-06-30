'use strict';
/**
 * gerador_pdf.js — Gerador de PDF 100% Node.js (sem Python)
 * Usa pdf-lib para gerar relatórios e projetos técnicos.
 */

const { PDFDocument, rgb, StandardFonts, PageSizes } = require('pdf-lib');
const fs = require('fs');
const path = require('path');

// ── Paleta de cores do sistema ─────────────────────────────────────────────
const COR = {
  verde_dark:  rgb(27/255,  67/255,  50/255),   // #1b4332
  verde_med:   rgb(45/255,  106/255, 79/255),   // #2d6a4f
  verde_light: rgb(90/255,  170/255, 71/255),   // #5aaa47
  verde_pale:  rgb(235/255, 245/255, 238/255),  // #ebf5ee
  verde_sec:   rgb(216/255, 237/255, 207/255),  // #d8edcf
  cinza_label: rgb(238/255, 240/255, 233/255),  // #eef0e9
  cinza_linha: rgb(244/255, 243/255, 239/255),  // #f4f3ef
  cinza_borda: rgb(205/255, 208/255, 196/255),  // #cdd0c4
  branco:      rgb(1, 1, 1),
  preto:       rgb(30/255, 42/255, 26/255),     // #1e2a1a
  cinza_texto: rgb(82/255, 99/255, 72/255),     // #526348
  amber:       rgb(232/255, 160/255, 32/255),   // #e8a020
};

// ── Formatadores ───────────────────────────────────────────────────────────
function fmtMoeda(v) {
  if (!v && v !== 0) return 'R$ 0,00';
  return 'R$ ' + parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtArea(v) {
  if (!v) return '—';
  return parseFloat(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + ' ha';
}
function fmtNum(v) {
  return parseInt(v || 0).toLocaleString('pt-BR');
}
function fmtCoordenada(valor, tipo = 'lat') {
  if (!valor) return '—';
  const abs = Math.abs(parseFloat(valor));
  const graus = Math.floor(abs);
  const minDec = (abs - graus) * 60;
  const minutos = Math.floor(minDec);
  const segundos = ((minDec - minutos) * 60).toFixed(2);
  const direcao = tipo === 'lat' ? (valor >= 0 ? 'N' : 'S') : (valor >= 0 ? 'L' : 'O');
  return `${graus}°${minutos}'${segundos}"${direcao}`;
}

// ── Classe auxiliar de layout ──────────────────────────────────────────────
class PDFBuilder {
  constructor(page, doc, fonts, pageSize = null) {
    this.page   = page;
    this.doc    = doc;
    this.fonts  = fonts;
    const { width, height } = page.getSize();
    this.W        = width;
    this.H        = height;
    this.margin   = 34;
    this.usable   = width - this.margin * 2;
    this.y        = height - 40;
    // Armazena tamanho para novas páginas
    this._pageSize = pageSize || [width, height];
  }

  // Avança o cursor para baixo
  down(h) { this.y -= h; }

  // Verifica se precisa de nova página
  needsPage(h = 20) {
    if (this.y - h < 50) {
      this.page = this.doc.addPage(this._pageSize);
      const { width, height } = this.page.getSize();
      this.W = width;
      this.H = height;
      this.usable = width - this.margin * 2;
      this.y = height - 40;
      return true;
    }
    return false;
  }

  // Texto simples
  text(txt, x, y, { size = 8, font = 'norm', color = COR.preto } = {}) {
    const f = this.fonts[font] || this.fonts.norm;
    this.page.drawText(String(txt ?? ''), { x, y, size, font: f, color });
  }

  // Retângulo preenchido
  rect(x, y, w, h, color) {
    this.page.drawRectangle({ x, y, width: w, height: h, color });
  }

  // Linha horizontal
  hline(y, color = COR.cinza_borda) {
    this.page.drawLine({
      start: { x: this.margin, y },
      end:   { x: this.W - this.margin, y },
      thickness: 0.5, color,
    });
  }

  // Texto com wrapping simples (retorna linhas)
  wrapText(txt, maxWidth, size, fontKey = 'norm') {
    const f = this.fonts[fontKey];
    const words = String(txt || '').split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      const tw = f.widthOfTextAtSize(test, size);
      if (tw > maxWidth && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ── Célula de tabela ─────────────────────────────────────────────────────
  cell(txt, x, y, w, h, {
    bg = null, txtColor = COR.preto, font = 'norm',
    size = 7.5, align = 'left', border = true,
    paddingX = 4, paddingY = 2,
  } = {}) {
    if (bg) this.rect(x, y, w, h, bg);
    if (border) {
      this.page.drawRectangle({ x, y, width: w, height: h,
        borderColor: COR.cinza_borda, borderWidth: 0.4 });
    }
    const f = this.fonts[font] || this.fonts.norm;
    const maxW = Math.max(w - paddingX * 2, 1);
    const lines = this.wrapText(txt, maxW, size, font);
    const lineH = size * 1.35;
    // Centraliza verticalmente o bloco de texto dentro da célula
    const totalTextH = lines.length * lineH;
    const topPad = Math.max(paddingY, (h - totalTextH) / 2);
    // Ponto de baseline da primeira linha (de cima para baixo: y + h - topPad - size)
    let ty = y + h - topPad - size;

    for (const line of lines) {
      // Não renderiza fora dos limites verticais da célula
      if (ty < y + paddingY - size * 0.2) break;
      const tw = f.widthOfTextAtSize(line, size);
      let tx = x + paddingX;
      if (align === 'center') tx = x + (w - tw) / 2;
      if (align === 'right')  tx = x + w - paddingX - tw;
      // Garante que não ultrapassa a borda esquerda
      tx = Math.max(tx, x + 1);
      this.page.drawText(line, { x: tx, y: ty, size, font: f, color: txtColor });
      ty -= lineH;
    }
  }

  // ── Linha de seção (header verde) ────────────────────────────────────────
  sectionRow(texto, h = 16) {
    this.needsPage(h + 4);
    const x = this.margin;
    const w = this.W - this.margin * 2; // sempre recalcula
    this.rect(x, this.y - h, w, h, COR.verde_dark);
    this.cell(texto, x, this.y - h, w, h, {
      bg: null, txtColor: COR.branco, font: 'bold',
      size: 8, align: 'center', border: false,
    });
    this.down(h);
  }

  // ── Linha de tabela com colunas ──────────────────────────────────────────
  tableRow(cells, rowH = 0) {
    const h = rowH > 0 ? rowH : this.autoRowHeight(cells);
    this.needsPage(h + 2);
    let x = this.margin;
    for (const c of cells) {
      this.cell(c.txt ?? '', x, this.y - h, c.w, h, {
        bg:       c.bg       ?? null,
        txtColor: c.color    ?? COR.preto,
        font:     c.bold     ? 'bold' : (c.font ?? 'norm'),
        size:     c.size     ?? 7.5,
        align:    c.align    ?? 'left',
        border:   c.border   ?? true,
        paddingX: c.paddingX ?? 4,
      });
      x += c.w;
    }
    this.down(h);
  }

  // ── Cabeçalho de tabela (fundo verde médio) ──────────────────────────────
  tableHeader(cells, rowH = 13) {
    this.needsPage(rowH + 2);
    let x = this.margin;
    for (const c of cells) {
      this.cell(c.txt ?? '', x, this.y - rowH, c.w, rowH, {
        bg:       COR.verde_med,
        txtColor: COR.branco,
        font:     'bold',
        size:     7,
        align:    c.align ?? 'center',
        border:   true,
      });
      x += c.w;
    }
    this.down(rowH);
  }

  sp(h = 5) { this.down(h); }

  // Calcula a altura mínima necessária para um conjunto de células
  autoRowHeight(cells, minH = 14, paddingY = 4) {
    let maxLines = 1;
    for (const c of cells) {
      const size = c.size ?? 7.5;
      const font = c.bold ? 'bold' : (c.font ?? 'norm');
      const maxW = Math.max((c.w ?? 0) - (c.paddingX ?? 4) * 2, 1);
      const lines = this.wrapText(c.txt ?? '', maxW, size, font);
      if (lines.length > maxLines) maxLines = lines.length;
    }
    const size = cells[0]?.size ?? 7.5;
    return Math.max(minH, maxLines * size * 1.35 + paddingY * 2);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RELATÓRIOS
// ═══════════════════════════════════════════════════════════════════════════
async function gerarRelatorio({ tipo, rows }) {
  const isLandscape = true;
  const doc  = await PDFDocument.create();
  doc.setTitle(`Relatório de ${tipo}`);
  doc.setCreator('AgroGestão');

  const addPage = () => {
    const pg = doc.addPage(isLandscape ? [841.89, 595.28] : PageSizes.A4);
    return pg;
  };

  const fonts = {
    norm: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const page = addPage();
  const b = new PDFBuilder(page, doc, fonts, [841.89, 595.28]);
  b.margin = 28;
  b.usable = b.W - b.margin * 2;
  b.y = b.H - 28;

  // ── Cabeçalho ──
  const hoje = new Date().toLocaleString('pt-BR');
  const titulos = { clientes: 'RELATÓRIO DE CLIENTES', imoveis: 'RELATÓRIO DE IMÓVEIS', semoventes: 'RELATÓRIO DE SEMOVENTES' };

  b.text('AGRIPEC CONSULTORIA – GSO SERVIÇOS AGRONÔMICOS LTDA', b.margin, b.y, { size: 10, font: 'bold', color: COR.verde_dark });
  b.down(13);
  b.text(`${titulos[tipo]}  |  Emitido em: ${hoje}`, b.margin, b.y, { size: 8, color: COR.cinza_texto });
  b.down(8);
  b.hline(b.y, COR.verde_med);
  b.down(8);

  const W = b.usable;

  // ── Tabela por tipo ──
  if (tipo === 'clientes') {
    const ws = [W*.18, W*.11, W*.10, W*.09, W*.11, W*.20, W*.14, W*.07];
    const hdrs = ['NOME','CPF','RG','EST. CIVIL','TELEFONE','E-MAIL','CIDADE','UF'];
    b.tableHeader(hdrs.map((t,i) => ({ txt: t, w: ws[i] })));
    rows.forEach((r, i) => {
      const bg = i % 2 === 0 ? COR.cinza_linha : null;
      b.tableRow([
        { txt: r.nome||'', w: ws[0], bg },
        { txt: r.cpf||'', w: ws[1], bg },
        { txt: r.rg||'', w: ws[2], bg },
        { txt: (r.estado_civil||''), w: ws[3], bg },
        { txt: r.telefone||'', w: ws[4], bg },
        { txt: r.email||'', w: ws[5], bg },
        { txt: r.endereco_cidade||'', w: ws[6], bg },
        { txt: r.endereco_uf||'', w: ws[7], bg, align: 'center' },
      ]);
    });

  } else if (tipo === 'imoveis') {
    const ws = [W*.18, W*.10, W*.13, W*.06, W*.10, W*.12, W*.09, W*.22];
    const hdrs = ['NOME DO IMÓVEL','ÁREA (ha)','MUNICÍPIO','UF','SITUAÇÃO','MATRÍCULA','CRI','PROPRIETÁRIO'];
    b.tableHeader(hdrs.map((t,i) => ({ txt: t, w: ws[i] })));
    rows.forEach((r, i) => {
      const bg = i % 2 === 0 ? COR.cinza_linha : null;
      b.tableRow([
        { txt: r.nome||'', w: ws[0], bg },
        { txt: fmtArea(r.area_total), w: ws[1], bg, align: 'right' },
        { txt: r.municipio||'', w: ws[2], bg },
        { txt: r.uf||'', w: ws[3], bg, align: 'center' },
        { txt: (r.situacao||''), w: ws[4], bg },
        { txt: r.matricula||'', w: ws[5], bg },
        { txt: r.cri||'', w: ws[6], bg },
        { txt: r.proprietario_nome||'', w: ws[7], bg },
      ]);
    });

  } else { // semoventes
    // 10 colunas: índices 0-9. Soma = 1.00
    const ws = [W*.12, W*.10, W*.07, W*.09, W*.06, W*.07, W*.11, W*.13, W*.17, W*.08];
    const hdrs = ['CATEGORIA','RAÇA','COR','MESTIÇAGEM','IDADE(m)','QTDE','PREÇO UNIT.','VALOR TOTAL','IMÓVEL','MARCA'];
    b.tableHeader(hdrs.map((t,i) => ({ txt: t, w: ws[i] })));
    let totalQtd = 0, totalValor = 0;
    rows.forEach((r, i) => {
      const bg = i % 2 === 0 ? COR.cinza_linha : null;
      const qtd = parseInt(r.quantidade || 0);
      const pu  = parseFloat(r.preco_unitario || 0);
      const vt  = qtd * pu;
      totalQtd   += qtd;
      totalValor += vt;
      b.tableRow([
        { txt: (r.categoria||''), w: ws[0], bg },
        { txt: r.raca||'', w: ws[1], bg },
        { txt: r.cor||'', w: ws[2], bg },
        { txt: r.mesticagem||'', w: ws[3], bg },
        { txt: r.idade_meses ? String(r.idade_meses)+'m' : '—', w: ws[4], bg, align: 'center' },
        { txt: fmtNum(qtd), w: ws[5], bg, align: 'center', bold: true },
        { txt: fmtMoeda(pu), w: ws[6], bg, align: 'right' },
        { txt: fmtMoeda(vt), w: ws[7], bg, align: 'right', bold: true, color: COR.verde_med },
        { txt: r.imovel_nome||'—', w: ws[8], bg },
        { txt: r.marca_ferro||'—', w: ws[9], bg },
      ]);
    });
    // Linha de totais
    b.tableRow([
      { txt: 'TOTAL GERAL', w: ws[0]+ws[1]+ws[2]+ws[3]+ws[4], bg: COR.verde_pale, bold: true, align: 'right' },
      { txt: fmtNum(totalQtd)+' cab.', w: ws[5], bg: COR.verde_pale, bold: true, align: 'center' },
      { txt: '', w: ws[6], bg: COR.verde_pale },
      { txt: fmtMoeda(totalValor), w: ws[7], bg: COR.verde_pale, bold: true, align: 'right', color: COR.verde_dark },
      { txt: '', w: ws[8]+ws[9], bg: COR.verde_pale },
    ]);
  }

  b.sp(6);
  b.text(`Total de registros: ${rows.length}`, b.margin, b.y, { size: 7.5, color: COR.cinza_texto });

  // Rodapé em todas as páginas
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    const { width, height } = pg.getSize();
    pg.drawLine({ start:{x:28,y:22}, end:{x:width-28,y:22}, thickness:0.5, color: COR.cinza_borda });
    pg.drawText(`AgroGestão – Página ${i+1} de ${pages.length}`, {
      x: 28, y: 10, size: 6.5, font: fonts.norm, color: COR.cinza_texto
    });
    pg.drawText(new Date().toLocaleDateString('pt-BR'), {
      x: width - 80, y: 10, size: 6.5, font: fonts.norm, color: COR.cinza_texto
    });
  }

  return await doc.save();
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJETO TÉCNICO
// ═══════════════════════════════════════════════════════════════════════════
async function gerarProjeto(payload) {
  const doc = await PDFDocument.create();
  doc.setTitle('Projeto Técnico – AgroGestão');
  doc.setCreator('AgroGestão');

  const fonts = {
    norm: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const page = doc.addPage(PageSizes.A4);
  const b = new PDFBuilder(page, doc, fonts);

  const c   = payload.cliente  || {};
  const im  = payload.imovel   || {};
  const rb  = payload.rebanho  || [];
  const emp = payload.empresa  || {};

  const totalRb  = payload.totalRebanho || 0;
  const banco    = payload.banco    || 'Banco do Brasil';
  const safra    = payload.safra    || '2025/2026';
  const valor    = payload.valor    || 0;
  const juros    = payload.juros    || 6;
  const prazo    = payload.prazo    || 24;
  const agencia  = payload.agencia  || '';
  const sistema  = payload.sistema  || 'Extensivo';
  const hoje     = payload.hoje     || new Date().toLocaleDateString('pt-BR');
  const enq      = c.enquadramento  || 'PRONAF';
  const tituloTipo = payload.tituloTipo || 'PROJETO TÉCNICO DE CUSTEIO PECUÁRIO - BOVINOCULTURA DE CORTE';

  const emp_razao    = emp.emp_razao_social  || 'GSO SERVIÇOS AGRONÔMICOS LTDA';
  const emp_fantasia = emp.emp_nome_fantasia || 'AGRIPEC CONSULTORIA';
  const emp_cnpj     = emp.emp_cnpj          || 'CNPJ: 45.976.488/0001-25';
  const emp_crea     = emp.emp_crea          || 'CREA-MA: 0005462592';
  const emp_fone     = emp.emp_fone          || '98 98118-8695';
  const emp_email    = emp.emp_email         || 'agripec.ma@gmail.com';
  const emp_endereco = emp.emp_endereco      || payload.endereco_astec || 'RUA SANTA CRUZ, 15 A, CENTRO - BOM JARDIM / MA';
  const emp_resp     = emp.emp_responsavel   || 'Genilson de Sousa Oliveira';
  const emp_formacao = emp.emp_formacao      || 'Engenheiro Agrônomo';
  const emp_conselho = emp.emp_conselho      || 'CREA-MA: 111.737.380-0';
  const emp_rnp      = emp.emp_rnp           || payload.rnp || '1117373800';

  const num_cc          = payload.num_cc           || '';
  const financiada      = payload.financiada       || 'Não';
  const tipo_assistencia= payload.tipo_assistencia || '';
  const fiador_nome     = payload.fiador_nome      || '';
  const fiador_cpf      = payload.fiador_cpf       || '';
  const atividade       = payload.atividade        || 'Bovinocultura de corte';
  const fase_producao   = payload.fase_producao    || '';
  const data_reembolso  = payload.data_reembolso   || '';
  const animais_cust    = payload.animais_custeados|| '';
  const produtividade   = payload.produtividade    || '';
  const produto         = payload.produto          || '';
  const desc_assist     = tipo_assistencia || `Projeto > Astec 0,5% - ${enq}`;

  const W = b.usable;

  // ── CABEÇALHO DA EMPRESA ──────────────────────────────────────────────
  // Tenta carregar logomarca
  const logoPath = payload.logomarca_path;
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      const logoBytes = fs.readFileSync(logoPath);
      const ext = path.extname(logoPath).toLowerCase();
      let logoImg;
      if (ext === '.png') logoImg = await doc.embedPng(logoBytes);
      else logoImg = await doc.embedJpg(logoBytes);
      const aspect = logoImg.width / logoImg.height;
      const lh = 36, lw = lh * aspect;
      b.page.drawImage(logoImg, { x: b.margin, y: b.y - lh, width: Math.min(lw, 120), height: lh });
      b.text(emp_razao,    b.margin + 130, b.y - 10,  { size: 10, font: 'bold', color: COR.verde_dark });
      b.text(emp_fantasia, b.margin + 130, b.y - 20,  { size: 8,  color: COR.cinza_texto });
      b.text(`${emp_cnpj}  |  ${emp_crea}`, b.margin + 130, b.y - 30, { size: 7.5, color: COR.cinza_texto });
      b.down(42);
    } catch(e) {
      b.text(emp_razao,    b.margin, b.y,      { size: 11, font: 'bold', color: COR.verde_dark });
      b.down(14);
      b.text(`${emp_fantasia}  |  ${emp_cnpj}  |  ${emp_crea}`, b.margin, b.y, { size: 8, color: COR.cinza_texto });
      b.down(12);
    }
  } else {
    b.text(emp_razao,    b.margin, b.y,      { size: 11, font: 'bold', color: COR.verde_dark });
    b.down(14);
    b.text(`${emp_fantasia}  |  ${emp_cnpj}  |  ${emp_crea}`, b.margin, b.y, { size: 8, color: COR.cinza_texto });
    b.down(12);
  }

  b.hline(b.y, COR.verde_med);
  b.down(7);

  // Título principal
  b.rect(b.margin, b.y - 16, W, 16, COR.verde_dark);
  b.cell(tituloTipo, b.margin, b.y - 16, W, 16, {
    bg: null, txtColor: COR.branco, font: 'bold', size: 8, align: 'center', border: false
  });
  b.down(16);

  // Linha banco/enquadramento/safra
  const r1ws = [W*.07, W*.16, W*.10, W*.10, W*.07, W*.10, W*.07, W*.15, W*.06, W*.12];
  b.tableRow([
    { txt:'Banco:',        w:r1ws[0], bg:COR.cinza_label, bold:true },
    { txt:banco.toUpperCase(), w:r1ws[1] },
    { txt:'Enquadramento:',w:r1ws[2], bg:COR.cinza_label, bold:true },
    { txt:enq,             w:r1ws[3] },
    { txt:'Safra:',        w:r1ws[4], bg:COR.cinza_label, bold:true },
    { txt:safra,           w:r1ws[5] },
    { txt:'Agência:',      w:r1ws[6], bg:COR.cinza_label, bold:true },
    { txt:agencia,         w:r1ws[7] },
    { txt:'Data:',         w:r1ws[8], bg:COR.cinza_label, bold:true },
    { txt:hoje,            w:r1ws[9] },
  ]);
  b.sp(5);

  // ── SEÇÃO 1: ASTEC ─────────────────────────────────────────────────────
  b.sectionRow('ASTEC/ATNI ELABORADORA DO PROJETO');

  const a1ws = [W*.12, W*.30, W*.08, W*.20, W*.08, W*.22];
  b.tableRow([
    { txt:'Razão Social:',   w:a1ws[0], bg:COR.cinza_label, bold:true },
    { txt:emp_razao,          w:a1ws[1] },
    { txt:'Nº C/C:',         w:a1ws[2], bg:COR.cinza_label, bold:true },
    { txt:num_cc,             w:a1ws[3] },
    { txt:'Agência:',         w:a1ws[4], bg:COR.cinza_label, bold:true },
    { txt:agencia,            w:a1ws[5] },
  ]);

  const a2ws = [W*.08, W*.20, W*.09, W*.63];
  b.tableRow([
    { txt:'Fone:', w:a2ws[0], bg:COR.cinza_label, bold:true },
    { txt:emp_fone, w:a2ws[1] },
    { txt:'Endereço:', w:a2ws[2], bg:COR.cinza_label, bold:true },
    { txt:emp_endereco, w:a2ws[3] },
  ]);

  b.tableRow([
    { txt:'E-mail:', w:W*.08, bg:COR.cinza_label, bold:true },
    { txt:emp_email, w:W*.92 },
  ]);

  const a4ws = [W*.16, W*.38, W*.10, W*.36];
  b.tableRow([
    { txt:'Responsável Técnico:', w:a4ws[0], bg:COR.cinza_label, bold:true },
    { txt:emp_resp,               w:a4ws[1] },
    { txt:'Formação:',            w:a4ws[2], bg:COR.cinza_label, bold:true },
    { txt:emp_formacao,           w:a4ws[3] },
  ]);

  b.tableRow([
    { txt:'Conselho de Classe:', w:a4ws[0], bg:COR.cinza_label, bold:true },
    { txt:emp_conselho,          w:a4ws[1] },
    { txt:'RNP:',                w:W*.08, bg:COR.cinza_label, bold:true },
    { txt:emp_rnp,               w:W*.38 },
  ]);
  b.sp(5);

  // ── SEÇÃO 2: ASSISTÊNCIA TÉCNICA ───────────────────────────────────────
  b.sectionRow('TIPO DE ASSISTÊNCIA TÉCNICA');
  b.tableRow([
    { txt:'Descrição:', w:W*.09, bg:COR.cinza_label, bold:true },
    { txt:desc_assist,  w:W*.72 },
    { txt:'Financiada:', w:W*.10, bg:COR.cinza_label, bold:true },
    { txt:financiada,   w:W*.09 },
  ]);
  b.sp(5);

  // ── SEÇÃO 3: MUTUÁRIO ──────────────────────────────────────────────────
  b.sectionRow('MUTUÁRIO PROPONENTE / INTERVENIENTE GARANTIDOR');
  const m1ws = [W*.30, W*.16, W*.15, W*.27, W*.12];
  b.tableHeader([
    { txt:'NOME', w:m1ws[0] }, { txt:'CPF', w:m1ws[1] },
    { txt:'ESTADO CIVIL', w:m1ws[2] },
    { txt:'FIADOR/AVALISTA', w:m1ws[3] }, { txt:'CPF FIADOR', w:m1ws[4] },
  ]);
  b.tableRow([
    { txt:c.nome||'', w:m1ws[0], bold:true },
    { txt:c.cpf||'',  w:m1ws[1], align:'center' },
    { txt:(c.estado_civil||'').toUpperCase(), w:m1ws[2], align:'center' },
    { txt:fiador_nome, w:m1ws[3] },
    { txt:fiador_cpf,  w:m1ws[4], align:'center' },
  ]);
  b.sp(5);

  // ── SEÇÃO 4: FINALIDADE ────────────────────────────────────────────────
  b.sectionRow('FINALIDADE DA PROPOSTA - EMPREENDIMENTO FINANCIADO');
  b.tableRow([
    { txt:'Atividade:', w:W*.09, bg:COR.cinza_label, bold:true },
    { txt:atividade, w:W*.22 },
    { txt:'Fase de Produção:', w:W*.13, bg:COR.cinza_label, bold:true },
    { txt:fase_producao, w:W*.20 },
    { txt:'Sistema de Produção:', w:W*.15, bg:COR.cinza_label, bold:true },
    { txt:sistema, w:W*.21 },
  ]);
  b.tableRow([
    { txt:'Prazo de Reembolso:', w:W*.14, bg:COR.cinza_label, bold:true },
    { txt:String(prazo), w:W*.07, align:'center' },
    { txt:'meses', w:W*.07 },
    { txt:'Data de Reembolso:', w:W*.14, bg:COR.cinza_label, bold:true },
    { txt:data_reembolso, w:W*.58 },
  ]);
  b.tableRow([
    { txt:'Animais Custeados:', w:W*.14, bg:COR.cinza_label, bold:true },
    { txt:String(animais_cust), w:W*.10, align:'center' },
    { txt:'Produtividade Esperada:', w:W*.17, bg:COR.cinza_label, bold:true },
    { txt:produtividade, w:W*.20 },
    { txt:'Produto:', w:W*.08, bg:COR.cinza_label, bold:true },
    { txt:produto, w:W*.31 },
  ]);
  b.sp(5);

  // ── SEÇÃO 5: IDENTIFICAÇÃO DO IMÓVEL ──────────────────────────────────
  b.sectionRow('IDENTIFICAÇÃO DO IMÓVEL BENEFICIADO');
  b.tableRow([
    { txt:'Nome do Imóvel:', w:W*.12, bg:COR.cinza_label, bold:true },
    { txt:im.nome||'', w:W*.24 },
    { txt:'Município:', w:W*.09, bg:COR.cinza_label, bold:true },
    { txt:im.municipio||'', w:W*.20 },
    { txt:'UF:', w:W*.05, bg:COR.cinza_label, bold:true },
    { txt:im.uf||'', w:W*.07, align:'center' },
    { txt:'Situação:', w:W*.09, bg:COR.cinza_label, bold:true },
    { txt:im.situacao||'', w:W*.14 },
  ]);
  b.tableRow([
    { txt:'Matrícula:', w:W*.09, bg:COR.cinza_label, bold:true }, { txt:im.matricula||'', w:W*.21 },
    { txt:'CRI:',       w:W*.05, bg:COR.cinza_label, bold:true }, { txt:im.cri||'', w:W*.15 },
    { txt:'CCIR:',      w:W*.06, bg:COR.cinza_label, bold:true }, { txt:im.ccir||'', w:W*.19 },
    { txt:'CAR:',       w:W*.05, bg:COR.cinza_label, bold:true }, { txt:im.car||'', w:W*.20 },
  ]);
  b.tableRow([
    { txt:'Área Total:', w:W*.09, bg:COR.cinza_label, bold:true }, { txt:fmtArea(im.area_total), w:W*.15 },
    { txt:'Coordenadas:', w:W*.10, bg:COR.cinza_label, bold:true },
    { txt:`${fmtCoordenada(im.latitude, 'lat')}  ${fmtCoordenada(im.longitude, 'lng')}`, w:W*.30 },
    { txt:'Data Registro:', w:W*.11, bg:COR.cinza_label, bold:true }, { txt:im.data_registro||'', w:W*.25 },
  ]);
  if (im.roteiro_acesso) {
    b.tableRow([
      { txt:'Roteiro de Acesso:', w:W*.15, bg:COR.cinza_label, bold:true },
      { txt:im.roteiro_acesso, w:W*.85 },
    ]);
  }
  b.sp(5);

  // ── SEÇÃO 6: REBANHO BOVINO ────────────────────────────────────────────
  b.sectionRow('REBANHO BOVINO DO MUTUÁRIO PROPONENTE');
  const rbws = [W*.32, W*.22, W*.10, W*.18, W*.18];
  b.tableHeader([
    { txt:'SEMOVENTES', w:rbws[0] }, { txt:'RAÇA', w:rbws[1] },
    { txt:'QTDE', w:rbws[2] }, { txt:'VALOR UNIT.', w:rbws[3] }, { txt:'VALOR TOTAL', w:rbws[4] },
  ]);
  rb.forEach((sem, i) => {
    const qtd = parseInt(sem.quantidade || 0);
    const pu  = parseFloat(sem.preco_unitario || 0);
    const vt  = qtd * pu;
    const bg  = i % 2 === 0 ? COR.cinza_linha : null;
    b.tableRow([
      { txt:sem.categoria||'', w:rbws[0], bg },
      { txt:sem.raca||'Nelore', w:rbws[1], bg },
      { txt:fmtNum(qtd), w:rbws[2], bg, align:'center' },
      { txt:fmtMoeda(pu), w:rbws[3], bg, align:'right' },
      { txt:fmtMoeda(vt), w:rbws[4], bg, align:'right' },
    ]);
  });
  // Total
  b.tableRow([
    { txt:'VALOR OPINATIVO TOTAL DO REBANHO', w:rbws[0]+rbws[1]+rbws[2]+rbws[3],
      bg:COR.verde_pale, bold:true, align:'right' },
    { txt:fmtMoeda(totalRb), w:rbws[4], bg:COR.verde_pale, bold:true, align:'right', color:COR.verde_dark },
  ]);
  b.sp(5);

  // ── SEÇÃO 7: DADOS DO FINANCIAMENTO ───────────────────────────────────
  b.sectionRow('DADOS DO FINANCIAMENTO');
  b.tableRow([
    { txt:'Valor do Projeto:', w:W*.13, bg:COR.cinza_label, bold:true },
    { txt:fmtMoeda(valor), w:W*.18 },
    { txt:'Taxa de Juros a.a.:', w:W*.14, bg:COR.cinza_label, bold:true },
    { txt:`${juros}%`, w:W*.10, align:'center' },
    { txt:'Prazo (meses):', w:W*.12, bg:COR.cinza_label, bold:true },
    { txt:String(prazo), w:W*.08, align:'center' },
    { txt:'Sistema:', w:W*.09, bg:COR.cinza_label, bold:true },
    { txt:sistema, w:W*.16 },
  ]);
  b.sp(5);

  // ── Textos configuráveis via painel de administração ──────────────────
  const tx = payload.textos || {};
  const txtRecTecnica = tx.rec_tecnica ||
    'A área produtiva da propriedade encontra-se em regular estado de conservação, boa capacidade hídrica, o que leva a bons parâmetros que possibilitam a aquisição de bezerros e sua respectiva produção.';
  const txtPreservacao = tx.preservacao_ambiental ||
    'O proponente foi orientado em relação às leis ambientais vigentes, principalmente no que tange à reserva legal, mata ciliar e demais áreas de preservação permanente. Imóvel possui DCAA e Outorga de uso de água, conforme legislação do Estado do Maranhão.';
  const txtConservacao = tx.conservacao_solo ||
    'Serão recomendadas, caso necessário, a adoção de técnicas de manejo do solo que visem a melhoria deste, focando na garantia da produção.';
  const txtCroqui = tx.croqui_localizacao ||
    'Apresentado no dossiê da operação de crédito e no cadastro do cliente, no ambiente glebas geomapa.';
  const txtAteste = tx.ateste ||
    'Fica dado ciência sobre o acompanhamento técnico da ASTEC/ATNI ao longo do contrato objeto do projeto ao imóvel beneficiado, com fins de produção de laudos, levantamento de execução de inversões financiadas, recomendações técnicas, eventuais prejuízos e demais ocorrências relevantes, inclusive eventuais irregularidades.';

  // ── SEÇÃO 8: RECOMENDAÇÕES TÉCNICAS ───────────────────────────────────
  b.sectionRow('RECOMENDAÇÕES TÉCNICAS');
  b.tableRow([{ txt: txtRecTecnica, w: W }]);
  b.sp(5);

  // ── SEÇÃO 9: PRESERVAÇÃO AMBIENTAL ────────────────────────────────────
  b.sectionRow('RECOMENDAÇÃO PARA PRESERVAÇÃO DO MEIO AMBIENTE');
  b.tableRow([{ txt: txtPreservacao, w: W }]);
  b.sp(5);

  // ── SEÇÃO 10: CONSERVAÇÃO DE SOLO ─────────────────────────────────────
  b.sectionRow('CONSERVAÇÃO DE SOLO');
  b.tableRow([{ txt: txtConservacao, w: W }]);
  b.sp(5);

  // ── SEÇÃO 11: CROQUI DE LOCALIZAÇÃO ───────────────────────────────────
  b.sectionRow('CROQUI DE LOCALIZAÇÃO');
  b.tableRow([{ txt: txtCroqui, w: W, align: 'center' }]);
  b.sp(5);

  // ── SEÇÃO 12: ATESTE ──────────────────────────────────────────────────
  b.sectionRow('ATESTE');
  b.tableRow([{ txt: txtAteste, w: W }]);
  b.sp(20);

  // ── ASSINATURAS ────────────────────────────────────────────────────────
  b.sectionRow('ASSINATURAS');
  b.sp(30);

  const linha = '_'.repeat(46);
  const assWs = [W*.45, W*.10, W*.45];

  b.tableRow([
    { txt:linha, w:assWs[0], align:'center', border:false },
    { txt:'',    w:assWs[1], border:false },
    { txt:linha, w:assWs[2], align:'center', border:false },
  ], 12);
  b.tableRow([
    { txt:c.nome||'', w:assWs[0], bold:true, align:'center', border:false },
    { txt:'', w:assWs[1], border:false },
    { txt:emp_razao, w:assWs[2], bold:true, align:'center', border:false },
  ], 12);
  b.tableRow([
    { txt:c.cpf||'', w:assWs[0], align:'center', border:false },
    { txt:'', w:assWs[1], border:false },
    { txt:emp_cnpj, w:assWs[2], align:'center', border:false },
  ], 12);
  b.tableRow([
    { txt:'MUTUÁRIO PROPONENTE', w:assWs[0], align:'center', border:false, color:COR.cinza_texto },
    { txt:'', w:assWs[1], border:false },
    { txt:'ASTEC/ATNI – RESPONSÁVEL TÉCNICO', w:assWs[2], align:'center', border:false, color:COR.cinza_texto },
  ], 12);

  // Cidade da empresa extraída do endereço (ex: "RUA X - BOM JARDIM / MA" → "BOM JARDIM")
  const emp_cidade = (() => {
    const end = emp_endereco || '';
    // Tenta extrair "CIDADE / UF" ou "CIDADE/UF" do endereço
    const m = end.match(/[-–]\s*([^/\-–]+)\s*\/\s*([A-Z]{2})\s*$/i);
    if (m) return `${m[1].trim()} / ${m[2].trim()}`;
    // Fallback: usa cidade do cliente
    return `${c.cidade||''}${c.uf?', '+c.uf:''}`;
  })();

  b.sp(12);
  b.text(`${emp_cidade}   –   ${hoje}`, b.margin, b.y, { size: 7.5, color: COR.cinza_texto });

  // Rodapé em todas as páginas
  const pages = doc.getPages();
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    const { width } = pg.getSize();
    pg.drawLine({ start:{x:34,y:22}, end:{x:width-34,y:22}, thickness:0.4, color:COR.cinza_borda });
    pg.drawText(`AgroGestão – Página ${i+1} de ${pages.length}`, {
      x:34, y:10, size:6.5, font:fonts.norm, color:COR.cinza_texto
    });
    pg.drawText(new Date().toLocaleDateString('pt-BR'), {
      x:width-80, y:10, size:6.5, font:fonts.norm, color:COR.cinza_texto
    });
  }

  return await doc.save();
}

// ═══════════════════════════════════════════════════════════════════════════
// LAUDO DE OPINIÃO DE SEMOVENTES
// ═══════════════════════════════════════════════════════════════════════════
// ── Helpers de layout compartilhados ──────────────────────────────────────
function _cabecalhoEmpresa(b, doc, fonts, emp, payload) {
  const emp_razao    = emp.emp_razao_social  || 'GSO SERVICOS AGRONOMICOS LTDA';
  const emp_fantasia = emp.emp_nome_fantasia || 'AGRIPEC CONSULTORIA';
  const emp_cnpj     = emp.emp_cnpj          || 'CNPJ: 45.976.488/0001-25';
  const emp_crea     = emp.emp_crea          || 'CREA-MA: 000.546.259-2';
  const emp_aneps    = emp.emp_aneps         || 'ANEPS 0514240215114331';
  const emp_endereco = emp.emp_endereco      || 'RUA SANTA CRUZ, 15 A - CENTRO';
  const emp_cidade   = emp.emp_cidade        || 'BOM JARDIM - MA';
  const W = b.usable;

  // Tenta usar logo se disponível
  let logoDrawn = false;
  const logoPath = payload.logomarca_path;
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      const logoBytes = fs.readFileSync(logoPath);
      const ext = path.extname(logoPath).toLowerCase();
      // embedPng/embedJpg são async – serão resolvidos pelo chamador
      // Retorna promessa para ser awaited lá
      return (async () => {
        let logoImg = ext === '.png' ? await doc.embedPng(logoBytes) : await doc.embedJpg(logoBytes);
        const aspect = logoImg.width / logoImg.height;
        const lh = 36, lw = Math.min(lh * aspect, 120);
        b.page.drawImage(logoImg, { x: b.margin, y: b.y - lh, width: lw, height: lh });
        const tx = b.margin + lw + 8;
        b.text(emp_razao,    tx, b.y - 10, { size: 9, font: 'bold', color: COR.verde_dark });
        b.text(emp_fantasia, tx, b.y - 20, { size: 8, color: COR.cinza_texto });
        b.text(`${emp_cnpj}  |  ${emp_crea}`, tx, b.y - 29, { size: 7.5, color: COR.cinza_texto });
        b.text(`${emp_aneps}  |  ${emp_endereco} - ${emp_cidade}`, tx, b.y - 38, { size: 7, color: COR.cinza_texto });
        b.down(42);
        b.hline(b.y); b.down(5);
      })();
    } catch(e) {}
  }

  // Sem logo: texto alinhado à esquerda, linha de separação à direita
  b.rect(b.margin, b.y - 46, W, 46, COR.verde_pale);
  b.page.drawRectangle({ x: b.margin, y: b.y - 46, width: W, height: 46, borderColor: COR.cinza_borda, borderWidth: 0.4 });
  b.text(emp_razao,    b.margin + 6, b.y - 10, { size: 10, font: 'bold', color: COR.verde_dark });
  b.text(emp_fantasia, b.margin + 6, b.y - 21, { size: 8.5, color: COR.cinza_texto });
  b.text(`${emp_cnpj}  |  ${emp_crea}`, b.margin + 6, b.y - 31, { size: 7.5, color: COR.cinza_texto });
  b.text(`${emp_aneps}  |  ${emp_endereco} - ${emp_cidade}`, b.margin + 6, b.y - 40, { size: 7, color: COR.cinza_texto });
  b.down(50);
  return Promise.resolve();
}

// ═══════════════════════════════════════════════════════════════════════════
// LAUDO DE OPINIÃO DE SEMOVENTES
// ═══════════════════════════════════════════════════════════════════════════

// ── Cabecalho compartilhado (sem caracteres especiais para compatibilidade PDF) ──
async function _cabecalhoEmpresa(b, doc, fonts, emp, payload) {
  const emp_razao    = (emp.emp_razao_social  || 'GSO SERVICOS AGRONOMICOS LTDA').toUpperCase();
  const emp_fantasia = (emp.emp_nome_fantasia || 'AGRIPEC CONSULTORIA').toUpperCase();
  const emp_cnpj     = emp.emp_cnpj     || 'CNPJ: 45.976.488/0001-25';
  const emp_crea     = emp.emp_crea     || 'CREA-MA: 000.546.259-2';
  const emp_aneps    = emp.emp_aneps    || 'ANEPS 0514240215114331';
  const emp_endereco = (emp.emp_endereco || 'RUA SANTA CRUZ, 15 A - CENTRO').toUpperCase();
  const emp_cidade   = (emp.emp_cidade   || 'BOM JARDIM - MA').toUpperCase();
  const W = b.usable;

  const logoPath = payload.logomarca_path;
  if (logoPath && fs.existsSync(logoPath)) {
    try {
      const logoBytes = fs.readFileSync(logoPath);
      const ext = path.extname(logoPath).toLowerCase();
      let logoImg = ext === '.png' ? await doc.embedPng(logoBytes) : await doc.embedJpg(logoBytes);
      const aspect = logoImg.width / logoImg.height;
      const lh = 38, lw = Math.min(lh * aspect, 130);
      b.page.drawImage(logoImg, { x: b.margin, y: b.y - lh, width: lw, height: lh });
      const tx = b.margin + lw + 10;
      b.text(emp_razao,    tx, b.y - 11, { size: 9,   font: 'bold', color: COR.verde_dark });
      b.text(emp_fantasia, tx, b.y - 21, { size: 8,   color: COR.cinza_texto });
      b.text(emp_cnpj + '  |  ' + emp_crea, tx, b.y - 30, { size: 7.5, color: COR.cinza_texto });
      b.text(emp_aneps + '  |  ' + emp_endereco + ' - ' + emp_cidade, tx, b.y - 39, { size: 7, color: COR.cinza_texto });
      b.down(44);
    } catch(e) {
      _cabecalhoTexto(b, emp_razao, emp_fantasia, emp_cnpj, emp_crea, emp_aneps, emp_endereco, emp_cidade, W);
    }
  } else {
    _cabecalhoTexto(b, emp_razao, emp_fantasia, emp_cnpj, emp_crea, emp_aneps, emp_endereco, emp_cidade, W);
  }
}

function _cabecalhoTexto(b, razao, fantasia, cnpj, crea, aneps, endereco, cidade, W) {
  b.rect(b.margin, b.y - 48, W, 48, COR.verde_pale);
  b.page.drawRectangle({ x: b.margin, y: b.y - 48, width: W, height: 48,
    borderColor: COR.cinza_borda, borderWidth: 0.4 });
  b.text(razao,    b.margin + 6, b.y - 11, { size: 10,  font: 'bold', color: COR.verde_dark });
  b.text(fantasia, b.margin + 6, b.y - 22, { size: 8.5, color: COR.cinza_texto });
  b.text(cnpj + '  |  ' + crea, b.margin + 6, b.y - 32, { size: 7.5, color: COR.cinza_texto });
  b.text(aneps + '  |  ' + endereco + ' - ' + cidade, b.margin + 6, b.y - 41, { size: 7, color: COR.cinza_texto });
  b.down(52);
}

// =============================================================================
// LAUDO DE OPINIAO DE SEMOVENTES
// =============================================================================
async function gerarLaudo(payload) {
  const doc = await PDFDocument.create();
  doc.setTitle('Laudo de Opiniao de Semoventes');
  doc.setCreator('AgroGestao');

  const fonts = {
    norm: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const page = doc.addPage(PageSizes.A4);
  const b    = new PDFBuilder(page, doc, fonts);

  const emp              = payload.empresa || {};
  const hoje             = payload.hoje || new Date().toLocaleDateString('pt-BR');
  const cliente          = payload.cliente || {};
  const imovel           = payload.imovel  || {};
  const lotes            = payload.lotes   || [];
  const percentual_banco = parseFloat(payload.percentual_banco || 70);

  const emp_fantasia = (emp.emp_nome_fantasia || 'AGRIPEC CONSULTORIA').toUpperCase();
  const emp_cnpj     = emp.emp_cnpj     || 'CNPJ: 45.976.488/0001-25';
  const emp_crea     = emp.emp_crea     || 'CREA-MA: 000.546.259-2';
  const emp_aneps    = emp.emp_aneps    || 'ANEPS 0514240215114331';
  const emp_endereco = (emp.emp_endereco || 'RUA SANTA CRUZ, 15 A - CENTRO').toUpperCase();
  const emp_cidade   = (emp.emp_cidade   || 'BOM JARDIM - MA').toUpperCase();

  await _cabecalhoEmpresa(b, doc, fonts, emp, payload);
  const W = b.usable;

  // ── TITULO ───────────────────────────────────────────────────────────
  b.rect(b.margin, b.y - 20, W, 20, COR.verde_dark);
  b.cell('LAUDO DE OPINIAO DE SEMOVENTES', b.margin, b.y - 20, W, 20, {
    bg: null, txtColor: COR.branco, font: 'bold', size: 11, align: 'center', border: false,
  });
  b.down(24);

  // ── IDENTIFICACAO ─────────────────────────────────────────────────────
  // 4 colunas: ROTULO | VALOR | ROTULO | VALOR
  // rotulo fixo em 36pt, valor ocupa o restante de cada metade
  const R1 = 36, V1 = W/2 - R1, R2 = 30, V2 = W/2 - R2;
  b.tableRow([
    { txt: 'CLIENTE',     w: R1, bg: COR.cinza_label, bold: true, size: 7, align: 'center' },
    { txt: cliente.nome || '',   w: V1, bold: true, size: 8 },
    { txt: 'CPF',         w: R2, bg: COR.cinza_label, bold: true, size: 7, align: 'center' },
    { txt: cliente.cpf  || '',   w: V2, size: 8 },
  ], 15);
  b.tableRow([
    { txt: 'PROPRIEDADE', w: R1, bg: COR.cinza_label, bold: true, size: 7, align: 'center' },
    { txt: imovel.nome || '',    w: V1, size: 8 },
    { txt: 'CIDADE',      w: R2, bg: COR.cinza_label, bold: true, size: 7, align: 'center' },
    { txt: imovel.municipio || '', w: V2, size: 8 },
  ], 15);
  b.sp(6);

  // ── TABELA DE SEMOVENTES ──────────────────────────────────────────────
  // Larguras em pt: soma deve ser exatamente W (~527pt para A4)
  // CATEGORIA=70 | IDADE=22 | RACA=58 | MESTICAGEM=40 | PELAGEM=38 | QTD=22 | UNIT=46 | TOTAL=46
  // Soma base = 342 → sobra vai para RACA
  const cw = { cat:70, idade:22, raca:58, mst:40, pel:38, qtd:22, pu:46, tot:46 };
  const cwSum = Object.values(cw).reduce((a,v)=>a+v,0);
  cw.raca += (W - cwSum);

  b.tableHeader([
    { txt: 'CATEGORIA',    w: cw.cat,   align: 'left'   },
    { txt: 'IDADE',        w: cw.idade, align: 'center' },
    { txt: 'RACA / COR',   w: cw.raca,  align: 'left'   },
    { txt: 'MESTICAGEM',   w: cw.mst,   align: 'center' },
    { txt: 'PELAGEM',      w: cw.pel,   align: 'center' },
    { txt: 'QTD',          w: cw.qtd,   align: 'center' },
    { txt: 'VL UNIT (R$)', w: cw.pu,    align: 'right'  },
    { txt: 'TOTAL (R$)',   w: cw.tot,   align: 'right'  },
  ]);

  let totalGeral = 0, totalQtd = 0;
  lotes.forEach((l, i) => {
    const vt  = parseFloat(l.valor_total || (l.quantidade||0)*(l.preco_unitario||0));
    totalGeral += vt;
    totalQtd   += parseInt(l.quantidade || 0);
    const bg   = i % 2 === 0 ? null : COR.cinza_linha;
    const racaCor = [l.raca, l.cor].filter(Boolean).join(' / ');
    b.tableRow([
      { txt: (l.categoria  || '').toUpperCase(), w: cw.cat,   bg },
      { txt: l.idade_meses ? l.idade_meses+'m' : '',          w: cw.idade, align:'center', bg },
      { txt: racaCor,                            w: cw.raca,  bg },
      { txt: (l.mesticagem || '').toUpperCase(), w: cw.mst,   align:'center', bg },
      { txt: (l.pelagem||l.cor||'').toUpperCase(), w: cw.pel, align:'center', bg },
      { txt: String(l.quantidade || ''),         w: cw.qtd,   align:'center', bg, bold:true },
      { txt: fmtMoeda(l.preco_unitario),         w: cw.pu,    align:'right',  bg },
      { txt: fmtMoeda(vt),                       w: cw.tot,   align:'right',  bg, bold:true },
    ]);
  });

  // Linha TOTAL
  b.tableRow([
    { txt: '', w: cw.cat+cw.idade+cw.raca+cw.mst+cw.pel, bg: COR.verde_pale, border:true },
    { txt: String(totalQtd),    w: cw.qtd, align:'center', bg:COR.verde_pale, bold:true },
    { txt: 'TOTAL',             w: cw.pu,  align:'right',  bg:COR.verde_pale, bold:true },
    { txt: fmtMoeda(totalGeral),w: cw.tot, align:'right',  bg:COR.verde_dark, txtColor:COR.branco, bold:true },
  ], 16);

  // Linha percentual banco
  const valorBanco = totalGeral * (percentual_banco / 100);
  b.tableRow([
    { txt: '', w: cw.cat+cw.idade+cw.raca+cw.mst+cw.pel+cw.qtd, border:false },
    { txt: percentual_banco+'%', w: cw.pu, align:'right', bold:true, size:8 },
    { txt: fmtMoeda(valorBanco), w: cw.tot,align:'right', bg:COR.verde_med, txtColor:COR.branco, bold:true },
  ], 15);

  b.sp(10);

  // ── ATESTE / FOTO DO FERRO / FORMA LOCAL ─────────────────────────────
  b.sectionRow('ATESTE                                  MARCA                               FORMA / LOCAL');

  const atesteW = Math.floor(W * 0.40);
  const fotoW   = Math.floor(W * 0.28);
  const localW  = W - atesteW - fotoW;
  const boxH    = 74;

  // ATESTE
  b.rect(b.margin, b.y - boxH, atesteW, boxH, COR.verde_pale);
  b.page.drawRectangle({ x: b.margin, y: b.y - boxH, width: atesteW, height: boxH,
    borderColor: COR.cinza_borda, borderWidth: 0.5 });
  const atx = b.margin + 5;
  b.text(emp_fantasia, atx, b.y - 12, { size: 7.5, font:'bold', color: COR.verde_dark });
  b.text(emp_cnpj,     atx, b.y - 22, { size: 7,   color: COR.cinza_texto });
  b.text(emp_crea,     atx, b.y - 31, { size: 7,   color: COR.cinza_texto });
  b.text(emp_aneps,    atx, b.y - 40, { size: 7,   color: COR.cinza_texto });
  b.text(emp_endereco, atx, b.y - 49, { size: 6.5, color: COR.cinza_texto });
  const assinY = b.y - boxH + 14;
  b.page.drawLine({ start:{x:b.margin+6, y:assinY}, end:{x:b.margin+atesteW-6, y:assinY},
    thickness:0.5, color:COR.cinza_borda });
  b.text('Assinatura / Carimbo', b.margin + atesteW/2 - 30, assinY - 8, { size:6, color:COR.cinza_texto });

  // FOTO DO FERRO
  const fotoX = b.margin + atesteW;
  b.page.drawRectangle({ x:fotoX, y:b.y - boxH, width:fotoW, height:boxH,
    borderColor:COR.cinza_borda, borderWidth:0.5 });
  b.text('FOTO DO FERRO', fotoX + fotoW/2 - 26, b.y - 11, { size:7, font:'bold', color:COR.cinza_texto });
  const loteComFoto = lotes.find(l => l.foto_ferro);
  let fotoOk = false;
  if (loteComFoto) {
    try {
      const raw  = loteComFoto.foto_ferro.replace(/^data:image\/\w+;base64,/, '');
      const iBytes = Buffer.from(raw, 'base64');
      const isJpeg = /jpeg|jpg/.test(loteComFoto.foto_ferro.slice(0, 25));
      const img    = isJpeg ? await doc.embedJpg(iBytes) : await doc.embedPng(iBytes);
      const aspect = img.width / img.height;
      const ih = boxH - 20, iw = Math.min(ih * aspect, fotoW - 10);
      b.page.drawImage(img, {
        x: fotoX + (fotoW - iw) / 2,
        y: b.y - boxH + (boxH - ih) / 2,
        width: iw, height: ih,
      });
      fotoOk = true;
    } catch(e) {}
  }
  if (!fotoOk) {
    b.text('(sem imagem)', fotoX + fotoW/2 - 22, b.y - boxH/2 + 4, { size:7, color:COR.cinza_borda });
  }

  // FORMA / LOCAL
  const localX = fotoX + fotoW;
  b.page.drawRectangle({ x:localX, y:b.y - boxH, width:localW, height:boxH,
    borderColor:COR.cinza_borda, borderWidth:0.5 });
  b.text('FORMA / LOCAL', localX + 5, b.y - 11, { size:7, font:'bold', color:COR.cinza_texto });
  const marcaTxt = (lotes[0]?.marca_ferro || payload.marca_ferro || 'A FERRO E FOGO NO QPD.').toUpperCase();
  const mLinhas  = b.wrapText(marcaTxt, localW - 12, 8.5, 'bold');
  let mly = b.y - 26;
  mLinhas.forEach(ml => {
    b.text(ml, localX + 5, mly, { size:8.5, font:'bold', color:COR.verde_dark });
    mly -= 13;
  });

  b.down(boxH + 10);
  b.text((imovel.municipio || emp_cidade) + ', ' + hoje, b.margin, b.y, { size:8, color:COR.cinza_texto });

  // ── RODAPE ────────────────────────────────────────────────────────────
  doc.getPages().forEach((pg, i) => {
    const { width } = pg.getSize();
    pg.drawLine({ start:{x:34,y:24}, end:{x:width-34,y:24}, thickness:0.4, color:COR.cinza_borda });
    pg.drawText('AgroGestao - Laudo de Semoventes - Pagina '+(i+1)+' de '+doc.getPages().length,
      { x:34, y:11, size:6.5, font:fonts.norm, color:COR.cinza_texto });
    pg.drawText(hoje, { x:width-62, y:11, size:6.5, font:fonts.norm, color:COR.cinza_texto });
  });

  return await doc.save();
}

// =============================================================================
// CALCULO PREVIO DE APASCENTAMENTO
// =============================================================================
async function gerarApascentamento(payload) {
  const doc = await PDFDocument.create();
  doc.setTitle('Calculo Previo de Apascentamento');
  doc.setCreator('AgroGestao');

  const fonts = {
    norm: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
  };

  const page = doc.addPage(PageSizes.A4);
  const b    = new PDFBuilder(page, doc, fonts);

  const emp              = payload.empresa || {};
  const hoje             = payload.hoje || new Date().toLocaleDateString('pt-BR');
  const cliente          = payload.cliente    || {};
  const imovel           = payload.imovel     || {};
  const categorias       = payload.categorias || [];
  const area_pastagem    = parseFloat(payload.area_pastagem  || 0);
  const ua_referencia    = parseFloat(payload.ua_referencia  || 1.5);
  const sgp              = parseFloat(payload.sgp || (area_pastagem * ua_referencia).toFixed(2));
  const percentual_banco = parseFloat(payload.percentual_banco || 70);

  await _cabecalhoEmpresa(b, doc, fonts, emp, payload);
  const W = b.usable;

  // ── TITULO ───────────────────────────────────────────────────────────
  b.rect(b.margin, b.y - 20, W, 20, COR.verde_dark);
  b.cell('CALCULO PREVIO DE APASCENTAMENTO', b.margin, b.y - 20, W, 20, {
    bg:null, txtColor:COR.branco, font:'bold', size:11, align:'center', border:false,
  });
  b.down(24);

  // ── IDENTIFICACAO ─────────────────────────────────────────────────────
  const R1=36, V1=W/2-R1, R2=30, V2=W/2-R2;
  b.tableRow([
    { txt:'CLIENTE',  w:R1, bg:COR.cinza_label, bold:true, size:7, align:'center' },
    { txt:cliente.nome||'', w:V1, bold:true, size:8 },
    { txt:'CPF',      w:R2, bg:COR.cinza_label, bold:true, size:7, align:'center' },
    { txt:cliente.cpf ||'', w:V2, size:8 },
  ], 15);
  b.tableRow([
    { txt:'IMOVEL',   w:R1, bg:COR.cinza_label, bold:true, size:7, align:'center' },
    { txt:imovel.nome||'',  w:W-R1, size:8, bold:true },
  ], 15);
  b.sp(6);

  // ── DADOS DA PASTAGEM ─────────────────────────────────────────────────
  b.sectionRow('DADOS DA PASTAGEM');
  const pw  = Math.floor(W / 3);
  const pw3 = W - pw * 2;
  b.tableRow([
    { txt:'AREA DE PASTAGEM (ha)',              w:pw,  bg:COR.cinza_label, bold:true, size:7.5, align:'center' },
    { txt:'UA REFERENCIA (UA/ha)',              w:pw,  bg:COR.cinza_label, bold:true, size:7.5, align:'center' },
    { txt:'SUPORTE GLOBAL DA PASTAGEM (S.G.P)',w:pw3, bg:COR.cinza_label, bold:true, size:7.5, align:'center' },
  ], 14);
  b.tableRow([
    { txt:area_pastagem.toFixed(2), w:pw,  align:'center', bold:true, size:12 },
    { txt:ua_referencia.toFixed(1), w:pw,  align:'center', bold:true, size:12 },
    { txt:sgp.toFixed(2),           w:pw3, align:'center', bold:true, size:12, color:COR.verde_med },
  ], 22);
  b.sp(8);

  // ── TABELA DE CATEGORIAS ──────────────────────────────────────────────
  b.sectionRow('RESULTADO ANALITICO DA RELACAO SEMOVENTES X AQUISICOES X PASTAGEM');

  // CAT=62 EXIST=24 NOVOS=24 IDADE=22 TOTAL=24 UA_CAT=28 UA_TOT=30 PU=44 VT=46 → soma=304
  const cw = { cat:62, exist:24, novos:24, idade:22, total:24, ua_cat:28, ua_tot:30, pu:44, vt:46 };
  const cwSum = Object.values(cw).reduce((a,v)=>a+v,0);
  cw.cat += (W - cwSum);

  b.tableHeader([
    { txt:'CATEGORIA',  w:cw.cat,    align:'left'   },
    { txt:'EXIST.',     w:cw.exist,  align:'center' },
    { txt:'NOVOS',      w:cw.novos,  align:'center' },
    { txt:'IDADE (m)',  w:cw.idade,  align:'center' },
    { txt:'TOTAL',      w:cw.total,  align:'center' },
    { txt:'UA CAT',     w:cw.ua_cat, align:'center' },
    { txt:'UA TOTAL',   w:cw.ua_tot, align:'center' },
    { txt:'VL. UNIT.',  w:cw.pu,     align:'right'  },
    { txt:'TOTAL (R$)', w:cw.vt,     align:'right'  },
  ]);

  let tExist=0, tNovos=0, tCab=0, tUA=0, tValor=0;
  categorias.forEach((c, i) => {
    const bg  = i % 2 === 0 ? null : COR.cinza_linha;
    const ex  = parseInt(c.existente||0);
    const nv  = parseInt(c.novos||0);
    const tot = parseInt(c.total||ex+nv);
    tExist += ex; tNovos += nv; tCab += tot;
    tUA    += parseFloat(c.ua_total||0);
    tValor += parseFloat(c.valor_total||0);
    b.tableRow([
      { txt:(c.nome||'').toUpperCase(),           w:cw.cat,    bg },
      { txt:ex  > 0 ? String(ex)  : '',           w:cw.exist,  align:'center', bg },
      { txt:nv  > 0 ? String(nv)  : '',           w:cw.novos,  align:'center', bg },
      { txt:c.idade ? String(c.idade) : '',        w:cw.idade,  align:'center', bg },
      { txt:String(tot),                           w:cw.total,  align:'center', bg, bold:true },
      { txt:parseFloat(c.ua_cat||0).toFixed(2),    w:cw.ua_cat, align:'center', bg },
      { txt:parseFloat(c.ua_total||0).toFixed(2),  w:cw.ua_tot, align:'center', bg, bold:true },
      { txt:fmtMoeda(c.preco_unitario),             w:cw.pu,     align:'right',  bg },
      { txt:fmtMoeda(c.valor_total),                w:cw.vt,     align:'right',  bg, bold:true },
    ]);
  });

  // Totais
  b.tableRow([
    { txt:'TOTAIS',        w:cw.cat,    bg:COR.verde_pale, bold:true },
    { txt:String(tExist),  w:cw.exist,  align:'center', bg:COR.verde_pale, bold:true },
    { txt:tNovos>0?String(tNovos):'', w:cw.novos, align:'center', bg:COR.verde_pale, bold:true },
    { txt:'',              w:cw.idade,  align:'center', bg:COR.verde_pale },
    { txt:String(tCab),    w:cw.total,  align:'center', bg:COR.verde_pale, bold:true },
    { txt:'',              w:cw.ua_cat, align:'center', bg:COR.verde_pale },
    { txt:tUA.toFixed(2),  w:cw.ua_tot, align:'center', bg:COR.verde_pale, bold:true },
    { txt:'TOTAL',         w:cw.pu,     align:'right',  bg:COR.verde_pale, bold:true },
    { txt:fmtMoeda(tValor),w:cw.vt,     align:'right',  bg:COR.verde_dark, txtColor:COR.branco, bold:true },
  ], 16);

  const valorBanco = tValor * (percentual_banco / 100);
  b.tableRow([
    { txt:'', w:cw.cat+cw.exist+cw.novos+cw.idade+cw.total+cw.ua_cat+cw.ua_tot, border:false },
    { txt:percentual_banco+'%', w:cw.pu, align:'right', bold:true, size:8 },
    { txt:fmtMoeda(valorBanco), w:cw.vt, align:'right', bg:COR.verde_med, txtColor:COR.branco, bold:true },
  ], 15);

  b.sp(10);

  // ── RESULTADO ANALITICO ───────────────────────────────────────────────
  b.sectionRow('SUPORTE GLOBAL DA PASTAGEM  x  QUANTIDADE GLOBAL  =  RESULTADO');
  const rw  = Math.floor(W / 3);
  const rw3 = W - rw * 2;
  b.tableRow([
    { txt:'SUPORTE GLOBAL (UA)',   w:rw,  bg:COR.cinza_label, bold:true, size:7.5, align:'center' },
    { txt:'QUANTIDADE GLOBAL (UA)',w:rw,  bg:COR.cinza_label, bold:true, size:7.5, align:'center' },
    { txt:'RESULTADO (SALDO UA)',  w:rw3, bg:COR.cinza_label, bold:true, size:7.5, align:'center' },
  ], 14);
  const saldo    = sgp - tUA;
  const saldoCor = saldo >= 0 ? COR.verde_med : rgb(0.75, 0.15, 0.15);
  b.tableRow([
    { txt:sgp.toFixed(2),   w:rw,  align:'center', bold:true, size:13 },
    { txt:tUA.toFixed(2),   w:rw,  align:'center', bold:true, size:13 },
    { txt:(saldo>=0?'+':'')+saldo.toFixed(2), w:rw3, align:'center', bold:true, size:13, color:saldoCor },
  ], 24);

  b.sp(6);
  const validMsg = saldo >= 0
    ? 'VALIDAMOS CALCULO PREVIO - Pastagem comporta os semoventes declarados.'
    : 'ATENCAO: Capacidade de pastagem insuficiente para os semoventes declarados.';
  const validBg  = saldo >= 0 ? COR.verde_pale : rgb(1, 0.93, 0.93);
  const validClr = saldo >= 0 ? COR.verde_dark  : rgb(0.65, 0.1, 0.1);
  b.rect(b.margin, b.y - 18, W, 18, validBg);
  b.cell(validMsg, b.margin, b.y - 18, W, 18, {
    bg:null, txtColor:validClr, font:'bold', size:8, align:'center', border:true,
  });
  b.down(22);
  b.text((imovel.municipio || '') + ', ' + hoje, b.margin, b.y, { size:8, color:COR.cinza_texto });

  // ── RODAPE ────────────────────────────────────────────────────────────
  doc.getPages().forEach((pg, i) => {
    const { width } = pg.getSize();
    pg.drawLine({ start:{x:34,y:24}, end:{x:width-34,y:24}, thickness:0.4, color:COR.cinza_borda });
    pg.drawText('AgroGestao - Apascentamento - Pagina '+(i+1)+' de '+doc.getPages().length,
      { x:34, y:11, size:6.5, font:fonts.norm, color:COR.cinza_texto });
    pg.drawText(hoje, { x:width-62, y:11, size:6.5, font:fonts.norm, color:COR.cinza_texto });
  });

  return await doc.save();
}

module.exports = { gerarRelatorio, gerarProjeto, gerarLaudo, gerarApascentamento };
