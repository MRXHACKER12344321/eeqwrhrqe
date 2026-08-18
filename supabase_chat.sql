-- Criar tabela de chat para admin
CREATE TABLE IF NOT EXISTS public.chat_admin (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  loja_id UUID NOT NULL REFERENCES public.lojas(id) ON DELETE CASCADE,
  remetente VARCHAR(50) NOT NULL, -- 'admin' ou 'staff'
  nome_remetente VARCHAR(255) NOT NULL,
  mensagem TEXT NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'admin', -- 'admin', 'staff', 'sistema'
  criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  lido BOOLEAN DEFAULT FALSE
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_chat_loja_id ON public.chat_admin(loja_id);
CREATE INDEX IF NOT EXISTS idx_chat_criado_em ON public.chat_admin(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_chat_loja_criado ON public.chat_admin(loja_id, criado_em DESC);

-- Row Level Security (RLS)
ALTER TABLE public.chat_admin ENABLE ROW LEVEL SECURITY;

-- Política simples para o chat funcionar com o esquema atual
DROP POLICY IF EXISTS "Admin pode gerenciar chat" ON public.chat_admin;
CREATE POLICY "Admin pode gerenciar chat" ON public.chat_admin
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comentário na tabela
COMMENT ON TABLE public.chat_admin IS 'Tabela para armazenar mensagens de chat entre admin e staff da loja';
