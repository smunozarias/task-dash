# Guia de Configuração do Ambiente Local

## Passo 1: Configurar Supabase

### 1.1 Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com)
2. Faça login ou crie uma conta
3. Clique em "New Project"
4. Preencha:
   - **Nome do Projeto**: `branddi-dash` (ou o nome que preferir)
   - **Database Password**: Escolha uma senha forte (anote!)
   - **Region**: Escolha a região mais próxima (ex: `South America (São Paulo)`)
5. Clique em "Create new project" e aguarde a criação (leva ~2 minutos)

### 1.2 Executar o Schema do Banco de Dados

1. No painel do Supabase, vá em **SQL Editor** (ícone de banco de dados na barra lateral)
2. Clique em "+ New query"
3. Copie todo o conteúdo do arquivo `supabase_schema.sql`:

```sql
CREATE TABLE activities (
  id BIGSERIAL PRIMARY KEY,
  user_name TEXT NOT NULL,
  type TEXT NOT NULL,
  activity_date TIMESTAMP NOT NULL,
  hour INTEGER NOT NULL
);

-- Enable Row Level Security
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Allow public read/insert/update (para desenvolvimento)
CREATE POLICY "Allow public read" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON activities FOR UPDATE USING (true);
```

4. Cole no editor e clique em **"Run"** (ou pressione `Ctrl/Cmd + Enter`)
5. Você deve ver: ✅ `Success. No rows returned`

### 1.3 Obter as Credenciais

1. No painel do Supabase, vá em **⚙️ Settings** → **API**
2. Você verá duas seções importantes:

   **Project URL:**
   ```
   https://xxxxxxxxxxxx.supabase.co
   ```
   
   **Project API keys:**
   - `anon` `public` (esta é a chave que vamos usar)
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Copie ambos os valores** (vamos usá-los no próximo passo)

---

## Passo 2: Configurar Variáveis de Ambiente Localmente

### 2.1 Criar arquivo `.env.local`

1. Na raiz do projeto, crie um arquivo chamado `.env.local`:

```bash
# No terminal, na pasta do projeto:
cp .env.local.example .env.local
```

2. Abra o arquivo `.env.local` e preencha com suas credenciais:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **IMPORTANTE**: O arquivo `.env.local` já está no `.gitignore` e **não será comitado** no Git (é secreto!)

### 2.2 Reiniciar o servidor de desenvolvimento

```bash
# Pare o servidor atual (Ctrl+C) e reinicie:
npm run dev
```

O Vite detectará automaticamente as variáveis de ambiente.

---

## Passo 3: Testar a Integração

### 3.1 Testar "Sincronizar Cloud"

1. Abra o navegador em `http://localhost:5173`
2. Clique em **"Carregar Dados de Exemplo (Demo)"**
3. No topo da tela, clique no botão **"Sincronizar Cloud"**
4. Aguarde a mensagem: ✅ "Dados sincronizados com Supabase!"

### 3.2 Verificar no Supabase

1. Volte ao painel do Supabase
2. Vá em **Table Editor** → **activities**
3. Você deve ver os dados sincronizados (múltiplas linhas com atividades)

### 3.3 Testar "Carregar da Nuvem"

1. Recarregue a página do dashboard (`F5` ou `Cmd+R`)
2. Na tela de upload, clique em **"Carregar da Nuvem"**
3. Os dados devem ser carregados automaticamente do Supabase! 🎉

---

## Passo 4: (Opcional) Fazer Upload de CSV Real

1. Exporte seus dados do CRM em formato CSV
2. Na tela de upload, arraste o arquivo CSV ou clique para selecionar
3. Após o processamento, clique em **"Sincronizar Cloud"**
4. Seus dados reais estarão agora salvos no Supabase

---

## Troubleshooting

### Erro: "Failed to fetch"

**Causa:** As credenciais do Supabase estão incorretas ou o arquivo `.env.local` não foi criado.

**Solução:**
1. Verifique se o arquivo `.env.local` existe
2. Confirme que as variáveis começam com `VITE_`
3. Reinicie o servidor de desenvolvimento

### Erro: "relation 'activities' does not exist"

**Causa:** A tabela não foi criada no banco de dados.

**Solução:**
1. Execute o script SQL novamente no Supabase SQL Editor
2. Verifique se a tabela `activities` aparece no Table Editor

### Erro: "new row violates row-level security policy"

**Causa:** As políticas RLS (Row Level Security) não foram configuradas.

**Solução:**
1. Execute a parte das policies no SQL Editor:
```sql
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON activities FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON activities FOR UPDATE USING (true);
```

---

## Próximos Passos

Após a configuração local funcionar, você pode seguir para o deployment no Vercel (veja o walkthrough principal).

✅ Ambiente local configurado e testado!
