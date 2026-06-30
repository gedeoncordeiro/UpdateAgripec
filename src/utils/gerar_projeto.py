import sys, json, os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image
)

# ─── Paleta de Cores do Sistema (verde suave) ────────────────────────────────
VERDE_DARK   = colors.HexColor('#1b4332')   # sb-bg do sistema
VERDE_MED    = colors.HexColor('#2d6a4f')   # primary
VERDE_LIGHT  = colors.HexColor('#52b788')   # accent claro
VERDE_PALE   = colors.HexColor('#ebf5ee')   # primary-pale
VERDE_SEC    = colors.HexColor('#d8edcf')   # g100
VERDE_HDR    = colors.HexColor('#2d6a4f')   # cabeçalho de seção
VERDE_HDR_TXT= colors.white
CINZA_LINHA  = colors.HexColor('#f4f3ef')   # surface-2
CINZA_LABEL  = colors.HexColor('#eef0e9')   # surface-3
CINZA_BORDA  = colors.HexColor('#cdd0c4')   # border-strong
BRANCO       = colors.white
PRETO_TEXTO  = colors.HexColor('#1e2a1a')   # --text
CINZA_TEXTO  = colors.HexColor('#526348')   # --text-2
CINZA_MUTED  = colors.HexColor('#8fa080')   # --text-3
AMBER        = colors.HexColor('#e8a020')   # --a400

styles = getSampleStyleSheet()

def _s(name, **kw):
    return ParagraphStyle(name, parent=styles['Normal'], **kw)

# ── Estilos de texto ─────────────────────────────────────────────────────────
TN   = _s('tn',  fontSize=8,  leading=11, textColor=PRETO_TEXTO)
TB   = _s('tb',  fontSize=8,  leading=11, textColor=PRETO_TEXTO, fontName='Helvetica-Bold')
TC   = _s('tc',  fontSize=8,  leading=11, textColor=PRETO_TEXTO, alignment=TA_CENTER)
TBC  = _s('tbc', fontSize=8,  leading=11, textColor=PRETO_TEXTO, fontName='Helvetica-Bold', alignment=TA_CENTER)
TR   = _s('tr_', fontSize=8,  leading=11, textColor=PRETO_TEXTO, alignment=TA_RIGHT)
TBR  = _s('tbr', fontSize=8,  leading=11, textColor=PRETO_TEXTO, fontName='Helvetica-Bold', alignment=TA_RIGHT)
TG   = _s('tg',  fontSize=8,  leading=11, textColor=CINZA_TEXTO)
THDR = _s('thd', fontSize=8,  leading=11, textColor=VERDE_HDR_TXT, fontName='Helvetica-Bold', alignment=TA_CENTER)
TSEC = _s('tsc', fontSize=8.5,leading=11, textColor=VERDE_HDR_TXT, fontName='Helvetica-Bold', alignment=TA_CENTER)

S_EMPRESA = _s('em_', fontSize=13, leading=17, textColor=VERDE_DARK,
               fontName='Helvetica-Bold', alignment=TA_CENTER)
S_SUBEMP  = _s('se_', fontSize=9,  leading=13, textColor=CINZA_TEXTO, alignment=TA_CENTER)
S_TITULO  = _s('sti', fontSize=10, leading=14, textColor=VERDE_HDR_TXT,
               fontName='Helvetica-Bold', alignment=TA_CENTER)

def p(txt, st=None):
    return Paragraph(str(txt) if txt is not None else '', st or TN)

def sp(h=4):
    return Spacer(1, h)

# ── Base de estilo das tabelas ────────────────────────────────────────────────
GRID_BASE = [
    ('GRID',          (0,0), (-1,-1), 0.5, CINZA_BORDA),
    ('TOPPADDING',    (0,0), (-1,-1), 3),
    ('BOTTOMPADDING', (0,0), (-1,-1), 3),
    ('LEFTPADDING',   (0,0), (-1,-1), 5),
    ('RIGHTPADDING',  (0,0), (-1,-1), 5),
    ('VALIGN',        (0,0), (-1,-1), 'MIDDLE'),
]

def secao_row(texto, W):
    """Linha de título de seção com fundo verde do sistema."""
    t = Table([[p(texto, TSEC)]], colWidths=[W])
    t.setStyle(TableStyle(GRID_BASE + [
        ('BACKGROUND', (0,0), (-1,-1), VERDE_HDR),
        ('TOPPADDING',    (0,0),(-1,-1), 5),
        ('BOTTOMPADDING', (0,0),(-1,-1), 5),
    ]))
    return t

def mk_table(data, col_w, extra=None):
    t = Table(data, colWidths=col_w)
    t.setStyle(TableStyle(GRID_BASE + (extra or [])))
    return t

def label_bg(col):
    return ('BACKGROUND', (col,0),(col,0), CINZA_LABEL)

def fmt_moeda(v):
    if not v: return 'R$ 0,00'
    return 'R$ {:,.2f}'.format(float(v)).replace(',','X').replace('.',',').replace('X','.')

def fmt_area(v):
    if not v: return '—'
    return '{:,.2f} ha'.format(float(v)).replace(',','X').replace('.',',').replace('X','.')

def fmt_coordenada(valor, tipo='lat'):
    if not valor:
        return '—'
    val = float(valor)
    abs_val = abs(val)
    graus = int(abs_val)
    min_dec = (abs_val - graus) * 60
    minutos = int(min_dec)
    segundos = ((min_dec - minutos) * 60)
    direcao = 'N' if tipo == 'lat' and val >= 0 else 'S' if tipo == 'lat' else ('L' if val >= 0 else 'O')
    return f"{graus}°{minutos}'{segundos:.2f}\"{direcao}"

# ════════════════════════════════════════════════════════════════════════════
def gerar(payload, out_path):
    c        = payload.get('cliente', {})
    im       = payload.get('imovel', {})
    rb       = payload.get('rebanho', [])
    total_rb = payload.get('totalRebanho', 0)
    banco    = payload.get('banco', 'Banco do Brasil')
    safra    = payload.get('safra', '2025/2026')
    valor    = payload.get('valor', 0)
    juros    = payload.get('juros', 6)
    prazo    = payload.get('prazo', 24)
    agencia  = payload.get('agencia', '')
    sistema  = payload.get('sistema', 'Extensivo')
    hoje     = payload.get('hoje', datetime.now().strftime('%d/%m/%Y'))
    enq      = c.get('enquadramento', 'PRONAF')

    # Campos do formulário
    num_cc           = payload.get('num_cc', '')
    financiada       = payload.get('financiada', 'Não')
    tipo_assistencia = payload.get('tipo_assistencia', '')
    fiador_nome      = payload.get('fiador_nome', '')
    fiador_cpf       = payload.get('fiador_cpf', '')
    atividade        = payload.get('atividade', 'Bovinocultura de corte')
    fase_producao    = payload.get('fase_producao', '')
    data_reembolso   = payload.get('data_reembolso', '')
    animais_custeados = payload.get('animais_custeados', '')
    produtividade    = payload.get('produtividade', '')
    produto          = payload.get('produto', '')
    tituloTipo       = payload.get('tituloTipo', 'PROJETO TÉCNICO DE CUSTEIO PECUÁRIO')

    # Dados da empresa (do config salvo)
    emp = payload.get('empresa', {})
    emp_razao    = emp.get('emp_razao_social',  'GSO SERVIÇOS AGRONÔMICOS LTDA')
    emp_fantasia = emp.get('emp_nome_fantasia', 'AGRIPEC CONSULTORIA')
    emp_cnpj     = emp.get('emp_cnpj',         'CNPJ: 45.976.488/0001-25')
    emp_crea     = emp.get('emp_crea',          'CREA-MA: 0005462592')
    emp_fone     = emp.get('emp_fone',          '98 98118-8695')
    emp_email    = emp.get('emp_email',         'agripec.ma@gmail.com')
    emp_endereco = emp.get('emp_endereco',      payload.get('endereco_astec','RUA SANTA CRUZ, 15 A, CENTRO - BOM JARDIM / MA'))
    emp_resp     = emp.get('emp_responsavel',   'Genilson de Sousa Oliveira')
    emp_formacao = emp.get('emp_formacao',      'Engenheiro Agrônomo')
    emp_conselho = emp.get('emp_conselho',      'CREA-MA: 111.737.380-0')
    emp_rnp      = emp.get('emp_rnp',           payload.get('rnp','1117373800'))

    desc_assistencia = tipo_assistencia or f'Projeto > Astec 0,5% - {enq}'
    nome_conjuge = c.get('nome_conjuge', '')
    cpf_conjuge  = c.get('cpf_conjuge', '')

    doc = SimpleDocTemplate(
        out_path, pagesize=A4,
        leftMargin=1.2*cm, rightMargin=1.2*cm,
        topMargin=1.5*cm,  bottomMargin=1.5*cm,
        title='Projeto Técnico – ' + emp_fantasia
    )
    W = A4[0] - 2.4*cm
    story = []

    # ── CABEÇALHO DA EMPRESA ──────────────────────────────────────────────
    logo_path = payload.get('logomarca_path') or emp.get('logomarca_path')
    header_built = False
    if logo_path and os.path.exists(logo_path):
        try:
            from PIL import Image as PILImage
            pil_img = PILImage.open(logo_path)
            iw, ih  = pil_img.size
            aspect  = ih / iw
            lw = min(4.5*cm, W * 0.28)
            lh = lw * aspect
            if lh > 2.2*cm:
                lh = 2.2*cm
                lw = lh / aspect
            logo = Image(logo_path, width=lw, height=lh)
            txt_col = [
                p(emp_razao,    S_EMPRESA),
                p(emp_fantasia, S_SUBEMP),
                p(f'{emp_cnpj}  |  {emp_crea}', S_SUBEMP),
            ]
            ht = Table([[logo, txt_col]], colWidths=[lw + 0.4*cm, W - lw - 0.4*cm])
            ht.setStyle(TableStyle([
                ('VALIGN',(0,0),(-1,-1),'MIDDLE'),
                ('LEFTPADDING',(0,0),(0,0),0),
            ]))
            story.append(ht)
            header_built = True
        except Exception:
            pass

    if not header_built:
        story.append(p(emp_razao,    S_EMPRESA))
        story.append(p(emp_fantasia, S_SUBEMP))
        story.append(p(f'{emp_cnpj}  |  {emp_crea}', S_SUBEMP))

    story.append(sp(6))
    story.append(HRFlowable(width='100%', thickness=1.5, color=VERDE_MED))
    story.append(sp(6))

    # Título principal
    t_tit = Table([[p(tituloTipo, S_TITULO)]], colWidths=[W])
    t_tit.setStyle(TableStyle(GRID_BASE + [
        ('BACKGROUND', (0,0),(-1,-1), VERDE_DARK),
        ('TOPPADDING',    (0,0),(-1,-1), 6),
        ('BOTTOMPADDING', (0,0),(-1,-1), 6),
    ]))
    story.append(t_tit)

    # Banco / Enquadramento / Safra / Agência / Data
    t_ban = mk_table([[
        p('Banco:', TB), p(banco.upper(), TN),
        p('Enquadramento:', TB), p(enq, TN),
        p('Safra:', TB), p(safra, TN),
        p('Agência:', TB), p(agencia, TN),
        p('Data:', TB), p(hoje, TN),
    ]], [W*0.07, W*0.16, W*0.10, W*0.10, W*0.07, W*0.10,
         W*0.07, W*0.15, W*0.06, W*0.12],
        [label_bg(0), label_bg(2), label_bg(4), label_bg(6), label_bg(8)])
    story.append(t_ban)
    story.append(sp(6))

    # ════ SEÇÃO 1 – ASTEC ════════════════════════════════════════════════
    story.append(secao_row('ASTEC/ATNI ELABORADORA DO PROJETO', W))

    story.append(mk_table([[
        p('Razão Social:', TB), p(emp_razao, TN),
        p('Nº C/C:', TB), p(num_cc, TN),
        p('Agência:', TB), p(agencia, TN),
    ]], [W*0.12, W*0.30, W*0.08, W*0.20, W*0.08, W*0.22],
        [label_bg(0), label_bg(2), label_bg(4)]))

    story.append(mk_table([[
        p('Fone:', TB), p(emp_fone, TN),
        p('Endereço:', TB), p(emp_endereco, TN),
    ]], [W*0.08, W*0.20, W*0.09, W*0.63],
        [label_bg(0), label_bg(2)]))

    story.append(mk_table([[
        p('E-mail:', TB), p(emp_email, TN),
    ]], [W*0.08, W*0.92], [label_bg(0)]))

    story.append(mk_table([[
        p('Responsável Técnico:', TB), p(emp_resp, TN),
        p('Formação:', TB), p(emp_formacao, TN),
    ]], [W*0.16, W*0.38, W*0.10, W*0.36],
        [label_bg(0), label_bg(2)]))

    story.append(mk_table([[
        p('Conselho de Classe:', TB), p(emp_conselho, TN),
        p('RNP:', TB), p(emp_rnp, TN),
    ]], [W*0.16, W*0.38, W*0.08, W*0.38],
        [label_bg(0), label_bg(2)]))

    story.append(sp(6))

    # ════ SEÇÃO 2 – ASSISTÊNCIA TÉCNICA ══════════════════════════════════
    story.append(secao_row('TIPO DE ASSISTÊNCIA TÉCNICA', W))
    story.append(mk_table([[
        p('Descrição:', TB), p(desc_assistencia, TN),
        p('Financiada:', TB), p(financiada, TN),
    ]], [W*0.09, W*0.72, W*0.10, W*0.09],
        [label_bg(0), label_bg(2)]))
    story.append(sp(6))

    # ════ SEÇÃO 3 – MUTUÁRIO ═════════════════════════════════════════════
    story.append(secao_row('MUTUÁRIO PROPONENTE / INTERVENIENTE GARANTIDOR', W))

    # Cabeçalho da tabela
    t_mh = mk_table([[
        p('NOME', THDR), p('CPF', THDR),
        p('ESTADO CIVIL', THDR),
        p('FIADOR/AVALISTA', THDR), p('CPF FIADOR', THDR),
    ]], [W*0.30, W*0.16, W*0.15, W*0.27, W*0.12],
        [('BACKGROUND',(0,0),(-1,-1), VERDE_MED)])
    story.append(t_mh)

    ec = (c.get('estado_civil','') or '').upper()
    story.append(mk_table([[
        p(c.get('nome',''), TB), p(c.get('cpf',''), TC),
        p(ec, TC),
        p(fiador_nome, TN), p(fiador_cpf, TC),
    ]], [W*0.30, W*0.16, W*0.15, W*0.27, W*0.12],
        [('ROWBACKGROUNDS',(0,0),(-1,-1),[CINZA_LINHA, BRANCO])]))
    story.append(sp(6))

    # ════ SEÇÃO 4 – FINALIDADE ═══════════════════════════════════════════
    story.append(secao_row('FINALIDADE DA PROPOSTA - EMPREENDIMENTO FINANCIADO', W))

    story.append(mk_table([[
        p('Atividade:', TB), p(atividade, TN),
        p('Fase de Produção:', TB), p(fase_producao, TN),
        p('Sistema de Produção:', TB), p(sistema, TN),
    ]], [W*0.09, W*0.22, W*0.13, W*0.20, W*0.15, W*0.21],
        [label_bg(0), label_bg(2), label_bg(4)]))

    story.append(mk_table([[
        p('Prazo de Reembolso:', TB), p(str(prazo), TC), p('meses', TN),
        p('Data de reembolso:', TB), p(data_reembolso, TC),
    ]], [W*0.14, W*0.07, W*0.07, W*0.14, W*0.58],
        [label_bg(0), label_bg(3)]))

    story.append(mk_table([[
        p('Animais Custeados:', TB), p(str(animais_custeados), TC),
        p('Produtividade Esperada:', TB), p(produtividade, TC),
        p('Produto:', TB), p(produto, TN),
    ]], [W*0.14, W*0.10, W*0.17, W*0.20, W*0.08, W*0.31],
        [label_bg(0), label_bg(2), label_bg(4)]))
    story.append(sp(6))

    # ════ SEÇÃO 5 – IDENTIFICAÇÃO DO IMÓVEL ══════════════════════════════
    story.append(secao_row('IDENTIFICAÇÃO DO IMÓVEL BENEFICIADO', W))

    story.append(mk_table([[
        p('Nome do Imóvel:', TB), p(im.get('nome',''), TN),
        p('Município:', TB), p(im.get('municipio',''), TN),
        p('UF:', TB), p(im.get('uf',''), TC),
        p('Situação:', TB), p((im.get('situacao','') or '').capitalize(), TN),
    ]], [W*0.12, W*0.24, W*0.09, W*0.20, W*0.05, W*0.07, W*0.09, W*0.14],
        [label_bg(0), label_bg(2), label_bg(4), label_bg(6)]))

    story.append(mk_table([[
        p('Matrícula:', TB), p(im.get('matricula',''), TN),
        p('CRI:', TB), p(im.get('cri',''), TN),
        p('CCIR:', TB), p(im.get('ccir',''), TN),
        p('CAR:', TB), p(im.get('car',''), TN),
    ]], [W*0.09, W*0.21, W*0.05, W*0.15, W*0.06, W*0.19, W*0.05, W*0.20],
        [label_bg(0), label_bg(2), label_bg(4), label_bg(6)]))

    story.append(mk_table([[
        p('Área Total:', TB), p(fmt_area(im.get('area_total')), TN),
        p('Coordenadas:', TB), p(f"{fmt_coordenada(im.get('latitude'), 'lat')}  {fmt_coordenada(im.get('longitude'), 'lng')}", TN),
        p('Data Registro:', TB), p(im.get('data_registro',''), TN),
    ]], [W*0.09, W*0.15, W*0.10, W*0.30, W*0.11, W*0.25],
        [label_bg(0), label_bg(2), label_bg(4)]))

    if im.get('roteiro_acesso'):
        story.append(mk_table([[
            p('Roteiro de Acesso:', TB), p(im['roteiro_acesso'], TN),
        ]], [W*0.15, W*0.85], [label_bg(0)]))
    story.append(sp(6))

    # ════ SEÇÃO 6 – REBANHO BOVINO ═══════════════════════════════════════
    story.append(secao_row('REBANHO BOVINO DO MUTUÁRIO PROPONENTE', W))

    rb_data = [[
        p('SEMOVENTES', THDR), p('RAÇA', THDR), p('QTDE', THDR),
        p('VALOR UNIT.', THDR), p('VALOR TOTAL', THDR),
    ]]

    for i, sem in enumerate(rb):
        qtd = int(sem.get('quantidade', 0))
        pu  = float(sem.get('preco_unitario', 0))
        vt  = qtd * pu
        bg  = CINZA_LINHA if i % 2 == 0 else BRANCO
        rb_data.append([
            p(sem.get('categoria',''), TN),
            p(sem.get('raca','Nelore'), TN),
            p(str(qtd), TC),
            p(fmt_moeda(pu), TR),
            p(fmt_moeda(vt), TR),
        ])

    tot_s = fmt_moeda(float(total_rb))
    rb_data.append([p('VALOR OPINATIVO TOTAL DO REBANHO', TB), p(''), p(''), p(''), p(tot_s, TBR)])

    t_rb = Table(rb_data, colWidths=[W*0.32, W*0.22, W*0.10, W*0.18, W*0.18])
    rb_styles = TableStyle(GRID_BASE + [
        ('BACKGROUND', (0,0), (-1,0), VERDE_MED),
        ('BACKGROUND', (0,-1),(-1,-1), VERDE_PALE),
        ('SPAN',       (0,-1),(3,-1)),
        ('FONTNAME',   (0,-1),(4,-1), 'Helvetica-Bold'),
        ('ROWBACKGROUNDS', (0,1),(-2,-1), [CINZA_LINHA, BRANCO]),
    ])
    t_rb.setStyle(rb_styles)
    story.append(t_rb)
    story.append(sp(6))

    # ════ SEÇÃO 7 – DADOS DO FINANCIAMENTO ═══════════════════════════════
    story.append(secao_row('DADOS DO FINANCIAMENTO', W))
    story.append(mk_table([[
        p('Valor do Projeto:', TB), p(fmt_moeda(valor), TN),
        p('Taxa de Juros a.a.:', TB), p(f'{juros}%', TC),
        p('Prazo (meses):', TB), p(str(prazo), TC),
        p('Sistema:', TB), p(sistema, TN),
    ]], [W*0.13, W*0.18, W*0.14, W*0.10, W*0.12, W*0.08, W*0.09, W*0.16],
        [label_bg(0), label_bg(2), label_bg(4), label_bg(6)]))
    story.append(sp(6))

    # ── Textos configuráveis (passados via payload JSON) ──────────────────
    textos = data.get('textos', {})
    txt_rec_tecnica = textos.get('rec_tecnica',
        'A área produtiva da propriedade encontra-se em regular estado de conservação, '
        'boa capacidade hídrica, o que leva a bons parâmetros que possibilitam a '
        'aquisição de bezerros e sua respectiva produção.')
    txt_preservacao = textos.get('preservacao_ambiental',
        'O proponente foi orientado em relação às leis ambientais vigentes, principalmente no '
        'que tange à reserva legal, mata ciliar e demais áreas de preservação permanente. '
        'Imóvel possui DCAA e Outorga de uso de água, conforme legislação do Estado do Maranhão.')
    txt_conservacao = textos.get('conservacao_solo',
        'Serão recomendadas, caso necessário, a adoção de técnicas de manejo do solo que '
        'visem a melhoria deste, focando na garantia da produção.')
    txt_croqui = textos.get('croqui_localizacao',
        'Apresentado no dossiê da operação de crédito e no cadastro do cliente, no ambiente glebas geomapa.')
    txt_ateste = textos.get('ateste',
        'Fica dado ciência sobre o acompanhamento técnico da ASTEC/ATNI ao longo do contrato '
        'objeto do projeto ao imóvel beneficiado, com fins de produção de laudos, levantamento '
        'de execução de inversões financiadas, recomendações técnicas, eventuais prejuízos e '
        'demais ocorrências relevantes, inclusive eventuais irregularidades.')

    # ════ SEÇÃO 8 – RECOMENDAÇÕES TÉCNICAS ═══════════════════════════════
    story.append(secao_row('RECOMENDAÇÕES TÉCNICAS', W))
    story.append(mk_table([[p(txt_rec_tecnica, TN)]], [W]))
    story.append(sp(6))

    # ════ SEÇÃO 9 – PRESERVAÇÃO AMBIENTAL ════════════════════════════════
    story.append(secao_row('RECOMENDAÇÃO PARA PRESERVAÇÃO DO MEIO AMBIENTE', W))
    story.append(mk_table([[p(txt_preservacao, TN)]], [W]))
    story.append(sp(6))

    # ════ SEÇÃO 10 – CONSERVAÇÃO DE SOLO ═════════════════════════════════
    story.append(secao_row('CONSERVAÇÃO DE SOLO', W))
    story.append(mk_table([[p(txt_conservacao, TN)]], [W]))
    story.append(sp(6))

    # ════ SEÇÃO 11 – CROQUI DE LOCALIZAÇÃO ═══════════════════════════════
    story.append(secao_row('CROQUI DE LOCALIZAÇÃO', W))
    story.append(mk_table([[p(txt_croqui, TC)]], [W]))
    story.append(sp(6))

    # ════ SEÇÃO 12 – ATESTE ══════════════════════════════════════════════
    story.append(secao_row('ATESTE', W))
    story.append(mk_table([[p(txt_ateste, TN)]], [W]))
    story.append(sp(20))

    # ════ ASSINATURAS ═════════════════════════════════════════════════════
    story.append(secao_row('ASSINATURAS', W))
    story.append(sp(28))
    linha = '_' * 42
    t_ass = Table([
        [p(linha, TC), p(''), p(linha, TC)],
        [p(c.get('nome',''), TBC), p(''), p(emp_razao, TBC)],
        [p(c.get('cpf',''), TC),   p(''), p(emp_cnpj, TC)],
        [p('MUTUÁRIO PROPONENTE', TC), p(''), p('ASTEC/ATNI – RESPONSÁVEL TÉCNICO', TC)],
    ], colWidths=[W*0.45, W*0.1, W*0.45])
    t_ass.setStyle(TableStyle([
        ('TOPPADDING',(0,0),(-1,-1),3),
        ('BOTTOMPADDING',(0,0),(-1,-1),3),
    ]))
    story.append(t_ass)
    story.append(sp(12))
    # Cidade da empresa extraída do endereço (ex: "RUA X - BOM JARDIM / MA")
    import re as _re
    m = _re.search(r'[-–]\s*([^/\-–]+)\s*/\s*([A-Z]{2})\s*$', emp_endereco, _re.IGNORECASE)
    if m:
        emp_cidade = f"{m.group(1).strip()} / {m.group(2).strip()}"
    else:
        emp_cidade = f"{c.get('cidade','')}, {c.get('uf','MA')}"
    story.append(p(f"{emp_cidade}   –   {hoje}", TG))

    doc.build(story)
    print(f'PDF salvo: {out_path}')


if __name__ == '__main__':
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    gerar(data, sys.argv[2])
