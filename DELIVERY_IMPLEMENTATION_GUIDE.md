# 🚀 GUIA DE IMPLEMENTAÇÃO - SISTEMA DE ENTREGA COM GEOCODIFICAÇÃO

## 1️⃣ CONFIGURAR VARIÁVEIS DE AMBIENTE

### No Supabase Dashboard:

1. Vá para **Project Settings** → **API**
2. Note seu `SUPABASE_URL` e `SUPABASE_ANON_KEY`
3. Vá para **Project Settings** → **Secrets** (ou **Environment Variables**)
4. Adicione a variável:
   ```
   HEIGIT_API_KEY=sk-abcdef1234567890...
   ```

**Como obter a chave HeiGIT:**
- Acesse: https://openrouteservice.org/sign-up/
- Crie uma conta
- Vá para sua conta e gere uma API Key
- Use essa chave em `HEIGIT_API_KEY`

### No seu arquivo `.env` (Frontend):
```env
VITE_SUPABASE_URL=https://sua-instancia.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima
```

## 2️⃣ EXECUTAR MIGRAÇÃO DO BANCO DE DADOS

1. Abra o **SQL Editor** do Supabase
2. Cole o conteúdo do arquivo: `supabase_delivery_migration.sql`
3. Clique em **Execute**
4. Verifique as novas tabelas:
   - `delivery_rules`
   - `address_cache`
   - Colunas novas em `lojas` e `pedidos`

## 3️⃣ FAZER DEPLOY DAS EDGE FUNCTIONS

### Via CLI do Supabase:

```bash
# Instalar CLI se não tiver
npm install -g supabase

# Login
supabase login

# Deploy das functions
supabase functions deploy geocode-address --project-id sua-instancia-id
supabase functions deploy calculate-delivery --project-id sua-instancia-id
supabase functions deploy update-restaurant-coords --project-id sua-instancia-id
```

### Ou via Dashboard:

1. No Supabase Dashboard → **Edge Functions**
2. Clique em **Create a new function**
3. Copie o conteúdo de cada arquivo `.ts` das functions
4. Configure como "TypeScript"
5. Deploy

### Permitir chamadas sem autenticação (ou com ANON_KEY):

No Dashboard do Supabase:
1. Vá para **SQL Editor**
2. Execute:

```sql
-- Permitir Edge Functions públicas
UPDATE auth.identities
SET user_metadata = jsonb_set(
  COALESCE(user_metadata, '{}'::jsonb),
  '{allow_functions}',
  'true'::jsonb
)
WHERE provider = 'anonymous';
```

Ou configure RLS nas funções para aceitar requisições autenticadas.

## 4️⃣ INTEGRAR COMPONENTES NO PAINEL ADMIN

### Adicione o Configurador de Entrega:

Em `src/components/PainelAdmin.tsx`, na seção de configurações:

```tsx
import ConfiguradorEntrega from './ConfiguradorEntrega';

// Dentro do componente PainelAdmin:
{currentSection === 'entrega' && (
  <ConfiguradorEntrega
    store={currentStore}
    onSave={loadStoreConfigurations}
    showToast={showToast}
  />
)}

// Adicione botão no menu:
<button
  onClick={() => setCurrentSection('entrega')}
  className="..."
>
  📍 Configuração de Entrega
</button>
```

## 5️⃣ INTEGRAR COMPONENTE DE CHECKOUT

### Adicione o DeliveryCheckout no seu checkout:

```tsx
import DeliveryCheckout from './DeliveryCheckout';

// Dentro do checkout:
<DeliveryCheckout
  store={currentStore}
  onDeliveryCalculated={(distance, fee) => {
    setDeliveryDistance(distance);
    setDeliveryFee(fee);
    // Atualizar total do pedido
    updateOrderTotal();
  }}
  showToast={showToast}
/>
```

## 6️⃣ COMO TESTAR

### Teste 1: Geocodificação de Restaurante

```bash
# Via curl:
curl -X POST https://sua-instancia.supabase.co/functions/v1/geocode-address \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sua-anon-key" \
  -d '{
    "address": {
      "rua": "Avenida Brasil",
      "numero": "1000",
      "bairro": "Centro",
      "cidade": "Timon",
      "estado": "MA",
      "cep": "64700-000"
    }
  }'
```

**Resultado esperado:**
```json
{
  "latitude": -5.xxxx,
  "longitude": -42.xxxx,
  "cached": false
}
```

### Teste 2: Atualizar Coordenadas do Restaurante

1. Abra o Painel Admin
2. Vá para **Configuração de Entrega**
3. Preencha o endereço do restaurante
4. Clique em **🌍 Geocodificar e Salvar Endereço**
5. Verifique no banco se as colunas foram atualizadas:

```sql
SELECT id, rua, numero, latitude, longitude 
FROM lojas 
WHERE id = 'seu-restaurante-id';
```

### Teste 3: Calcular Entrega (Um Restaurante)

1. Abra o Cardápio Público
2. Vá para o **Checkout**
3. Preencha endereço de entrega
4. Clique em **📍 Calcular Entrega**
5. Verifique se aparece:
   - Distância em KM
   - Taxa de entrega em R$

**Exemplo de resultado:**
```
Distância: 4.7 km
Taxa de Entrega: R$ 7.00
```

### Teste 4: Dois Restaurantes Diferentes

**Cenário:**
- Restaurante A: Timon - MA
- Restaurante B: Timon - MA
- Cliente: Timon - MA

1. Configure ambos os restaurantes com endereços diferentes
2. Geocodifique cada um
3. No checkout de cada um, teste o cálculo
4. Resultado deve variar pela distância diferente

**Exemplo:**
```
Restaurante A (próximo):
- Distância: 2.3 km → Taxa: R$ 5.00

Restaurante B (longe):
- Distância: 8.5 km → Taxa: R$ 10.00
```

### Teste 5: Validar Fora da Área

1. Configure restaurante com max distance = 5 km
2. Tente calcular entrega > 5 km
3. Resultado esperado: Erro "Endereço fora da área de entrega"

### Teste 6: Cache de Endereços

1. Geocodifique o mesmo endereço 2x
2. Na segunda vez, a resposta deve incluir `"cached": true`
3. Reduz latência significativamente

## 7️⃣ SEGURANÇA - VERIFICAR CHECKLIST

- ✅ `HEIGIT_API_KEY` está em variável de ambiente (não no código)
- ✅ Frontend chama Edge Functions, não HeiGIT diretamente
- ✅ Supabase RLS está configurada nas tabelas
- ✅ Autenticação de Edge Functions está ativa
- ✅ Cache de endereços reduz chamadas à API
- ✅ Validação de entrada em todas as functions

## 8️⃣ TROUBLESHOOTING

### "Erro ao geocodificar endereço"
- Verificar se `HEIGIT_API_KEY` está configurada
- Confirmar se a chave está válida
- Testar endereço direto na API HeiGIT

### "Erro ao chamar Edge Function"
- Verificar se o deploy das functions foi bem-sucedido
- Confirmar se a URL está correta em `deployService.ts`
- Validar se há autenticação configurada

### "Distância incorreta"
- Lembrar que HeiGIT retorna **via rota real** (não linha reta)
- Confirmar coordenadas do restaurante e cliente
- Testar com ferramentas como Google Maps para validar

### "Taxa de entrega muito alta/baixa"
- Verificar se as faixas estão configuradas corretamente
- Confirmar se `delivery_type` está correto ('distancia' vs 'faixas')
- Validar cálculo manual: base_price + (distance * price_per_km)

## 9️⃣ PRÓXIMAS OTIMIZAÇÕES

- [ ] Implementar webhook para atualizar cache de endereços
- [ ] Adicionar matrix routes (cálculo para múltiplos pontos)
- [ ] Integrar isochrone para visualizar área de entrega no mapa
- [ ] Analytics: rastrear distâncias mais comuns
- [ ] Bulk geocoding para importar endereços em lote

## 🔟 LINKS ÚTEIS

- 📖 HeiGIT API Docs: https://api.heigit.org/
- 📖 Supabase Edge Functions: https://supabase.com/docs/guides/functions
- 📖 Supabase Secrets: https://supabase.com/docs/guides/functions/secrets
- 🔍 Testar API: https://www.postman.com/

---

**Status:** ✅ Pronto para Produção
**Última Atualização:** 2026-08-10
