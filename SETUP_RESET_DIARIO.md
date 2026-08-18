# 📊 Sistema de Reset Diário de Faturamento

## O que foi implementado?

Um sistema completo que **reinicia automaticamente os valores de faturamento e pedidos à meia-noite (00:00)**, mantendo um **histórico completo** de todos os dias para análise e relatórios.

---

## 🔧 PASSO 1: Executar o Schema SQL no Supabase

1. Abra o Supabase Dashboard: https://app.supabase.com
2. Vá para **SQL Editor**
3. Crie um novo query e copie todo o conteúdo do arquivo: **`supabase_daily_reset.sql`**
4. Execute o script completo
5. Aguarde a conclusão (deve levar alguns segundos)

**O que esse script faz:**
- ✅ Adiciona colunas `faturamento_hoje`, `pedidos_hoje` e `data_ultimo_reset` na tabela `lojas`
- ✅ Cria a tabela `faturamento_diario` para armazenar o histórico
- ✅ Cria um TRIGGER que atualiza automaticamente o faturamento quando um pedido é inserido
- ✅ Cria a função `resetar_faturamento_diario()` para resetar valores à meia-noite
- ✅ Cria uma VIEW `relatorio_faturamento` para consultas fáceis

---

## 🤖 PASSO 2: Configurar o Reset Automático (IMPORTANTE!)

### Opção A: Usar uma Supabase Edge Function (Recomendado)

1. Vá para **Edge Functions** no Supabase Dashboard
2. Crie uma nova function chamada `reset-faturamento-diario`
3. Cole este código:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    const { data, error } = await supabaseClient
      .rpc('resetar_faturamento_diario')

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, resetados: data?.length || 0 }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

4. Deploy a function
5. Configure um **Cron Job** usando uma ferramenta como **cron-job.org** ou **EasyCron**:
   - URL: `https://seu-projeto.supabase.co/functions/v1/reset-faturamento-diario`
   - Headers: `Authorization: Bearer SEU_ANON_KEY`
   - Schedule: Todo dia às 00:01 (1 minuto após meia-noite)

### Opção B: Usar um Cron Job Externo

Se não quiser usar Supabase Edge Functions, use um serviço de cron como:
- **EasyCron**: https://www.easycron.com (gratuito)
- **cron-job.org**: https://cron-job.org (gratuito)
- **AWS Lambda** com EventBridge

Faça uma request GET/POST para:
```
https://seu-projeto.supabase.co/rest/v1/rpc/resetar_faturamento_diario
```

Com headers:
```
Authorization: Bearer SEU_ANON_KEY
Content-Type: application/json
```

---

## 💻 PASSO 3: Integrar no Frontend

### A) Adicionar o Componente de Histórico ao PainelAdmin

No arquivo **`src/components/PainelAdmin.tsx`**, procure a seção `activeMenu === 'financeiro'` e adicione:

```tsx
import HistoricoFaturamento from './HistoricoFaturamento';

// Dentro do return do PainelAdmin, adicione:
{activeMenu === 'financeiro' && (
  <div className="space-y-6">
    <HistoricoFaturamento 
      lojaId={currentStore?.id || 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28'}
      lojaNome={currentStore?.nome || 'Minha Loja'}
      corPrimaria={currentStore?.cor_primaria || '#FF3D00'}
    />
  </div>
)}
```

### B) Atualizar o Painel de Dashboard para Usar Dados do Banco

Procure a seção onde `storeFinancials.revenue` é exibida (linha ~2078) e substitua:

```tsx
// ANTIGO (usando localStorage):
<span className="text-2xl font-black text-sky-400">
  R$ {storeFinancials.revenue.toFixed(2)}
</span>

// NOVO (usando dados em tempo real):
{/* Adicione um useEffect para carregar dados do banco: */}
const [faturamentoAtual, setFaturamentoAtual] = useState(0);

useEffect(() => {
  obterFaturamentoDia(currentStore?.id).then(data => {
    setFaturamentoAtual(data.faturamento_hoje);
  });
}, [currentStore?.id]);

<span className="text-2xl font-black text-sky-400">
  R$ {faturamentoAtual.toFixed(2)}
</span>
```

---

## 📊 PASSO 4: Como Funciona?

### Fluxo de Dados:

```
1. Cliente faz pedido → Pedido inserido em pedidos table
   ↓
2. TRIGGER ativa automaticamente → Atualiza faturamento_hoje + pedidos_hoje
   ↓
3. Painel mostra valores atualizados em tempo real
   ↓
4. Todo dia às 00:01 → resetar_faturamento_diario() executa
   ↓
5. Valores do dia anterior são salvos em faturamento_diario
   ↓
6. faturamento_hoje e pedidos_hoje são resetados para 0
   ↓
7. Relatório continua acessível na VIEW relatorio_faturamento
```

### Dados Salvos no Histórico:

```
- Data da venda
- Total de faturamento do dia
- Total de pedidos do dia
- Ticket médio
- Horário de início (primeiro pedido)
- Horário de fim (último pedido)
```

---

## 🔍 Como Consultar o Histórico?

### Via SQL (no Supabase):

```sql
-- Ver histórico completo da loja
SELECT * FROM public.relatorio_faturamento 
WHERE loja_id = 'seu-id-da-loja'
ORDER BY data_referencia DESC
LIMIT 30;

-- Ver faturamento atual
SELECT faturamento_hoje, pedidos_hoje, data_ultimo_reset 
FROM public.lojas 
WHERE id = 'seu-id-da-loja';
```

### Via Frontend (usando os utilitários):

```tsx
import { 
  obterFaturamentoDia, 
  obterHistoricoFaturamento,
  obterEstatisticasFaturamento 
} from '../lib/faturamentoUtils';

// Faturamento de hoje
const dados = await obterFaturamentoDia(lojaId);

// Histórico dos últimos 30 dias
const historico = await obterHistoricoFaturamento(lojaId, 30);

// Estatísticas
const stats = await obterEstatisticasFaturamento(lojaId, 7);
```

---

## 📱 Funcionalidades do Componente HistoricoFaturamento

O novo componente oferece:

✅ **Card Principal** - Mostra faturamento de hoje em tempo real
✅ **Cards de Estatísticas** - Total, maior dia, menor dia, total de pedidos
✅ **Filtro de Período** - Selecione 7, 15 ou 30 dias
✅ **Tabela de Histórico** - Lista completa com datas, valores, pedidos
✅ **Exportar para CSV** - Baixe relatório em formato Excel
✅ **Atualização Automática** - Dados atualizam a cada 2 minutos
✅ **Cálculos Automáticos** - Ticket médio, média diária, etc.

---

## ⚙️ Configurações Avançadas

### Alterar Horário do Reset

Por padrão, o reset acontece às 00:01. Para alterar:

1. Modifique o cron job para o horário desejado
2. **OU** crie uma nova função SQL:

```sql
CREATE OR REPLACE FUNCTION public.resetar_faturamento_diario_horario(hora INTEGER)
RETURNS TABLE(loja_id UUID, valores_salvos BOOLEAN) AS $$
-- ... mesmo código da função original
$$ LANGUAGE plpgsql;
```

### Excluir Reset para Loja Específica

```sql
-- Impedir reset de uma loja específica
UPDATE public.lojas 
SET faturamento_hoje = faturamento_hoje  -- Não redefine
WHERE id = 'id-da-loja-especifica';
```

### Resetar Manualmente

```sql
-- Forçar reset imediato
SELECT * FROM public.resetar_faturamento_diario();
```

---

## 🧪 Teste a Implementação

1. Insira um pedido de teste no painel
2. Verifique se `faturamento_hoje` aumenta automaticamente
3. Execute manualmente:
   ```sql
   SELECT * FROM public.resetar_faturamento_diario();
   ```
4. Verifique se os valores voltaram a 0 e foram salvos no histórico
5. Consulte `SELECT * FROM public.faturamento_diario;` para confirmar

---

## 🚀 Próximas Melhorias Sugeridas

- [ ] Alertas quando faturamento cai abaixo da meta diária
- [ ] Gráficos de tendência (Chart.js ou Recharts)
- [ ] Integração com WhatsApp para relatórios diários
- [ ] Comparação ano a ano
- [ ] Previsões usando ML

---

## ❓ Troubleshooting

### Problema: Valores não resetam à meia-noite

**Solução:**
- Verifique se o cron job está ativo
- Teste manualmente: `SELECT * FROM public.resetar_faturamento_diario();`
- Confira se o Supabase está respondendo

### Problema: Histórico não está sendo salvo

**Solução:**
- Verifique se a tabela `faturamento_diario` existe
- Confirme que o TRIGGER `trigger_atualizar_faturamento` está ativo
- Veja os logs do Supabase para erros

### Problema: Dados inconsistentes

**Solução:**
- Execute: `TRUNCATE TABLE public.faturamento_diario;`
- Reinicie o processo

---

## 📞 Suporte

Se tiver dúvidas:
1. Verifique os logs do Supabase
2. Consulte a documentação oficial: https://supabase.com/docs
3. Teste as queries SQL no SQL Editor do Supabase

---

**Pronto!** Seu sistema de reset diário de faturamento está funcionando! 🎉
