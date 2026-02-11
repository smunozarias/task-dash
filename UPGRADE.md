# 🎯 TaskDash - Upgrade Guide

## ✨ Novo Fluxo Simplificado

A aplicação foi completamente refatorada para ser **super simples e intuitiva**:

### 📊 Como Usar

1. **Upload**: Arraste seu arquivo CSV para fazer upload
2. **Análise**: Explore os dados em 3 visualizações (Geral, Dedicação, Individual)
3. **Salvar**: Clique em "Salvar Dados" para guardar na nuvem
4. **Próxima sessão**: Dados carregam automaticamente!

### 🗄️ Mudanças no Supabase

Se você estava usando a versão anterior com períodos/meses, **execute a migration**:

```bash
# No SQL Editor do Supabase, rode:
ALTER TABLE public.activities DROP COLUMN IF EXISTS period;
ALTER TABLE public.activities DROP COLUMN IF EXISTS is_demo;
DROP INDEX IF EXISTS idx_activities_period;
ALTER TABLE public.activities ADD COLUMN IF NOT EXISTS synced_at TIMESTAMP DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_activities_synced_at ON public.activities (synced_at);
```

Ou copie o arquivo `supabase_simplify_schema.sql` e execute no Supabase.

### 🔄 O Que Mudou

**Antes:**
- ❌ Múltiplos períodos/meses
- ❌ Controle complexo de carregar/salvar
- ❌ Dropdown de períodos confuso

**Agora:**
- ✅ Um arquivo = uma análise
- ✅ Auto-carrega dados ao abrir
- ✅ Um clique para salvar (substitui automaticamente)
- ✅ UI ultra-limpa e intuitiva

### 📱 URL Live

🚀 **https://task-dash-olive.vercel.app**

### 📝 Formato do CSV Esperado

```csv
user,type,date,hour
João Silva,Call,2025-02-01,09
João Silva,Email,2025-02-01,10
Maria Santos,WhatsApp,2025-02-01,14
...
```

**Colunas necessárias:**
- `user` - Nome do usuário/vendedor
- `type` - Tipo de atividade (Call, Email, WhatsApp, LinkedIn, etc)
- `date` - Data (YYYY-MM-DD)
- `hour` - Hora (0-23)

---

**Desenvolvido com React 19 + Vite 7 + Supabase + Tailwind CSS**
