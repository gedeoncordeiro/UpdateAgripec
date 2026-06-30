import sys, json
from datetime import datetime
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)

VERDE       = colors.HexColor('#2D6A0A')
AZUL_ESC    = colors.HexColor('#1F3864')
VERDE_CLARO = colors.HexColor('#EAFDE7')
CINZA_LIN   = colors.HexColor('#F5F5F5')
BRANCO      = colors.white
CINZA_BORDA = colors.HexColor('#AAAAAA')

styles = getSampleStyleSheet()

def estilo(name, **kw):
    return ParagraphStyle(name, parent=styles['Normal'], **kw)

S_TITULO  = estilo('ti_', fontSize=14, leading=18, textColor=VERDE, fontName='Helvetica-Bold', alignment=TA_CENTER)
S_SUB     = estilo('su_', fontSize=9,  leading=13, textColor=colors.HexColor('#444444'), alignment=TA_CENTER)
S_HDR     = estilo('hd_', fontSize=8,  leading=11, textColor=BRANCO, fontName='Helvetica-Bold', alignment=TA_CENTER)
S_CELL    = estilo('ce_', fontSize=8,  leading=11, textColor=colors.HexColor('#222222'))
S_CELL_C  = estilo('cc_', fontSize=8,  leading=11, textColor=colors.HexColor('#222222'), alignment=TA_CENTER)

def p(txt, style=None):
    return Paragraph(str(txt) if txt is not None else '', style or S_CELL)

def fmt_moeda(v):
    if not v: return 'R$ 0,00'
    try: return 'R$ {:,.2f}'.format(float(v)).replace(',','X').replace('.',',').replace('X','.')
    except: return str(v)

def fmt_area(v):
    if not v: return '-'
    try: return '{:,.2f} ha'.format(float(v)).replace(',','X').replace('.',',').replace('X','.')
    except: return str(v)

TITULOS = {
    'clientes':   'RELATÓRIO DE CLIENTES',
    'imoveis':    'RELATÓRIO DE IMÓVEIS',
    'semoventes': 'RELATÓRIO DE SEMOVENTES',
}

def gerar(payload, out_path):
    tipo = payload['tipo']
    rows = payload['rows']
    hoje = datetime.now().strftime('%d/%m/%Y %H:%M')

    doc = SimpleDocTemplate(
        out_path, pagesize=landscape(A4),
        leftMargin=1.5*cm, rightMargin=1.5*cm,
        topMargin=1.5*cm, bottomMargin=1.5*cm,
        title=TITULOS.get(tipo,'Relatório')
    )
    W = landscape(A4)[0] - 3*cm
    story = []

    story.append(p('AGRIPEC CONSULTORIA – GSO SERVIÇOS AGRONÔMICOS LTDA', S_TITULO))
    story.append(p(f'{TITULOS[tipo]}  |  Emitido em: {hoje}', S_SUB))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width='100%', thickness=1.5, color=VERDE))
    story.append(Spacer(1, 8))

    if tipo == 'clientes':
        hdrs = ['NOME','CPF','RG','EST. CIVIL','TELEFONE','E-MAIL','CIDADE','UF']
        ws   = [W*0.18,W*0.11,W*0.10,W*0.09,W*0.11,W*0.20,W*0.14,W*0.07]
        data = [[p(h,S_HDR) for h in hdrs]]
        for i, r in enumerate(rows):
            bg = CINZA_LIN if i%2==0 else BRANCO
            data.append([
                p(r.get('nome','') or ''), p(r.get('cpf','') or ''), p(r.get('rg','') or ''),
                p((r.get('estado_civil','') or '').capitalize()),
                p(r.get('telefone','') or ''), p(r.get('email','') or ''),
                p(r.get('endereco_cidade','') or ''), p(r.get('endereco_uf','') or ''),
            ])
    elif tipo == 'imoveis':
        hdrs = ['NOME DO IMÓVEL','ÁREA (ha)','MUNICÍPIO','UF','SITUAÇÃO','MATRÍCULA','CRI','PROPRIETÁRIO']
        ws   = [W*0.18,W*0.09,W*0.13,W*0.06,W*0.10,W*0.11,W*0.09,W*0.24]
        data = [[p(h,S_HDR) for h in hdrs]]
        for i, r in enumerate(rows):
            data.append([
                p(r.get('nome','') or ''), p(fmt_area(r.get('area_total'))),
                p(r.get('municipio','') or ''), p(r.get('uf','') or ''),
                p((r.get('situacao','') or '').capitalize()),
                p(r.get('matricula','') or ''), p(r.get('cri','') or ''),
                p(r.get('proprietario_nome','') or ''),
            ])
    else:  # semoventes
        hdrs = ['CATEGORIA','RAÇA','COR','MESTIÇAGEM','IDADE (m)','QTDE','PREÇO UNIT.','TOTAL','IMÓVEL','MARCA']
        ws   = [W*0.10,W*0.09,W*0.07,W*0.09,W*0.07,W*0.06,W*0.10,W*0.10,W*0.17,W*0.08]
        data = [[p(h,S_HDR) for h in hdrs]]
        for i, r in enumerate(rows):
            data.append([
                p((r.get('categoria','') or '').capitalize()), p(r.get('raca','') or ''),
                p(r.get('cor','') or ''), p(r.get('mesticagem','') or ''),
                p(str(r.get('idade_meses','') or ''), S_CELL_C),
                p(str(r.get('quantidade','') or ''), S_CELL_C),
                p(fmt_moeda(r.get('preco_unitario'))), p(fmt_moeda(r.get('valor_total'))),
                p(r.get('imovel_nome','') or ''), p(r.get('marca_ferro','') or ''),
            ])

    t = Table(data, colWidths=ws, repeatRows=1)
    ts = TableStyle([
        ('BACKGROUND',    (0,0),(-1,0), VERDE),
        ('TOPPADDING',    (0,0),(-1,-1), 3),
        ('BOTTOMPADDING', (0,0),(-1,-1), 3),
        ('LEFTPADDING',   (0,0),(-1,-1), 5),
        ('GRID',          (0,0),(-1,-1), 0.4, CINZA_BORDA),
        ('ROWBACKGROUNDS',(0,1),(-1,-1), [CINZA_LIN, BRANCO]),
    ])
    t.setStyle(ts)
    story.append(t)

    story.append(Spacer(1, 8))
    story.append(p(f'Total de registros: {len(rows)}', estilo('tot_', fontSize=8, textColor=colors.HexColor('#666'))))

    doc.build(story)
    print(f'Relatório PDF salvo: {out_path}')

if __name__ == '__main__':
    with open(sys.argv[1], 'r', encoding='utf-8') as f:
        data = json.load(f)
    gerar(data, sys.argv[2])
