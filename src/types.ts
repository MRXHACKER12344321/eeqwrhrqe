export interface Store {
  id: string;
  name: string;
  slug: string;
  slogan: string;
  description: string;
  logo_url?: string;
  banner_url?: string;
  banner_promo_url?: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  facebook?: string;
  email?: string;
  cep: string;
  rua: string;
  numero: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
  referencia?: string;
  mensagem_topo?: string;
  mensagem_rodape?: string;
  cor_primaria: string; // Hex color
  cor_secundaria: string; // Hex color
  aberto: boolean;
  tempo_entrega_min: number;
  tempo_entrega_max: number;
  taxa_entrega_padrao: number;
  pedido_minimo: number;
  frete_gratis_acima: number;
  nicho: 'hamburgueria' | 'outro';
  // Coordenadas para cálculo de entrega
  latitude?: number;
  longitude?: number;
  latitude_longitude_atualizado_em?: string;
  // Configurações de entrega
  delivery_enabled?: boolean;
  delivery_type?: 'distancia' | 'faixas'; // Taxa por distância ou por faixa
  delivery_min_distance_km?: number;
  delivery_max_distance_km?: number;
  delivery_base_price?: number;
  delivery_price_per_km?: number;
  // Scheduling rules
  horarios?: {
    [key: string]: { abertura: string; fechamento: string; fechado: boolean }
  };
  // Payment methods
  metodos_pagamento?: {
    pix?: boolean;
    dinheiro?: boolean;
    cartao?: boolean;
    vr?: boolean;
    [key: string]: boolean | undefined;
  };
  // Master Management fields
  nome?: string;
  owner_name?: string;
  owner_email?: string;
  owner_password?: string;
  plano?: 'gratis' | 'normal' | 'indicacao' | string;
  vencimento?: string;
  pago?: boolean;
  bloqueado?: boolean;
  pausado?: boolean;
  quem_indicou?: string | null;
  whatsapp_indicou?: string | null;
  quanto_receber_indicacao?: number;
  // Daily reset fields
  faturamento_hoje?: number;
  pedidos_hoje?: number;
  data_ultimo_reset?: string;
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
  nome?: string;
  ordem: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  store_id: string;
  category_id: string;
  name: string;
  description: string;
  preco: number;
  preco_promocional?: number;
  foto_url?: string;
  disponivel: boolean;
  destaque: boolean;
  is_novo: boolean;
  sku?: string;
  tempo_preparo?: number; // In minutes
  ordem: number;
}

export interface ProductBadge {
  id: string;
  label: string;
  backgroundColor: string;
  textColor: string;
}

export interface ProductOptionItem {
  id: string;
  name: string;
  price: number;
  isFree: boolean;
  order: number;
  available: boolean;
  foto_url?: string;
  description?: string;
}

export interface ProductOptionGroup {
  id: string;
  label: string;
  required: boolean;
  minSelection: number;
  maxSelection: number;
  controlType?: 'radio' | 'counter'; // 'radio' (Bolinha) or 'counter' (Botão +)
  items: ProductOptionItem[];
}

export interface ProductMeta {
  badges: ProductBadge[];
  optionGroups: ProductOptionGroup[];
}

export interface OrderItem {
  id: string;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  observacao?: string;
  personalization?: {
    sao_pao?: string;
    carne_tipo?: string;
    carne_ponto?: string;
    add_bacon?: boolean;
    add_cheddar?: boolean;
    add_ovo?: boolean;
    add_catupiry?: boolean;
    add_hamburguer?: boolean;
    add_cebola_caramelizada?: boolean;
    add_onion_rings?: boolean;
    add_molho_especial?: boolean;
    add_batata_extra?: boolean;
    remove_cebola?: boolean;
    remove_tomate?: boolean;
    remove_alface?: boolean;
    remove_picles?: boolean;
    remove_molho?: boolean;
    remove_queijo?: boolean;
  };
}

export interface Order {
  id: string;
  store_id: string;
  numero_pedido: number;
  cliente_nome: string;
  cliente_whatsapp: string;
  cliente_endereco: string;
  cliente_bairro: string;
  cliente_complemento?: string;
  subtotal: number;
  taxa_entrega: number;
  desconto: number;
  total: number;
  forma_pagamento: 'PIX' | 'Cartão' | 'Dinheiro';
  troco?: string;
  observacoes?: string;
  cupom_codigo?: string;
  status: 'novo' | 'preparando' | 'saiu_entrega' | 'entregue' | 'cancelado';
  criado_em: string;
  itens?: any[];
}

export interface Bairro {
  id: string;
  store_id: string;
  nome: string;
  bairro?: string;
  taxa: number;
  tempo_estimado?: number; // In minutes
}

export interface Cupom {
  id: string;
  store_id: string;
  codigo: string;
  tipo: 'percentual' | 'fixo';
  valor: number;
  validade?: string;
  min_compra?: number;
  max_usos?: number;
  usos: number;
  is_active: boolean;
}

export interface Client {
  id: string;
  store_id: string;
  nome: string;
  whatsapp: string;
  cep?: string;
  rua?: string;
  numero?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  total_pedidos: number;
  total_gasto: number;
  ultimo_pedido_em?: string;
  is_vip: boolean;
  level: 'Bronze' | 'Prata' | 'Ouro';
  observacoes_internas?: string;
  bloqueado: boolean;
}

export interface RecoveryCampaign {
  id: string;
  store_id: string;
  nome: string;
  segmento: string;
  segmento_label: string;
  quantidade_clientes: number;
  clientes_ids: string[];
  oferta_tipo: 'desconto_pct' | 'desconto_fixo' | 'cupom' | 'frete_gratis' | 'produto' | 'promo' | 'nenhuma';
  oferta_valor?: string | number;
  cupom_codigo?: string;
  produto_id?: string;
  produto_nome?: string;
  mensagem_template: string;
  data_criacao: string;
  data_envio?: string;
  agendado_para?: string;
  status: 'rascunho' | 'agendada' | 'enviada' | 'concluida' | 'cancelada';
  mensagens_enviadas: number;
  mensagens_entregues: number;
  respostas: number;
  cliques: number;
  pedidos_gerados: number;
  clientes_recuperados: number;
  valor_recuperado: number;
}

export interface ClientCampaignLog {
  id: string;
  store_id: string;
  campaign_id?: string;
  campaign_name: string;
  client_id: string;
  client_nome: string;
  client_whatsapp: string;
  mensagem: string;
  data_envio: string;
  status: 'enviado' | 'entregue' | 'respondido' | 'recuperado';
}

// ─── TIPOS DE ENTREGA ─────────────────────────────────────────────────────

export interface DeliveryRule {
  id: string;
  loja_id: string;
  min_distance_km: number;
  max_distance_km: number;
  price: number;
  created_at: string;
  updated_at: string;
}

export interface AddressCache {
  id: string;
  address_hash: string;
  full_address: string;
  latitude: number;
  longitude: number;
  source: 'heigit' | 'manual';
  created_at: string;
  last_used_at: string;
}

export interface DeliveryCalculationRequest {
  restaurant_id: string;
  client_latitude: number;
  client_longitude: number;
}

export interface DeliveryCalculationResponse {
  distance_km: number;
  delivery_fee: number;
  status: 'success' | 'out_of_area' | 'error';
  message?: string;
}

export interface GeocodeAddressRequest {
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep?: string;
}

export interface GeocodeAddressResponse {
  latitude: number;
  longitude: number;
  cached: boolean;
}

export interface UpdateRestaurantCoordsRequest {
  restaurant_id: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep?: string;
}

export interface UpdateRestaurantCoordsResponse {
  success: boolean;
  latitude: number;
  longitude: number;
  restaurant: Store;
}
