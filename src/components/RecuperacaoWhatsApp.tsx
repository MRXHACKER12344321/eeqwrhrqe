import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Send, 
  MessageSquare, 
  TrendingUp, 
  Sparkles, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Calendar, 
  ArrowRight, 
  Tag, 
  ShoppingBag, 
  DollarSign, 
  Percent, 
  Truck, 
  Eye, 
  X, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  RefreshCw, 
  Flame, 
  Crown, 
  UserCheck, 
  History, 
  ShieldCheck, 
  Zap, 
  Smartphone,
  Copy,
  ExternalLink,
  ChevronRight,
  BarChart3,
  UserPlus,
  Trash2,
  Edit2,
  MapPin,
  Phone,
  CheckSquare,
  Square,
  MessageCircle,
  Sliders,
  Minus,
  Plus
} from 'lucide-react';
import { Store, Order, Product, Cupom, Client, RecoveryCampaign, ClientCampaignLog } from '../types';
import { 
  RECOVERY_SEGMENTS, 
  AI_OBJECTIVES, 
  generateAiMessageVariations, 
  replaceTemplateVariables,
  getStorePublicUrl
} from './recuperacao/recoveryTemplates';
import { supabase } from '../lib/supabaseClient';
import { db } from '../lib/db';

function formatClientPhone(phone: string) {
  if (!phone) return 'Sem WhatsApp';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 13 && clean.startsWith('55')) {
    const ddd = clean.substring(2, 4);
    const num = clean.substring(4);
    return num.length === 9 
      ? `(${ddd}) ${num.substring(0, 5)}-${num.substring(5)}`
      : `(${ddd}) ${num.substring(0, 4)}-${num.substring(4)}`;
  }
  if (clean.length === 11) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 7)}-${clean.substring(7)}`;
  }
  if (clean.length === 10) {
    return `(${clean.substring(0, 2)}) ${clean.substring(2, 6)}-${clean.substring(6)}`;
  }
  return phone;
}

export interface EnrichedClient extends Client {
  diasSemComprar: number;
  ticketMedio: number;
  bairroMaisFrequente?: string;
  produtoFavorito?: string;
  ultimoPedidoObj?: Order;
  pedidosDoCliente: Order[];
  statusRecuperacao: 'recuperado' | 'em_recuperacao' | 'inativo' | 'alto_risco';
  ultimaCampanhaRecebida?: ClientCampaignLog;
  totalCampanhasRecebidas: number;
}

interface RecuperacaoWhatsAppProps {
  currentStore: Store;
  orders: Order[];
  clients: Client[];
  products: Product[];
  cupons: Cupom[];
  bairros?: any[];
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onUpdateClients?: (updated: Client[]) => void;
  onRefreshClients?: () => void;
  onAddClient?: (newClient: Client) => void;
  onRefreshCupons?: () => void;
}

export const RecuperacaoWhatsApp: React.FC<RecuperacaoWhatsAppProps> = ({
  currentStore,
  orders,
  clients,
  products,
  cupons,
  bairros = [],
  showToast,
  onUpdateClients,
  onRefreshClients,
  onAddClient,
  onRefreshCupons
}) => {
  // Navigation tabs inside Recovery
  const [activeTab, setActiveTab] = useState<'clientes' | 'campanhas' | 'metricas'>('clientes');

  // Selected Segment Filter
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [customInactiveDays, setCustomInactiveDays] = useState<number>(3);
  const [customDaysMatchMode, setCustomDaysMatchMode] = useState<'gte' | 'exact'>('gte');

  // Advanced Filters State
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBairro, setFilterBairro] = useState('');
  const [filterMinOrders, setFilterMinOrders] = useState<string>('');
  const [filterMinTotal, setFilterMinTotal] = useState<string>('');
  const [filterMinTicket, setFilterMinTicket] = useState<string>('');
  const [filterMinDays, setFilterMinDays] = useState<string>('');
  const [filterMaxDays, setFilterMaxDays] = useState<string>('');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');

  // Client Selection State
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  // Manual Client Registration Modal
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientBairro, setNewClientBairro] = useState('');
  const [newClientRua, setNewClientRua] = useState('');
  const [newClientIsVip, setNewClientIsVip] = useState(false);
  const [newClientInitialDays, setNewClientInitialDays] = useState('0');

  // Campaigns & Logs state with store persistence
  const [campaigns, setCampaigns] = useState<RecoveryCampaign[]>(() => {
    try {
      const saved = localStorage.getItem(`pedifacil_recovery_campaigns_${currentStore.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [campaignLogs, setCampaignLogs] = useState<ClientCampaignLog[]>(() => {
    try {
      const saved = localStorage.getItem(`pedifacil_recovery_logs_${currentStore.id}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Client Details Modal State
  const [viewingClient, setViewingClient] = useState<EnrichedClient | null>(null);

  // Campaign Wizard State
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [campaignStep, setCampaignStep] = useState<1 | 2 | 3>(1);
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignSegment, setNewCampaignSegment] = useState('all');
  const [wizardCustomDays, setWizardCustomDays] = useState<number>(3);
  const [wizardCustomDaysMatchMode, setWizardCustomDaysMatchMode] = useState<'gte' | 'exact'>('gte');
  const [wizardSelectedClientIds, setWizardSelectedClientIds] = useState<string[]>([]);
  const [wizardClientSearch, setWizardClientSearch] = useState('');
  const [newCampaignOfferType, setNewCampaignOfferType] = useState<RecoveryCampaign['oferta_tipo']>('cupom');
  const [newCampaignOfferVal, setNewCampaignOfferVal] = useState('10');
  const [newCampaignCupom, setNewCampaignCupom] = useState('VOLTAJA10');
  const [newCampaignCupomType, setNewCampaignCupomType] = useState<'percentual' | 'fixo'>('percentual');
  const [newCampaignCupomValue, setNewCampaignCupomValue] = useState('10');
  const [newCampaignCupomMinOrder, setNewCampaignCupomMinOrder] = useState('0');
  const [newCampaignCupomValidityDays, setNewCampaignCupomValidityDays] = useState('7');
  const [newCampaignProductId, setNewCampaignProductId] = useState('');
  const [newCampaignMessage, setNewCampaignMessage] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState('');
  const [antiSpamDays, setAntiSpamDays] = useState<number>(7);

  // AI Message Generator Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiObjective, setAiObjective] = useState('recuperar');
  const [aiVariations, setAiVariations] = useState<{ curta: string; persuasiva: string; humanizada: string } | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Active Dispatch Queue State
  const [dispatchQueue, setDispatchQueue] = useState<{
    campaign: RecoveryCampaign;
    clientsList: EnrichedClient[];
    currentIndex: number;
  } | null>(null);

  // Save campaigns and logs to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(`pedifacil_recovery_campaigns_${currentStore.id}`, JSON.stringify(campaigns));
    } catch (e) {
      console.error('Error saving campaigns:', e);
    }
  }, [campaigns, currentStore.id]);

  useEffect(() => {
    try {
      localStorage.setItem(`pedifacil_recovery_logs_${currentStore.id}`, JSON.stringify(campaignLogs));
    } catch (e) {
      console.error('Error saving logs:', e);
    }
  }, [campaignLogs, currentStore.id]);

  // Combine and Enrich Real Clients from Supabase + Actual Orders + Registered users strictly for this store
  const enrichedClients: EnrichedClient[] = useMemo(() => {
    const clientsMap = new Map<string, EnrichedClient>();

    // Helper to check store isolation
    const isThisStore = (storeId?: string) => {
      if (!storeId) return true;
      return storeId === currentStore.id || storeId === currentStore.slug;
    };

    // 1. Seed with registered clients in this store
    clients.forEach(c => {
      if (!c.whatsapp) return;
      if (!isThisStore(c.store_id)) return; // Strictly isolate by store

      const cleanPhone = c.whatsapp.replace(/\D/g, '');
      const lastOrderDays = c.ultimo_pedido_em 
        ? Math.max(0, Math.floor((Date.now() - new Date(c.ultimo_pedido_em).getTime()) / (1000 * 60 * 60 * 24)))
        : 999;
      
      const ticket = c.total_pedidos > 0 ? Number((c.total_gasto / c.total_pedidos).toFixed(2)) : 0;

      clientsMap.set(cleanPhone, {
        ...c,
        id: c.id || `cl-${cleanPhone}`,
        whatsapp: cleanPhone,
        diasSemComprar: lastOrderDays,
        ticketMedio: ticket,
        pedidosDoCliente: [],
        statusRecuperacao: 'inativo',
        totalCampanhasRecebidas: 0
      });
    });

    // 2. Scan registered users in localStorage for this store
    try {
      const keysToScan = [
        `pedifacil_registered_users_${currentStore.id}`,
        `pedifacil_registered_users_${currentStore.slug}`,
        'pedifacil_registered_users'
      ];
      keysToScan.forEach(k => {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((u: any) => {
              if (!u.whatsapp) return;
              const cleanPhone = String(u.whatsapp).replace(/\D/g, '');
              if (!clientsMap.has(cleanPhone)) {
                clientsMap.set(cleanPhone, {
                  id: `cl-reg-${cleanPhone}`,
                  store_id: currentStore.id,
                  nome: u.nome || 'Cliente Cadastrado',
                  whatsapp: cleanPhone,
                  bairro: u.bairro,
                  rua: u.endereco || u.rua,
                  total_pedidos: 0,
                  total_gasto: 0,
                  ultimo_pedido_em: undefined,
                  is_vip: false,
                  level: 'Bronze',
                  bloqueado: false,
                  diasSemComprar: 999,
                  ticketMedio: 0,
                  pedidosDoCliente: [],
                  statusRecuperacao: 'inativo',
                  totalCampanhasRecebidas: 0
                });
              }
            });
          }
        }
      });
    } catch {}

    // 3. Aggregate actual orders from this store
    orders.forEach(o => {
      if (!o.cliente_whatsapp) return;
      if (!isThisStore(o.store_id)) return; // Strictly isolate by store

      const cleanPhone = o.cliente_whatsapp.replace(/\D/g, '');

      let existing = clientsMap.get(cleanPhone);
      if (!existing) {
        existing = {
          id: `cl-${cleanPhone}`,
          store_id: currentStore.id,
          nome: o.cliente_nome || 'Cliente',
          whatsapp: cleanPhone,
          bairro: o.cliente_bairro,
          rua: o.cliente_endereco,
          total_pedidos: 0,
          total_gasto: 0,
          ultimo_pedido_em: o.criado_em,
          is_vip: false,
          level: 'Bronze',
          bloqueado: false,
          diasSemComprar: 0,
          ticketMedio: 0,
          pedidosDoCliente: [],
          statusRecuperacao: 'inativo',
          totalCampanhasRecebidas: 0
        };
        clientsMap.set(cleanPhone, existing);
      }

      existing.pedidosDoCliente.push(o);
    });

    // 4. Final calculations per client
    const list: EnrichedClient[] = [];
    const now = Date.now();

    clientsMap.forEach(client => {
      // Sort client's orders by date descending
      client.pedidosDoCliente.sort((a, b) => new Date(b.criado_em || 0).getTime() - new Date(a.criado_em || 0).getTime());

      if (client.pedidosDoCliente.length > 0) {
        const latestOrder = client.pedidosDoCliente[0];
        client.ultimoPedidoObj = latestOrder;
        client.ultimo_pedido_em = latestOrder.criado_em;
        client.total_pedidos = client.pedidosDoCliente.length;
        client.total_gasto = client.pedidosDoCliente.reduce((sum, ord) => sum + Number(ord.total || 0), 0);
        client.ticketMedio = Number((client.total_gasto / client.total_pedidos).toFixed(2));
        
        const diffMs = now - new Date(latestOrder.criado_em || now).getTime();
        client.diasSemComprar = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        // Find most frequent neighborhood
        const bairroCounts: Record<string, number> = {};
        client.pedidosDoCliente.forEach(ord => {
          if (ord.cliente_bairro) {
            bairroCounts[ord.cliente_bairro] = (bairroCounts[ord.cliente_bairro] || 0) + 1;
          }
        });
        const topBairro = Object.entries(bairroCounts).sort((a, b) => b[1] - a[1])[0];
        if (topBairro) client.bairroMaisFrequente = topBairro[0];

        // Find favorite product
        const productCounts: Record<string, number> = {};
        client.pedidosDoCliente.forEach(ord => {
          if (Array.isArray(ord.itens)) {
            ord.itens.forEach(item => {
              if (item?.name) {
                productCounts[item.name] = (productCounts[item.name] || 0) + (item.quantity || 1);
              }
            });
          }
        });
        const topProd = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];
        if (topProd) client.produtoFavorito = topProd[0];
      }

      // Check campaign logs for this client
      const clientLogs = campaignLogs.filter(log => log.client_whatsapp.replace(/\D/g, '') === client.whatsapp);
      client.totalCampanhasRecebidas = clientLogs.length;
      if (clientLogs.length > 0) {
        clientLogs.sort((a, b) => new Date(b.data_envio).getTime() - new Date(a.data_envio).getTime());
        client.ultimaCampanhaRecebida = clientLogs[0];
      }

      // VIP & Level assignment based on purchase behavior
      if (client.total_pedidos >= 8 || client.total_gasto >= 350) {
        client.is_vip = true;
        client.level = 'Ouro';
      } else if (client.total_pedidos >= 4 || client.total_gasto >= 150) {
        client.level = 'Prata';
      } else {
        client.level = 'Bronze';
      }

      // Determine Recovery Status
      const lastCamp = client.ultimaCampanhaRecebida;
      if (lastCamp && client.ultimoPedidoObj) {
        const campDate = new Date(lastCamp.data_envio).getTime();
        const orderDate = new Date(client.ultimoPedidoObj.criado_em || 0).getTime();
        if (orderDate > campDate) {
          client.statusRecuperacao = 'recuperado';
        } else {
          const daysSinceCamp = Math.floor((now - campDate) / (1000 * 60 * 60 * 24));
          if (daysSinceCamp <= 7) {
            client.statusRecuperacao = 'em_recuperacao';
          } else if (client.diasSemComprar >= 30) {
            client.statusRecuperacao = 'alto_risco';
          } else {
            client.statusRecuperacao = 'inativo';
          }
        }
      } else if (client.diasSemComprar >= 30) {
        client.statusRecuperacao = 'alto_risco';
      } else {
        client.statusRecuperacao = 'inativo';
      }

      list.push(client);
    });

    return list;
  }, [clients, orders, currentStore.id, currentStore.slug, campaignLogs]);

  // Handle Manual Client Registration
  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      showToast('Informe o nome do cliente', 'error');
      return;
    }
    const cleanPhone = newClientPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      showToast('Informe um número de WhatsApp válido', 'error');
      return;
    }

    const days = parseInt(newClientInitialDays) || 0;
    const lastOrderDate = days > 0 
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
      : new Date().toISOString();

    const newClientObj: Client = {
      id: `cl-${Date.now()}`,
      store_id: currentStore.id,
      nome: newClientName.trim(),
      whatsapp: cleanPhone,
      bairro: newClientBairro.trim() || undefined,
      rua: newClientRua.trim() || undefined,
      total_pedidos: days > 0 ? 1 : 0,
      total_gasto: 0,
      ultimo_pedido_em: days > 0 ? lastOrderDate : undefined,
      is_vip: newClientIsVip,
      level: newClientIsVip ? 'Ouro' : 'Bronze',
      bloqueado: false
    };

    // Save to Supabase table clientes if possible
    try {
      await supabase.from('clientes').insert([{
        id: newClientObj.id,
        loja_id: currentStore.id,
        nome: newClientObj.nome,
        whatsapp: newClientObj.whatsapp,
        total_pedidos: newClientObj.total_pedidos,
        total_gasto: newClientObj.total_gasto,
        ultimo_pedido_em: newClientObj.ultimo_pedido_em,
        is_vip: newClientObj.is_vip,
        level: newClientObj.level,
        bloqueado: false
      }]);
    } catch (err) {
      console.warn('Fallback local para inserção de cliente:', err);
    }

    // Update LocalStorage & Prop Callbacks
    try {
      const storeKey = `pedifacil_db_clients_${currentStore.id}`;
      const storeList: Client[] = JSON.parse(localStorage.getItem(storeKey) || '[]');
      const updatedStoreList = [newClientObj, ...storeList.filter(c => c.id !== newClientObj.id && c.whatsapp !== newClientObj.whatsapp)];
      localStorage.setItem(storeKey, JSON.stringify(updatedStoreList));

      const globalList: Client[] = JSON.parse(localStorage.getItem('pedifacil_db_clients') || '[]');
      const updatedGlobal = [newClientObj, ...globalList.filter(c => c.id !== newClientObj.id)];
      localStorage.setItem('pedifacil_db_clients', JSON.stringify(updatedGlobal));

      if (onAddClient) {
        onAddClient(newClientObj);
      }
      if (onUpdateClients) {
        onUpdateClients(updatedStoreList);
      }
      if (onRefreshClients) {
        onRefreshClients();
      }
    } catch {}

    showToast(`Cliente ${newClientObj.nome} cadastrado com sucesso!`, 'success');
    setShowAddClientModal(false);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientBairro('');
    setNewClientRua('');
    setNewClientIsVip(false);
    setNewClientInitialDays('0');
  };

  // Quick segment counts calculation
  const segmentCounts = useMemo(() => {
    const counts: Record<string, number> = { all: enrichedClients.length };
    
    RECOVERY_SEGMENTS.forEach(seg => {
      if (seg.id === 'all') return;
      if (seg.id === 'custom_days') {
        counts[seg.id] = enrichedClients.filter(c => 
          customDaysMatchMode === 'exact'
            ? c.diasSemComprar === customInactiveDays
            : (c.diasSemComprar >= customInactiveDays && c.diasSemComprar < 999)
        ).length;
      } else {
        counts[seg.id] = enrichedClients.filter(c => seg.filter(c)).length;
      }
    });

    return counts;
  }, [enrichedClients, customInactiveDays, customDaysMatchMode]);

  // Filtered clients based on segment + search + advanced filters
  const filteredClients = useMemo(() => {
    return enrichedClients.filter(client => {
      // 1. Segment filter
      if (selectedSegment === 'custom_days') {
        const matches = customDaysMatchMode === 'exact'
          ? client.diasSemComprar === customInactiveDays
          : (client.diasSemComprar >= customInactiveDays && client.diasSemComprar < 999);
        if (!matches) return false;
      } else if (selectedSegment !== 'all') {
        const segObj = RECOVERY_SEGMENTS.find(s => s.id === selectedSegment);
        if (segObj && !segObj.filter(client)) {
          return false;
        }
      }

      // 2. Search query filter (name or whatsapp)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchName = client.nome.toLowerCase().includes(query);
        const matchPhone = client.whatsapp.includes(query);
        const matchBairro = (client.bairro || client.bairroMaisFrequente || '').toLowerCase().includes(query);
        if (!matchName && !matchPhone && !matchBairro) return false;
      }

      // 3. Neighborhood filter
      if (filterBairro) {
        const b = (client.bairro || client.bairroMaisFrequente || '').toLowerCase();
        if (!b.includes(filterBairro.toLowerCase())) return false;
      }

      // 4. Min orders
      if (filterMinOrders && client.total_pedidos < parseInt(filterMinOrders)) {
        return false;
      }

      // 5. Min total spent
      if (filterMinTotal && client.total_gasto < parseFloat(filterMinTotal)) {
        return false;
      }

      // 6. Min ticket
      if (filterMinTicket && client.ticketMedio < parseFloat(filterMinTicket)) {
        return false;
      }

      // 7. Days without buying range
      if (filterMinDays && client.diasSemComprar < parseInt(filterMinDays)) {
        return false;
      }
      if (filterMaxDays && client.diasSemComprar > parseInt(filterMaxDays)) {
        return false;
      }

      // 8. Date of last order range
      if (filterDateFrom && client.ultimo_pedido_em) {
        if (new Date(client.ultimo_pedido_em) < new Date(filterDateFrom)) return false;
      }
      if (filterDateTo && client.ultimo_pedido_em) {
        if (new Date(client.ultimo_pedido_em) > new Date(filterDateTo + 'T23:59:59')) return false;
      }

      return true;
    });
  }, [
    enrichedClients, 
    selectedSegment, 
    searchTerm, 
    filterBairro, 
    filterMinOrders, 
    filterMinTotal, 
    filterMinTicket, 
    filterMinDays, 
    filterMaxDays, 
    filterDateFrom, 
    filterDateTo
  ]);

  // Real-time KPI Stats calculation
  const stats = useMemo(() => {
    const totalInativos = enrichedClients.filter(c => c.diasSemComprar >= 7 && c.diasSemComprar < 999).length;
    const totalRisco = enrichedClients.filter(c => c.diasSemComprar >= 30).length;
    const totalRecuperados = enrichedClients.filter(c => c.statusRecuperacao === 'recuperado').length;
    const totalDisparos = campaignLogs.length;

    // Calculate recovered revenue from orders placed by recovered clients after campaign date
    let valorRecuperadoTotal = 0;
    enrichedClients.forEach(c => {
      if (c.statusRecuperacao === 'recuperado' && c.ultimaCampanhaRecebida) {
        const campDate = new Date(c.ultimaCampanhaRecebida.data_envio).getTime();
        const ordersAfter = c.pedidosDoCliente.filter(o => new Date(o.criado_em || 0).getTime() > campDate);
        valorRecuperadoTotal += ordersAfter.reduce((sum, ord) => sum + Number(ord.total || 0), 0);
      }
    });

    const taxaRecuperacao = totalDisparos > 0 
      ? Math.min(100, Math.round((totalRecuperados / totalDisparos) * 100)) 
      : (enrichedClients.length > 0 && totalRecuperados > 0 ? Math.round((totalRecuperados / enrichedClients.length) * 100) : 0);

    return {
      totalInativos,
      totalRisco,
      totalRecuperados,
      totalDisparos,
      taxaRecuperacao,
      valorRecuperadoTotal
    };
  }, [enrichedClients, campaignLogs]);

  // Toggle selection for all currently filtered clients
  const handleSelectAllFiltered = () => {
    if (selectedClientIds.length === filteredClients.length && filteredClients.length > 0) {
      setSelectedClientIds([]);
    } else {
      setSelectedClientIds(filteredClients.map(c => c.id));
    }
  };

  // Toggle single client selection
  const handleToggleSelectClient = (id: string) => {
    setSelectedClientIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Quick action: Open campaign wizard with auto-selection
  const handleOpenCreateCampaign = (initialSegment = 'all', specificClientIds?: string[]) => {
    const targetSegment = initialSegment;
    setNewCampaignSegment(targetSegment);
    
    if (specificClientIds && specificClientIds.length > 0) {
      setWizardSelectedClientIds(specificClientIds);
      setNewCampaignName(`Campanha para ${specificClientIds.length} clientes selecionados`);
    } else if (selectedClientIds.length > 0) {
      setWizardSelectedClientIds(selectedClientIds);
      setNewCampaignName(`Campanha para ${selectedClientIds.length} clientes selecionados`);
    } else if (targetSegment === 'custom_days') {
      const days = customInactiveDays || 3;
      setWizardCustomDays(days);
      setWizardCustomDaysMatchMode(customDaysMatchMode);
      const matchingIds = enrichedClients.filter(c => 
        customDaysMatchMode === 'exact'
          ? c.diasSemComprar === days
          : (c.diasSemComprar >= days && c.diasSemComprar < 999)
      ).map(c => c.id);
      setWizardSelectedClientIds(matchingIds);
      setNewCampaignName(`Campanha Recuperação (${days} dias sem pedir) - ${new Date().toLocaleDateString('pt-BR')}`);
    } else {
      const seg = RECOVERY_SEGMENTS.find(s => s.id === targetSegment);
      const matchingIds = seg ? enrichedClients.filter(c => seg.filter(c)).map(c => c.id) : enrichedClients.map(c => c.id);
      setWizardSelectedClientIds(matchingIds);
      setNewCampaignName(`Campanha ${seg?.label || 'Recuperação'} - ${new Date().toLocaleDateString('pt-BR')}`);
    }

    const seg = RECOVERY_SEGMENTS.find(s => s.id === targetSegment);
    if (seg && seg.defaultTemplates.length > 0) {
      setNewCampaignMessage(seg.defaultTemplates[0]);
    }

    setWizardClientSearch('');
    setCampaignStep(1);
    setIsCreatingCampaign(true);
  };

  const handleUpdateWizardDays = (days: number, mode: 'gte' | 'exact' = wizardCustomDaysMatchMode) => {
    const validDays = Math.max(1, days);
    setWizardCustomDays(validDays);
    setWizardCustomDaysMatchMode(mode);
    setNewCampaignName(`Campanha Recuperação (${validDays} dias sem pedir) - ${new Date().toLocaleDateString('pt-BR')}`);

    const matchingIds = enrichedClients.filter(c => 
      mode === 'exact'
        ? c.diasSemComprar === validDays
        : (c.diasSemComprar >= validDays && c.diasSemComprar < 999)
    ).map(c => c.id);
    setWizardSelectedClientIds(matchingIds);
  };

  const handleStartCampaignForSegment = (segmentId: string) => {
    handleOpenCreateCampaign(segmentId);
  };

  // Filtered clients inside the Campaign Wizard Step 1 based on segment and search query
  const wizardFilteredClients = useMemo(() => {
    let list = enrichedClients;
    if (newCampaignSegment === 'custom_days') {
      list = list.filter(c => 
        wizardCustomDaysMatchMode === 'exact'
          ? c.diasSemComprar === wizardCustomDays
          : (c.diasSemComprar >= wizardCustomDays && c.diasSemComprar < 999)
      );
    } else if (newCampaignSegment !== 'all') {
      const seg = RECOVERY_SEGMENTS.find(s => s.id === newCampaignSegment);
      if (seg) {
        list = list.filter(c => seg.filter(c));
      }
    }
    if (wizardClientSearch.trim()) {
      const q = wizardClientSearch.toLowerCase().trim();
      list = list.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(q)) ||
        (c.whatsapp && c.whatsapp.includes(q)) ||
        (c.bairro && c.bairro.toLowerCase().includes(q))
      );
    }
    return list;
  }, [enrichedClients, newCampaignSegment, wizardCustomDays, wizardCustomDaysMatchMode, wizardClientSearch]);

  // Dynamic preview message calculation based on first selected client or placeholder
  const previewClient: EnrichedClient = useMemo(() => {
    const sel = enrichedClients.find(c => wizardSelectedClientIds.includes(c.id) || selectedClientIds.includes(c.id));
    if (sel) return sel;
    if (enrichedClients.length > 0) return enrichedClients[0];
    
    return {
      id: 'cl-preview',
      store_id: currentStore.id,
      nome: 'Matheus',
      whatsapp: '5586994240872',
      diasSemComprar: 15,
      ultimo_pedido_em: new Date().toISOString(),
      ticketMedio: 45.0,
      total_gasto: 90.0,
      total_pedidos: 2,
      is_vip: false,
      level: 'Bronze',
      bloqueado: false,
      produtoFavorito: 'Burger Artesanal',
      pedidosDoCliente: [],
      statusRecuperacao: 'inativo',
      totalCampanhasRecebidas: 0
    };
  }, [enrichedClients, wizardSelectedClientIds, selectedClientIds, currentStore]);

  const renderedPreviewText = useMemo(() => {
    let discountText = '10% OFF';
    if (newCampaignOfferType === 'desconto_pct') discountText = `${newCampaignOfferVal || '10'}% OFF`;
    if (newCampaignOfferType === 'desconto_fixo') discountText = `R$ ${newCampaignOfferVal || '10'} de desconto`;
    if (newCampaignOfferType === 'frete_gratis') discountText = 'Frete Grátis 🛵';
    if (newCampaignOfferType === 'cupom') discountText = `Cupom Especial: ${newCampaignCupom || 'VOLTAJA'}`;

    return replaceTemplateVariables(newCampaignMessage || 'Olá {nome}, sentimos sua falta! Peça agora: {link_pedido}', {
      client: previewClient,
      store: currentStore,
      cupom: newCampaignCupom || 'VOLTAJA',
      desconto: discountText,
      produtoNome: products.find(p => p.id === newCampaignProductId)?.name
    });
  }, [newCampaignMessage, previewClient, currentStore, newCampaignOfferType, newCampaignOfferVal, newCampaignCupom, newCampaignProductId, products]);

  // Execute campaign dispatch queue creation
  const handleLaunchCampaign = () => {
    if (!newCampaignName.trim()) {
      showToast('Dê um nome para sua campanha.', 'error');
      return;
    }
    if (!newCampaignMessage.trim()) {
      showToast('Digite a mensagem a ser enviada.', 'error');
      return;
    }

    // Determine target clients strictly from wizard selection or fallback
    let targetClients: EnrichedClient[] = [];
    if (wizardSelectedClientIds.length > 0) {
      targetClients = enrichedClients.filter(c => wizardSelectedClientIds.includes(c.id));
    } else if (selectedClientIds.length > 0) {
      targetClients = enrichedClients.filter(c => selectedClientIds.includes(c.id));
    } else {
      const segObj = RECOVERY_SEGMENTS.find(s => s.id === newCampaignSegment);
      targetClients = segObj ? enrichedClients.filter(c => segObj.filter(c)) : enrichedClients;
    }

    // Apply anti-spam filter if enabled
    if (antiSpamDays > 0) {
      const now = Date.now();
      targetClients = targetClients.filter(c => {
        if (!c.ultimaCampanhaRecebida) return true;
        const lastSentDate = new Date(c.ultimaCampanhaRecebida.data_envio).getTime();
        const daysDiff = (now - lastSentDate) / (1000 * 60 * 60 * 24);
        return daysDiff >= antiSpamDays;
      });
    }

    if (targetClients.length === 0) {
      showToast('Nenhum cliente disponível para disparo com os filtros atuais.', 'error');
      return;
    }

    // Auto-create and activate functional coupon in store database if offer is selected
    let effectiveCupomCode = (newCampaignCupom || '').trim().toUpperCase();
    if (newCampaignOfferType !== 'nenhuma') {
      if (!effectiveCupomCode) {
        if (newCampaignOfferType === 'desconto_pct') effectiveCupomCode = `VOLTA${newCampaignOfferVal || '10'}`;
        else if (newCampaignOfferType === 'desconto_fixo') effectiveCupomCode = `OFF${newCampaignOfferVal || '15'}`;
        else if (newCampaignOfferType === 'frete_gratis') effectiveCupomCode = 'FRETEGRATIS';
        else if (newCampaignOfferType === 'produto') effectiveCupomCode = 'BRINDEVIP';
        else effectiveCupomCode = 'VOLTAJA10';
      }

      const cupomTipo: 'percentual' | 'fixo' = 
        newCampaignOfferType === 'desconto_pct' ? 'percentual' :
        newCampaignOfferType === 'desconto_fixo' ? 'fixo' :
        newCampaignOfferType === 'frete_gratis' ? 'fixo' :
        newCampaignOfferType === 'produto' ? 'fixo' :
        newCampaignCupomType;

      const cupomValor = Number(
        newCampaignOfferType === 'desconto_pct' ? (newCampaignOfferVal || newCampaignCupomValue || '10') :
        newCampaignOfferType === 'desconto_fixo' ? (newCampaignOfferVal || newCampaignCupomValue || '15') :
        newCampaignOfferType === 'frete_gratis' ? '0' :
        newCampaignOfferType === 'produto' ? '0' :
        (newCampaignCupomValue || newCampaignOfferVal || '10')
      );

      let validadeIso: string | undefined = undefined;
      const days = Number(newCampaignCupomValidityDays || 0);
      if (days > 0) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        validadeIso = d.toISOString().split('T')[0];
      }

      const createdCupom: Cupom = {
        id: `cupom-${Date.now()}`,
        store_id: currentStore.id,
        codigo: effectiveCupomCode,
        tipo: cupomTipo,
        valor: cupomValor,
        min_compra: Number(newCampaignCupomMinOrder || 0),
        validade: validadeIso,
        max_usos: 999,
        usos: 0,
        is_active: true
      };

      // Save to storage and remote database asynchronously
      db.saveCupom(createdCupom).then(() => {
        onRefreshCupons?.();
      }).catch(err => {
        console.warn('Erro ao salvar cupom automático da campanha:', err);
      });
    }

    const newCamp: RecoveryCampaign = {
      id: `camp-${Date.now()}`,
      store_id: currentStore.id,
      nome: newCampaignName,
      segmento: newCampaignSegment,
      segmento_label: RECOVERY_SEGMENTS.find(s => s.id === newCampaignSegment)?.label || 'Segmento Personalizado',
      quantidade_clientes: targetClients.length,
      clientes_ids: targetClients.map(c => c.id),
      oferta_tipo: newCampaignOfferType,
      oferta_valor: newCampaignOfferVal,
      cupom_codigo: effectiveCupomCode || newCampaignCupom,
      produto_id: newCampaignProductId,
      produto_nome: products.find(p => p.id === newCampaignProductId)?.name,
      mensagem_template: newCampaignMessage,
      data_criacao: new Date().toISOString(),
      data_envio: new Date().toISOString(),
      agendado_para: isScheduled ? scheduledDateTime : undefined,
      status: isScheduled ? 'agendada' : 'enviada',
      mensagens_enviadas: 0,
      mensagens_entregues: targetClients.length,
      respostas: 0,
      cliques: 0,
      pedidos_gerados: 0,
      clientes_recuperados: 0,
      valor_recuperado: 0
    };

    setCampaigns(prev => [newCamp, ...prev]);

    // If not scheduled, open interactive WhatsApp dispatch modal
    if (!isScheduled) {
      setDispatchQueue({
        campaign: newCamp,
        clientsList: targetClients,
        currentIndex: 0
      });
    }

    setIsCreatingCampaign(false);
    showToast(
      effectiveCupomCode 
        ? `Campanha configurada para ${targetClients.length} clientes e cupom "${effectiveCupomCode}" ativado!`
        : `Campanha configurada para ${targetClients.length} clientes!`, 
      'success'
    );
  };

  // Send single WhatsApp message directly for a client in dispatch queue
  const handleSendNextInQueue = () => {
    if (!dispatchQueue) return;
    const { campaign, clientsList, currentIndex } = dispatchQueue;
    const currentClient = clientsList[currentIndex];

    if (!currentClient) return;

    let discountText = '10% OFF';
    if (campaign.oferta_tipo === 'desconto_pct') discountText = `${campaign.oferta_valor || '10'}% OFF`;
    if (campaign.oferta_tipo === 'desconto_fixo') discountText = `R$ ${campaign.oferta_valor || '10'} OFF`;
    if (campaign.oferta_tipo === 'frete_gratis') discountText = 'Frete Grátis 🛵';
    if (campaign.oferta_tipo === 'cupom') discountText = `Cupom: ${campaign.cupom_codigo || 'VOLTAJA'}`;

    const textToSend = replaceTemplateVariables(campaign.mensagem_template, {
      client: currentClient,
      store: currentStore,
      cupom: campaign.cupom_codigo || '',
      desconto: discountText,
      produtoNome: campaign.produto_nome
    });

    const encodedText = encodeURIComponent(textToSend);
    const cleanPhone = currentClient.whatsapp.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    // Open WhatsApp in new tab
    window.open(waUrl, '_blank');

    // Register log
    const newLog: ClientCampaignLog = {
      id: `log-${Date.now()}`,
      store_id: currentStore.id,
      campaign_id: campaign.id,
      campaign_name: campaign.nome,
      client_id: currentClient.id,
      client_nome: currentClient.nome,
      client_whatsapp: currentClient.whatsapp,
      mensagem: textToSend,
      data_envio: new Date().toISOString(),
      status: 'enviado'
    };

    setCampaignLogs(prev => [newLog, ...prev]);

    // Update campaign metrics
    setCampaigns(prev => prev.map(c => {
      if (c.id === campaign.id) {
        return {
          ...c,
          mensagens_enviadas: c.mensagens_enviadas + 1
        };
      }
      return c;
    }));

    // Advance queue
    if (currentIndex + 1 < clientsList.length) {
      setDispatchQueue({
        ...dispatchQueue,
        currentIndex: currentIndex + 1
      });
    } else {
      showToast('Disparo concluído com sucesso!', 'success');
      setDispatchQueue(null);
    }
  };

  // Direct single WhatsApp trigger for any individual client
  const handleDirectSingleClientMessage = (client: EnrichedClient) => {
    const seg = RECOVERY_SEGMENTS.find(s => s.id === selectedSegment) || RECOVERY_SEGMENTS[0];
    const template = seg.defaultTemplates[0] || 'Olá {nome}, tudo bem? Sentimos sua falta aqui no {nome_restaurante}! Dá uma olhada no cardápio de hoje: {link_pedido}';
    
    const textToSend = replaceTemplateVariables(template, {
      client,
      store: currentStore,
      cupom: 'VOLTAJA',
      desconto: '10% OFF',
      produtoNome: client.produtoFavorito
    });

    const encodedText = encodeURIComponent(textToSend);
    const cleanPhone = client.whatsapp.replace(/\D/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(waUrl, '_blank');

    // Register log
    const newLog: ClientCampaignLog = {
      id: `log-${Date.now()}`,
      store_id: currentStore.id,
      campaign_name: 'Disparo Individual Rápido',
      client_id: client.id,
      client_nome: client.nome,
      client_whatsapp: client.whatsapp,
      mensagem: textToSend,
      data_envio: new Date().toISOString(),
      status: 'enviado'
    };

    setCampaignLogs(prev => [newLog, ...prev]);
    showToast(`WhatsApp aberto para ${client.nome}!`, 'success');
  };

  // Generate AI copy suggestions
  const handleGenerateAiMessage = () => {
    setIsGeneratingAi(true);
    setTimeout(() => {
      const vars = generateAiMessageVariations(aiObjective, {
        storeName: currentStore.name,
        clientName: previewClient.nome,
        storeSlug: currentStore.slug,
        favoriteProduct: previewClient.produtoFavorito || 'especial da casa'
      });
      setAiVariations(vars);
      setIsGeneratingAi(false);
    }, 600);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-4 sm:p-6 lg:p-8 space-y-8 shadow-sm transition-all text-zinc-900 dark:text-zinc-100">
      
      {/* 1. TOP HEADER & MAIN NAVIGATION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight uppercase">
              Recuperação de Clientes WhatsApp
            </h1>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
              CRM Ativo
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
            Segmente seus clientes, recupere vendas perdidas e envie mensagens personalizadas no WhatsApp com 1 clique.
          </p>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddClientModal(true)}
            className="bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-white dark:border-zinc-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
          >
            <UserPlus className="w-4 h-4 text-zinc-700 dark:text-zinc-300 shrink-0" />
            <span className="text-zinc-900 dark:text-white font-bold">Cadastrar Cliente</span>
          </button>

          <button
            onClick={() => handleOpenCreateCampaign(selectedSegment)}
            className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 dark:hover:bg-zinc-200 px-4 py-2 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="!text-white dark:!text-zinc-950 font-extrabold tracking-wide">Criar Nova Campanha</span>
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-6 text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveTab('clientes')}
          className={`pb-3 transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'clientes'
              ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Base de Clientes ({enrichedClients.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('campanhas')}
          className={`pb-3 transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'campanhas'
              ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Histórico de Campanhas ({campaigns.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('metricas')}
          className={`pb-3 transition-all flex items-center gap-2 border-b-2 ${
            activeTab === 'metricas'
              ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
              : 'border-transparent text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Métricas de Retenção</span>
        </button>
      </div>

      {/* 2. REAL-TIME KPI INDICATOR CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Base da Loja
          </span>
          <p className="text-xl font-black text-zinc-900 dark:text-white font-mono">
            {enrichedClients.length}
          </p>
          <span className="text-[10px] text-zinc-400">clientes cadastrados</span>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Inativos (7d+)
          </span>
          <p className="text-xl font-black text-zinc-900 dark:text-white font-mono">
            {stats.totalInativos}
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">oportunidade de venda</span>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Em Risco (30d+)
          </span>
          <p className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {stats.totalRisco}
          </p>
          <span className="text-[10px] text-zinc-400">sumidos há mais tempo</span>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Recuperados
          </span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {stats.totalRecuperados}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">voltaram a pedir 🎉</span>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Disparos Feitos
          </span>
          <p className="text-xl font-black text-zinc-900 dark:text-white font-mono">
            {stats.totalDisparos}
          </p>
          <span className="text-[10px] text-zinc-400">mensagens enviadas</span>
        </div>

        <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
            Recuperado (R$)
          </span>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            R$ {stats.valorRecuperadoTotal.toFixed(2)}
          </p>
          <span className="text-[10px] text-zinc-400">receita reativada</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CLIENTS & SEGMENTS VIEW                                           */}
      {/* ========================================================================= */}
      {activeTab === 'clientes' && (
        <div className="space-y-6">
          
          {/* 3. HORIZONTAL SEGMENTATION PILLS */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-black uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-zinc-900 dark:text-white" />
                Segmentação de Clientes da Sua Loja
              </h3>
              <span className="text-xs text-zinc-500">
                Mostrando <strong className="text-zinc-900 dark:text-white font-mono">{filteredClients.length}</strong> de <span className="font-mono">{enrichedClients.length}</span> clientes
              </span>
            </div>

            {/* Scrollable Segment Chips in clean Monochrome styling */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {RECOVERY_SEGMENTS.map(seg => {
                const isSelected = selectedSegment === seg.id;
                const count = segmentCounts[seg.id] || 0;

                return (
                  <button
                    key={seg.id}
                    onClick={() => setSelectedSegment(seg.id)}
                    className={`shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 border ${
                      isSelected
                        ? 'bg-zinc-900 !text-white border-zinc-900 dark:bg-white dark:!text-zinc-950 dark:border-white shadow-xs'
                        : 'bg-white !text-zinc-800 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 dark:bg-zinc-800 dark:!text-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-750'
                    }`}
                  >
                    <span className={isSelected ? '!text-white dark:!text-zinc-950 font-bold' : '!text-zinc-800 dark:!text-zinc-200 font-bold'}>{seg.label}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                      isSelected
                        ? 'bg-white/20 !text-white dark:bg-black/20 dark:!text-zinc-950'
                        : 'bg-zinc-100 !text-zinc-700 dark:bg-zinc-900 dark:!text-zinc-300'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Segment Description & Quick Campaign Launch Button */}
            {selectedSegment === 'custom_days' ? (
              <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                      <Sliders className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-zinc-900 dark:text-white flex items-center gap-2">
                        <span>Filtro de Inatividade Personalizado</span>
                        <span className="bg-emerald-500 text-black text-[10px] font-black px-2 py-0.5 rounded-full">
                          {customInactiveDays} {customInactiveDays === 1 ? 'dia' : 'dias'}
                        </span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {customDaysMatchMode === 'exact' 
                          ? `Exibindo clientes ausentes há exatamente ${customInactiveDays} dias.`
                          : `Exibindo clientes que não pedem há ${customInactiveDays} ou mais dias.`}
                      </p>
                    </div>
                  </div>

                  {/* Match Mode Toggle & Campaign Button */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center bg-white dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold shrink-0">
                      <button
                        onClick={() => setCustomDaysMatchMode('gte')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          customDaysMatchMode === 'gte'
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        ≥ A partir de {customInactiveDays}d
                      </button>
                      <button
                        onClick={() => setCustomDaysMatchMode('exact')}
                        className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                          customDaysMatchMode === 'exact'
                            ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-xs'
                            : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                        }`}
                      >
                        = Exatamente {customInactiveDays}d
                      </button>
                    </div>

                    <button
                      onClick={() => handleStartCampaignForSegment('custom_days')}
                      className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="!text-white dark:!text-zinc-950 font-bold">Criar Campanha ({filteredClients.length})</span>
                    </button>
                  </div>
                </div>

                {/* Days Stepper & Range Slider */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                  <div className="md:col-span-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomInactiveDays(prev => Math.max(1, prev - 1))}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold transition-all cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <div className="flex-1 relative">
                      <input
                        type="number"
                        min="1"
                        max="180"
                        value={customInactiveDays}
                        onChange={(e) => setCustomInactiveDays(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full text-center font-mono font-black text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2 text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-[10px] text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 font-bold pointer-events-none">
                        dias
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomInactiveDays(prev => prev + 1)}
                      className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="md:col-span-8 flex items-center gap-3">
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={Math.min(30, customInactiveDays)}
                      onChange={(e) => setCustomInactiveDays(parseInt(e.target.value))}
                      className="flex-1 accent-emerald-500 h-2 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                    />
                    <span className="text-[10px] font-mono font-bold text-zinc-400 shrink-0">1 a 30 dias</span>
                  </div>
                </div>

                {/* Quick Presets Pills (1 a 30 dias) */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 mr-1">Atalhos rápidos:</span>
                  {[1, 2, 3, 4, 5, 7, 10, 15, 20, 30].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCustomInactiveDays(d)}
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer border ${
                        customInactiveDays === d
                          ? 'bg-emerald-500 text-black border-emerald-500 font-black shadow-xs'
                          : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      {d} {d === 1 ? 'dia' : 'dias'}
                    </button>
                  ))}
                </div>
              </div>
            ) : (() => {
              const currentSegObj = RECOVERY_SEGMENTS.find(s => s.id === selectedSegment);
              if (!currentSegObj) return null;
              return (
                <div className="bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5">
                    <p className="font-bold text-zinc-900 dark:text-white">
                      💡 {currentSegObj.label}:
                    </p>
                    <p className="text-zinc-500 dark:text-zinc-400">
                      {currentSegObj.description}
                    </p>
                  </div>

                  <button
                    onClick={() => handleStartCampaignForSegment(selectedSegment)}
                    className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 dark:hover:bg-zinc-200 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all shrink-0 flex items-center gap-2 shadow-xs"
                  >
                    <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="!text-white dark:!text-zinc-950 font-bold">Criar Campanha para este Segmento</span>
                  </button>
                </div>
              );
            })()}
          </div>

          {/* 4. SEARCH & ADVANCED FILTERS BAR */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nome do cliente, WhatsApp ou bairro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:border-zinc-900 dark:focus:border-white transition-all"
                />
              </div>

              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 border ${
                  showAdvancedFilters || filterBairro || filterMinOrders || filterMinTotal || filterMinDays
                    ? 'bg-zinc-900 !text-white border-zinc-900 dark:bg-white dark:!text-zinc-950 font-bold'
                    : 'bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Filtros Avançados</span>
                {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {(searchTerm || filterBairro || filterMinOrders || filterMinTotal || filterMinTicket || filterMinDays || filterMaxDays || filterDateFrom || filterDateTo) && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterBairro('');
                    setFilterMinOrders('');
                    setFilterMinTotal('');
                    setFilterMinTicket('');
                    setFilterMinDays('');
                    setFilterMaxDays('');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar</span>
                </button>
              )}
            </div>

            {/* Expandable Advanced Filters Drawer */}
            {showAdvancedFilters && (
              <div className="bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                
                {/* Bairro Filter */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Filtrar por Bairro</label>
                  <input
                    type="text"
                    placeholder="Ex: Centro, Parque Piauí..."
                    value={filterBairro}
                    onChange={(e) => setFilterBairro(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Min Orders */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Mínimo de Pedidos</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 3"
                    value={filterMinOrders}
                    onChange={(e) => setFilterMinOrders(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Min Total Spent */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total Gasto Mínimo (R$)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 100"
                    value={filterMinTotal}
                    onChange={(e) => setFilterMinTotal(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Ticket Médio Mínimo */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Ticket Médio Mínimo (R$)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 40"
                    value={filterMinTicket}
                    onChange={(e) => setFilterMinTicket(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Days without buying range */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Dias sem Comprar (Mínimo)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 15"
                    value={filterMinDays}
                    onChange={(e) => setFilterMinDays(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Dias sem Comprar (Máximo)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 60"
                    value={filterMaxDays}
                    onChange={(e) => setFilterMaxDays(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Last Order Date range */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Última Compra De</label>
                  <input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Última Compra Até</label>
                  <input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

              </div>
            )}
          </div>

          {/* 5. BULK SELECTION ACTION BAR */}
          {selectedClientIds.length > 0 && (
            <div className="bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-white/10 dark:bg-black/10 rounded-xl font-mono text-xs font-black">
                  {selectedClientIds.length} {selectedClientIds.length === 1 ? 'cliente selecionado' : 'clientes selecionados'}
                </span>
                <p className="text-xs text-zinc-300 dark:text-zinc-600">
                  Pronto para enviar ofertas no WhatsApp para os selecionados.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedClientIds([])}
                  className="bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20 text-xs font-bold px-3 py-2 rounded-xl transition-all"
                >
                  Desmarcar Todos
                </button>
                <button
                  onClick={() => handleOpenCreateCampaign(selectedSegment, selectedClientIds)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                >
                  <Send className="w-4 h-4" />
                  <span>Disparar Campanha ({selectedClientIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* 6. CLIENTS DATA TABLE IN CLEAN MONOCHROME */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
            
            {/* Table Header Control */}
            <div className="bg-zinc-50 dark:bg-zinc-850 p-4 flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800">
              <label className="flex items-center gap-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={selectedClientIds.length === filteredClients.length && filteredClients.length > 0}
                  onChange={handleSelectAllFiltered}
                  className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 accent-zinc-900 cursor-pointer"
                />
                <span>Selecionar todos os clientes filtrados ({filteredClients.length})</span>
              </label>

              <span className="text-[11px] text-zinc-400">
                Clique em <strong className="text-zinc-700 dark:text-zinc-300">Ver cliente</strong> para detalhes e histórico
              </span>
            </div>

            {/* Table Content */}
            {filteredClients.length === 0 ? (
              <div className="p-12 text-center space-y-3 bg-white dark:bg-zinc-900">
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Nenhum cliente encontrado</h4>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Não encontramos nenhum cliente cadastrado nesta loja para o filtro selecionado. Você pode cadastrar um cliente manualmente acima ou realizar novos pedidos no cardápio.
                </p>
                <button
                  onClick={() => setShowAddClientModal(true)}
                  className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 mt-2"
                >
                  <UserPlus className="w-4 h-4 text-zinc-300 dark:text-zinc-700" />
                  <span className="!text-white dark:!text-zinc-950 font-bold">Cadastrar Primeiro Cliente</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-zinc-100/75 dark:bg-zinc-800/80 text-[10px] font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800">
                      <th className="p-3.5 w-10 text-center"></th>
                      <th className="p-3.5">Cliente</th>
                      <th className="p-3.5">Última Compra</th>
                      <th className="p-3.5 text-center">Dias Sem Comprar</th>
                      <th className="p-3.5 text-center">Pedidos</th>
                      <th className="p-3.5 text-right">Total Gasto</th>
                      <th className="p-3.5 text-right">Ticket Médio</th>
                      <th className="p-3.5 text-center">Segmento</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                    {filteredClients.map(client => {
                      const isSelected = selectedClientIds.includes(client.id);
                      
                      // Status Styling in subtle, modern badges
                      const getStatusBadge = () => {
                        switch (client.statusRecuperacao) {
                          case 'recuperado':
                            return (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                RECUPERADO
                              </span>
                            );
                          case 'em_recuperacao':
                            return (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                EM RECUPERAÇÃO
                              </span>
                            );
                          case 'alto_risco':
                            return (
                              <span className="bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                ALTO RISCO
                              </span>
                            );
                          default:
                            return (
                              <span className="bg-zinc-100 text-zinc-600 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400"></span>
                                INATIVO
                              </span>
                            );
                        }
                      };

                      return (
                        <tr 
                          key={client.id}
                          className={`hover:bg-zinc-50/80 dark:hover:bg-zinc-850/50 transition-colors ${
                            isSelected ? 'bg-zinc-50 dark:bg-zinc-850/80' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectClient(client.id)}
                              className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 accent-zinc-900 cursor-pointer"
                            />
                          </td>

                          {/* Client Name & Phone */}
                          <td className="p-3.5">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <p className="font-extrabold text-zinc-900 dark:text-white text-xs">
                                  {client.nome}
                                </p>
                                {client.is_vip && (
                                  <span title="Cliente VIP">
                                    <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                                <Smartphone className="w-3 h-3 text-zinc-400" />
                                <span>{client.whatsapp}</span>
                                {(client.bairro || client.bairroMaisFrequente) && (
                                  <span className="text-[10px] text-zinc-400 font-sans ml-1">
                                    • {client.bairro || client.bairroMaisFrequente}
                                  </span>
                                )}
                              </p>
                            </div>
                          </td>

                          {/* Last Order Date */}
                          <td className="p-3.5 text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">
                            {client.ultimo_pedido_em ? (
                              <div>
                                <p>{new Date(client.ultimo_pedido_em).toLocaleDateString('pt-BR')}</p>
                                <p className="text-[10px] text-zinc-400">
                                  {new Date(client.ultimo_pedido_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            ) : (
                              <span className="text-zinc-400 italic">Nunca comprou</span>
                            )}
                          </td>

                          {/* Days without buying */}
                          <td className="p-3.5 text-center">
                            {client.diasSemComprar === 999 ? (
                              <span className="text-[10px] font-mono text-zinc-400">Sem pedidos</span>
                            ) : (
                              <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded-md ${
                                client.diasSemComprar >= 30 
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800' 
                                  : client.diasSemComprar >= 15 
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' 
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                              }`}>
                                {client.diasSemComprar}d
                              </span>
                            )}
                          </td>

                          {/* Orders count */}
                          <td className="p-3.5 text-center font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {client.total_pedidos}
                          </td>

                          {/* Total spent */}
                          <td className="p-3.5 text-right font-mono font-bold text-zinc-900 dark:text-white">
                            R$ {client.total_gasto.toFixed(2)}
                          </td>

                          {/* Average Ticket */}
                          <td className="p-3.5 text-right font-mono text-zinc-600 dark:text-zinc-400">
                            R$ {client.ticketMedio.toFixed(2)}
                          </td>

                          {/* Segment Level */}
                          <td className="p-3.5 text-center">
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                              {client.level}
                            </span>
                          </td>

                          {/* Recovery Status */}
                          <td className="p-3.5 text-center">
                            {getStatusBadge()}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewingClient(client)}
                                className="bg-zinc-100 hover:bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-200 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1"
                                title="Ver histórico do cliente"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver</span>
                              </button>

                              <button
                                onClick={() => handleDirectSingleClientMessage(client)}
                                className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs"
                                title="Enviar mensagem via WhatsApp"
                              >
                                <Send className="w-3.5 h-3.5 !text-white dark:!text-zinc-950 shrink-0" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CAMPAIGNS HISTORY                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'campanhas' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-900 dark:text-white">
                Campanhas Realizadas
              </h3>
              <p className="text-xs text-zinc-500">
                Acompanhe o desempenho, clientes impactados e resultados de vendas.
              </p>
            </div>

            <button
              onClick={() => handleOpenCreateCampaign('all')}
              className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="!text-white dark:!text-zinc-950 font-bold">Nova Campanha</span>
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center mx-auto text-zinc-400">
                <History className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Nenhuma campanha realizada ainda</h4>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Crie sua primeira campanha para reativar clientes sumidos, oferecer cupons e aumentar o faturamento do seu restaurante.
                </p>
              </div>
              <button
                onClick={() => handleOpenCreateCampaign('all')}
                className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 px-6 py-2.5 rounded-xl text-xs font-extrabold uppercase tracking-wide transition-all inline-flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="!text-white dark:!text-zinc-950 font-extrabold">Criar Primeira Campanha</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map(camp => (
                <div 
                  key={camp.id}
                  className="bg-white dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-400 transition-all shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-zinc-900 dark:text-white text-sm">{camp.nome}</h4>
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                          {camp.segmento_label}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          camp.status === 'enviada' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {camp.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Criada em: {new Date(camp.data_criacao).toLocaleString('pt-BR')} • Oferta: <strong>{camp.oferta_tipo}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const targets = enrichedClients.filter(c => camp.clientes_ids.includes(c.id));
                          setDispatchQueue({
                            campaign: camp,
                            clientsList: targets.length > 0 ? targets : enrichedClients.slice(0, camp.quantidade_clientes),
                            currentIndex: 0
                          });
                        }}
                        className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                      >
                        <Send className="w-3.5 h-3.5 !text-white dark:!text-zinc-950 shrink-0" />
                        <span className="!text-white dark:!text-zinc-950 font-bold">Abrir Fila de Disparo</span>
                      </button>
                    </div>
                  </div>

                  {/* Campaign Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Público Alvo</span>
                      <p className="font-mono font-bold text-zinc-900 dark:text-white text-sm">{camp.quantidade_clientes}</p>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Enviadas</span>
                      <p className="font-mono font-bold text-zinc-900 dark:text-white text-sm">{camp.mensagens_enviadas}</p>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Status do Envio</span>
                      <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {camp.mensagens_enviadas >= camp.quantidade_clientes ? '100% Concluído' : `${camp.mensagens_enviadas}/${camp.quantidade_clientes}`}
                      </p>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-900 p-3 rounded-xl border border-zinc-150 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase">Canal</span>
                      <p className="font-mono font-bold text-zinc-700 dark:text-zinc-300 text-sm">WhatsApp Oficial</p>
                    </div>
                  </div>

                  {/* Message Template Display */}
                  <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-700 dark:text-zinc-300">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">Mensagem Base:</p>
                    <p className="whitespace-pre-line leading-relaxed">{camp.mensagem_template}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: RETENTION METRICS & ADVANCED CHARTS                                */}
      {/* ========================================================================= */}
      {activeTab === 'metricas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Segmentation Health Chart */}
            <div className="bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-zinc-900 dark:text-white" />
                Saúde da Base de Clientes (Distribuição)
              </h4>

              <div className="space-y-3 text-xs">
                {RECOVERY_SEGMENTS.filter(s => s.id !== 'all').map(seg => {
                  const count = segmentCounts[seg.id] || 0;
                  const pct = enrichedClients.length > 0 ? Math.round((count / enrichedClients.length) * 100) : 0;

                  return (
                    <div key={seg.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-zinc-700 dark:text-zinc-300">{seg.label}</span>
                        <span className="font-mono text-zinc-500">{count} clientes ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-zinc-900 dark:bg-white rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Campaign ROI & Conversion Impact */}
            <div className="bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                Impacto de Retenção & Retorno
              </h4>

              <div className="space-y-4 text-xs">
                <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-medium">Taxa Média de Reativação</span>
                  <p className="text-2xl font-black text-emerald-600 font-mono">{stats.taxaRecuperacao}%</p>
                  <p className="text-[11px] text-zinc-400">Percentual de clientes que voltaram a fazer pedidos após campanha.</p>
                </div>

                <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-medium">Faturamento Resgatado</span>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
                    R$ {stats.valorRecuperadoTotal.toFixed(2)}
                  </p>
                  <p className="text-[11px] text-zinc-400">Total transacionado por clientes recuperados.</p>
                </div>

                <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-1">
                  <span className="text-zinc-500 font-medium">Disparos no Período</span>
                  <p className="text-2xl font-black text-zinc-900 dark:text-white font-mono">
                    {stats.totalDisparos}
                  </p>
                  <p className="text-[11px] text-zinc-400">Total de contatos diretos realizados via WhatsApp.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CADASTRAR NOVO CLIENTE (MANUAL FORM)                             */}
      {/* ========================================================================= */}
      {showAddClientModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-6 text-zinc-900 dark:text-white">
            
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-850">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-xl">
                  <UserPlus className="w-5 h-5 text-zinc-900 dark:text-white" />
                </span>
                <div>
                  <h3 className="text-base font-extrabold">Cadastrar Cliente na Loja</h3>
                  <p className="text-xs text-zinc-500">Adicione um novo contato para fidelidade e campanhas WhatsApp.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddClientModal(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Matheus Silva"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                  WhatsApp (com DDD) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="Ex: 86994558787"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                />
                <p className="text-[10px] text-zinc-400">Insira somente os números com DDD.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                    Bairro (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Parque Aliança"
                    value={newClientBairro}
                    onChange={(e) => setNewClientBairro(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                    Dias sem comprar
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = hoje"
                    value={newClientInitialDays}
                    onChange={(e) => setNewClientInitialDays(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                  Endereço / Rua (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Rua das Flores, 123"
                  value={newClientRua}
                  onChange={(e) => setNewClientRua(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newClientIsVip}
                    onChange={(e) => setNewClientIsVip(e.target.checked)}
                    className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 accent-zinc-900"
                  />
                  <span>Marcar como Cliente VIP (Ouro)</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 dark:hover:bg-zinc-200 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs"
                >
                  <span className="!text-white dark:!text-zinc-950 font-bold">Salvar Cliente</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: VER DETALHES & HISTÓRICO DO CLIENTE                              */}
      {/* ========================================================================= */}
      {viewingClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 text-zinc-900 dark:text-white">
            
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-start bg-zinc-50 dark:bg-zinc-850">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black">{viewingClient.nome}</h3>
                  {viewingClient.is_vip && (
                    <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Crown className="w-3 h-3" /> VIP
                    </span>
                  )}
                  <span className="text-[10px] font-bold bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">
                    {viewingClient.level}
                  </span>
                </div>
                <p className="text-xs font-mono text-zinc-500 flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{viewingClient.whatsapp}</span>
                  {(viewingClient.bairro || viewingClient.bairroMaisFrequente) && (
                    <span>• {viewingClient.bairro || viewingClient.bairroMaisFrequente}</span>
                  )}
                </p>
              </div>

              <button 
                onClick={() => setViewingClient(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              
              {/* Quick Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-zinc-50 dark:bg-zinc-850 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Pedidos</span>
                  <p className="font-mono font-bold text-base text-zinc-900 dark:text-white">{viewingClient.total_pedidos}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-850 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Total Gasto</span>
                  <p className="font-mono font-bold text-base text-zinc-900 dark:text-white">R$ {viewingClient.total_gasto.toFixed(2)}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-850 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Ticket Médio</span>
                  <p className="font-mono font-bold text-base text-zinc-900 dark:text-white">R$ {viewingClient.ticketMedio.toFixed(2)}</p>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-850 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Dias sem comprar</span>
                  <p className="font-mono font-bold text-base text-zinc-900 dark:text-white">
                    {viewingClient.diasSemComprar === 999 ? 'Sem pedidos' : `${viewingClient.diasSemComprar}d`}
                  </p>
                </div>
              </div>

              {/* Order History */}
              <div className="space-y-3">
                <h4 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px]">
                  Histórico de Pedidos ({viewingClient.pedidosDoCliente.length})
                </h4>

                {viewingClient.pedidosDoCliente.length === 0 ? (
                  <p className="text-zinc-400 italic">Nenhum pedido registrado ainda.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {viewingClient.pedidosDoCliente.map(ord => (
                      <div key={ord.id} className="bg-zinc-50 dark:bg-zinc-850 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-xs">
                        <div className="space-y-0.5">
                          <p className="font-bold text-zinc-900 dark:text-white">
                            Pedido #{ord.numero_pedido || ord.id.slice(-4)} • R$ {Number(ord.total || 0).toFixed(2)}
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            {new Date(ord.criado_em || Date.now()).toLocaleString('pt-BR')} • {ord.forma_pagamento}
                          </p>
                        </div>
                        <span className="text-[10px] font-mono bg-zinc-200 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">
                          {ord.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-2">
                <button
                  onClick={() => setViewingClient(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400"
                >
                  Fechar
                </button>
                <button
                  onClick={() => {
                    handleDirectSingleClientMessage(viewingClient);
                    setViewingClient(null);
                  }}
                  className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                >
                  <Send className="w-4 h-4 !text-white dark:!text-zinc-950 shrink-0" />
                  <span className="!text-white dark:!text-zinc-950 font-bold">Enviar Mensagem no WhatsApp</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: WIZARD DE CRIAÇÃO DE CAMPANHA (3 ETAPAS)                         */}
      {/* ========================================================================= */}
      {isCreatingCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 text-zinc-900 dark:text-white">
            
            {/* Header */}
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-850">
              <div>
                <h3 className="text-base font-extrabold uppercase tracking-tight">
                  Criador de Campanha WhatsApp
                </h3>
                <p className="text-xs text-zinc-500">
                  Etapa {campaignStep} de 3 — Configure seu público, oferta e mensagem.
                </p>
              </div>

              <button 
                onClick={() => setIsCreatingCampaign(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Step Navigation Pills */}
              <div className="flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-4 text-xs font-bold">
                <button
                  onClick={() => setCampaignStep(1)}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    campaignStep === 1
                      ? 'bg-zinc-900 !text-white dark:bg-white dark:!text-zinc-950 font-bold'
                      : 'bg-zinc-100 !text-zinc-600 dark:bg-zinc-800 dark:!text-zinc-400 font-bold'
                  }`}
                >
                  1. Público & Dados
                </button>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
                <button
                  onClick={() => setCampaignStep(2)}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    campaignStep === 2
                      ? 'bg-zinc-900 !text-white dark:bg-white dark:!text-zinc-950 font-bold'
                      : 'bg-zinc-100 !text-zinc-600 dark:bg-zinc-800 dark:!text-zinc-400 font-bold'
                  }`}
                >
                  2. Oferta & Cupom
                </button>
                <ChevronRight className="w-4 h-4 text-zinc-400" />
                <button
                  onClick={() => setCampaignStep(3)}
                  className={`px-3.5 py-1.5 rounded-xl transition-all ${
                    campaignStep === 3
                      ? 'bg-zinc-900 !text-white dark:bg-white dark:!text-zinc-950 font-bold'
                      : 'bg-zinc-100 !text-zinc-600 dark:bg-zinc-800 dark:!text-zinc-400 font-bold'
                  }`}
                >
                  3. Mensagem & Disparo
                </button>
              </div>

              {/* STEP 1: PÚBLICO & SELEÇÃO DE CLIENTES */}
              {campaignStep === 1 && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                      Nome da Campanha
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Reativação Semana dos Campeões"
                      value={newCampaignName}
                      onChange={(e) => setNewCampaignName(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                      Segmento Alvo
                    </label>
                    <select
                      value={newCampaignSegment}
                      onChange={(e) => {
                        const newSeg = e.target.value;
                        setNewCampaignSegment(newSeg);
                        const seg = RECOVERY_SEGMENTS.find(s => s.id === newSeg);
                        if (seg && seg.defaultTemplates.length > 0) {
                          setNewCampaignMessage(seg.defaultTemplates[0]);
                        }
                        if (newSeg === 'all') {
                          setWizardSelectedClientIds(enrichedClients.map(c => c.id));
                          setNewCampaignName(`Campanha Todos os Clientes - ${new Date().toLocaleDateString('pt-BR')}`);
                        } else if (newSeg === 'custom_days') {
                          handleUpdateWizardDays(wizardCustomDays, wizardCustomDaysMatchMode);
                        } else if (seg) {
                          setWizardSelectedClientIds(enrichedClients.filter(c => seg.filter(c)).map(c => c.id));
                          setNewCampaignName(`Campanha ${seg.label} - ${new Date().toLocaleDateString('pt-BR')}`);
                        }
                      }}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                    >
                      {RECOVERY_SEGMENTS.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.label} ({segmentCounts[s.id] || 0} clientes)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* SELETOR INTERATIVO DE DIAS PERSONALIZADOS (1 a 30 DIAS) */}
                  {newCampaignSegment === 'custom_days' && (
                    <div className="bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-500/20 pb-2.5">
                        <div>
                          <label className="font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                            <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Definir Dias de Ausência do Cliente</span>
                          </label>
                          <p className="text-[10px] text-zinc-500">
                            Ex: escolha 3 dias para recuperar clientes que não pedem há 3 dias.
                          </p>
                        </div>

                        {/* Match mode */}
                        <div className="flex items-center bg-white dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-[10px] font-bold shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateWizardDays(wizardCustomDays, 'gte')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              wizardCustomDaysMatchMode === 'gte'
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-black'
                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-white'
                            }`}
                          >
                            ≥ A partir de {wizardCustomDays}d
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateWizardDays(wizardCustomDays, 'exact')}
                            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              wizardCustomDaysMatchMode === 'exact'
                                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-black'
                                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-white'
                            }`}
                          >
                            = Exatamente {wizardCustomDays}d
                          </button>
                        </div>
                      </div>

                      {/* Stepper + Slider */}
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateWizardDays(Math.max(1, wizardCustomDays - 1), wizardCustomDaysMatchMode)}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold transition-all cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <div className="flex-1 relative">
                            <input
                              type="number"
                              min="1"
                              max="180"
                              value={wizardCustomDays}
                              onChange={(e) => handleUpdateWizardDays(Math.max(1, parseInt(e.target.value) || 1), wizardCustomDaysMatchMode)}
                              className="w-full text-center font-mono font-black text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg py-1.5 text-zinc-900 dark:text-white focus:outline-none focus:border-emerald-500"
                            />
                            <span className="text-[9px] text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 font-bold pointer-events-none">
                              dias
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUpdateWizardDays(wizardCustomDays + 1, wizardCustomDaysMatchMode)}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 font-bold transition-all cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="sm:col-span-7 flex items-center gap-2.5">
                          <input
                            type="range"
                            min="1"
                            max="30"
                            value={Math.min(30, wizardCustomDays)}
                            onChange={(e) => handleUpdateWizardDays(parseInt(e.target.value), wizardCustomDaysMatchMode)}
                            className="flex-1 accent-emerald-500 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg cursor-pointer"
                          />
                          <span className="text-[9px] font-mono font-bold text-zinc-400 shrink-0">1 a 30 dias</span>
                        </div>
                      </div>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        <span className="text-[9px] uppercase font-bold text-zinc-400 mr-1">Atalhos:</span>
                        {[1, 2, 3, 4, 5, 7, 10, 15, 20, 30].map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => handleUpdateWizardDays(d, wizardCustomDaysMatchMode)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer border ${
                              wizardCustomDays === d
                                ? 'bg-emerald-500 text-black border-emerald-500 font-black shadow-xs'
                                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                            }`}
                          >
                            {d} {d === 1 ? 'dia' : 'd'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SELEÇÃO INDIVIDUAL E VISUAL DE CLIENTES */}
                  <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <label className="font-extrabold text-zinc-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Clientes que Receberão a Mensagem</span>
                        </label>
                        <p className="text-[10px] text-zinc-500">
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{wizardSelectedClientIds.length}</span> de {enrichedClients.length} clientes selecionados
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            const currentIds = wizardFilteredClients.map(c => c.id);
                            setWizardSelectedClientIds(prev => Array.from(new Set([...prev, ...currentIds])));
                          }}
                          className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <CheckSquare className="w-3 h-3 text-emerald-500" />
                          <span>Marcar Todos</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const currentIds = new Set(wizardFilteredClients.map(c => c.id));
                            setWizardSelectedClientIds(prev => prev.filter(id => !currentIds.has(id)));
                          }}
                          className="text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Square className="w-3 h-3 text-zinc-400" />
                          <span>Desmarcar</span>
                        </button>
                      </div>
                    </div>

                    {/* Busca rápida na lista */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Buscar cliente por nome, telefone ou bairro..."
                        value={wizardClientSearch}
                        onChange={(e) => setWizardClientSearch(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-750 rounded-xl pl-8 pr-7 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                      />
                      {wizardClientSearch && (
                        <button
                          type="button"
                          onClick={() => setWizardClientSearch('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Lista scrollável de cards de cliente com checkboxes */}
                    <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 border border-zinc-200 dark:border-zinc-800 rounded-xl p-2 bg-zinc-50/50 dark:bg-zinc-900/50">
                      {wizardFilteredClients.length === 0 ? (
                        <div className="p-4 text-center text-zinc-400 text-xs">
                          Nenhum cliente cadastrado ou encontrado com este filtro.
                        </div>
                      ) : (
                        wizardFilteredClients.map(client => {
                          const isChecked = wizardSelectedClientIds.includes(client.id);
                          const rawPhone = formatClientPhone(client.whatsapp);
                          const dias = client.diasSemComprar === 999 ? 'Sem pedidos' : `${client.diasSemComprar}d sem pedir`;
                          const firstLetter = (client.nome || 'C').charAt(0).toUpperCase();

                          return (
                            <div
                              key={client.id}
                              onClick={() => {
                                setWizardSelectedClientIds(prev => 
                                  prev.includes(client.id) ? prev.filter(id => id !== client.id) : [...prev, client.id]
                                );
                              }}
                              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                isChecked 
                                  ? 'bg-emerald-500/10 border-emerald-500/40 dark:bg-emerald-950/30 dark:border-emerald-500/50 shadow-xs' 
                                  : 'bg-white dark:bg-zinc-850 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {}} // Handled by parent div onClick
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-zinc-300 pointer-events-none shrink-0"
                                />
                                <div className="w-7 h-7 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 flex items-center justify-center font-bold text-xs shrink-0">
                                  {firstLetter}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-zinc-900 dark:text-white truncate text-xs flex items-center gap-1.5">
                                    <span>{client.nome || 'Cliente'}</span>
                                    {client.is_vip && (
                                      <span className="bg-amber-500/10 text-amber-500 text-[9px] px-1.5 py-0.2 rounded font-bold">VIP</span>
                                    )}
                                  </p>
                                  <p className="text-[10px] text-zinc-400 flex items-center gap-1">
                                    <MessageCircle className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                                    <span>{rawPhone}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0 text-right">
                                <div className="text-[10px]">
                                  <span className={`inline-block px-1.5 py-0.5 rounded font-medium ${
                                    client.diasSemComprar > 15 ? 'bg-rose-500/10 text-rose-500 dark:bg-rose-950/30' :
                                    client.diasSemComprar > 7 ? 'bg-amber-500/10 text-amber-500 dark:bg-amber-950/30' :
                                    'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                                  }`}>
                                    {dias}
                                  </span>
                                  <p className="text-[9px] text-zinc-400 mt-0.5">
                                    {client.total_pedidos} ped. • R$ {Number(client.total_gasto || 0).toFixed(0)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                      Proteção Anti-Spam (Dias Mínimos desde o último envio)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={antiSpamDays}
                      onChange={(e) => setAntiSpamDays(parseInt(e.target.value) || 0)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                    />
                    <p className="text-[10px] text-zinc-400">
                      Evita mandar mensagens repetidas para clientes que já receberam disparos recentes.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 2: OFERTA & CUPOM */}
              {campaignStep === 2 && (
                <div className="space-y-4 text-xs">
                  <div className="space-y-1.5">
                    <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                      Tipo de Oferta / Vantagem
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {[
                        { id: 'cupom', label: 'Cupom de Desconto', icon: Tag },
                        { id: 'desconto_pct', label: 'Desconto %', icon: Percent },
                        { id: 'desconto_fixo', label: 'Desconto em R$', icon: DollarSign },
                        { id: 'frete_gratis', label: 'Frete Grátis', icon: Truck },
                        { id: 'produto', label: 'Brinde Especial', icon: ShoppingBag },
                        { id: 'nenhuma', label: 'Sem Oferta', icon: Sparkles },
                      ].map(item => {
                        const IconComp = item.icon;
                        const isSelected = newCampaignOfferType === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setNewCampaignOfferType(item.id as any);
                              if (item.id === 'desconto_pct') {
                                setNewCampaignCupomType('percentual');
                                if (!newCampaignCupom) setNewCampaignCupom('VOLTA10');
                              } else if (item.id === 'desconto_fixo') {
                                setNewCampaignCupomType('fixo');
                                if (!newCampaignCupom) setNewCampaignCupom('OFF15');
                              } else if (item.id === 'frete_gratis') {
                                setNewCampaignCupomType('fixo');
                                setNewCampaignCupom('FRETEGRATIS');
                              } else if (item.id === 'produto') {
                                setNewCampaignCupomType('fixo');
                                setNewCampaignCupom('BRINDEVIP');
                              }
                            }}
                            className={`p-3 rounded-xl border text-left font-bold transition-all flex items-center gap-2.5 ${
                              isSelected
                                ? 'bg-zinc-900 !text-white border-zinc-900 dark:bg-white dark:!text-zinc-950 font-bold shadow-sm'
                                : 'bg-zinc-50 text-zinc-700 border-zinc-200 hover:bg-zinc-100 dark:bg-zinc-800/80 dark:text-zinc-300 dark:border-zinc-700'
                            }`}
                          >
                            <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-amber-400 dark:text-amber-500' : 'text-zinc-400'}`} />
                            <span className="truncate">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {newCampaignOfferType !== 'nenhuma' && (
                    <div className="bg-zinc-50/80 dark:bg-zinc-900/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                      {/* Code and Randomizer */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                            <Tag className="w-3.5 h-3.5 text-amber-500" />
                            Código do Cupom (Ativado no Cardápio)
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const samples = ['VOLTAJA10', 'VIP15', 'PROMO10', 'DELICIA10', 'DESCONTO10', 'OFF15', 'BEMVINDO10', 'QUERO10'];
                              const random = samples[Math.floor(Math.random() * samples.length)];
                              setNewCampaignCupom(random);
                            }}
                            className="text-[10px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                          >
                            🎲 Gerar Código
                          </button>
                        </div>
                        <input
                          type="text"
                          placeholder="Ex: VOLTAJA10"
                          value={newCampaignCupom}
                          onChange={(e) => setNewCampaignCupom(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                          className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white shadow-sm"
                        />
                      </div>

                      {/* Discount Type & Value */}
                      {newCampaignOfferType !== 'frete_gratis' && newCampaignOfferType !== 'produto' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                              Tipo de Desconto
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                type="button"
                                onClick={() => setNewCampaignCupomType('percentual')}
                                className={`py-2 px-3 rounded-lg border font-bold text-[11px] transition-all ${
                                  newCampaignCupomType === 'percentual'
                                    ? 'bg-zinc-900 !text-white border-zinc-900 dark:bg-white dark:!text-zinc-900'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                % Porcentagem
                              </button>
                              <button
                                type="button"
                                onClick={() => setNewCampaignCupomType('fixo')}
                                className={`py-2 px-3 rounded-lg border font-bold text-[11px] transition-all ${
                                  newCampaignCupomType === 'fixo'
                                    ? 'bg-zinc-900 !text-white border-zinc-900 dark:bg-white dark:!text-zinc-900'
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                                }`}
                              >
                                R$ Valor Fixo
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                              Valor do Desconto ({newCampaignCupomType === 'percentual' ? '%' : 'R$'})
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                min="1"
                                placeholder={newCampaignCupomType === 'percentual' ? 'Ex: 10 (para 10%)' : 'Ex: 15 (para R$ 15,00)'}
                                value={newCampaignOfferVal || newCampaignCupomValue}
                                onChange={(e) => {
                                  setNewCampaignOfferVal(e.target.value);
                                  setNewCampaignCupomValue(e.target.value);
                                }}
                                className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white shadow-sm font-bold"
                              />
                              <span className="absolute right-3.5 top-2.5 text-zinc-400 font-bold text-xs">
                                {newCampaignCupomType === 'percentual' ? '%' : 'R$'}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Minimum Purchase & Validity */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                            Pedido Mínimo (R$)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0 (Sem pedido mínimo)"
                            value={newCampaignCupomMinOrder}
                            onChange={(e) => setNewCampaignCupomMinOrder(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white shadow-sm"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                            Validade do Cupom
                          </label>
                          <select
                            value={newCampaignCupomValidityDays}
                            onChange={(e) => setNewCampaignCupomValidityDays(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white shadow-sm"
                          >
                            <option value="3">3 dias (Urgência máxima)</option>
                            <option value="7">7 dias (Recomendado)</option>
                            <option value="15">15 dias</option>
                            <option value="30">30 dias</option>
                            <option value="0">Sem validade (Vitalício)</option>
                          </select>
                        </div>
                      </div>

                      {/* Product selection if item offer */}
                      {newCampaignOfferType === 'produto' && (
                        <div className="space-y-1.5">
                          <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                            Selecione o Produto / Brinde
                          </label>
                          <select
                            value={newCampaignProductId}
                            onChange={(e) => setNewCampaignProductId(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 dark:focus:border-white shadow-sm"
                          >
                            <option value="">Selecione um item do cardápio...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} - R$ {Number(p.preco || 0).toFixed(2)}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Live Functional Status Indicator */}
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold text-[11px] text-emerald-800 dark:text-emerald-300">
                            Cupom 100% Funcional e Ativo no Cardápio
                          </p>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                            Ao criar a campanha, o cupom <strong className="font-mono">{newCampaignCupom || 'VOLTAJA10'}</strong> será cadastrado no banco de dados e estará imediatamente válido para os clientes no cardápio online!
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: MENSAGEM & DISPARO */}
              {campaignStep === 3 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                  
                  {/* Left: Message Editor */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                        Texto da Mensagem
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          handleGenerateAiMessage();
                          setShowAiModal(true);
                        }}
                        className="bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Gerar com IA</span>
                      </button>
                    </div>

                    <textarea
                      rows={7}
                      value={newCampaignMessage}
                      onChange={(e) => setNewCampaignMessage(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900 leading-relaxed font-sans"
                      placeholder="Olá {nome}, tudo bem? Sentimos sua falta aqui no {nome_restaurante}! Use o cupom {cupom} para {desconto}: {link_pedido}"
                    />

                    {/* Available Variables */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Variáveis dinâmicas disponíveis:</p>
                      <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                        {['{nome}', '{dias_sem_comprar}', '{cupom}', '{desconto}', '{nome_restaurante}', '{produto_favorito}', '{link_pedido}'].map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => setNewCampaignMessage(prev => prev + ' ' + v)}
                            className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700"
                          >
                            + {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right: WhatsApp Preview Screen */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">Pré-visualização WhatsApp:</p>
                    <div className="bg-[#e5ddd5] dark:bg-[#0b141a] rounded-2xl p-4 border border-zinc-300 dark:border-zinc-800 shadow-inner space-y-3">
                      <div className="bg-[#075e54] text-white px-3 py-2 rounded-xl text-[11px] font-bold flex items-center justify-between">
                        <span>{currentStore.name}</span>
                        <span className="text-[9px] opacity-80">Online</span>
                      </div>

                      <div className="flex justify-end">
                        <div className="bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-2xl rounded-tr-xs p-3.5 max-w-[85%] text-xs shadow-xs space-y-1">
                          <p className="whitespace-pre-line leading-relaxed">{renderedPreviewText}</p>
                          <p className="text-[9px] text-right text-zinc-500 dark:text-zinc-400 font-mono">
                            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ✓✓
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {/* Wizard Footer Controls */}
              <div className="flex justify-between items-center pt-4 border-t border-zinc-200 dark:border-zinc-800">
                {campaignStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCampaignStep((campaignStep - 1) as any)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400"
                  >
                    Voltar
                  </button>
                ) : <div />}

                <div className="flex gap-2">
                  {campaignStep < 3 ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (campaignStep === 1 && wizardSelectedClientIds.length === 0) {
                          showToast('Selecione pelo menos 1 cliente para avançar com a campanha.', 'error');
                          return;
                        }
                        setCampaignStep((campaignStep + 1) as any);
                      }}
                      className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      <span className="!text-white dark:!text-zinc-950 font-bold">Avançar</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLaunchCampaign}
                      className="bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
                    >
                      <Send className="w-4 h-4" />
                      <span>Iniciar Disparos</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: FILA DE DISPARO INTERATIVO WHATSAPP                              */}
      {/* ========================================================================= */}
      {dispatchQueue && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl space-y-6 text-zinc-900 dark:text-white">
            
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-850">
              <div>
                <h3 className="text-base font-extrabold uppercase">Fila de Disparos WhatsApp</h3>
                <p className="text-xs text-zinc-500">
                  Progresso: {dispatchQueue.currentIndex + 1} de {dispatchQueue.clientsList.length} clientes
                </p>
              </div>
              <button 
                onClick={() => setDispatchQueue(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs text-center">
              {(() => {
                const currentClient = dispatchQueue.clientsList[dispatchQueue.currentIndex];
                if (!currentClient) return null;

                return (
                  <div className="space-y-4">
                    <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
                      <Send className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-black text-zinc-900 dark:text-white">
                        {currentClient.nome}
                      </h4>
                      <p className="text-xs font-mono text-zinc-500">
                        {currentClient.whatsapp} • {currentClient.diasSemComprar} dias sem pedir
                      </p>
                    </div>

                    <div className="bg-zinc-50 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 text-left text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                      <p className="font-bold text-[10px] text-zinc-400 uppercase mb-1">Mensagem personalizada:</p>
                      <p className="whitespace-pre-line">
                        {replaceTemplateVariables(dispatchQueue.campaign.mensagem_template, {
                          client: currentClient,
                          store: currentStore,
                          cupom: dispatchQueue.campaign.cupom_codigo || '',
                          desconto: '10% OFF',
                          produtoNome: dispatchQueue.campaign.produto_nome
                        })}
                      </p>
                    </div>

                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        onClick={handleSendNextInQueue}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-black py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md"
                      >
                        <Send className="w-4 h-4" />
                        <span>Abrir WhatsApp & Avançar</span>
                      </button>

                      <button
                        onClick={() => {
                          if (dispatchQueue.currentIndex + 1 < dispatchQueue.clientsList.length) {
                            setDispatchQueue({
                              ...dispatchQueue,
                              currentIndex: dispatchQueue.currentIndex + 1
                            });
                          } else {
                            setDispatchQueue(null);
                          }
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 py-1 font-bold"
                      >
                        Pular este cliente
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: SUGESTÕES DE CÓPIA POR INTELIGÊNCIA ARTIFICIAL                    */}
      {/* ========================================================================= */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl space-y-6 text-zinc-900 dark:text-white">
            
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-850">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold">Gerador de Mensagens com IA</h3>
              </div>
              <button 
                onClick={() => setShowAiModal(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider text-[10px]">
                  Objetivo da Campanha
                </label>
                <select
                  value={aiObjective}
                  onChange={(e) => setAiObjective(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-900"
                >
                  {AI_OBJECTIVES.map(obj => (
                    <option key={obj.id} value={obj.id}>{obj.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleGenerateAiMessage}
                  disabled={isGeneratingAi}
                  className="bg-zinc-900 hover:bg-black !text-white dark:bg-white dark:!text-zinc-950 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingAi ? 'animate-spin' : ''}`} />
                  <span className="!text-white dark:!text-zinc-950 font-bold">Gerar Novas Variações</span>
                </button>
              </div>

              {aiVariations && (
                <div className="space-y-3 pt-2">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase">Escolha sua variação favorita:</p>

                  <div 
                    onClick={() => {
                      setNewCampaignMessage(aiVariations.curta);
                      setShowAiModal(false);
                      showToast('Variação Curta aplicada!', 'success');
                    }}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer transition-all space-y-1"
                  >
                    <span className="text-[9px] font-black uppercase text-zinc-500">Variação 1: Direta & Curta</span>
                    <p className="text-zinc-900 dark:text-white leading-relaxed">{aiVariations.curta}</p>
                  </div>

                  <div 
                    onClick={() => {
                      setNewCampaignMessage(aiVariations.persuasiva);
                      setShowAiModal(false);
                      showToast('Variação Persuasiva aplicada!', 'success');
                    }}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer transition-all space-y-1"
                  >
                    <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400">Variação 2: Persuasiva (Maior Conversão)</span>
                    <p className="text-zinc-900 dark:text-white leading-relaxed">{aiVariations.persuasiva}</p>
                  </div>

                  <div 
                    onClick={() => {
                      setNewCampaignMessage(aiVariations.humanizada);
                      setShowAiModal(false);
                      showToast('Variação Humanizada aplicada!', 'success');
                    }}
                    className="p-3.5 bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl cursor-pointer transition-all space-y-1"
                  >
                    <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400">Variação 3: Amigável & Humanizada</span>
                    <p className="text-zinc-900 dark:text-white leading-relaxed">{aiVariations.humanizada}</p>
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default RecuperacaoWhatsApp;
