-- ========================================================================
-- SQL para garantir que as lojas do localStorage existem no Supabase
-- Copie e execute no SQL Editor do Supabase
-- ========================================================================

-- Cria ou atualiza a loja "matheus-test"
INSERT INTO public.lojas (
  id, nome, slug, owner_email, owner_password, whatsapp, 
  nicho, plano, pago, bloqueado, pausado, vencimento
) VALUES (
  'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
  'Matheus Test',
  'matheus-test',
  'matheus@test.com',
  'password123',
  '5586999999999',
  'hamburgueria',
  'normal',
  true,
  false,
  false,
  now() + interval '30 days'
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  owner_email = EXCLUDED.owner_email,
  owner_password = EXCLUDED.owner_password,
  whatsapp = EXCLUDED.whatsapp;

-- Cria ou atualiza a loja "burger-do-gordo" (exemplo do mock)
INSERT INTO public.lojas (
  id, nome, slug, slogan, descricao, logo_url, banner_url,
  phone, whatsapp, instagram, cep, rua, numero, bairro, cidade, estado,
  owner_name, owner_email, owner_password, nicho, plano, pago, 
  bloqueado, pausado, vencimento, tempo_entrega_min, tempo_entrega_max,
  taxa_entrega_padrao, pedido_minimo, frete_gratis_acima, aberto
) VALUES (
  'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
  'Burger do Gordo',
  'burger-do-gordo',
  'Estúpido de tão suculento! 🍔🔥',
  'Os melhores smash e artesanais de Timon e região.',
  'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=200&q=80',
  'https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=1200&q=80',
  '86994240872',
  '5586994240872',
  '@burgerdogordo',
  '64290-000',
  'Av. Jaime Rios',
  '170',
  'Parque Piauí',
  'Timon',
  'MA',
  'Mateus Gordo',
  'admin@burgerdogordo.com',
  'gordo',
  'hamburgueria',
  'normal',
  true,
  false,
  false,
  now() + interval '30 days',
  30, 50, 5.0, 15.0, 50.0, true
)
ON CONFLICT (slug) DO UPDATE SET
  nome = EXCLUDED.nome,
  slogan = EXCLUDED.slogan,
  descricao = EXCLUDED.descricao,
  owner_email = EXCLUDED.owner_email,
  owner_password = EXCLUDED.owner_password;

-- Verifica quais lojas foram criadas/atualizadas
SELECT id, nome, slug, owner_email FROM public.lojas 
WHERE slug IN ('matheus-test', 'burger-do-gordo');
