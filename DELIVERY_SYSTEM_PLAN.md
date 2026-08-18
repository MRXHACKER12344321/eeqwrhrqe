# 📍 Plano de Implementação - Sistema de Cálculo de Distância e Taxa de Entrega

## 1. ARQUITETURA GERAL

```
Frontend (Vite+React)
    ↓
Supabase Edge Functions (Node.js protegido)
    ↓
API HeiGIT (com HEIGIT_API_KEY segura)
```

## 2. MODIFICAÇÕES NO BANCO DE DADOS

### A. Tabela `lojas` - Adicionar campos de entrega:
```sql
-- Coordenadas do restaurante
latitude NUMERIC(10,8),
longitude NUMERIC(10,8),
latitude_longitude_atualizado_em TIMESTAMPTZ,

-- Configurações de entrega
delivery_enabled BOOLEAN DEFAULT true,
delivery_type TEXT DEFAULT 'faixas', -- 'distancia' ou 'faixas'
delivery_min_distance_km NUMERIC DEFAULT 0.5,
delivery_max_distance_km NUMERIC DEFAULT 20,
delivery_base_price NUMERIC DEFAULT 5.00,
delivery_price_per_km NUMERIC DEFAULT 2.00,
```

### B. Tabela `delivery_rules` - Faixas de distância:
```sql
CREATE TABLE delivery_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  min_distance_km NUMERIC NOT NULL,
  max_distance_km NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### C. Tabela `address_cache` - Cache de geocodificação:
```sql
CREATE TABLE address_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  address_hash TEXT UNIQUE NOT NULL, -- hash do endereço
  full_address TEXT NOT NULL,
  latitude NUMERIC(10,8) NOT NULL,
  longitude NUMERIC(10,8) NOT NULL,
  source TEXT DEFAULT 'heigit', -- 'heigit' ou 'manual'
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ DEFAULT now()
);
```

## 3. EDGE FUNCTIONS A CRIAR

### A. `/functions/geocode-address.ts`
- Recebe: endereço completo
- Retorna: { latitude, longitude }
- Usa cache se disponível
- Faz geocoding via HeiGIT se necessário
- Protegido com autenticação

### B. `/functions/calculate-delivery.ts`
- Recebe: { restaurant_id, latitude, longitude }
- Retorna: { distance_km, delivery_fee, status }
- Calcula rota via HeiGIT Directions V2
- Aplica regra de taxa (distância ou faixas)
- Valida área de entrega

### C. `/functions/update-restaurant-coords.ts`
- Recebe: { restaurant_id, address }
- Geocodifica endereço do restaurante
- Atualiza lojas com latitude/longitude
- Retorna coordenadas salvas

## 4. COMPONENTES FRONTEND A CRIAR

### A. `ConfiguradorEntrega.tsx`
- Formulário com endereço do restaurante
- Botão "Geocodificar e Salvar"
- Tipo de taxa (distância vs faixas)
- Faixas de distância personalizadas

### B. `CheckoutComEntrega.tsx`
- Campos de endereço de entrega
- Botão "Calcular Entrega"
- Exibe: distância + taxa de entrega
- Integra ao total do pedido

## 5. VARIÁVEIS DE AMBIENTE

```
HEIGIT_API_KEY=sua_chave_secreta_aqui
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
```

## 6. FLUXO COMPLETO

### Cadastro de Restaurante (Admin):
1. Preench endereço no painel
2. Sistema geocodifica automaticamente
3. Salva lat/long no banco
4. Define tipo de taxa (distância ou faixas)
5. Configura faixas de entrega

### Cliente fazendo pedido:
1. Informa endereço de entrega
2. Clica "Calcular Entrega"
3. Frontend chama Edge Function
4. Sistema verifica cache de endereço
5. Se não estiver em cache, geocodifica
6. Calcula rota entre restaurante e cliente
7. Determina distância e taxa
8. Exibe resultado
9. Cliente continua checkout normalmente

## 7. SEGURANÇA

✅ API Key fica em variável de ambiente (Edge Functions)
✅ Frontend nunca acessa HeiGIT diretamente
✅ Todas as chamadas passam pelo Supabase (autenticado)
✅ Cache reduz chamadas desnecessárias
✅ Validação de áreas de entrega

## 8. PERFORMANCE

✅ Cache de coordenadas evita geocoding repetido
✅ Calcula rota apenas ao confirmar endereço
✅ RLS (Row Level Security) no Supabase protege dados
✅ Edge Functions executam proche ao backend (latência baixa)

