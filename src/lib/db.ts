import { Store, Category, Product, Order, Bairro, Cupom, Client } from '../types';
import { supabase } from './supabaseClient';
import { loadProductMeta } from './productMeta';

const normalizeSlug = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')

// Let's create an elegant, fully localized and highly visual initial mockup dataset
const INITIAL_MOCK_STORES: Store[] = [
  {
    id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    name: 'Burger do Gordo',
    slug: 'burger-do-gordo',
    slogan: 'Estúpido de tão suculento! 🍔🔥',
    description: 'Os melhores smash e artesanais de Timon e região. Carnes selecionadas moídas diariamente, pão selado na manteiga e receitas artesanais exclusivas do Gordo.',
    logo_url: 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?auto=format&fit=crop&w=200&q=80',
    banner_url: 'https://images.unsplash.com/photo-1586816001966-79b736744398?auto=format&fit=crop&w=1200&q=80',
    banner_promo_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=600&q=80',
    phone: '86994240872',
    whatsapp: '5586994240872',
    instagram: '@burgerdogordo',
    cep: '64290-000',
    rua: 'Av. Jaime Rios',
    numero: '170',
    bairro: 'Parque Piauí',
    cidade: 'Timon',
    estado: 'MA',
    complemento: 'Próximo à Praça Principal',
    referencia: 'Em frente ao Banco do Brasil',
    mensagem_topo: '⚡ COMPRE PELO SITE E EVITE TAXAS EXTORSIVAS DO IFOOD! ENTREGA ACIMA DE R$ 50,00 É GRÁTIS! 🛵',
    mensagem_rodape: '🍔 Feito com amor e muito cheddar pelo PediFácil - Obrigado pela preferência!',
    cor_primaria: '#FF3D00', // Crimson / Orange Red
    cor_secundaria: '#111111', // Matte Black
    aberto: true,
    tempo_entrega_min: 30,
    tempo_entrega_max: 50,
    taxa_entrega_padrao: 5.0,
    pedido_minimo: 15.0,
    frete_gratis_acima: 50.0,
    nicho: 'hamburgueria',
    horarios: {
      seg: { abertura: '18:00', fechamento: '23:59', fechado: false },
      ter: { abertura: '18:00', fechamento: '23:59', fechado: true }, // closed on Tuesday
      qua: { abertura: '18:00', fechamento: '23:59', fechado: false },
      qui: { abertura: '18:00', fechamento: '23:59', fechado: false },
      sex: { abertura: '18:00', fechamento: '23:59', fechado: false },
      sab: { abertura: '18:00', fechamento: '23:59', fechado: false },
      dom: { abertura: '18:00', fechamento: '23:59', fechado: false },
    },
    nome: 'Burger do Gordo',
    owner_name: 'Mateus Gordo',
    owner_email: 'admin@burgerdogordo.com',
    owner_password: 'gordo',
    plano: 'normal',
    pago: true,
    bloqueado: false,
    pausado: false,
    vencimento: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const INITIAL_MOCK_CATEGORIES: Category[] = [
  // Categories for Burger do Gordo
  { id: 'cat-hamb-1', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', name: '🍔 Burgers Artesanais', ordem: 1, is_active: true },
  { id: 'cat-hamb-2', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', name: '⚡ Smash Burgers', ordem: 2, is_active: true },
  { id: 'cat-hamb-3', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', name: '🎁 Combos Monstruosos', ordem: 3, is_active: true },
  { id: 'cat-hamb-4', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', name: '🍟 Batatas & Porções', ordem: 4, is_active: true },
  { id: 'cat-hamb-5', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', name: '🥤 Bebidas Trincando', ordem: 5, is_active: true },
  { id: 'cat-hamb-6', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', name: '🍰 Doces e Sobremesas', ordem: 6, is_active: true }
];

const INITIAL_MOCK_PRODUCTS: Product[] = [
  // Products for Burger do Gordo
  {
    id: 'prod-h-1',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    category_id: 'cat-hamb-1',
    name: 'Gordelícia Artesanal',
    description: 'Experimente nosso campeão de vendas! Pão brioche selado na manteiga, blend suculento de 180g de costela angus, queijo cheddar derretido, bacon rústico crocante, alface americana, tomate fresco e a maionese artesanal defumada secreta do Gordo.',
    preco: 34.90,
    preco_promocional: 29.90,
    foto_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=300&q=80',
    disponivel: true,
    destaque: true,
    is_novo: false,
    sku: 'BG001',
    tempo_preparo: 15,
    ordem: 1
  },
  {
    id: 'prod-h-2',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    category_id: 'cat-hamb-1',
    name: 'Gordo Costela Duplo',
    description: 'Para fomes brutais! Pão brioche, 2x blends de costela de 180g (360g de pura suculência), muito queijo cheddar duplo, cebola caramelizada artesanal e a maionese secreta do Gordo.',
    preco: 45.90,
    foto_url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=300&q=80',
    disponivel: true,
    destaque: true,
    is_novo: false,
    sku: 'BG002',
    tempo_preparo: 20,
    ordem: 2
  },
  {
    id: 'prod-h-3',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    category_id: 'cat-hamb-1',
    name: 'Frango Crispy Gold',
    description: 'Pão brioche selado, peito de frango super empanado de 150g extremamente crocante por fora e suculento por dentro, queijo prato, cebola roxa marinada, picles artesanal e molho de mostarda e mel.',
    preco: 28.90,
    preco_promocional: 24.90,
    foto_url: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=300&q=80',
    disponivel: true,
    destaque: false,
    is_novo: true,
    sku: 'BG003',
    tempo_preparo: 15,
    ordem: 3
  },
  {
    id: 'prod-h-4',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    category_id: 'cat-hamb-2',
    name: 'Smash Bacon Salad',
    description: 'Pão smash prensado, blend prensado de 90g com crostinha de reação de Maillard, queijo cheddar extremamente derretido, bacon picadinho crocante, alface, tomate e maionese defumada.',
    preco: 19.90,
    foto_url: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=300&q=80',
    disponivel: true,
    destaque: false,
    is_novo: false,
    sku: 'BG004',
    tempo_preparo: 10,
    ordem: 1
  },
  {
    id: 'prod-h-5',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    category_id: 'cat-hamb-2',
    name: 'Double Smash Cheddar',
    description: 'Dois blends smash prensados de 90g de costela angus (borda crocante), muito cheddar cremoso escorrendo, picles artesanal e maionese defumada da casa.',
    preco: 25.90,
    preco_promocional: 22.90,
    foto_url: 'https://images.unsplash.com/photo-1547584370-2cc98b8b8dc8?auto=format&fit=crop&w=300&q=80',
    disponivel: true,
    destaque: true,
    is_novo: false,
    sku: 'BG005',
    tempo_preparo: 10,
    ordem: 2
  },
  {
    id: 'prod-h-6',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    category_id: 'cat-hamb-3',
    name: 'Combo Casal do Gordo',
    description: 'Comemore com quem você ama! Leve 2x Gordelícias Artesanais + 1x Batata Frita Grande com cheddar e bacon + 1x Refrigerante de 1.5L geladinho.',
    preco: 89.90,
    preco_promocional: 74.90,
    foto_url: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?auto=format&fit=crop&w=300&q=80',
    disponivel: true,
    destaque: true,
    is_novo: false,
    sku: 'BG301',
    tempo_preparo: 25,
    ordem: 1
  },
  {
    id: 'prod-h-7',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    category_id: 'cat-hamb-4',
    name: 'Batata Rústica com Alecrim',
    description: 'Generosa porção de batatas selecionadas fritas com casca, temperadas com alecrim fresco e sal grosso rústico. Acompanha molho de maionese caseira de alho.',
    preco: 18.90,
    foto_url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=300&q=80',
    disponivel: true,
    destaque: false,
    is_novo: false,
    sku: 'BG401',
    tempo_preparo: 12,
    ordem: 1
  },
  {
    id: 'prod-h-8',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    category_id: 'cat-hamb-4',
    name: 'Onion Rings Crocantes G',
    description: 'Anéis de cebola gigantes empanados em farinha panko super crocantes e dourados. Acompanha molho barbecue artesanal da casa.',
    preco: 16.90,
    foto_url: 'https://images.unsplash.com/photo-1639024471283-2bc7b3c6a267?auto=format&fit=crop&w=300&q=80',
    disponivel: false, // ESGOTADO para testar o status!
    destaque: false,
    is_novo: false,
    sku: 'BG402',
    tempo_preparo: 10,
    ordem: 2
  },
  {
    id: 'prod-h-9',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    category_id: 'cat-hamb-5',
    name: 'Coca-Cola Trincando Lata',
    description: 'Lata de 350ml trincando de gelada para acompanhar seu hambúrguer monstruoso.',
    preco: 6.00,
    foto_url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=300&q=80',
    disponivel: true,
    destaque: false,
    is_novo: false,
    sku: 'BG501',
    tempo_preparo: 2,
    ordem: 1
  },
  {
    id: 'prod-h-10',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    category_id: 'cat-hamb-6',
    name: 'Brownie Caseiro de Chocolate',
    description: 'Delicioso pedaço de brownie de chocolate meio amargo, úmido por dentro e com casquinha crocante, recheado com nozes.',
    preco: 12.00,
    foto_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=300&q=80',
    disponivel: true,
    destaque: false,
    is_novo: false,
    sku: 'BG601',
    tempo_preparo: 5,
    ordem: 1
  }
];

const INITIAL_MOCK_BAIRROS: Bairro[] = [
  { id: 'b-1', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', nome: 'Centro', taxa: 5.0, tempo_estimado: 35 },
  { id: 'b-2', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', nome: 'Parque Piauí', taxa: 3.50, tempo_estimado: 30 },
  { id: 'b-3', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', nome: 'Lourival Parente', taxa: 6.0, tempo_estimado: 40 },
  { id: 'b-4', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', nome: 'Cidade Nova', taxa: 7.0, tempo_estimado: 45 },
  { id: 'b-5', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', nome: 'Zona Sul', taxa: 8.0, tempo_estimado: 50 },
  { id: 'b-6', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', nome: 'São Francisco', taxa: 7.50, tempo_estimado: 45 }
];

const INITIAL_MOCK_CUPONS: Cupom[] = [
  { id: 'cup-1', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', codigo: 'PRIMEIRACOMPRA', tipo: 'percentual', valor: 10, min_compra: 30.0, max_usos: 200, usos: 14, is_active: true },
  { id: 'cup-2', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', codigo: 'BURGER10', tipo: 'fixo', valor: 5.0, min_compra: 40.0, max_usos: 100, usos: 5, is_active: true },
  { id: 'cup-3', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', codigo: 'FRETECOMPLETO', tipo: 'fixo', valor: 5.0, min_compra: 35.0, max_usos: 50, usos: 3, is_active: true }
];

const INITIAL_MOCK_CLIENTS: Client[] = [
  { id: 'cli-1', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', nome: 'Mateus Bezerra', whatsapp: '5586994240872', rua: 'Rua Professor Diniz', numero: '1481', bairro: 'Lourival Parente', cidade: 'Teresina', estado: 'PI', cep: '64016-150', total_pedidos: 12, total_gasto: 358.50, ultimo_pedido_em: '2026-06-01T19:30:00.000Z', is_vip: true, level: 'Ouro', bloqueado: false, observacoes_internas: 'Gosta de pão brioche bem torradinho.' },
  { id: 'cli-2', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', nome: 'Ana Carolina', whatsapp: '5586988223344', rua: 'Av Jaime Rios', numero: '1025', bairro: 'Centro', cidade: 'Timon', estado: 'MA', cep: '64290-000', total_pedidos: 6, total_gasto: 182.90, ultimo_pedido_em: '2026-06-12T20:15:00.000Z', is_vip: false, level: 'Bronze', bloqueado: false },
  { id: 'cli-3', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', nome: 'Carlos Alberto', whatsapp: '5586994556677', rua: 'Rua São Francisco', numero: '404', bairro: 'São Francisco', cidade: 'Timon', estado: 'MA', cep: '64290-000', total_pedidos: 3, total_gasto: 89.90, ultimo_pedido_em: '2026-06-10T21:00:00.000Z', is_vip: false, level: 'Bronze', bloqueado: false },
  { id: 'cli-4', store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28', nome: 'Ricardo Sousa', whatsapp: '5586981112233', rua: 'Av. Jaime Rios', numero: '42', bairro: 'Centro', cidade: 'Timon', estado: 'MA', cep: '64290-000', total_pedidos: 2, total_gasto: 49.80, ultimo_pedido_em: '2026-02-14T21:40:00.000Z', is_vip: false, level: 'Bronze', bloqueado: false, observacoes_internas: 'Não responde lembrete de faturas' }
];

const INITIAL_MOCK_ORDERS: Order[] = [
  {
    id: 'ord-f01',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    numero_pedido: 1052,
    cliente_nome: 'Mateus Bezerra',
    cliente_whatsapp: '5586994240872',
    cliente_endereco: 'Professor Diniz, 1481',
    cliente_bairro: 'Lourival Parente',
    itens: [
      { id: 'prod-h-1', name: 'Gordelícia Artesanal', quantity: 2, price: 29.90 },
      { id: 'prod-h-9', name: 'Coca-Cola Trincando Lata', quantity: 2, price: 6.00 }
    ],
    subtotal: 71.80,
    taxa_entrega: 6.0,
    desconto: 5.0,
    total: 72.80,
    forma_pagamento: 'PIX',
    observacoes: 'Pão extremamente selado na chapa.',
    status: 'entregue',
    criado_em: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
  },
  {
    id: 'ord-f02',
    store_id: 'd2e951a5-f6a5-4d50-b6b1-28f1dc19dc28',
    numero_pedido: 1053,
    cliente_nome: 'Ana Carolina',
    cliente_whatsapp: '5586988223344',
    cliente_endereco: 'Av Jaime Rios, 1025',
    cliente_bairro: 'Centro',
    itens: [
      { id: 'prod-h-2', name: 'Gordo Costela Duplo', quantity: 1, price: 45.90 }
    ],
    subtotal: 45.90,
    taxa_entrega: 5.0,
    desconto: 0.0,
    total: 50.90,
    forma_pagamento: 'Dinheiro',
    troco: 'Troco para R$ 100',
    status: 'preparando',
    criado_em: new Date(Date.now() - 45 * 60 * 1000).toISOString() // 45 mins ago
  }
];

// Helper to safely read from localStorage
const getLocal = <T>(key: string, fallback: T): T => {
  try {
    const val = localStorage.getItem(`pedifacil_db_${key}`);
    return val ? JSON.parse(val) : fallback;
  } catch (err) {
    return fallback;
  }
};

// Helper to safely write to localStorage
const setLocal = <T>(key: string, data: T): void => {
  try {
    localStorage.setItem(`pedifacil_db_${key}`, JSON.stringify(data));
  } catch (err) {
    console.error(`Error saving pedifacil_db_${key}`, err);
  }
};

/**
 * Robust bridge to Supabase endpoints with localStorage fallback
 */
export const db = {
  // Reset memory to clean default state for illustration/backup
  initializeLocalBackup(force = false): void {
    if (force || !localStorage.getItem('pedifacil_db_stores')) {
      setLocal('stores', INITIAL_MOCK_STORES);
      setLocal('categories', INITIAL_MOCK_CATEGORIES);
      setLocal('products', INITIAL_MOCK_PRODUCTS);
      setLocal('bairros', INITIAL_MOCK_BAIRROS);
      setLocal('cupons', INITIAL_MOCK_CUPONS);
      setLocal('orders', INITIAL_MOCK_ORDERS);
      setLocal('clients', INITIAL_MOCK_CLIENTS);
    }
  },

  // STORES
  async getStores(): Promise<Store[]> {
    try {
      const { data } = await supabase
        .from('lojas')
        .select('*');
      if (data && data.length > 0) {
        return data as any[];
      }
    } catch {}
    this.initializeLocalBackup();
    return getLocal<Store[]>('stores', INITIAL_MOCK_STORES);
  },

  async getStoreBySlug(slug: string): Promise<Store | null> {
    const normalizedSlug = normalizeSlug(String(slug || ''));
    if (!normalizedSlug) return null;

    // 1. Try exact slug match in Supabase
    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('*')
        .eq('slug', normalizedSlug)
        .maybeSingle();
      if (data) {
        return this.mapStoreFromSupabase(data);
      }
    } catch {}

    // 2. Try fuzzy search by name in Supabase (fetch all lojas and search locally)
    try {
      const { data: allStores } = await supabase
        .from('lojas')
        .select('*');
      if (allStores && allStores.length > 0) {
        const fuzzyMatch = allStores.find((s: any) => {
          const nameCandidate = normalizeSlug(String(s.nome || s.name || ''));
          return nameCandidate === normalizedSlug;
        });
        if (fuzzyMatch) {
          return this.mapStoreFromSupabase(fuzzyMatch);
        }
      }
    } catch {}

    // 3. Try localStorage fallback
    const localStores = getLocal<Store[]>('stores', INITIAL_MOCK_STORES);
    const matched = localStores.find((s) => {
      const slugCandidate = normalizeSlug(String(s.slug || ''));
      const nameCandidate = normalizeSlug(String((s.nome || s.name || '')));
      return slugCandidate === normalizedSlug || nameCandidate === normalizedSlug;
    });

    if (matched) return matched;

    this.initializeLocalBackup();
    const stores = getLocal<Store[]>('stores', INITIAL_MOCK_STORES);
    return stores.find((s) => normalizeSlug(String(s.slug || '')) === normalizedSlug) || null;
  },

  mapStoreFromSupabase(data: any): Store {
    return {
      id: data.id,
      name: data.nome,
      slug: data.slug,
      slogan: data.slogan,
      description: data.descricao || data.description || data.slogan || '',
      logo_url: data.logo_url,
      banner_url: data.banner_url,
      banner_promo_url: data.banner_promo_url,
      phone: data.telefone,
      whatsapp: data.whatsapp,
      instagram: data.instagram,
      cep: data.cep,
      rua: data.rua,
      numero: data.numero,
      bairro: data.bairro,
      cidade: data.cidade,
      estado: data.estado,
      complemento: data.complemento,
      referencia: data.referencia,
      mensagem_topo: data.mensagem_topo,
      mensagem_rodape: data.mensagem_rodape,
      cor_primaria: data.cor_primaria,
      cor_secundaria: data.cor_secundaria,
      aberto: data.aberto,
      tempo_entrega_min: data.tempo_entrega_min,
      tempo_entrega_max: data.tempo_entrega_max,
      taxa_entrega_padrao: Number(data.taxa_entrega_padrao || 0),
      pedido_minimo: Number(data.pedido_minimo || 0),
      frete_gratis_acima: Number(data.frete_gratis_acima || 0),
      nicho: data.nicho,
      vencimento: data.vencimento,
      pausado: data.pausado === true,
      bloqueado: data.bloqueado === true,
      pago: data.pago !== false,
      owner_name: data.owner_name,
      horarios: data.horarios || {
        seg: { abertura: '18:00', fechamento: '23:59', fechado: false },
        ter: { abertura: '18:00', fechamento: '23:59', fechado: false },
        qua: { abertura: '18:00', fechamento: '23:59', fechado: false },
        qui: { abertura: '18:00', fechamento: '23:59', fechado: false },
        sex: { abertura: '18:00', fechamento: '23:59', fechado: false },
        sab: { abertura: '18:00', fechamento: '23:59', fechado: false },
        dom: { abertura: '18:00', fechamento: '23:59', fechado: false }
      },
      metodos_pagamento: data.metodos_pagamento || {
        pix: true,
        dinheiro: true,
        cartao: true,
        vr: false
      }
    } as any;
  },

  async saveStore(store: Store): Promise<Store> {
    this.updateLocalStore(store);
    return store;
  },

  updateLocalStore(store: Store): void {
    this.initializeLocalBackup();
    const stores = getLocal<Store[]>('stores', INITIAL_MOCK_STORES);
    const index = stores.findIndex(s => s.id === store.id);
    if (index >= 0) stores[index] = store;
    else stores.push(store);
    setLocal('stores', stores);
  },

  async syncLocalDataToCloud(storeId: string): Promise<void> {
    if (!storeId) return;
    try {
      // 1. Sync Categories from local storage to Supabase
      const customLocalCatsRaw = localStorage.getItem(`pedifacil_local_categories_${storeId}`);
      let allLocalCats: any[] = [];
      if (customLocalCatsRaw) {
        try { allLocalCats = JSON.parse(customLocalCatsRaw); } catch {}
      }
      if (allLocalCats.length === 0) {
        const globalCats = getLocal<Category[]>('categories', INITIAL_MOCK_CATEGORIES);
        allLocalCats = globalCats.filter(c => c.store_id === storeId);
      }

      if (allLocalCats.length > 0) {
        const catPayloads = allLocalCats.map((c, idx) => ({
          id: c.id,
          loja_id: storeId,
          nome: c.nome || c.name || 'Categoria',
          ordem: c.ordem || idx + 1,
          ativo: c.ativo !== false && c.is_active !== false
        }));
        await supabase.from('categorias').upsert(catPayloads, { onConflict: 'id' });
      }

      // 2. Sync Products from local storage to Supabase
      const customLocalProdsRaw = localStorage.getItem(`pedifacil_local_products_${storeId}`);
      let allLocalProds: any[] = [];
      if (customLocalProdsRaw) {
        try { allLocalProds = JSON.parse(customLocalProdsRaw); } catch {}
      }
      if (allLocalProds.length === 0) {
        const globalProds = getLocal<Product[]>('products', INITIAL_MOCK_PRODUCTS);
        allLocalProds = globalProds.filter(p => p.store_id === storeId);
      }

      if (allLocalProds.length > 0) {
        const prodPayloads = allLocalProds.map((p, idx) => {
          let skuVal = p.sku;
          if (!skuVal) {
            const meta = loadProductMeta(p.id);
            if (meta && (meta.optionGroups?.length || meta.badges?.length)) {
              skuVal = JSON.stringify(meta);
            }
          }

          const payload: any = {
            id: p.id,
            loja_id: storeId,
            categoria_id: p.categoria_id || p.category_id,
            nome: p.nome || p.name || 'Produto',
            descricao: p.descricao || p.description || '',
            preco: Number(p.preco || 0),
            preco_promocional: p.preco_promocional ? Number(p.preco_promocional) : null,
            foto_url: p.foto_url || null,
            disponivel: p.disponivel !== false,
            destaque: p.destaque === true,
            is_novo: p.is_novo === true,
            tempo_preparo: p.tempo_preparo || 15,
            ordem: p.ordem || idx + 1
          };
          // Only include sku if we have valid metadata so we NEVER clear server-side adicionais
          if (skuVal) payload.sku = skuVal;
          return payload;
        });
        await supabase.from('produtos').upsert(prodPayloads, { onConflict: 'id' });
      }
    } catch (err) {
      console.warn('Sincronia local -> nuvem falhou:', err);
    }
  },

  // CATEGORIES
  async getCategories(storeId: string): Promise<Category[]> {
    try {
      const { data } = await supabase
        .from('categorias')
        .select('*')
        .eq('loja_id', storeId)
        .order('ordem', { ascending: true });
      if (data && data.length > 0) {
        return data.map(c => ({
          id: c.id,
          store_id: c.loja_id,
          name: c.nome,
          ordem: c.ordem,
          is_active: c.ativo
        }));
      }
    } catch {}

    // Trigger background sync of local backup data to cloud
    await this.syncLocalDataToCloud(storeId);

    this.initializeLocalBackup();
    const cats = getLocal<Category[]>('categories', INITIAL_MOCK_CATEGORIES);
    return cats.filter(c => c.store_id === storeId).sort((a, b) => a.ordem - b.ordem);
  },

  async saveCategory(category: Category): Promise<Category> {
    this.updateLocalCategory(category);
    try {
      await supabase.from('categorias').upsert({
        id: category.id,
        loja_id: category.store_id,
        nome: category.name,
        ordem: category.ordem || 0,
        ativo: category.is_active !== false
      });
    } catch (err) {
      console.error('Erro ao salvar categoria no Supabase:', err);
    }
    return category;
  },

  async deleteCategory(id: string): Promise<boolean> {
    this.deleteLocalCategory(id);
    try {
      await supabase.from('categorias').delete().eq('id', id);
    } catch (err) {
      console.error('Erro ao deletar categoria no Supabase:', err);
    }
    return true;
  },

  updateLocalCategory(cat: Category): void {
    const cats = getLocal<Category[]>('categories', INITIAL_MOCK_CATEGORIES);
    const idx = cats.findIndex(c => c.id === cat.id);
    if (idx >= 0) cats[idx] = cat;
    else cats.push(cat);
    setLocal('categories', cats);
  },

  deleteLocalCategory(id: string): void {
    const cats = getLocal<Category[]>('categories', INITIAL_MOCK_CATEGORIES);
    const filtered = cats.filter(c => c.id !== id);
    setLocal('categories', filtered);
  },

  // PRODUCTS
  async getProducts(storeId: string): Promise<Product[]> {
    let cloudProds: Product[] = [];
    try {
      const { data } = await supabase
        .from('produtos')
        .select('*')
        .eq('loja_id', storeId)
        .order('ordem', { ascending: true });
      if (data && data.length > 0) {
        cloudProds = data.map(p => {
          if (p.sku && p.sku.trim().startsWith('{')) {
            try {
              const metaObj = JSON.parse(p.sku);
              if (metaObj && (metaObj.optionGroups || metaObj.badges)) {
                localStorage.setItem(`pedifacil_product_meta_${p.id}`, p.sku);
              }
            } catch (e) {}
          }
          return {
            id: p.id,
            store_id: p.loja_id,
            category_id: p.categoria_id || p.category_id,
            name: p.nome || p.name,
            description: p.descricao || p.description,
            preco: Number(p.preco),
            preco_promocional: p.preco_promocional ? Number(p.preco_promocional) : undefined,
            foto_url: p.foto_url,
            disponivel: p.disponivel !== false,
            destaque: p.destaque === true,
            is_novo: p.is_novo === true,
            sku: p.sku,
            tempo_preparo: p.tempo_preparo,
            ordem: p.ordem || 0
          };
        });
      }
    } catch {}

    // Combine with local fallback storage (pedifacil_local_products_STOREID)
    try {
      const localRaw = localStorage.getItem(`pedifacil_local_products_${storeId}`);
      if (localRaw) {
        const localList: any[] = JSON.parse(localRaw);
        localList.forEach(lp => {
          const pid = lp.id;
          const cloudSku = cloudProds.find(cp => cp.id === pid)?.sku || '';
          const mappedItem: Product = {
            id: pid,
            store_id: storeId,
            category_id: lp.categoria_id || lp.category_id,
            name: lp.nome || lp.name || '',
            description: lp.descricao || lp.description || '',
            preco: Number(lp.preco || 0),
            preco_promocional: lp.preco_promocional ? Number(lp.preco_promocional) : undefined,
            foto_url: lp.foto_url,
            disponivel: lp.disponivel !== false,
            destaque: lp.destaque === true,
            is_novo: lp.is_novo === true,
            sku: lp.sku && String(lp.sku).trim() !== '' ? lp.sku : cloudSku,
            tempo_preparo: lp.tempo_preparo || 15,
            ordem: lp.ordem || 0
          };
          const existingIdx = cloudProds.findIndex(cp => cp.id === pid);
          if (existingIdx >= 0) {
            cloudProds[existingIdx] = mappedItem;
          } else {
            cloudProds.push(mappedItem);
          }
        });
      }
    } catch {}

    if (cloudProds.length > 0) {
      // Background push of combined prods to cloud to keep Supabase updated
      this.syncLocalDataToCloud(storeId).catch(() => {});
      return cloudProds.sort((a, b) => a.ordem - b.ordem);
    }

    this.initializeLocalBackup();
    const prods = getLocal<Product[]>('products', INITIAL_MOCK_PRODUCTS);
    return prods.filter(p => p.store_id === storeId).sort((a, b) => a.ordem - b.ordem);
  },

  async saveProduct(product: Product): Promise<Product> {
    this.updateLocalProduct(product);
    try {
      let skuVal = product.sku;
      if (!skuVal) {
        const meta = loadProductMeta(product.id);
        if (meta && (meta.optionGroups?.length || meta.badges?.length)) {
          skuVal = JSON.stringify(meta);
        }
      }

      const dbPayload: any = {
        id: product.id,
        loja_id: product.store_id,
        categoria_id: product.category_id,
        nome: product.name,
        descricao: product.description,
        preco: product.preco,
        preco_promocional: product.preco_promocional || null,
        foto_url: product.foto_url || null,
        disponivel: product.disponivel !== false,
        destaque: product.destaque === true,
        is_novo: product.is_novo === true,
        tempo_preparo: product.tempo_preparo || 15,
        ordem: product.ordem || 0
      };

      // Only attach sku if valid, so we never overwrite with null
      if (skuVal) {
        dbPayload.sku = skuVal;
      }

      await supabase.from('produtos').upsert(dbPayload, { onConflict: 'id' });
    } catch (err) {
      console.error('Erro ao salvar produto no Supabase:', err);
    }
    return product;
  },

  async deleteProduct(id: string): Promise<boolean> {
    this.deleteLocalProduct(id);
    try {
      await supabase.from('produtos').delete().eq('id', id);
    } catch (err) {
      console.error('Erro ao excluir produto no Supabase:', err);
    }
    return true;
  },

  updateLocalProduct(prod: Product): void {
    const prods = getLocal<Product[]>('products', INITIAL_MOCK_PRODUCTS);
    const idx = prods.findIndex(p => p.id === prod.id);
    if (idx >= 0) prods[idx] = prod;
    else prods.push(prod);
    setLocal('products', prods);
  },

  deleteLocalProduct(id: string): void {
    const prods = getLocal<Product[]>('products', INITIAL_MOCK_PRODUCTS);
    const filtered = prods.filter(p => p.id !== id);
    setLocal('products', filtered);
  },

  // DELIVERIES
  async getBairros(storeId: string): Promise<Bairro[]> {
    try {
      const { data } = await supabase
        .from('taxas_entrega')
        .select('*')
        .eq('loja_id', storeId);
      if (data && data.length > 0) {
        return data.map(b => ({
          id: b.id,
          store_id: b.loja_id,
          nome: b.bairro,
          taxa: Number(b.taxa),
          tempo_estimado: b.tempo_estimado
        }));
      }
    } catch {}

    this.initializeLocalBackup();
    return getLocal<Bairro[]>('bairros', INITIAL_MOCK_BAIRROS).filter(b => b.store_id === storeId);
  },

  async saveBairro(bairro: Bairro): Promise<Bairro> {
    this.updateLocalBairro(bairro);
    return bairro;
  },

  async deleteBairro(id: string): Promise<boolean> {
    this.deleteLocalBairro(id);
    return true;
  },

  updateLocalBairro(bairro: Bairro): void {
    const list = getLocal<Bairro[]>('bairros', INITIAL_MOCK_BAIRROS);
    const idx = list.findIndex(b => b.id === bairro.id);
    if (idx >= 0) list[idx] = bairro;
    else list.push(bairro);
    setLocal('bairros', list);
  },

  deleteLocalBairro(id: string): void {
    const list = getLocal<Bairro[]>('bairros', INITIAL_MOCK_BAIRROS);
    const filtered = list.filter(b => b.id !== id);
    setLocal('bairros', filtered);
  },

  // CUPONS
  async getCupons(storeId: string): Promise<Cupom[]> {
    let remoteCupons: Cupom[] = [];
    try {
      const { data } = await supabase
        .from('cupons')
        .select('*')
        .eq('loja_id', storeId);
      if (data && data.length > 0) {
        remoteCupons = data.map(c => ({
          id: c.id,
          store_id: c.loja_id,
          codigo: (c.codigo || '').toUpperCase().trim(),
          tipo: (c.tipo as any) || 'percentual',
          valor: Number(c.valor || 0),
          min_compra: Number(c.valor_minimo || c.min_compra || 0),
          max_usos: c.quantidade_maxima || c.max_usos || 999,
          usos: c.quantidade_usada || c.usos || 0,
          validade: c.validade || c.data_validade || undefined,
          is_active: c.ativo !== false && c.is_active !== false
        }));
      }
    } catch {}

    // Load store isolated localStorage
    let localStoreCupons: Cupom[] = [];
    try {
      const storeKey = `pedifacil_db_cupons_${storeId}`;
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        localStoreCupons = JSON.parse(raw);
      }
    } catch {}

    this.initializeLocalBackup();
    const globalLocal = getLocal<Cupom[]>('cupons', INITIAL_MOCK_CUPONS).filter(c => c.store_id === storeId);

    // Merge without duplicates by code
    const map = new Map<string, Cupom>();
    globalLocal.forEach(c => map.set(c.codigo.toUpperCase().trim(), c));
    localStoreCupons.forEach(c => map.set(c.codigo.toUpperCase().trim(), c));
    remoteCupons.forEach(c => map.set(c.codigo.toUpperCase().trim(), c));

    return Array.from(map.values());
  },

  async saveCupom(cupom: Cupom): Promise<Cupom> {
    const normalizedCode = (cupom.codigo || '').toUpperCase().trim();
    const cleanCupom: Cupom = {
      ...cupom,
      codigo: normalizedCode,
      is_active: cupom.is_active !== false
    };

    this.updateLocalCupom(cleanCupom);

    // Update isolated store local storage
    try {
      if (cleanCupom.store_id) {
        const storeKey = `pedifacil_db_cupons_${cleanCupom.store_id}`;
        const list: Cupom[] = JSON.parse(localStorage.getItem(storeKey) || '[]');
        const idx = list.findIndex(c => c.id === cleanCupom.id || c.codigo.toUpperCase() === normalizedCode);
        if (idx >= 0) {
          list[idx] = cleanCupom;
        } else {
          list.push(cleanCupom);
        }
        localStorage.setItem(storeKey, JSON.stringify(list));
      }
    } catch {}

    // Synchronize to Supabase cupons table
    try {
      await supabase
        .from('cupons')
        .upsert({
          id: cleanCupom.id,
          loja_id: cleanCupom.store_id,
          codigo: normalizedCode,
          tipo: cleanCupom.tipo,
          valor: Number(cleanCupom.valor || 0),
          valor_minimo: Number(cleanCupom.min_compra || 0),
          quantidade_maxima: cleanCupom.max_usos || 999,
          quantidade_usada: cleanCupom.usos || 0,
          ativo: cleanCupom.is_active,
          validade: cleanCupom.validade || null
        }, { onConflict: 'loja_id,codigo' });
    } catch (err) {
      console.warn('Erro ao salvar cupom no Supabase:', err);
    }

    try {
      window.dispatchEvent(new Event('storage'));
    } catch {}

    return cleanCupom;
  },

  async deleteCupom(id: string): Promise<boolean> {
    this.deleteLocalCupom(id);
    try {
      await supabase.from('cupons').delete().eq('id', id);
    } catch {}
    return true;
  },

  updateLocalCupom(cupom: Cupom): void {
    const list = getLocal<Cupom[]>('cupons', INITIAL_MOCK_CUPONS);
    const idx = list.findIndex(c => c.id === cupom.id || c.codigo.toUpperCase() === cupom.codigo.toUpperCase());
    if (idx >= 0) list[idx] = cupom;
    else list.push(cupom);
    setLocal('cupons', list);
  },

  deleteLocalCupom(id: string): void {
    const list = getLocal<Cupom[]>('cupons', INITIAL_MOCK_CUPONS);
    const filtered = list.filter(c => c.id !== id);
    setLocal('cupons', filtered);
  },

  // CLIENTS
  async getClients(storeId: string): Promise<Client[]> {
    this.initializeLocalBackup();
    return getLocal<Client[]>('clients', INITIAL_MOCK_CLIENTS).filter(c => c.store_id === storeId);
  },

  async saveClient(client: Client): Promise<Client> {
    this.updateLocalClient(client);
    return client;
  },

  updateLocalClient(client: Client): void {
    const list = getLocal<Client[]>('clients', INITIAL_MOCK_CLIENTS);
    const idx = list.findIndex(c => c.id === client.id || (c.whatsapp === client.whatsapp && c.store_id === client.store_id));
    if (idx >= 0) list[idx] = { ...list[idx], ...client };
    else list.push(client);
    setLocal('clients', list);
  },

  // ORDERS (REALTIME AND PERSISTENT)
  async getOrders(storeId: string): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('loja_id', storeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const remoteOrders: Order[] = (data || []).map(o => ({
        id: o.id,
        store_id: o.loja_id,
        numero_pedido: o.numero_pedido,
        cliente_nome: o.cliente_nome,
        cliente_whatsapp: o.cliente_whatsapp,
        cliente_endereco: o.cliente_endereco,
        cliente_bairro: o.cliente_bairro,
        subtotal: Number(o.subtotal),
        taxa_entrega: Number(o.taxa_entrega),
        desconto: Number(o.desconto),
        total: Number(o.total),
        forma_pagamento: o.forma_pagamento,
        troco: o.troco || undefined,
        status: o.status,
        itens: o.itens,
        criado_em: o.created_at
      } as Order));

      const localOrders = getLocal<Order[]>('orders', INITIAL_MOCK_ORDERS)
        .filter(o => o.store_id === storeId);

      const mergedById = [...remoteOrders];
      localOrders.forEach(local => {
        if (!mergedById.some(remote => remote.id === local.id)) {
          mergedById.push(local);
        }
      });

      return mergedById.sort((a,b) => b.criado_em.localeCompare(a.criado_em));
    } catch {}

    this.initializeLocalBackup();
    return getLocal<Order[]>('orders', INITIAL_MOCK_ORDERS)
      .filter(o => o.store_id === storeId)
      .sort((a,b) => b.criado_em.localeCompare(a.criado_em));
  },

  async createOrder(order: Order): Promise<Order> {
    this.initializeLocalBackup();

    const stores = getLocal<Store[]>('stores', INITIAL_MOCK_STORES);
    const localStore = stores.find(s => s.id === order.store_id);
    if (localStore?.aberto === false) {
      throw new Error('A loja está fechada. Não é possível criar pedidos.');
    }

    try {
      const { data: remoteStore, error: storeError } = await supabase
        .from('lojas')
        .select('aberto')
        .eq('id', order.store_id)
        .maybeSingle();
      if (storeError) {
        console.warn('Erro ao verificar status da loja:', storeError);
      } else if (remoteStore && remoteStore.aberto === false) {
        throw new Error('A loja está fechada. Não é possível criar pedidos.');
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('fechada')) throw err;
    }

    const list = getLocal<Order[]>('orders', INITIAL_MOCK_ORDERS);
    const storeOrders = list.filter(o => o.store_id === order.store_id);

    const existingNumbers = new Set(storeOrders.map(o => o.numero_pedido));
    const generateRandomNumber = () => {
      let value: number;
      let attempts = 0;
      do {
        value = Math.floor(10000 + Math.random() * 90000);
        attempts += 1;
      } while (existingNumbers.has(value) && attempts < 20);
      return value;
    };

    const orderNumber = order.numero_pedido && order.numero_pedido > 0 ? order.numero_pedido : generateRandomNumber();
    const orderCopy = { ...order, numero_pedido: orderNumber, criado_em: new Date().toISOString() };
    
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .insert([{
          id: orderCopy.id,
          loja_id: orderCopy.store_id,
          numero_pedido: orderCopy.numero_pedido,
          cliente_nome: orderCopy.cliente_nome,
          cliente_whatsapp: orderCopy.cliente_whatsapp,
          cliente_endereco: orderCopy.cliente_endereco,
          cliente_bairro: orderCopy.cliente_bairro,
          cliente_complemento: orderCopy.cliente_complemento || null,
          subtotal: orderCopy.subtotal,
          taxa_entrega: orderCopy.taxa_entrega,
          desconto: orderCopy.desconto,
          total: orderCopy.total,
          forma_pagamento: orderCopy.forma_pagamento,
          troco: orderCopy.troco || null,
          observacoes: orderCopy.observacoes || null,
          cupom_usado: orderCopy.cupom_codigo || null,
          itens: orderCopy.itens,
          status: 'novo'
        }])
        .select('*')
        .single();
      
      if (error) {
        console.error('⛔ Erro retornado pelo Supabase ao inserir pedido:', error);
      } else if (data) {
        orderCopy.numero_pedido = data.numero_pedido || orderCopy.numero_pedido;
        console.log('✅ Pedido inserido com sucesso no Supabase!', orderCopy.id, 'número', orderCopy.numero_pedido);
      }
    } catch (err) {
      console.warn('Erro ao inserir pedido online no Supabase:', err);
    }

    this.updateLocalOrder(orderCopy);
    this.registerClientFromOrder(orderCopy);
    return orderCopy;
  },

  async updateOrderStatus(id: string, status: Order['status']): Promise<boolean> {
    this.updateLocalOrderStatus(id, status);
    return true;
  },

  updateLocalOrder(order: Order): void {
    const list = getLocal<Order[]>('orders', INITIAL_MOCK_ORDERS);
    const idx = list.findIndex(o => o.id === order.id);
    if (idx >= 0) list[idx] = order;
    else list.push(order);
    setLocal('orders', list);
  },

  updateLocalOrderStatus(id: string, status: Order['status']): void {
    const list = getLocal<Order[]>('orders', INITIAL_MOCK_ORDERS);
    const idx = list.findIndex(o => o.id === id);
    if (idx >= 0) {
      list[idx].status = status;
      setLocal('orders', list);
    }
  },

  registerClientFromOrder(order: Order): void {
    const clients = getLocal<Client[]>('clients', INITIAL_MOCK_CLIENTS);
    const existingIdx = clients.findIndex(c => c.whatsapp === order.cliente_whatsapp && c.store_id === order.store_id);
    const nowStr = new Date().toISOString();
    
    if (existingIdx >= 0) {
      const c = clients[existingIdx];
      c.nome = order.cliente_nome;
      c.rua = order.cliente_endereco;
      c.bairro = order.cliente_bairro;
      c.ultimo_pedido_em = nowStr;
      c.total_pedidos += 1;
      c.total_gasto += order.total;
      c.level = c.total_gasto > 300 ? 'Ouro' : c.total_gasto > 150 ? 'Prata' : 'Bronze';
      c.is_vip = c.total_pedidos > 5;
    } else {
      clients.push({
        id: 'client-' + Date.now(),
        store_id: order.store_id,
        nome: order.cliente_nome,
        whatsapp: order.cliente_whatsapp,
        rua: order.cliente_endereco,
        bairro: order.cliente_bairro,
        total_pedidos: 1,
        total_gasto: order.total,
        ultimo_pedido_em: nowStr,
        is_vip: false,
        level: order.total > 300 ? 'Ouro' : order.total > 150 ? 'Prata' : 'Bronze',
        bloqueado: false
      });
    }
    setLocal('clients', clients);

    // Also update isolated per-store client database
    try {
      if (order.store_id) {
        const storeKey = `pedifacil_db_clients_${order.store_id}`;
        const storeClients: Client[] = JSON.parse(localStorage.getItem(storeKey) || '[]');
        const stIdx = storeClients.findIndex(c => c.whatsapp === order.cliente_whatsapp);
        if (stIdx >= 0) {
          storeClients[stIdx].nome = order.cliente_nome;
          storeClients[stIdx].rua = order.cliente_endereco;
          storeClients[stIdx].bairro = order.cliente_bairro;
          storeClients[stIdx].ultimo_pedido_em = nowStr;
          storeClients[stIdx].total_pedidos = (storeClients[stIdx].total_pedidos || 0) + 1;
          storeClients[stIdx].total_gasto = (storeClients[stIdx].total_gasto || 0) + order.total;
        } else {
          storeClients.push({
            id: 'client-' + Date.now(),
            store_id: order.store_id,
            nome: order.cliente_nome,
            whatsapp: order.cliente_whatsapp,
            rua: order.cliente_endereco,
            bairro: order.cliente_bairro,
            total_pedidos: 1,
            total_gasto: order.total,
            ultimo_pedido_em: nowStr,
            is_vip: false,
            level: order.total > 300 ? 'Ouro' : order.total > 150 ? 'Prata' : 'Bronze',
            bloqueado: false
          });
        }
        localStorage.setItem(storeKey, JSON.stringify(storeClients));

        // Fire-and-forget sync to Supabase clientes table for real-time admin sync
        const targetClient = storeClients.find(c => c.whatsapp === order.cliente_whatsapp);
        if (targetClient) {
          (async () => {
            try {
              await supabase
                .from('clientes')
                .upsert({
                  loja_id: order.store_id,
                  nome: targetClient.nome,
                  whatsapp: targetClient.whatsapp,
                  rua: targetClient.rua,
                  bairro: targetClient.bairro,
                  total_pedidos: targetClient.total_pedidos,
                  total_gasto: targetClient.total_gasto,
                  ultimo_pedido_em: targetClient.ultimo_pedido_em,
                  is_vip: targetClient.is_vip,
                  level: targetClient.level,
                  bloqueado: false
                }, { onConflict: 'loja_id,whatsapp' });
            } catch (err) {}
          })();
        }
      }
    } catch (e) {}
  }
};
