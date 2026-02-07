#!/bin/bash

# Script de Setup Rápido - BranddiDash
echo "🚀 BranddiDash - Setup de Ambiente Local"
echo "=========================================="
echo ""

# Verificar se node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    npm install
    echo "✅ Dependências instaladas!"
    echo ""
fi

# Verificar se .env.local existe
if [ ! -f ".env.local" ]; then
    echo "⚙️  Criando arquivo .env.local..."
    cp .env.local.example .env.local
    echo "✅ Arquivo .env.local criado!"
    echo ""
    echo "⚠️  IMPORTANTE: Configure suas credenciais do Supabase no arquivo .env.local"
    echo ""
    echo "📝 Para obter as credenciais:"
    echo "   1. Acesse https://supabase.com"
    echo "   2. Vá em Settings → API"
    echo "   3. Copie a 'Project URL' e a 'anon public key'"
    echo "   4. Cole no arquivo .env.local"
    echo ""
    
    # Abrir o arquivo .env.local no editor padrão (se disponível)
    if command -v code &> /dev/null; then
        echo "📂 Abrindo .env.local no VS Code..."
        code .env.local
    elif command -v nano &> /dev/null; then
        echo "📂 Abrindo .env.local no nano..."
        nano .env.local
    else
        echo "📂 Abra manualmente o arquivo .env.local para editar"
    fi
else
    echo "✅ Arquivo .env.local já existe!"
    echo ""
fi

echo ""
echo "📋 Próximos passos:"
echo ""
echo "1. ✅ Configure o arquivo .env.local com suas credenciais"
echo "2. 🗄️  Execute o script SQL no Supabase (veja supabase_schema.sql)"
echo "3. 🚀 Inicie o servidor: npm run dev"
echo ""
echo "📖 Para mais detalhes, veja o arquivo SETUP.md"
echo ""
