#!/bin/bash
# 🧪 SCRIPT DE TESTE - VERIFICAR SE O RESET DIÁRIO ESTÁ FUNCIONANDO

# CORES PARA OUTPUT
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔍 INICIANDO TESTES DO SISTEMA DE RESET DIÁRIO...${NC}\n"

# TESTE 1: Verificar se as tabelas existem
echo -e "${YELLOW}[TESTE 1]${NC} Verificando tabelas no Supabase..."
echo "Execute no SQL Editor do Supabase:"
echo ""
echo "SELECT table_name FROM information_schema.tables"
echo "WHERE table_schema = 'public' AND table_name IN ('lojas', 'faturamento_diario', 'pedidos');"
echo ""
echo "Esperado: 3 linhas (lojas, faturamento_diario, pedidos)"
echo ""

# TESTE 2: Verificar colunas
echo -e "${YELLOW}[TESTE 2]${NC} Verificando colunas em 'lojas'..."
echo "Execute no SQL Editor:"
echo ""
echo "SELECT column_name FROM information_schema.columns"
echo "WHERE table_name = 'lojas' AND column_name IN ('faturamento_hoje', 'pedidos_hoje', 'data_ultimo_reset');"
echo ""
echo "Esperado: 3 linhas (faturamento_hoje, pedidos_hoje, data_ultimo_reset)"
echo ""

# TESTE 3: Verificar função
echo -e "${YELLOW}[TESTE 3]${NC} Verificando função resetar_faturamento_diario..."
echo "Execute no SQL Editor:"
echo ""
echo "SELECT * FROM pg_proc WHERE proname = 'resetar_faturamento_diario';"
echo ""
echo "Esperado: 1 linha"
echo ""

# TESTE 4: Verificar VIEW
echo -e "${YELLOW}[TESTE 4]${NC} Verificando VIEW relatorio_faturamento..."
echo "Execute no SQL Editor:"
echo ""
echo "SELECT * FROM public.relatorio_faturamento LIMIT 1;"
echo ""
echo "Esperado: 0 linhas (se não houver dados) ou dados se já houver histórico"
echo ""

# TESTE 5: Teste de inserção
echo -e "${YELLOW}[TESTE 5]${NC} Teste de inserção de pedido..."
echo "Execute no SQL Editor:"
echo ""
echo "INSERT INTO public.pedidos ("
echo "  loja_id, cliente_nome, cliente_whatsapp, cliente_endereco,"
echo "  cliente_bairro, subtotal, taxa_entrega, desconto, total,"
echo "  forma_pagamento, status"
echo ") VALUES ("
echo "  'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',"
echo "  'Cliente Teste',"
echo "  '5586994240872',"
echo "  'Rua Teste, 123',"
echo "  'Bairro Teste',"
echo "  50.00,"
echo "  5.00,"
echo "  0,"
echo "  55.00,"
echo "  'PIX',"
echo "  'novo'"
echo ");"
echo ""
echo "Esperado: 1 linha inserida"
echo ""

# TESTE 6: Verificar atualização automática
echo -e "${YELLOW}[TESTE 6]${NC} Verificar se faturamento_hoje foi atualizado..."
echo "Execute no SQL Editor:"
echo ""
echo "SELECT faturamento_hoje, pedidos_hoje FROM public.lojas"
echo "WHERE id = 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28';"
echo ""
echo "Esperado: faturamento_hoje = 55.00, pedidos_hoje >= 1"
echo ""

# TESTE 7: Teste de reset manual
echo -e "${YELLOW}[TESTE 7]${NC} Teste de reset manual..."
echo "Execute no SQL Editor:"
echo ""
echo "SELECT * FROM public.resetar_faturamento_diario();"
echo ""
echo "Esperado: Retorna linhas indicando quais lojas foram resetadas"
echo ""

# TESTE 8: Verificar histórico após reset
echo -e "${YELLOW}[TESTE 8]${NC} Verificar se valores foram salvos no histórico..."
echo "Execute no SQL Editor:"
echo ""
echo "SELECT * FROM public.faturamento_diario"
echo "WHERE loja_id = 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28'"
echo "ORDER BY data_referencia DESC LIMIT 1;"
echo ""
echo "Esperado: 1 linha com os dados do dia anterior"
echo ""

# TESTE 9: Verificar reset dos valores
echo -e "${YELLOW}[TESTE 9]${NC} Verificar se valores foram resetados..."
echo "Execute no SQL Editor:"
echo ""
echo "SELECT faturamento_hoje, pedidos_hoje FROM public.lojas"
echo "WHERE id = 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28';"
echo ""
echo "Esperado: faturamento_hoje = 0, pedidos_hoje = 0"
echo ""

# TESTE 10: Verificar função RPC
echo -e "${YELLOW}[TESTE 10]${NC} Teste da função RPC (como será chamada pelo cron)..."
echo "Faça uma requisição HTTP:"
echo ""
echo "curl -X POST 'https://SEU-PROJETO.supabase.co/rest/v1/rpc/resetar_faturamento_diario' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer SEU_ANON_KEY' \\"
echo "  -d '{}'"
echo ""
echo "Esperado: Status 200 com array de lojas resetadas"
echo ""

# ==========================================
# CHECKLIST VISUAL
# ==========================================

echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📋 CHECKLIST DE IMPLEMENTAÇÃO${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}\n"

echo "Arquivos criados/modificados:"
echo -e "${GREEN}✓${NC} supabase_daily_reset.sql - Schema SQL"
echo -e "${GREEN}✓${NC} src/lib/faturamentoUtils.ts - Funções auxiliares"
echo -e "${GREEN}✓${NC} src/components/HistoricoFaturamento.tsx - Componente React"
echo -e "${GREEN}✓${NC} src/types.ts - Tipos TypeScript atualizados"
echo -e "${GREEN}✓${NC} SETUP_RESET_DIARIO.md - Documentação"
echo -e "${GREEN}✓${NC} EXEMPLO_INTEGRACAO.tsx - Exemplos de código"
echo ""

echo "Próximos passos:"
echo -e "${YELLOW}[ ]${NC} 1. Executar supabase_daily_reset.sql no Supabase"
echo -e "${YELLOW}[ ]${NC} 2. Executar TESTE 1-6 acima para validar"
echo -e "${YELLOW}[ ]${NC} 3. Configurar cron job para chamar a função"
echo -e "${YELLOW}[ ]${NC} 4. Executar TESTE 7-9 para validar o reset"
echo -e "${YELLOW}[ ]${NC} 5. Integrar HistoricoFaturamento no PainelAdmin"
echo -e "${YELLOW}[ ]${NC} 6. Testar no navegador"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}🚀 COMANDOS ÚTEIS${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}\n"

echo "Ver faturamento atual:"
echo "SELECT id, nome, faturamento_hoje, pedidos_hoje, data_ultimo_reset FROM public.lojas;"
echo ""

echo "Ver histórico completo:"
echo "SELECT * FROM public.relatorio_faturamento ORDER BY data_referencia DESC;"
echo ""

echo "Resetar manualmente:"
echo "SELECT * FROM public.resetar_faturamento_diario();"
echo ""

echo "Limpar histórico (CUIDADO!):"
echo "TRUNCATE TABLE public.faturamento_diario;"
echo ""

echo "Recarregar dados de teste:"
echo "DELETE FROM public.pedidos WHERE 1=1;"
echo "UPDATE public.lojas SET faturamento_hoje = 0, pedidos_hoje = 0;"
echo ""

echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Testes preparados! Execute os comandos acima no Supabase${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}\n"
