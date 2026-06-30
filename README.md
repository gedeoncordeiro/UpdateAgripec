# 🌾 AgroGestão – Sistema de Gestão Rural (Local)

Sistema completo para gestão de **Clientes**, **Imóveis** e **Semoventes**.  
Roda no próprio computador — sem internet, sem servidor externo, sem instalação complexa.

---

## ✅ Requisitos

Apenas um programa precisa ser instalado:

- **Node.js** (versão 18 ou superior)  
  Baixe em: https://nodejs.org (escolha a versão LTS)

---

## 🚀 Como usar

### Windows
Dê dois cliques no arquivo **`iniciar.bat`**

Na primeira vez, ele instala as dependências automaticamente (pode demorar 1–2 minutos).  
Uma janela do terminal ficará aberta e o navegador abrirá automaticamente.

### Linux / macOS
```bash
chmod +x iniciar.sh
./iniciar.sh
```

---

## 🔐 Acesso

| Perfil       | E-mail                       | Senha     |
|--------------|------------------------------|-----------|
| Admin        | admin@agrogestao.com         | admin123  |
| Operador     | operador@agrogestao.com      | op123456  |

---

## 💾 Onde ficam os dados?

Tudo fica salvo na pasta **`data/`** dentro do sistema:

```
data/
├── agrogestao.db     ← banco de dados (SQLite)
└── uploads/          ← documentos de imóveis enviados
```

> 🔒 **Faça backup desta pasta regularmente!**  
> Copie a pasta `data/` para um pendrive ou nuvem para não perder os dados.

---

## 🔧 Funcionalidades

- **Clientes** — CPF, estado civil, regime de casamento, endereço, contato
- **Imóveis** — área, situação (registrada/posse/arrendada), matrícula, CRI, coordenadas GPS, upload de documentos
- **Semoventes** — categoria, raça, cor, mestiçagem, quantidade, preço, valor total automático, marca/ferro
- **Painel** — resumo geral com gráficos e métricas
- **Mapas** — visualização dos imóveis no mapa (OpenStreetMap)
- **Relatórios** — resumo por categoria, exportação CSV
- **Usuários** — controle de acesso admin/operador com JWT

---

## ⚠️ Importante

- Deixe a janela do terminal **aberta** enquanto usar o sistema
- Fechar a janela encerra o sistema
- Para encerrar, feche a janela do terminal ou pressione `Ctrl+C`

---

## 🆘 Problemas comuns

**"node não é reconhecido"**  
→ Instale o Node.js em https://nodejs.org e reinicie o computador

**Porta 3000 já em uso**  
→ Abra o arquivo `src/server.js` e troque `3000` por `3001` (ou outra porta livre)

**Dados sumidos**  
→ Verifique se a pasta `data/agrogestao.db` existe — nunca delete essa pasta
