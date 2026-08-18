-- ====================================================================
-- 🏗️ NOVO ESQUEMA GERAL DE BANCO DE DADOS - PEDIFÁCIL DIGITAL (SUPABASE)
-- ====================================================================
-- Execute este script completo no "SQL Editor" do seu painel do Supabase.
-- Ele apagará as tabelas antigas se existirem e criará toda a estrutura 
-- necessária para o Cardápio, Painel do Lojista e Painel Master Admin!

-- 1. LIMPEZA TOTAL DE TABELAS OBSELETAS (Na ordem de dependência reversa)
DROP TABLE IF EXISTS public.pedidos CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.cupons CASCADE;
DROP TABLE IF EXISTS public.taxas_entrega CASCADE;
DROP TABLE IF EXISTS public.produtos CASCADE;
DROP TABLE IF EXISTS public.categorias CASCADE;
DROP TABLE IF EXISTS public.lojas CASCADE;

-- 2. TABELA DE LOJAS (CADASTRADAS ATRAVÉS DO PAINEL MASTER)
CREATE TABLE public.lojas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  -- Identidade básica
  nome TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  slogan TEXT,
  descricao TEXT,
  logo_url TEXT,
  banner_url TEXT,
  banner_promo_url TEXT,
  
  -- Contatos e Localização
  telefone TEXT,
  whatsapp TEXT,
  instagram TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  complemento TEXT,
  referencia TEXT,
  
  -- Mensagens e Visual
  mensagem_topo TEXT,
  mensagem_rodape TEXT,
  cor_primaria TEXT DEFAULT '#FF3D00',
  cor_secundaria TEXT DEFAULT '#111111',
  aberto BOOLEAN DEFAULT true,
  
  -- Configurações de entrega e pedido
  tempo_entrega_min INTEGER DEFAULT 30,
  tempo_entrega_max INTEGER DEFAULT 50,
  taxa_entrega_padrao NUMERIC DEFAULT 5.00,
  pedido_minimo NUMERIC DEFAULT 15.00,
  frete_gratis_acima NUMERIC DEFAULT 50.00,
  
  -- SEÇÃO DE ATRIBUTOS PARA CONTROLE MASTER ADMIN
  owner_name TEXT NOT NULL DEFAULT 'Proprietário',
  owner_email TEXT NOT NULL DEFAULT 'cadastro@pedifacil.com',
  owner_password TEXT NOT NULL DEFAULT '123456',
  nicho TEXT DEFAULT 'hamburgueria',
  plano TEXT DEFAULT 'gratis', -- 'gratis' (Teste 7 dias), 'normal' (Plano Mensal)
  quem_indicou TEXT,
  whatsapp_indicou TEXT,
  quanto_receber_indicacao NUMERIC DEFAULT 0.00,
  
  -- Flags de Status
  pago BOOLEAN DEFAULT true,
  bloqueado BOOLEAN DEFAULT false,
  pausado BOOLEAN DEFAULT false,
  
  -- Datas de Controle
  criado_em TIMESTAMPTZ DEFAULT now() NOT NULL,
  vencimento TIMESTAMPTZ DEFAULT (now() + interval '7 days') NOT NULL
);

-- 3. TABELA DE CATEGORIAS
CREATE TABLE public.categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true
);

-- 4. TABELA DE PRODUTOS
CREATE TABLE public.produtos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC NOT NULL,
  preco_promocional NUMERIC,
  foto_url TEXT,
  disponivel BOOLEAN DEFAULT true,
  destaque BOOLEAN DEFAULT false,
  is_novo BOOLEAN DEFAULT false,
  sku TEXT,
  tempo_preparo INTEGER DEFAULT 15,
  ordem INTEGER DEFAULT 0
);

-- 5. TABELA DE TAXAS POR BAIRRO DE ENTREGA
CREATE TABLE public.taxas_entrega (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  bairro TEXT NOT NULL,
  taxa NUMERIC NOT NULL DEFAULT 0.00,
  tempo_estimado INTEGER DEFAULT 40
);

-- 6. TABELA DE CUPONS DE DESCONTO
CREATE TABLE public.cupons (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  tipo TEXT DEFAULT 'percentual', -- 'percentual' (%) ou 'fixo' (R$)
  valor NUMERIC NOT NULL DEFAULT 0,
  valor_minimo NUMERIC DEFAULT 0,
  quantidade_maxima INTEGER DEFAULT 999,
  quantidade_usada INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  validade TIMESTAMPTZ,
  criado_em TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(loja_id, codigo)
);

-- 7. TABELA DE CLIENTES REGISTRADOS NO CARDÁPIO (PROFILES)
CREATE TABLE public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  nome VARCHAR(255) NOT NULL,
  whatsapp VARCHAR(20) UNIQUE NOT NULL,
  loyalty_points INTEGER DEFAULT 0 NOT NULL,
  CONSTRAINT points_non_negative CHECK (loyalty_points >= 0)
);

-- 8. TABELA DE CÓDIGOS DE VERIFICAÇÃO SMS PARA CADASTRO
CREATE TABLE public.sms_verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  code VARCHAR(10) NOT NULL,
  used BOOLEAN DEFAULT false NOT NULL,
  attempts INTEGER DEFAULT 0 NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  verified_at TIMESTAMPTZ
);

-- 9. TABELA DE PEDIDOS RECEBIDOS NO BANCO
CREATE TABLE public.pedidos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID REFERENCES public.lojas(id) ON DELETE CASCADE,
  numero_pedido SERIAL,
  cliente_nome TEXT,
  cliente_whatsapp TEXT,
  cliente_endereco TEXT,
  cliente_bairro TEXT,
  cliente_complemento TEXT,
  subtotal NUMERIC NOT NULL,
  taxa_entrega NUMERIC DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  total NUMERIC NOT NULL,
  forma_pagamento TEXT,
  troco TEXT,
  observacoes TEXT,
  cupom_usado TEXT,
  status TEXT DEFAULT 'novo', -- 'novo', 'preparando', 'saiu_entrega', 'entregue', 'cancelado'
  itens JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ====================================================================
-- HABILITAR SEGURANÇA (RLS) E POLÍTICAS DE ACESSO PÚBLICO
-- ====================================================================
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.taxas_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_verification_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Criação de políticas gerais públicas simplificadas para evitar bloqueio CORS/REST
CREATE POLICY "Acesso público lojas" ON public.lojas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público produtos" ON public.produtos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público taxas_entrega" ON public.taxas_entrega FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público cupons" ON public.cupons FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público perfis" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público sms_verification_codes" ON public.sms_verification_codes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público pedidos" ON public.pedidos FOR ALL USING (true) WITH CHECK (true);

-- Índices úteis para consultas velozes
CREATE INDEX IF NOT EXISTS idx_lojas_slug ON public.lojas(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp ON public.profiles(whatsapp);
CREATE INDEX IF NOT EXISTS idx_pedidos_whatsapp ON public.pedidos(cliente_whatsapp);
CREATE INDEX IF NOT EXISTS idx_sms_verification_phone ON public.sms_verification_codes(phone);
CREATE INDEX IF NOT EXISTS idx_sms_verification_phone_code ON public.sms_verification_codes(phone, code);

-- ====================================================================
-- 🍔 INSERIR REGISTRO DA LOJA PADRÃO: "BURGER DO GORDO"
-- ====================================================================
INSERT INTO public.lojas (
  id,
  nome,
  slug,
  slogan,
  descricao,
  logo_url,
  banner_url,
  banner_promo_url,
  telefone,
  whatsapp,
  instagram,
  cep,
  rua,
  numero,
  bairro,
  cidade,
  estado,
  complemento,
  referencia,
  mensagem_topo,
  mensagem_rodape,
  cor_primaria,
  cor_secundaria,
  aberto,
  tempo_entrega_min,
  tempo_entrega_max,
  taxa_entrega_padrao,
  pedido_minimo,
  frete_gratis_acima,
  owner_name,
  owner_email,
  owner_password,
  nicho,
  plano,
  pago,
  bloqueado,
  pausado,
  vencimento
) VALUES (
  'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
  'Burger do Gordo',
  'burger-do-gordo',
  'Estúpido de tão suculento! 🍔🔥',
  'Os melhores smash e artesanais de Timon e região. Carnes selecionadas moídas diariamente, pão selado na manteiga e receitas artesanais exclusivas do Gordo.',
  'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
  '86994240872',
  '5586994240872',
  '@burgerdogordo',
  '64290-000',
  'Av. Jaime Rios',
  '170',
  'Parque Piauí',
  'Timon',
  'MA',
  'Próximo à Praça Principal',
  'Em frente ao Banco do Brasil',
  '⚡ COMPRE PELO SITE E EVITE TAXAS EXTORSIVAS DO IFOOD! ENTREGA ACIMA DE R$ 50,00 É GRÁTIS! 🛵',
  '🍔 Feito com amor e muito cheddar pelo PediFácil - Obrigado pela preferência!',
  '#FF3D00',
  '#111111',
  true,
  30,
  50,
  5.00,
  15.00,
  50.00,
  'Mateus Gordo',
  'admin@burgerdogordo.com',
  'gordo123',
  'hamburgueria',
  'normal',
  true,
  false,
  false,
  (now() + interval '30 days')
) ON CONFLICT (id) DO NOTHING;

-- Inserir categorias padrão da loja "Burger do Gordo"
INSERT INTO public.categorias (id, loja_id, nome, ordem, ativo) VALUES
('9a632788-b223-4556-912f-987111111111', 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', '🍔 Burgers Artesanais', 1, true),
('9b632788-b223-4556-912f-987222222222', 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', '⚡ Smash Burgers', 2, true),
('9c632788-b223-4556-912f-987333333333', 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', '🎁 Combos Monstruosos', 3, true),
('9d632788-b223-4556-912f-987444444444', 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', '🍟 Batatas & Porções', 4, true),
('9e632788-b223-4556-912f-987555555555', 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', '🥤 Bebidas Trincando', 5, true)
ON CONFLICT (id) DO NOTHING;

-- Inserir produtos padrão da loja "Burger do Gordo"
INSERT INTO public.produtos (id, loja_id, categoria_id, nome, descricao, preco, preco_promocional, foto_url, disponivel, destaque, is_novo, sku, tempo_preparo, ordem) VALUES
('8a1a1a1a-1111-4111-8111-111111111111', 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', '9a632788-b223-4556-912f-987111111111', 'Gordelícia Artesanal', 'Pão brioche, blend suculento de 180g costela, cheddar derretido, bacon rústico crocante, salada e maionese defumada do Gordo.', 34.90, 29.90, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80', true, true, false, 'BG001', 15, 1),
('8b2b2b2b-2222-4222-8222-222222222222', 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', '9a632788-b223-4556-912f-987111111111', 'Gordo Costela Duplo', 'Pão brioche, 2 blends de costela de 180g (360g de carne), muito cheddar duplo, cebola caramelizada e maionese secreta.', 45.90, NULL, 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=300&q=80', true, true, false, 'BG002', 20, 2),
('8c3c3c3c-3333-4333-8333-333333333333', 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', '9b632788-b223-4556-912f-987222222222', 'Double Smash Cheddar', 'Dois blends smash prensados de 90g (bordas crocantes), muito cheddar escorrendo, picles e maionese de bacon.', 25.90, 22.90, 'https://images.unsplash.com/photo-1547584370-2cc98b8b8dc8?auto=format&fit=crop&w=300&q=80', true, true, false, 'BG005', 10, 3)
ON CONFLICT (id) DO NOTHING;

-- Inserir taxas sugeridas por bairro
INSERT INTO public.taxas_entrega (id, loja_id, bairro, taxa, tempo_estimado) VALUES
('7a1a1a1a-1010-1010-1010-101010101010', 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', 'Centro', 4.00, 30),
('7b2b2b2b-2020-2020-2020-202020202020', 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', 'Parque Piauí', 5.00, 35),
('7c3c3c3c-3030-3030-3030-303030303030', 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', 'São Francisco', 7.00, 45)
ON CONFLICT (id) DO NOTHING;
