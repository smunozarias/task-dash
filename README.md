# BranddiDash - Sales Ops Analytics

Dashboard de analytics para times de Sales Operations com integração Supabase e deployment no Vercel.

## 🚀 Quick Start

### Opção 1: Setup Automatizado

```bash
./setup.sh
```

### Opção 2: Setup Manual

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar ambiente:**
   ```bash
   cp .env.local.example .env.local
   # Edite .env.local e adicione suas credenciais do Supabase
   ```

3. **Executar localmente:**
   ```bash
   npm run dev
   ```

4. **Abrir no navegador:**
   ```
   http://localhost:5173
   ```

## 📖 Documentação

- **[SETUP.md](./SETUP.md)** - Guia completo de configuração do ambiente
- **[supabase_schema.sql](./supabase_schema.sql)** - Script SQL para criar o banco de dados
- **[vercel.json](./vercel.json)** - Configuração para deployment no Vercel

## 🔧 Tecnologias

- **Frontend:** React + TypeScript + Vite
- **UI:** TailwindCSS + Lucide Icons
- **Charts:** Recharts
- **Database:** Supabase (PostgreSQL)
- **Deploy:** Vercel

## 📊 Funcionalidades

- ✅ Upload de arquivos CSV (exportação CRM)
- ✅ Modo Demo com dados fictícios
- ✅ Sincronização com Supabase (nuvem)
- ✅ Carregar dados salvos da nuvem
- ✅ Dashboard com múltiplas visões:
  - Visão Geral da Equipe
  - Análise de Dedicação
  - Performance Individual
- ✅ Visualizações avançadas:
  - Heatmap de atividades
  - Gráficos de produtividade
  - Matriz de dedicação
  - Radar de canais
  - Análise temporal

## 🌐 Deployment

### Deploy no Vercel

1. **Via CLI:**
   ```bash
   npx vercel
   ```

2. **Via GitHub:**
   - Conecte seu repositório no Vercel
   - Deploy automático a cada push

3. **Configurar Environment Variables no Vercel:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

Veja mais detalhes no [walkthrough](./walkthrough.md).

## 🧪 Build de Produção

```bash
npm run build
```

Os arquivos otimizados estarão em `dist/`.

## 📝 Estrutura do Projeto

```
task dash/
├── src/
│   ├── App.tsx           # Componente principal
│   ├── lib/
│   │   └── supabase.ts   # Cliente Supabase
│   ├── index.css         # Estilos globais
│   └── main.tsx          # Entry point
├── supabase_schema.sql   # Schema do banco
├── vercel.json           # Config Vercel
├── .env.local.example    # Template de env vars
├── SETUP.md              # Guia de configuração
└── setup.sh              # Script de setup
```

## 🤝 Contribuindo

Para desenvolvimento local:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto é privado.

## 💡 Suporte

Para questões e suporte, consulte a documentação em `SETUP.md` ou entre em contato com a equipe.

---

**Desenvolvido com ❤️ para Branddi**
