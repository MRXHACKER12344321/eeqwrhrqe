import React, { useState, useEffect, useRef } from 'react';
import { db } from '../lib/db';
import { loadProductMeta } from '../lib/productMeta';
import { Store, Category, Product, ProductMeta, Bairro, Order, OrderItem, Cupom } from '../types';
import { supabase } from '../lib/supabaseClient';
import { ShoppingBag, Search, MapPin, Clock, Star, Share2, Plus, Minus, X, Info, Gift, Phone, ShieldCheck, Moon, Sun, ArrowUp, AlertCircle, ShoppingCart, Home, Tag, Trophy, ClipboardList, User, ChevronDown, ChevronRight, Instagram, UtensilsCrossed, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Specialized high-fidelity Synthesizer using Web Audio API (Zero dependencies/MP3 assets required)
const playSound = (type: 'ploc' | 'ding' | 'error') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    if (type === 'ploc') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      // Short pop sound on item add
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else if (type === 'ding') {
      // Elegant "prin prin" (trim trim) double bell chime
      // First "prin" (Pulse 1)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.type = 'triangle'; // rich harmonic sound
      osc1.frequency.setValueAtTime(1050, ctx.currentTime); // high pitch
      osc1.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.12);
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 0.02); // Maximum clear volume
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);

      // Second "prin" (Pulse 2)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1050, ctx.currentTime + 0.12); // double ring
      osc2.frequency.exponentialRampToValueAtTime(1300, ctx.currentTime + 0.24);
      gain2.gain.setValueAtTime(0, ctx.currentTime + 0.12);
      gain2.gain.linearRampToValueAtTime(0.65, ctx.currentTime + 0.14); // Maximum clear volume
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.3);
    } else if (type === 'error') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      // Alert buzz
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch (e) {
    // Graceful fallback if browser policies block audio
  }
};

const normalizeSlug = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const formatPhone = (phoneNum: string): string => {
  if (!phoneNum) return '';
  const clean = phoneNum.replace(/\D/g, '');
  if (clean.length === 13 && clean.startsWith('55')) {
    const ddd = clean.slice(2, 4);
    const firstPart = clean.slice(4, 9);
    const secondPart = clean.slice(9);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }
  if (clean.length === 11) {
    const ddd = clean.slice(0, 2);
    const firstPart = clean.slice(2, 7);
    const secondPart = clean.slice(7);
    return `(${ddd}) ${firstPart}-${secondPart}`;
  }
  return phoneNum;
};

// Reusable premium icon components for payment methods
const PixLogoIcon = ({ className = "w-8 h-8 shrink-0" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={`${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#32BCAD" />
    <path d="M50 20L80 50L50 80L20 50L50 20Z" stroke="white" strokeWidth="6" strokeLinejoin="round" />
    <path d="M50 35L65 50L50 65L35 50L50 35Z" fill="white" />
  </svg>
);

const DinheiroIcon = ({ className = "w-8 h-8 shrink-0" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={`${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#E8F5E9" />
    <rect x="18" y="30" width="64" height="40" rx="6" fill="#4CAF50" />
    <circle cx="50" cy="50" r="10" fill="#81C784" />
    <circle cx="50" cy="50" r="7" fill="none" stroke="white" strokeWidth="2" />
    <rect x="25" y="36" width="6" height="6" rx="1.5" fill="white" opacity="0.6" stroke="none" />
    <rect x="69" y="58" width="6" height="6" rx="1.5" fill="white" opacity="0.6" stroke="none" />
  </svg>
);

const CartaoIcon = ({ className = "w-8 h-8 shrink-0" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={`${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="#D1E8FC" />
    <rect x="18" y="30" width="64" height="40" rx="6" fill="#1565C0" />
    <rect x="18" y="38" width="64" height="8" fill="#0D47A1" />
    <rect x="25" y="52" width="12" height="8" rx="1.5" fill="#FFC107" />
    <rect x="60" y="55" width="12" height="4" rx="1" fill="white" opacity="0.6" />
  </svg>
);

interface PublicMenuProps {
  storeSlug: string;
}

export default function CardapioPublico({ storeSlug }: PublicMenuProps) {
  // DB States
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [loading, setLoading] = useState(true);
  
  // App UI/cart state
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [discount, setDesconto] = useState(0);
  const [activeCupom, setActiveCupom] = useState<string>('');
  const [cupomInput, setCupomInput] = useState('');
  const [cupomError, setCupomError] = useState('');
  const [cupomSuccess, setCupomSuccess] = useState('');
  const [shakeCupom, setShakeCupom] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [storeExtras, setStoreExtras] = useState<any>({
    fallback_bairro_msg: 'Seu bairro não foi encontrado no sistema? Finaliza o pedido e manda a localização no WhatsApp!',
    sms_verification_required: false,
    fid_brinde_ativo: false,
    fid_brinde_txt: '',
    fid_meta_pedidos: 10,
    fid_pts_por_real: 1,
    fid_cashback_pct: 5,
    fid_bronze_min: 0,
    fid_prata_min: 5,
    fid_ouro_min: 15
  });

  // Modals state
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [activeProductMeta, setActiveProductMeta] = useState<ProductMeta | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [infoActiveTab, setInfoActiveTab] = useState<'sobre' | 'horario' | 'pagamento'>('sobre');
  const [isCustomAnnouncementOpen, setIsCustomAnnouncementOpen] = useState(true);
  
  // Navigation & Screen Redesign states
  const [activeTab, setActiveTab] = useState<'inicio' | 'promocoes' | 'fidelidade' | 'pedidos' | 'perfil'>('inicio');
  const [profileSubSection, setProfileSubSection] = useState<'menu' | 'endereco'>('menu');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Pizza customization states
  const [selectPao, setSelectPao] = useState<string>('');
  const [selectCarne, setSelectCarne] = useState<string>('1 hambúrguer');
  const [selectPonto, setSelectPonto] = useState<string>('');
  const [selectedAddons, setSelectedAddons] = useState<{ [key: string]: boolean }>({});
  const [removedIngredients, setRemovedIngredients] = useState<{ [key: string]: boolean }>({});
  // Dynamic optionGroups selections: { groupId: itemId[] }
  const [selectedOptionItems, setSelectedOptionItems] = useState<{ [groupId: string]: string[] }>({});
  const [observation, setObservation] = useState('');
  const [productQty, setProductQty] = useState(1);
  const [validationError, setValidationError] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Present/Shaking urgent promo
  const [showUrgentPromoBox, setShowUrgentPromoBox] = useState(false);
  const [urgentPromoCountdown, setUrgentPromoCountdown] = useState(720); // 12 mins in seconds
  const [showPromoLancheModal, setShowPromoLancheModal] = useState(false);
  const [showPromoPopup, setShowPromoPopup] = useState(false);

  // Upsell cross-selling state
  const [showUpsell, setShowUpsell] = useState(false);
  const [upsellProduct, setUpsellProduct] = useState<Product | null>(null);

  // Voltar ao topo state
  const [showBackToTop, setShowBackToTop] = useState(false);

  // User persistent profile data
  const DEFAULT_CUSTOMER_INFO = {
    nome: '',
    whatsapp: '',
    endereco: '',
    rua: '',
    numero: '',
    bairro: '',
    complemento: '',
    referencia: '',
    formaPagamento: 'PIX' as 'PIX' | 'Cartão' | 'Dinheiro',
    troco: '',
  };

  const [customerInfo, setCustomerInfo] = useState(DEFAULT_CUSTOMER_INFO);

  // Profile auth states
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [profileAction, setProfileAction] = useState<'login' | 'register'>('register');
  const [profilePhoneInput, setProfilePhoneInput] = useState('');
  const [profileNameInput, setProfileNameInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [pendingRegistration, setPendingRegistration] = useState<{ nome: string; whatsapp: string } | null>(null);

  // Local state for orders (to simulate recent purchase)
  const [recentOrderNum, setRecentOrderNum] = useState<number | null>(null);

  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistoryOrders = async () => {
    if (!store || !customerInfo.whatsapp) {
      setHistoryOrders([]);
      return;
    }
    try {
      setLoadingHistory(true);
      const allOrders = await db.getOrders(store.id);
      const filtered = allOrders.filter(o => {
        const cleanO = o.cliente_whatsapp.replace(/\D/g, '');
        const cleanC = customerInfo.whatsapp.replace(/\D/g, '');
        return cleanO === cleanC && cleanC.length > 0;
      });
      setHistoryOrders(filtered);
    } catch (err) {
      console.error('Error fetching history orders', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const currentOrder = historyOrders.find(o => o.numero_pedido === recentOrderNum) || historyOrders[0] || null;
  const orderStatusLabel = currentOrder ?
    currentOrder.status === 'novo' ? 'Aguardando Preparação' :
    currentOrder.status === 'preparando' ? 'Preparando na grelha' :
    currentOrder.status === 'saiu_entrega' ? 'Saiu para entrega' :
    currentOrder.status === 'entregue' ? 'Pedido entregue' :
    'Pedido em andamento' :
    recentOrderNum ? 'Pedido registrado. Aguardando sincronia.' :
    'Preparando na grelha';

  const statusIsPreparing = currentOrder ? ['novo', 'preparando'].includes(currentOrder.status) : false;
  const statusIsOnTheWay = currentOrder ? ['saiu_entrega', 'entregue'].includes(currentOrder.status) : false;
  const statusIsDelivered = currentOrder ? currentOrder.status === 'entregue' : false;

  useEffect(() => {
    fetchHistoryOrders();
  }, [customerInfo.whatsapp, userLoggedIn, activeTab, recentOrderNum, store?.id]);

  // Loyalty and Ranking states
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);

  // Refs for Scroll Spy implementation
  const categoryRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  // Storage key helper to scope customer data per store (keeps new stores virgin)
  const storageKey = (key: string) => `${key}_${store?.id || 'global'}`;

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    playSound(type === 'success' ? 'ding' : 'error');
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const normalizeSmsRecipient = (phone: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 10 || clean.length === 11) {
      if (!clean.startsWith('55')) {
        clean = `55${clean}`;
      }
    }
    return clean;
  };

  const generateVerificationCode = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
  };

  const sendSmsVerificationCode = async (phone: string, code: string) => {
    const recipient = normalizeSmsRecipient(phone);
    const message = `Seu código de verificação é ${code}. Use-o para confirmar seu cadastro no cardápio.`;
    const smsUrl = `sms:${recipient}?body=${encodeURIComponent(message)}`;

    try {
      window.open(smsUrl, '_blank');
      showToast('Tentando abrir o app de SMS para enviar o código.', 'success');
    } catch (err) {
      console.warn('Não foi possível abrir o app de SMS:', err);
      showToast('Código gerado. Verifique seu SMS ou use o código exibido.', 'success');
    }
  };

  const saveSmsVerificationRecord = async (phone: string, code: string) => {
    if (!store?.id) return;
    try {
      await supabase.from('sms_verification_codes').insert([{ 
        loja_id: store.id,
        phone,
        code,
        used: false,
        attempts: 0,
        expires_at: new Date(Date.now() + 1000 * 60 * 10).toISOString()
      }]);
    } catch (err) {
      console.warn('Não foi possível salvar o código de verificação no Supabase:', err);
    }
  };

  const markSmsCodeUsed = async (codeId: string) => {
    try {
      await supabase.from('sms_verification_codes').update({ used: true, verified_at: new Date().toISOString() }).eq('id', codeId);
    } catch (err) {
      console.warn('Não foi possível marcar o código como usado no Supabase:', err);
    }
  };

  const findRegisteredUserByPhone = async (cleanPhone: string): Promise<{ nome: string; whatsapp: string } | null> => {
    try {
      const usersInStore = JSON.parse(localStorage.getItem(storageKey('pedifacil_registered_users')) || '[]');
      const localUser = usersInStore.find((u: any) => u.whatsapp === cleanPhone);
      if (localUser) {
        return { nome: localUser.nome || '', whatsapp: cleanPhone };
      }
    } catch (err) {
      console.warn('Erro ao ler usuários cadastrados no localStorage:', err);
    }

    try {
      const { data: dbUser, error: dbError } = await supabase
        .from('profiles')
        .select('*')
        .eq('whatsapp', cleanPhone)
        .maybeSingle();
      if (dbUser && !dbError) {
        return { nome: dbUser.nome || '', whatsapp: dbUser.whatsapp };
      }
    } catch (err) {
      console.warn('Erro ao consultar usuário no Supabase:', err);
    }

    return null;
  };

  const syncRegisteredUserToLocalStorage = (cleanPhone: string, name: string) => {
    try {
      const usersInStore = JSON.parse(localStorage.getItem(storageKey('pedifacil_registered_users')) || '[]');
      const existingIdx = usersInStore.findIndex((u: any) => u.whatsapp === cleanPhone);
      if (existingIdx >= 0) {
        usersInStore[existingIdx].nome = name;
      } else {
        usersInStore.push({ nome: name, whatsapp: cleanPhone });
      }
      localStorage.setItem(storageKey('pedifacil_registered_users'), JSON.stringify(usersInStore));
    } catch (err) {
      console.warn('Erro ao sincronizar usuário com pedifacil_registered_users:', err);
    }
  };

  const resetCurrentProfileState = () => {
    setCustomerInfo(DEFAULT_CUSTOMER_INFO);
    setProfileNameInput('');
    setProfilePhoneInput('');
    setUserLoggedIn(false);
    setLoyaltyPoints(0);
    setHistoryOrders([]);
    setRecentOrderNum(null);
    setCart([]);
    localStorage.removeItem(storageKey('pedifacil_customer_profile'));
    localStorage.setItem(storageKey('pedifacil_user_logged_in'), 'false');
  };

  const completeUserRegistration = async (name: string, cleanPhone: string) => {
    const alreadyRegistered = await findRegisteredUserByPhone(cleanPhone);
    if (alreadyRegistered) {
      showToast('Telefone já cadastrado. Faça login para continuar.', 'success');
      setProfileAction('login');
      setProfilePhoneInput(cleanPhone);
      setProfileNameInput(alreadyRegistered.nome || name);
      setOtpSent(false);
      setPendingRegistration(null);
      setOtpInput('');
      return;
    }

    try {
      await supabase
        .from('profiles')
        .upsert({
          nome: name,
          whatsapp: cleanPhone,
          loyalty_points: 0
        });
    } catch (err) {
      console.warn('Ação de Supabase ignorada:', err);
    }

    // Upsert into store's clientes table to trigger Supabase Realtime in admin panel
    try {
      await supabase
        .from('clientes')
        .upsert({
          loja_id: store.id,
          nome: name,
          whatsapp: cleanPhone,
          total_pedidos: 0,
          total_gasto: 0,
          is_vip: false,
          level: 'Bronze',
          bloqueado: false
        }, { onConflict: 'loja_id,whatsapp' });
    } catch (err) {
      console.warn('Erro ao sincronizar cliente no Supabase:', err);
    }

    // Update isolated store clients localStorage
    try {
      const storeKey = `pedifacil_db_clients_${store.id}`;
      const storeClients = JSON.parse(localStorage.getItem(storeKey) || '[]');
      const clIdx = storeClients.findIndex((c: any) => c.whatsapp === cleanPhone);
      if (clIdx >= 0) {
        storeClients[clIdx].nome = name;
      } else {
        storeClients.unshift({
          id: `cl-${Date.now()}`,
          store_id: store.id,
          nome: name,
          whatsapp: cleanPhone,
          total_pedidos: 0,
          total_gasto: 0,
          is_vip: false,
          level: 'Bronze',
          bloqueado: false
        });
      }
      localStorage.setItem(storeKey, JSON.stringify(storeClients));
    } catch (err) {}

    const updatedInfo = {
      ...DEFAULT_CUSTOMER_INFO,
      nome: name,
      whatsapp: cleanPhone,
    };
    setCustomerInfo(updatedInfo);
    localStorage.setItem(storageKey('pedifacil_customer_profile'), JSON.stringify(updatedInfo));
    localStorage.setItem(storageKey('pedifacil_user_logged_in'), 'true');

    syncRegisteredUserToLocalStorage(cleanPhone, name);

    const savedPhonePoints = localStorage.getItem(`${storageKey('pedifacil_loyalty_points')}_${cleanPhone}`);
    const initialPts = savedPhonePoints ? parseInt(savedPhonePoints, 10) : 0;
    setLoyaltyPoints(initialPts);
    setUserLoggedIn(true);
    setOtpSent(false);
    setPendingRegistration(null);
    setOtpInput('');
    setCart([]);
    setHistoryOrders([]);
    setRecentOrderNum(null);
    showToast('Conta criada com sucesso! 🌟', 'success');
  };

  const verifyRegistrationCode = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && 'preventDefault' in e) {
      e.preventDefault();
    }
    if (!pendingRegistration) return;
    const cleanPhone = pendingRegistration.whatsapp;
    const codeInput = otpInput.trim();

    let verified = false;
    let remoteRecordId: string | null = null;

    try {
      const { data, error } = await supabase
        .from('sms_verification_codes')
        .select('*')
        .eq('phone', cleanPhone)
        .eq('code', codeInput)
        .eq('used', false)
        .gte('expires_at', new Date().toISOString())
        .limit(1)
        .single();

      if (!error && data) {
        remoteRecordId = data.id;
        verified = true;
      }
    } catch (err) {
      console.warn('Erro ao consultar código de verificação no Supabase:', err);
    }

    if (!verified) {
      const expectedCode = localStorage.getItem(`${storageKey('pedifacil_sms_verification')}_${cleanPhone}`);
      const expiry = Number(localStorage.getItem(`${storageKey('pedifacil_sms_verification_expiry')}_${cleanPhone}`) || '0');
      if (!expectedCode) {
        showToast('Nenhum código encontrado. Solicite o envio novamente.', 'error');
        return;
      }
      if (Date.now() > expiry) {
        showToast('O código expirou. Solicite um novo código.', 'error');
        setOtpSent(false);
        setPendingRegistration(null);
        return;
      }
      if (codeInput !== expectedCode) {
        showToast('Código inválido! Verifique e tente novamente.', 'error');
        return;
      }
      verified = true;
    }

    if (verified) {
      if (remoteRecordId) {
        await markSmsCodeUsed(remoteRecordId);
      }
      localStorage.removeItem(`${storageKey('pedifacil_sms_verification')}_${cleanPhone}`);
      localStorage.removeItem(`${storageKey('pedifacil_sms_verification_expiry')}_${cleanPhone}`);
      await completeUserRegistration(pendingRegistration.nome, cleanPhone);
    }
  };

  const startSmsRegistration = async (cleanPhone: string, name: string) => {
    const code = generateVerificationCode();
    localStorage.setItem(`${storageKey('pedifacil_sms_verification')}_${cleanPhone}`, code);
    localStorage.setItem(`${storageKey('pedifacil_sms_verification_expiry')}_${cleanPhone}`, String(Date.now() + 1000 * 60 * 10));
    setPendingRegistration({ nome: name, whatsapp: cleanPhone });
    setOtpSent(true);
    setOtpInput('');
    await saveSmsVerificationRecord(cleanPhone, code);
    await sendSmsVerificationCode(cleanPhone, code);
    showToast('Código de verificação enviado por SMS. Digite-o abaixo para confirmar.', 'success');
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Load target store config from Supabase (or localStorage fallback)
        let storeData = await db.getStoreBySlug(storeSlug);
        
        // If still not found, try to sync from localStorage and retry
        if (!storeData) {
          const localStores = JSON.parse(localStorage.getItem('pedifacil_db_stores') || '[]');
          const normalizedTarget = storeSlug.trim().toLowerCase();
          const localMatch = localStores.find((s: any) => {
            const sSlug = (s.slug || s.nome || s.name || '').toString().toLowerCase().trim();
            return sSlug === normalizedTarget;
          });
          if (localMatch) {
            storeData = localMatch;
          }
        }
        
        if (storeData) {
          const fallbackName = storeData.name || storeData.nome || storeData.slug || storeData.cidade || 'Loja';
          storeData.name = fallbackName;
          // Sync with local stores backup & extras in case updated locally in Admin
          const localStores = JSON.parse(localStorage.getItem('pedifacil_db_stores') || '[]');
          const normalizedTarget = normalizeSlug(storeSlug);
          const localMatch = localStores.find((s: any) => {
            const candidateSlug = normalizeSlug(String(s.slug || s.nome || s.name || ''));
            return s.id === storeData.id || candidateSlug === normalizedTarget;
          });
          if (localMatch) {
            if (localMatch.horarios) storeData.horarios = localMatch.horarios;
            if (localMatch.metodos_pagamento) storeData.metodos_pagamento = localMatch.metodos_pagamento;
            if (!storeData.name || storeData.name === 'Loja') storeData.name = localMatch.name || localMatch.nome || localMatch.slug || 'Loja';
            if (!storeData.description || storeData.description === storeData.slogan) {
              storeData.description = localMatch.description || localMatch.descricao || storeData.description;
            }
          }

          // Load extras config
          const localExtras = localStorage.getItem(`pedifacil_store_extras_${storeData.id}`);
          if (localExtras) {
            try {
              const parsedExt = JSON.parse(localExtras);
              if (parsedExt.horarios) storeData.horarios = parsedExt.horarios;
              if (parsedExt.metodos_pagamento) storeData.metodos_pagamento = parsedExt.metodos_pagamento;
              if (parsedExt.fallback_bairro_msg && (parsedExt.fallback_bairro_msg.includes('não foi listado na entrega') || parsedExt.fallback_bairro_msg.includes('não fazemos entregas automáticas'))) {
                parsedExt.fallback_bairro_msg = 'Seu bairro não foi encontrado no sistema? Finaliza o pedido e manda a localização no WhatsApp!';
              }
              setStoreExtras((prev: any) => ({ ...prev, ...parsedExt }));
            } catch (e) {
              console.warn("Error parsing store extras", e);
            }
          }
          setStore(storeData);
          const [cats, prods, feeBairros] = await Promise.all([
            db.getCategories(storeData.id),
            db.getProducts(storeData.id),
            db.getBairros(storeData.id)
          ]);
          setCategories(cats);
          setProducts(prods);
          setBairros(feeBairros);
          
          if (prods.length > 0) {
            // Find a product to suggest for upsell
            const upsell = prods.find(p => (p.category_id || '').includes('batata') || (p.category_id || '').includes('acompanhamento') || (p.name || '').toLowerCase().includes('batata') && p.disponivel);
            if (upsell) setUpsellProduct(upsell);

            // AUTO SHOW POPUP PROMOS ON ENTRY (Only if there are products with promo price)
            const promProds = prods.filter(p => p.preco_promocional && p.preco_promocional < p.preco && p.disponivel);
            if (promProds.length > 0) {
              const hasShown = sessionStorage.getItem('promo_entry_popup_shown');
              if (!hasShown) {
                setTimeout(() => {
                  setShowPromoPopup(true);
                  sessionStorage.setItem('promo_entry_popup_shown', 'true');
                }, 1200);
              }
            }
          }
          // --- Load persistent customer profile scoped to this store ---
          try {
            const storeKey = (k: string) => `${k}_${storeData.id}`;
            const savedProfile = localStorage.getItem(storeKey('pedifacil_customer_profile'));
            if (savedProfile) {
              try {
                const parsed = JSON.parse(savedProfile);
                setCustomerInfo(parsed);
                if (parsed.nome && parsed.whatsapp) {
                  setProfileNameInput(parsed.nome);
                  setProfilePhoneInput(parsed.whatsapp);
                  const loggedIn = localStorage.getItem(storeKey('pedifacil_user_logged_in')) === 'true';
                  setUserLoggedIn(loggedIn);
                  if (loggedIn) {
                    const savedPhonePoints = localStorage.getItem(`${storeKey('pedifacil_loyalty_points')}_${parsed.whatsapp}`);
                    if (savedPhonePoints !== null) {
                      setLoyaltyPoints(parseInt(savedPhonePoints, 10));
                    } else {
                      setLoyaltyPoints(0);
                    }
                  } else {
                    setLoyaltyPoints(0);
                  }
                }
              } catch (e) {}
            } else {
              setUserLoggedIn(false);
              setLoyaltyPoints(0);
            }
          } catch (e) {
            console.warn('Erro ao carregar perfil persistido localmente para a loja:', e);
          }
        }
      } catch (err) {
        console.error('Error fetching menu data', err);
      } finally {
        setTimeout(() => setLoading(false), 900); // Shimmer presentation timeout
      }
    }
    loadData();
    

    // Scroll listener for "Voltar ao topo" and ScrollSpy
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
    };

    // Auto-sync store config from localStorage when window gets focus or storage changes
    const syncStoreFromLocal = () => {
      const localStores = JSON.parse(localStorage.getItem('pedifacil_db_stores') || '[]');
      const match = localStores.find((s: any) => s.slug === storeSlug || (store?.id && s.id === store.id));
      const targetId = store?.id || match?.id;
      const localExtras = targetId ? localStorage.getItem(`pedifacil_store_extras_${targetId}`) : null;
      let ext: any = {};
      if (localExtras) {
        try { ext = JSON.parse(localExtras); } catch (e) {}
      }
      if (match || ext.horarios || ext.metodos_pagamento) {
        setStore(prev => {
          if (!prev) return prev;
          const newHorarios = ext.horarios || match?.horarios || prev.horarios;
          const newMetodos = ext.metodos_pagamento || match?.metodos_pagamento || prev.metodos_pagamento;
          return {
            ...prev,
            ...(match || {}),
            horarios: newHorarios,
            metodos_pagamento: newMetodos
          };
        });
      }
    };

    const handleSyncStoreLocal = () => syncStoreFromLocal();

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('storage', handleSyncStoreLocal);
    window.addEventListener('focus', handleSyncStoreLocal);

    // BroadcastChannel: recebe atualizações instantâneas do Painel Admin (mesma aba ou outras abas)
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('pedifacil_store_update');
      bc.onmessage = (event) => {
        const { type, updateType, storeData, horarios, metodos_pagamento } = event.data;
        
        if (type === 'store_config_updated') {
          // Atualização de configurações da loja
          setStore(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              ...(storeData || {}),
              horarios: horarios || prev.horarios,
              metodos_pagamento: metodos_pagamento || prev.metodos_pagamento
            };
          });
        } else if (type === 'cardapio_data_changed') {
          // Mudança de produtos ou categorias - refrescar dados
          console.log('📡 Recebido evento de mudança no cardápio:', updateType);
          if (updateType === 'products' || updateType === 'full') {
            // Refrescar produtos
            (async () => {
              try {
                const updatedProds = await db.getProducts(store?.id || '');
                setProducts(updatedProds);
              } catch (e) {
                console.warn('Erro ao atualizar produtos após BroadcastChannel:', e);
              }
            })();
          }
          if (updateType === 'categories' || updateType === 'full') {
            // Refrescar categorias
            (async () => {
              try {
                const updatedCats = await db.getCategories(store?.id || '');
                setCategories(updatedCats);
              } catch (e) {
                console.warn('Erro ao atualizar categorias após BroadcastChannel:', e);
              }
            })();
          }
        }
      };
    } catch (e) {
      // BroadcastChannel não suportado, fallback para storage/focus events
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('storage', handleSyncStoreLocal);
      window.removeEventListener('focus', handleSyncStoreLocal);
      if (bc) bc.close();
    };
  }, [storeSlug, store?.id]);

  // ⚡ SUPABASE REALTIME - AUTOMATIC UPDATE ON MENU / CARDAPIO
  useEffect(() => {
    if (!store?.id) return;

    console.log('⚡ Inicializando canais Supabase Realtime para o Cardápio da loja:', store.nome);

    // Debounce timers para evitar múltiplas atualizações em sequência rápida
    let catUpdateTimeout: NodeJS.Timeout;
    let prodUpdateTimeout: NodeJS.Timeout;
    
    const updateCategoriesDebounced = async () => {
      clearTimeout(catUpdateTimeout);
      catUpdateTimeout = setTimeout(async () => {
        try {
          console.log('⏱️ Atualizando categorias após debounce...');
          const updatedCats = await db.getCategories(store.id);
          setCategories(updatedCats);
        } catch (e) {
          console.error('Erro ao recarregar categorias em tempo real:', e);
        }
      }, 500); // Wait 500ms to batch updates
    };

    const updateProductsDebounced = async () => {
      clearTimeout(prodUpdateTimeout);
      prodUpdateTimeout = setTimeout(async () => {
        try {
          console.log('⏱️ Atualizando produtos após debounce...');
          const updatedProds = await db.getProducts(store.id);
          setProducts(updatedProds);
        } catch (e) {
          console.error('Erro ao recarregar produtos em tempo real:', e);
        }
      }, 500); // Wait 500ms to batch updates
    };

    // 1. Canal da Loja (Status Aberto/Fechado, Dados Gerais)
    const storeSub = supabase
      .channel(`realtime-cardapio-loja-${store.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lojas',
          filter: `id=eq.${store.id}`
        },
        async (payload) => {
          console.log('🏪 Loja atualizada em tempo real via Supabase Realtime:', payload.new);
          const d = payload.new as any;
          setStore((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              // Campos com nomes mapeados (banco → estado)
              name: d.nome ?? prev.name,
              slogan: d.slogan ?? prev.slogan,
              description: d.descricao ?? d.description ?? prev.description,
              logo_url: d.logo_url ?? prev.logo_url,
              banner_url: d.banner_url ?? prev.banner_url,
              banner_promo_url: d.banner_promo_url ?? prev.banner_promo_url,
              phone: d.telefone ?? prev.phone,
              whatsapp: d.whatsapp ?? prev.whatsapp,
              cor_primaria: d.cor_primaria ?? prev.cor_primaria,
              cor_secundaria: d.cor_secundaria ?? prev.cor_secundaria,
              aberto: d.aberto ?? prev.aberto,
              pausado: d.pausado ?? prev.pausado,
              tempo_entrega_min: d.tempo_entrega_min ?? prev.tempo_entrega_min,
              tempo_entrega_max: d.tempo_entrega_max ?? prev.tempo_entrega_max,
              taxa_entrega_padrao: d.taxa_entrega_padrao != null ? Number(d.taxa_entrega_padrao) : prev.taxa_entrega_padrao,
              pedido_minimo: d.pedido_minimo != null ? Number(d.pedido_minimo) : prev.pedido_minimo,
              mensagem_topo: d.mensagem_topo ?? prev.mensagem_topo,
              mensagem_rodape: d.mensagem_rodape ?? prev.mensagem_rodape,
              // Campos JSONB críticos: horários e métodos de pagamento
              horarios: d.horarios ?? prev.horarios,
              metodos_pagamento: d.metodos_pagamento ?? prev.metodos_pagamento,
            };
          });
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime Store subscribed');
        } else if (status === 'CLOSED') {
          console.log('❌ Realtime Store disconnected, will retry via polling');
        }
        if (err) console.error('Realtime Store error:', err);
      });

    // 2. Canal de Categorias (Atualizar o menu se mudar)
    const catSub = supabase
      .channel(`realtime-cardapio-categorias-${store.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'categorias',
          filter: `loja_id=eq.${store.id}`
        },
        async (payload) => {
          console.log('📁 Categorias atualizadas em tempo real via Supabase Realtime!');
          updateCategoriesDebounced();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime Categories subscribed');
        } else if (status === 'CLOSED') {
          console.log('❌ Realtime Categories disconnected, will retry via polling');
        }
        if (err) console.error('Realtime Categories error:', err);
      });

    // 3. Canal de Produtos (Preço, disponibilidade, etc.)
    const prodSub = supabase
      .channel(`realtime-cardapio-produtos-${store.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'produtos',
          filter: `loja_id=eq.${store.id}`
        },
        async (payload) => {
          console.log('🍔 Produtos atualizados em tempo real via Supabase Realtime!');
          updateProductsDebounced();
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime Products subscribed');
        } else if (status === 'CLOSED') {
          console.log('❌ Realtime Products disconnected, will retry via polling');
        }
        if (err) console.error('Realtime Products error:', err);
      });

    // 4. Canal de Pedidos (Para que o cliente acompanhe seu pedido em tempo real!)
    const orderSub = supabase
      .channel(`realtime-cardapio-pedidos-${store.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter: `loja_id=eq.${store.id}`
        },
        async (payload) => {
          console.log('📦 Status ou novos pedidos atualizados via Supabase Realtime!');
          await fetchHistoryOrders();

          // Identificar e notificar se houve mudança de status no pedido deste cliente específico
          const updatedOrder = payload.new as any;
          if (updatedOrder && customerInfo.whatsapp) {
            const cleanNewPhone = (updatedOrder.cliente_whatsapp || '').replace(/\D/g, '');
            const cleanCustPhone = (customerInfo.whatsapp || '').replace(/\D/g, '');
            
            if (cleanNewPhone === cleanCustPhone && cleanCustPhone.length > 0) {
              const readableStatus = (() => {
                switch (updatedOrder.status) {
                  case 'novo': return 'Aguardando Aprovação ⏳';
                  case 'preparando': return 'Sendo Preparado 🧑‍🍳';
                  case 'saiu_entrega': return 'A caminho da sua casa! 🛵💨';
                  case 'entregue': return 'Entregue com sucesso! 🎉🏆';
                  case 'cancelado': return 'Cancelado pela loja ❌';
                  default: return updatedOrder.status;
                }
              })();

              showToast(`📦 Pedido #${updatedOrder.numero_pedido || ''} atualizado: ${readableStatus}`, 'success');
              playSound('ding');
            }
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime Orders subscribed');
        } else if (status === 'CLOSED') {
          console.log('❌ Realtime Orders disconnected, will retry via polling');
        }
        if (err) console.error('Realtime Orders error:', err);
      });

    return () => {
      clearTimeout(catUpdateTimeout);
      clearTimeout(prodUpdateTimeout);
      supabase.removeChannel(storeSub);
      supabase.removeChannel(catSub);
      supabase.removeChannel(prodSub);
      supabase.removeChannel(orderSub);
    };
  }, [store?.id, customerInfo.whatsapp]);

  // ♻️ POLLING FALLBACK - Garante sincronização mesmo quando o Realtime falha (celular, rede instável)
  // Busca configurações atualizadas da loja: mais rápido quando em foco, mais lento em background
  useEffect(() => {
    if (!store?.id) return;

    let pollingInterval: NodeJS.Timeout;
    let aggressivePolling = false; // Flag para saber se estamos em foco

    const syncFromSupabase = async () => {
      try {
        const { data } = await supabase
          .from('lojas')
          .select('nome, slogan, descricao, aberto, pausado, horarios, metodos_pagamento, mensagem_topo, mensagem_rodape, cor_primaria, tempo_entrega_min, tempo_entrega_max, taxa_entrega_padrao, pedido_minimo, whatsapp')
          .eq('id', store.id)
          .maybeSingle();

        if (data) {
          setStore((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              name: data.nome ?? prev.name,
              aberto: data.aberto ?? prev.aberto,
              pausado: data.pausado ?? prev.pausado,
              horarios: data.horarios ?? prev.horarios,
              metodos_pagamento: data.metodos_pagamento ?? prev.metodos_pagamento,
              mensagem_topo: data.mensagem_topo ?? prev.mensagem_topo,
              mensagem_rodape: data.mensagem_rodape ?? prev.mensagem_rodape,
              description: data.descricao ?? prev.description,
              cor_primaria: data.cor_primaria ?? prev.cor_primaria,
              tempo_entrega_min: data.tempo_entrega_min ?? prev.tempo_entrega_min,
              tempo_entrega_max: data.tempo_entrega_max ?? prev.tempo_entrega_max,
              taxa_entrega_padrao: data.taxa_entrega_padrao != null ? Number(data.taxa_entrega_padrao) : prev.taxa_entrega_padrao,
              pedido_minimo: data.pedido_minimo != null ? Number(data.pedido_minimo) : prev.pedido_minimo,
              whatsapp: data.whatsapp ?? prev.whatsapp,
            };
          });
        }
      } catch (e) {
        // Silencia erro de rede para não poluir o console do cliente
      }

      try {
        const [updatedCats, updatedProds] = await Promise.all([
          db.getCategories(store.id),
          db.getProducts(store.id)
        ]);
        setCategories(updatedCats);
        setProducts(updatedProds);
      } catch (e) {
        console.warn('Erro ao atualizar categorias/produtos no polling:', e);
      }
    };

    // Sincronizar imediatamente ao montar
    syncFromSupabase();

    // Função para atualizar intervalo de polling baseado em visibilidade
    const updatePollingSpeed = () => {
      if (pollingInterval) clearInterval(pollingInterval);
      
      // Se página está visível, polling a cada 8 segundos (mais rápido para celular)
      // Se página está oculta, polling a cada 60 segundos
      const interval = document.hidden ? 60000 : 8000;
      aggressivePolling = !document.hidden;
      
      pollingInterval = setInterval(syncFromSupabase, interval);
    };

    // Escutar mudanças de visibilidade da página
    document.addEventListener('visibilitychange', updatePollingSpeed);
    
    // Escutar eventos de storage (quando outro tab/janela faz mudanças)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `pedifacil_local_categories_${store.id}` || 
          e.key === `pedifacil_local_products_${store.id}` ||
          e.key === 'pedifacil_db_stores' ||
          e.key === `pedifacil_store_extras_${store.id}`) {
        console.log('📡 Sincronização detectada via localStorage event');
        syncFromSupabase();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Iniciar polling com velocidade apropriada
    updatePollingSpeed();

    return () => {
      clearInterval(pollingInterval);
      document.removeEventListener('visibilitychange', updatePollingSpeed);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [store?.id]);

  // Check URL query parameters for auto-applying coupons (e.g. from WhatsApp campaigns)
  useEffect(() => {
    if (!store?.id) return;
    try {
      let code = '';
      // Check window.location.search
      const searchParams = new URLSearchParams(window.location.search);
      code = searchParams.get('cupom') || searchParams.get('c') || searchParams.get('cupom_codigo') || '';
      
      // Also check hash query (e.g. /#matheus-test?cupom=VOLTAJA10)
      if (!code && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        if (hashQuery) {
          const hashParams = new URLSearchParams(hashQuery);
          code = hashParams.get('cupom') || hashParams.get('c') || hashParams.get('cupom_codigo') || '';
        }
      }

      if (code) {
        setCupomInput(code.toUpperCase().trim());
        // Auto apply if cart has items or pre-fill
        handleApplyCoupon(code.toUpperCase().trim());
      }
    } catch {}
  }, [store?.id]);

  // Urgent Countdown Tick
  useEffect(() => {
    if (!showUrgentPromoBox || urgentPromoCountdown <= 0) return;
    const timer = setInterval(() => {
      setUrgentPromoCountdown(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [showUrgentPromoBox, urgentPromoCountdown]);

  // Lock body scroll when dialogs are open to prevent background scrolling (scroll chaining)
  useEffect(() => {
    const isAnyModalOpen = !!(
      activeProduct ||
      isCartOpen ||
      isCheckoutOpen ||
      isInfoOpen ||
      showPromoPopup ||
      isCategoryModalOpen
    );

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [activeProduct, isCartOpen, isCheckoutOpen, isInfoOpen, showPromoPopup, isCategoryModalOpen]);

  // Reset window scroll position to top whenever active tab changes to prevent carrying over scroll state
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Scroll to category smoothly
  const scrollToCategory = (catId: string) => {
    setSelectedCategory(catId);
    if (catId === 'all') {
      window.scrollTo({ top: 350, behavior: 'smooth' });
      return;
    }
    const element = categoryRefs.current[catId];
    if (element) {
      const topOffset = element.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: topOffset, behavior: 'smooth' });
    }
  };

  // Cart totals calculation
  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getHelperMatchedBairro = (bairroName: string) => {
    const cleanStr = (s: string) => 
      (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
    const typedClean = cleanStr(bairroName);
    return bairros.find(b => cleanStr(b.nome) === typedClean);
  };

  const getActiveDeliveryFee = () => {
    if (!store) return 0;
    const subtotal = getSubtotal();
    if (store.frete_gratis_acima > 0 && subtotal >= store.frete_gratis_acima) {
      return 0; // free delivery goal achieved
    }
    const selectedBairro = getHelperMatchedBairro(customerInfo.bairro);
    return selectedBairro ? selectedBairro.taxa : (customerInfo.bairro.trim() ? store.taxa_entrega_padrao : 0);
  };

  const getOrderTotal = () => {
    return Math.max(0, getSubtotal() + getActiveDeliveryFee() - discount);
  };

  const getDeliveryFeeDisplay = () => {
    if (!customerInfo.bairro || !customerInfo.bairro.trim()) {
      return 'A consultar';
    }
    const fee = getActiveDeliveryFee();
    return fee === 0 ? 'Grátis' : `R$ ${fee.toFixed(2)}`;
  };

  // Checkout and WhatsApp message format
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    if (!store.aberto) {
      showToast('A loja está fechada. Não é possível finalizar o pedido agora.', 'error');
      setIsCheckoutOpen(false);
      return;
    }

    if (!customerInfo.nome.trim()) {
      showToast('Por favor, informe seu nome.', 'error');
      return;
    }
    if (!customerInfo.whatsapp.trim() || customerInfo.whatsapp.length < 9) {
      showToast('Por favor, informe um WhatsApp válido para contato.', 'error');
      return;
    }
    if (!customerInfo.endereco.trim()) {
      showToast('Por favor, informe o endereço de entrega.', 'error');
      return;
    }

    const subtotal = getSubtotal();
    const fee = getActiveDeliveryFee();
    const total = getOrderTotal();

    const generatedUuid = (() => {
      if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
        try {
          return window.crypto.randomUUID();
        } catch (e) {}
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    })();

    // Create the persistent Order payload
    const orderPayload: Order = {
      id: generatedUuid,
      store_id: store.id,
      numero_pedido: 0, // Generated inside DB or db.ts layer
      cliente_nome: customerInfo.nome,
      cliente_whatsapp: customerInfo.whatsapp,
      cliente_endereco: `${customerInfo.rua || customerInfo.endereco}, Nº ${customerInfo.numero || ''}`,
      cliente_bairro: customerInfo.bairro || undefined,
      cliente_complemento: customerInfo.complemento || undefined,
      subtotal,
      taxa_entrega: fee,
      desconto: discount,
      total,
      forma_pagamento: customerInfo.formaPagamento,
      troco: customerInfo.formaPagamento === 'Dinheiro' ? (customerInfo.troco || undefined) : undefined,
      observacoes: customerInfo.referencia || undefined,
      cupom_codigo: activeCupom || undefined,
      status: 'novo',
      criado_em: new Date().toISOString()
    };

    // Save profile to local storage for automatic memory recall (scoped to store)
    localStorage.setItem(storageKey('pedifacil_customer_profile'), JSON.stringify(customerInfo));

    // Save order in database (Supabase with Realtime push notifications)
    let result: Order;
    try {
      result = await db.createOrder({
        ...orderPayload,
        itens: cart as any // JSON items array
      });
    } catch (error: any) {
      showToast(error?.message || 'Não foi possível criar o pedido.', 'error');
      return;
    }

    setRecentOrderNum(result.numero_pedido || 1010);
    playSound('ding');
    
    // Create WhatsApp string
    let messageText = `🛒 *NOVO PEDIDO - ${store.name}*\n`;
    messageText += `*Pedido Nº: #${result.numero_pedido}*\n`;
    messageText += `━━━━━━━━━━━━━━━━━\n\n`;

    cart.forEach((item, index) => {
      const basePrice = item.price / item.quantity;
      messageText += `*${index + 1}. ${item.name}*\n`;
      messageText += `   ${item.quantity}x R$ ${basePrice.toFixed(2)} = R$ ${item.price.toFixed(2)}\n`;
      
      const p = item.personalization;
      if (p) {
        if (p.sao_pao) messageText += `   🍞 Pão: ${p.sao_pao}\n`;
        if (p.carne_tipo) messageText += `   🥩 Blend: ${p.carne_tipo}\n`;
        if (p.carne_ponto) messageText += `   🔥 Ponto: ${p.carne_ponto}\n`;
        
        const added: string[] = [];
        if (p.add_bacon) added.push('Bacon');
        if (p.add_cheddar) added.push('Cheddar Extra');
        if (p.add_ovo) added.push('Ovo');
        if (p.add_catupiry) added.push('Catupiry');
        if (p.add_hamburguer) added.push('Hambúrguer extra');
        if (p.add_cebola_caramelizada) added.push('Cebola Caramelizada');
        if (p.add_onion_rings) added.push('Onion Rings');
        if (p.add_molho_especial) added.push('Molho Especial');
        if (p.add_batata_extra) added.push('Batata Extra');
        
        if (added.length > 0) messageText += `   ➕ Adicionais: ${added.join(', ')}\n`;

        const removed: string[] = [];
        if (p.remove_cebola) removed.push('Cebola');
        if (p.remove_tomate) removed.push('Tomate');
        if (p.remove_alface) removed.push('Alface');
        if (p.remove_picles) removed.push('Picles');
        if (p.remove_molho) removed.push('Molho');
        if (p.remove_queijo) removed.push('Queijo');
        
        if (removed.length > 0) messageText += `   ❌ Sem: ${removed.join(', ')}\n`;
      }
      
      if (item.observacao) {
        messageText += `   📝 Obs: "${item.observacao}"\n`;
      }
      messageText += `\n`;
    });

    messageText += `━━━━━━━━━━━━━━━━━\n`;
    messageText += `📦 *Subtotal:* R$ ${subtotal.toFixed(2)}\n`;
    messageText += `🛵 *Taxa de Entrega:* ${customerInfo.bairro?.trim() ? (fee === 0 ? 'GRÁTIS 🎉' : `R$ ${fee.toFixed(2)}`) : 'A consultar'}\n`;
    if (discount > 0) {
      messageText += `🎟️ *Desconto:* -R$ ${discount.toFixed(2)}\n`;
    }
    messageText += `💰 *TOTAL FINAL: R$ ${total.toFixed(2)}*\n`;
    messageText += `━━━━━━━━━━━━━━━━━\n\n`;
    
    messageText += `👤 *Cliente:* ${customerInfo.nome}\n`;
    messageText += `📞 *WhatsApp:* ${customerInfo.whatsapp}\n`;
    messageText += `📍 *Endereço:* ${customerInfo.endereco}, Nº ${customerInfo.numero || 'S/N'}\n`;
    if (customerInfo.bairro) {
      const mbCleanQuery = (customerInfo.bairro || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const mbFound = bairros.find(b => (b.nome || b.bairro || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === mbCleanQuery);
      messageText += `🏘️ *Bairro:* ${customerInfo.bairro}${!mbFound ? ' (⚠️ Bairro não listado. Enviarei localização no WhatsApp)' : ''}\n`;
    }
    if (customerInfo.complemento) messageText += `📝 *Comp:* ${customerInfo.complemento}\n`;
    if (customerInfo.referencia) messageText += `📍 *Ref:* ${customerInfo.referencia}\n`;
    
    messageText += `💳 *Pagamento:* ${customerInfo.formaPagamento}\n`;
    if (customerInfo.formaPagamento === 'Dinheiro' && customerInfo.troco) {
      messageText += `💵 *Troco para:* R$ ${customerInfo.troco}\n`;
    }

    messageText += `\n📱 _Pedido enviado do cardápio digital PediFácil - pedifacil.br_`;

    // Accumulate loyalty points (R$ 1.00 = 1 point)
    const pointsEarned = Math.floor(total);
    if (pointsEarned > 0) {
      const userPhone = customerInfo.whatsapp;
      const currentPtsStr = userPhone
        ? localStorage.getItem(`${storageKey('pedifacil_loyalty_points')}_${userPhone}`)
        : localStorage.getItem(storageKey('pedifacil_loyalty_points'));
      const currentPtsVal = currentPtsStr ? parseInt(currentPtsStr, 10) : 0;
      const finalPts = currentPtsVal + pointsEarned;
      setLoyaltyPoints(finalPts);
      localStorage.setItem(storageKey('pedifacil_loyalty_points'), String(finalPts));
      if (userPhone) {
        localStorage.setItem(`${storageKey('pedifacil_loyalty_points')}_${userPhone}`, String(finalPts));
        
        // Tenta sincronizar pontos no novo Supabase
        try {
          await supabase
            .from('profiles')
            .update({ loyalty_points: finalPts })
            .eq('whatsapp', userPhone);
        } catch (err) {
          console.warn('Ação de atualização de pontos Supabase ignorada:', err);
        }
      }
      // Display loyalty rewards update
      setTimeout(() => {
        showToast(`Você acumulou +${pointsEarned} pontos de fidelidade! 🌟`, 'success');
      }, 800);
    }

    // Reset checkout/cart states
    setCart([]);
    setDesconto(0);
    setActiveCupom('');
    setCupomInput('');
    setIsCheckoutOpen(false);
    setIsCartOpen(false);

    // open whatsapp web/api
    const formattedPhone = (store.whatsapp || '').replace(/\D/g, '');
    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(messageText)}`;
    window.open(url, '_blank');
  };

  // Add customized lanche configuration
  const handleOpenProductSelection = (p: Product) => {
    if (!store?.aberto) {
      showToast('Loja fechada. Não é possível fazer pedidos no momento.', 'error');
      return;
    }

    setActiveProduct(p);

    let meta = loadProductMeta(p.id);
    if ((!meta || !meta.optionGroups || meta.optionGroups.length === 0) && p.sku && p.sku.trim().startsWith('{')) {
      try {
        const parsed = JSON.parse(p.sku);
        if (parsed && (parsed.optionGroups || parsed.badges)) {
          meta = parsed;
          try {
            localStorage.setItem(`pedifacil_product_meta_${p.id}`, p.sku);
          } catch (e) {}
        }
      } catch (e) {}
    }

    setActiveProductMeta(meta || { badges: [], optionGroups: [] });
    setSelectPao('');
    setSelectCarne('');
    setSelectPonto('');
    setSelectedAddons({});
    setRemovedIngredients({});
    setSelectedOptionItems({});
    setObservation('');
    setProductQty(1);
    setValidationError('');
  };

  const handleApplyCoupon = async (specificCode?: string) => {
    const codeToUse = (specificCode || cupomInput).trim().toUpperCase();
    if (!store || !codeToUse) return;
    setCupomInput(codeToUse);
    setCupomError('');
    setCupomSuccess('');

    try {
      const cuponsList = await db.getCupons(store.id);
      const data = cuponsList.find(c => c.codigo.toUpperCase() === codeToUse && c.is_active);
      
      if (!data) {
        setCupomError('Cupom inválido ou inativo!');
        setDesconto(0);
        setActiveCupom('');
        setShakeCupom(true);
        playSound('error');
        setTimeout(() => setShakeCupom(false), 500);
        return;
      }

      // Check validation dates
      if (data.validade && new Date(data.validade) < new Date()) {
        setCupomError('Este cupom expirou!');
        setDesconto(0);
        setActiveCupom('');
        playSound('error');
        return;
      }

      // Check minimum subtotal purchase
      const subtotal = getSubtotal();
      const minVal = data.min_compra ? Number(data.min_compra) : 0;
      if (subtotal < minVal) {
        setCupomError(`Pedido mínimo para este cupom é R$ ${minVal.toFixed(2)}`);
        setDesconto(0);
        setActiveCupom('');
        playSound('error');
        return;
      }

      // Valid cupom successfully applied!
      playSound('ding');
      const val = Number(data.valor || 0);
      if (data.tipo === 'percentual') {
        const valueDisc = (subtotal * val) / 100;
        setDesconto(valueDisc);
        setCupomSuccess(`Cupom aplicado! Desconto de ${val}% (-R$ ${valueDisc.toFixed(2)})`);
      } else {
        setDesconto(val);
        setCupomSuccess(`Cupom aplicado! Desconto de R$ ${val.toFixed(2)}`);
      }
      setActiveCupom(codeToUse);
    } catch (e) {
      setCupomError('Erro de conexão ao validar cupom.');
    }
  };

  const isActiveProductHamburguer = activeProduct ? activeProduct.category_id === 'cat-hamb-1' || activeProduct.category_id === 'cat-hamb-2' : false;
  const activeProductHasOptions = !!activeProductMeta?.optionGroups?.length;
  const shouldShowHamburguerCustomization = isActiveProductHamburguer && activeProductHasOptions;

  const calculateCustomizedPrice = () => {
    if (!activeProduct) return 0;
    let base = activeProduct.preco_promocional || activeProduct.preco;
    
    if (shouldShowHamburguerCustomization) {
      if (selectCarne === '2 blends de costela (360g)') base += 8.00;
      if (selectCarne === 'Smash Premium') base += 4.00;
      if (selectCarne === 'Frango Empanado extra (150g)') base += 5.00;

      if (selectedAddons['bacon']) base += 4.50;
      if (selectedAddons['cheddar']) base += 4.00;
      if (selectedAddons['ovo']) base += 2.00;
      if (selectedAddons['catupiry']) base += 4.00;
      if (selectedAddons['hamburguer_extra']) base += 8.00;
      if (selectedAddons['cebola_caram']) base += 3.00;
      if (selectedAddons['onion_rings']) base += 4.00;
      if (selectedAddons['molho_esp']) base += 2.50;
      if (selectedAddons['batata_extra']) base += 6.00;
    }

    // Dynamic optionGroups additional price
    if (activeProductMeta?.optionGroups) {
      for (const group of activeProductMeta.optionGroups) {
        const chosen = selectedOptionItems[group.id] || [];
        for (const itemId of chosen) {
          const item = group.items.find(i => i.id === itemId);
          if (item && !item.isFree) base += item.price;
        }
      }
    }
    
    return base * productQty;
  };

  const handleAddProductToCart = () => {
    if (!activeProduct) return;

    // Validation checks for required fields on Hamburgers
    const isHamburguer = activeProduct.category_id === 'cat-hamb-1' || activeProduct.category_id === 'cat-hamb-2';
    const shouldRequireCustomization = isHamburguer && activeProductHasOptions;
    if (shouldRequireCustomization) {
      if (!selectPao) {
        setValidationError('Atenção: Selecione o Tipo de Pão!');
        playSound('error');
        return;
      }
      if (!selectPonto) {
        setValidationError('Atenção: Selecione o Ponto da Carne!');
        playSound('error');
        return;
      }
    }

    // Validate required dynamic option groups
    if (activeProductMeta?.optionGroups) {
      for (const group of activeProductMeta.optionGroups) {
        if (group.required) {
          const chosen = selectedOptionItems[group.id] || [];
          const min = group.minSelection || 1;
          if (chosen.length < min) {
            setValidationError(`Atenção: Selecione ao menos ${min} opção em "${group.label}"!`);
            playSound('error');
            return;
          }
        }
      }
    }

    // Build dynamic options summary for observacao
    const dynamicObsLines: string[] = [];
    if (activeProductMeta?.optionGroups) {
      for (const group of activeProductMeta.optionGroups) {
        const chosen = selectedOptionItems[group.id] || [];
        if (chosen.length > 0) {
          const countMap: { [id: string]: number } = {};
          chosen.forEach(id => { countMap[id] = (countMap[id] || 0) + 1; });
          const names = Object.entries(countMap).map(([id, count]) => {
            const it = group.items.find(i => i.id === id);
            if (!it) return null;
            const singlePrice = Number(it.price || 0);
            const totalOptPrice = singlePrice * count;
            const priceTag = totalOptPrice > 0 ? ` (+R$ ${totalOptPrice.toFixed(2)})` : '';
            return count > 1 ? `${count}x ${it.name}${priceTag}` : `${it.name}${priceTag}`;
          }).filter(Boolean);
          if (names.length > 0) dynamicObsLines.push(`${group.label}: ${names.join(', ')}`);
        }
      }
    }
    const fullObservacao = [dynamicObsLines.join(' | '), observation].filter(Boolean).join(' | ');

    const calculatedPrice = calculateCustomizedPrice();

    const itemPersonalization: any = {
      sao_pao: shouldShowHamburguerCustomization && selectPao ? selectPao : undefined,
      carne_tipo: shouldShowHamburguerCustomization && selectCarne ? selectCarne : undefined,
      carne_ponto: shouldShowHamburguerCustomization && selectPonto ? selectPonto : undefined,
      add_bacon: shouldShowHamburguerCustomization && selectedAddons['bacon'] ? true : undefined,
      add_cheddar: shouldShowHamburguerCustomization && selectedAddons['cheddar'] ? true : undefined,
      add_ovo: shouldShowHamburguerCustomization && selectedAddons['ovo'] ? true : undefined,
      add_catupiry: shouldShowHamburguerCustomization && selectedAddons['catupiry'] ? true : undefined,
      add_hamburguer: shouldShowHamburguerCustomization && selectedAddons['hamburguer_extra'] ? true : undefined,
      add_cebola_caramelizada: shouldShowHamburguerCustomization && selectedAddons['cebola_caram'] ? true : undefined,
      add_onion_rings: shouldShowHamburguerCustomization && selectedAddons['onion_rings'] ? true : undefined,
      add_molho_especial: shouldShowHamburguerCustomization && selectedAddons['molho_esp'] ? true : undefined,
      add_batata_extra: shouldShowHamburguerCustomization && selectedAddons['batata_extra'] ? true : undefined,
      remove_cebola: shouldShowHamburguerCustomization && removedIngredients['cebola'] ? true : undefined,
      remove_tomate: shouldShowHamburguerCustomization && removedIngredients['tomate'] ? true : undefined,
      remove_alface: shouldShowHamburguerCustomization && removedIngredients['alface'] ? true : undefined,
      remove_picles: shouldShowHamburguerCustomization && removedIngredients['picles'] ? true : undefined,
      remove_molho: shouldShowHamburguerCustomization && removedIngredients['molho'] ? true : undefined,
      remove_queijo: shouldShowHamburguerCustomization && removedIngredients['queijo'] ? true : undefined,
    };

    if (activeProductMeta?.optionGroups) {
      for (const group of activeProductMeta.optionGroups) {
        const chosen = selectedOptionItems[group.id] || [];
        if (chosen.length > 0) {
          itemPersonalization[`group_${group.id}`] = chosen;
        }
      }
    }

    const newItem: OrderItem = {
      id: `cart-item-${Date.now()}-${Math.random()}`,
      product_id: activeProduct.id,
      name: `${activeProduct.name}${selectPao ? ` (Pão ${selectPao})` : ''}`,
      price: calculatedPrice,
      quantity: productQty,
      observacao: fullObservacao || observation,
      personalization: Object.keys(itemPersonalization).length > 0 ? itemPersonalization : undefined
    };

    setCart(prev => [...prev, newItem]);
    playSound('ploc');
    setActiveProduct(null);
    setActiveProductMeta(null);
    setSelectedOptionItems({});
    if (upsellProduct) {
      setTimeout(() => {
        setShowUpsell(true);
      }, 1000);
    }
  };

  const handleAddUpsell = () => {
    if (!upsellProduct) return;
    const upsellItem: OrderItem = {
      id: `cart-item-upsell-${Date.now()}`,
      product_id: upsellProduct.id,
      name: upsellProduct.name,
      price: upsellProduct.preco,
      quantity: 1
    };
    setCart(prev => [...prev, upsellItem]);
    playSound('ploc');
    setShowUpsell(false);
    showToast('Acompanhamento adicionado com desconto especial! 🍟', 'success');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[550px] py-16 px-6 max-w-lg mx-auto">
        {/* Animated Brand / Food Icon Badge */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 text-white animate-pulse">
            <UtensilsCrossed className="w-8 h-8 stroke-[2.2]" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>
        </div>

        {/* Loading Headings */}
        <div className="text-center space-y-1 mb-8">
          <div className="flex items-center justify-center gap-2">
            <h2 className="text-xl font-bold text-zinc-900 font-sans tracking-tight">Carregando cardápio</h2>
            <Sparkles className="w-4 h-4 text-amber-500 animate-spin" style={{ animationDuration: '4s' }} />
          </div>
          <p className="text-xs text-zinc-500 font-medium">Buscando os melhores sabores e promoções para você...</p>
        </div>

        {/* Sleek Skeleton Card Previews */}
        <div className="w-full space-y-3">
          {/* Skeleton category pill bar */}
          <div className="flex gap-2 pb-2 overflow-hidden justify-center opacity-75">
            <div className="h-8 w-20 rounded-full bg-zinc-200 animate-pulse"></div>
            <div className="h-8 w-24 rounded-full bg-zinc-200 animate-pulse"></div>
            <div className="h-8 w-20 rounded-full bg-zinc-200 animate-pulse"></div>
          </div>

          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-zinc-100/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="flex-1 space-y-2.5">
                <div className="h-4.5 w-2/5 rounded-md bg-zinc-200 animate-pulse"></div>
                <div className="h-3 w-5/6 rounded-md bg-zinc-100 animate-pulse"></div>
                <div className="h-4 w-1/4 rounded-md bg-amber-100 animate-pulse"></div>
              </div>
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-zinc-100 to-zinc-200 animate-pulse flex-shrink-0"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white max-w-md mx-auto rounded-3xl border border-zinc-100 mt-20">
        <span className="text-5xl mb-4">😕</span>
        <h2 className="text-xl font-bold text-zinc-900 mb-2">Estabelecimento Não Encontrado</h2>
        <p className="text-zinc-500 text-sm mb-4">Infelizmente não encontramos nenhuma lanchonete ou barbearia associada à URL <strong>"{storeSlug}"</strong>.</p>
        <p className="text-xs text-zinc-400 mb-6">Verifique se o link está correto ou crie/ative a loja no Painel Master.</p>
        <a href="#admin-master" className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold hover:bg-orange-600 transition">
          Ir para Painel Master
        </a>
      </div>
    );
  }

  // Filter products by category and searches
  const filteredProducts = products.filter(p => {
    const matchSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = selectedCategory === 'all' || p.category_id === selectedCategory;
    return matchSearch && matchCategory;
  });

  const highlights = products.filter(p => (p.destaque || p.preco_promocional) && p.disponivel);

  return (
    <div className={`min-h-screen font-sans ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-100/70 text-zinc-900'} pb-28 relative`}>
      {activeTab === 'inicio' && (
        <>
          {/* Compact Header Banner */}
          <div className="relative h-28 sm:h-40 overflow-hidden bg-zinc-900">
            {store.banner_url ? (
              <img src={store.banner_url} alt="Banner" className="w-full h-full object-cover opacity-80" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-950 flex items-center justify-center">
                <span className="text-zinc-600 font-extrabold text-lg sm:text-2xl tracking-widest uppercase">{store.name}</span>
              </div>
            )}
          </div>

          {/* Compact Profile Card Header (Cardápio Web / iFood Style) */}
          <div className="max-w-lg mx-auto px-3 sm:px-4 -mt-8 sm:-mt-10 relative z-20">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-lg border border-zinc-100 dark:border-zinc-800 relative">
              
              {/* Store info header row */}
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Store logo */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl sm:rounded-2xl border-2 border-white dark:border-zinc-850 bg-white dark:bg-zinc-800 shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                  {store.logo_url ? (
                    <img src={store.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl sm:text-3xl">🍔</span>
                  )}
                </div>

                {/* Name, Status & Location */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 id="store-title" className="text-lg sm:text-xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 truncate leading-tight">
                      {store.name}
                    </h1>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      store.aberto 
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${store.aberto ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></span>
                      {store.aberto ? 'Aberto' : 'Fechado'}
                    </span>
                  </div>

                  {store.slogan && (
                    <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold mt-0.5 truncate italic">
                      "{store.slogan}"
                    </p>
                  )}

                  {/* Location & Info trigger */}
                  <div className="flex items-center gap-2 mt-1.5 text-zinc-500 dark:text-zinc-400 text-[11px] font-semibold flex-wrap">
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} className="text-zinc-400 shrink-0" />
                      <span>{store.cidade || 'Timon'}, {store.estado || 'MA'}</span>
                    </span>
                    <span>•</span>
                    <button 
                      onClick={() => setIsInfoOpen(true)}
                      className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <Info size={11} />
                      <span>Mais info</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Delivery info & Order info quick bar */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-150 dark:border-zinc-800 text-center">
                <div className="flex items-center justify-center gap-1.5 py-1 px-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
                  <Clock size={13} className="text-zinc-400 shrink-0" />
                  <div className="text-left">
                    <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider leading-none">Entrega</div>
                    <div className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-0.5 leading-none">
                      {store.tempo_entrega_min}-{store.tempo_entrega_max} min
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 py-1 px-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl">
                  <span className="text-xs font-bold text-zinc-400 leading-none">R$</span>
                  <div className="text-left">
                    <div className="text-[9px] text-zinc-400 uppercase font-bold tracking-wider leading-none">Pedido Mín.</div>
                    <div className="text-xs font-black text-zinc-900 dark:text-zinc-100 mt-0.5 leading-none">
                      R$ {store.pedido_minimo > 0 ? store.pedido_minimo.toFixed(2) : "15.00"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Social buttons - WhatsApp & Instagram */}
              {(store.whatsapp || store.instagram) && (
                <div className={`grid ${store.whatsapp && store.instagram ? 'grid-cols-2' : 'grid-cols-1'} gap-2 mt-2.5`}>
                  {store.whatsapp && (
                    <a 
                      id="whatsapp-button"
                      href={`https://wa.me/${store.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500 text-white font-black text-xs shadow-xs hover:bg-emerald-600 transition active:scale-95 truncate"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="shrink-0">
                        <path d="M13.601 2.326A7.85 7.85 0 0 0 .1 8c0 2.042.535 4.043 1.551 5.824l-1.025 3.74 3.84-1.006A7.85 7.85 0 0 0 16 8c0-2.164-.84-4.2-2.399-5.74zM10.53 11.357c-.08.08-.222.128-.372.137-.15.01-.298-.031-.448-.093a3.46 3.46 0 0 1-1.393-.974 4.02 4.02 0 0 1-.872-1.423c-.152-.395-.126-.74.015-.975.053-.089.143-.222.22-.303l.261-.286c.075-.084.148-.158.148-.222 0-.084-.047-.184-.112-.341L7.143 5.373c-.097-.24-.2-.239-.297-.239-.08 0-.16-.003-.24-.003a.75.75 0 0 0-.555.253l-.361.392a1.8 1.8 0 0 0-.51 1.22c0 .823.364 1.614.9 2.302a6.76 6.76 0 0 0 3.013 2.1c1.164.444 1.61.33 2.196.249a1.74 1.74 0 0 0 1.135-.8l.137-.4c.019-.055-.008-.109-.053-.131z"/>
                      </svg>
                      <span className="truncate">WhatsApp</span>
                    </a>
                  )}
                  {store.instagram && (
                    <a 
                      id="instagram-button"
                      href={`https://instagram.com/${store.instagram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-500 via-pink-600 to-indigo-600 text-white font-black text-xs shadow-xs hover:opacity-95 transition active:scale-95 truncate"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="shrink-0">
                        <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04 1.15.223 1.171.42 1.678.199.51.487.973.923 1.417.444.444.907.729 1.417.92.509.199 1.092.33 1.947.37 1.15.04 1.425.048 3.297.048 2.174 0 2.446-.01 3.298-.048.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.417-.923c.445-.445.718-.991.924-1.42.19-.507.327-1.091.368-1.947.041-1.153.048-1.427.048-3.297 0-2.174-.01-2.446-.048-3.299-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.282.11-.705.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                      </svg>
                      <span className="truncate">Instagram</span>
                    </a>
                  )}
                </div>
              )}

            </div>
          </div>
        </>
      )}

      {/* Active Tab Screen Content dispatcher matching user specifications */}
      <div className={`max-w-lg mx-auto px-3 sm:px-4 relative pb-4 ${activeTab === 'inicio' ? 'z-20' : 'z-20 pt-6'}`}>
        {/* ======================================= */}
        {/* TAB 1: INÍCIO (CATALOG MENU LAYOUT)    */}
        {/* ======================================= */}
        {activeTab === 'inicio' && (
          <div className="animate-fade-in space-y-4 sm:space-y-6">
            
            {/* Clube de Pontos Banner overlay */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 mt-3 sm:mt-4 text-zinc-900 dark:text-zinc-100 shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-white dark:bg-zinc-800 border border-amber-200/50 dark:border-amber-900/50 rounded-xl flex items-center justify-center text-base shrink-0 shadow-xs">
                  🎁
                </div>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm text-amber-800 dark:text-amber-400 uppercase tracking-wider leading-tight">Clube de Pontos</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 text-[10px] sm:text-[11px] leading-tight mt-0.5">
                    Ganhe pontos a cada pedido e resgate prêmios!
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setActiveTab('fidelidade');
                  showToast('Bem-vindo ao clube de mimos!', 'success');
                }}
                className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] sm:text-xs font-black tracking-wider uppercase flex items-center gap-1 transition active:scale-95 shrink-0 cursor-pointer"
              >
                <span>VER</span>
                <span>➔</span>
              </button>
            </div>

            {/* Categories and Search block row */}
            <div className="flex gap-2 mt-3">
              <div className="relative flex-1">
                <button
                  id="category-dropdown-trigger"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs font-black flex items-center justify-between shadow-xs transition active:scale-98 cursor-pointer"
                >
                  <span className="flex items-center gap-2 truncate">
                    <span>📋</span>
                    <span className="truncate">
                      {selectedCategory === 'all' 
                        ? 'Lista de categorias' 
                        : categories.find(c => c.id === selectedCategory)?.name || 'Lista de categorias'
                      }
                    </span>
                  </span>
                  <ChevronDown size={15} className="text-zinc-400 stroke-[3] shrink-0" />
                </button>
              </div>

              <button 
                id="search-toggle-btn"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
                className={`w-11 h-11 flex items-center justify-center rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 shadow-xs transition active:scale-95 shrink-0 cursor-pointer ${isSearchOpen ? 'ring-2 ring-zinc-900 dark:ring-white border-transparent' : ''}`}
              >
                <Search size={18} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Collapsible search drawer box */}
            {isSearchOpen && (
              <div className="relative mt-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Pesquise por hambúrgueres, combos, bebidas..."
                  className="w-full py-3 pl-11 pr-10 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-100 text-xs font-bold focus:outline-hidden focus:ring-1 focus:ring-zinc-950 dark:focus:ring-white shadow-inner"
                />
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-950 p-1 cursor-pointer">
                    <X size={14} />
                  </button>
                )}
              </div>
            )}

            {/* Horizontal scrollable category list with badges and emojis */}
            {!searchQuery && (
              <div className="mt-2 -mx-3 sm:-mx-4 px-3 sm:px-4 overflow-x-auto scrollbar-hide flex gap-2 pb-1">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    scrollToCategory('all');
                  }}
                  className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs font-black transition whitespace-nowrap flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer ${selectedCategory === 'all' ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs' : 'bg-white dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 border border-zinc-150/70 dark:border-zinc-800'}`}
                >
                  📋 Todos
                </button>
                {categories.map(cat => {
                  const nameNorm = (cat.name || cat.nome || '').toLowerCase();
                  const emoji = nameNorm.includes('hamb') || nameNorm.includes('burger') ? '🍔' : 
                                nameNorm.includes('bebida') || nameNorm.includes('suco') || nameNorm.includes('refr') ? '🥤' : 
                                nameNorm.includes('porç') || nameNorm.includes('frita') || nameNorm.includes('batat') ? '🍟' : 
                                nameNorm.includes('pizz') ? '🍕' : 
                                nameNorm.includes('doce') || nameNorm.includes('sobre') || nameNorm.includes('mous') ? '🍰' : '🍽️';
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        scrollToCategory(cat.id);
                      }}
                      className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-xs font-black transition whitespace-nowrap flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer ${selectedCategory === cat.id ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs' : 'bg-white dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 border border-zinc-150/70 dark:border-zinc-800'}`}
                    >
                      <span>{emoji}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Free Delivery Progressive Bar Campaign */}
            {cart.length > 0 && store.frete_gratis_acima > 0 && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-xs">
                {getSubtotal() >= store.frete_gratis_acima ? (
                  <p className="text-xs font-black inline-flex items-center gap-1.5 text-emerald-600 animate-pulse">
                    🎉 Parabéns! Você atingiu o frete GRÁTIS!
                  </p>
                ) : (
                  <div>
                    <p className="text-xs font-semibold text-emerald-900">
                      Falta apenas <span className="font-extrabold text-[#111] bg-white px-2 py-0.5 rounded-md shadow-xs">R$ {(store.frete_gratis_acima - getSubtotal()).toFixed(2)}</span> para garantir <span className="font-bold text-emerald-700">FRETE GRÁTIS!</span>
                    </p>
                    <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (getSubtotal() / store.frete_gratis_acima) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Highlights Section */}
            {!searchQuery && selectedCategory === 'all' && highlights.length > 0 && (
              <div className="mt-6 sm:mt-8 space-y-3 sm:space-y-4">
                <h2 className="text-xs font-black tracking-widest text-[#1ebd5c] uppercase flex items-center gap-1.5">
                  <span>🔥</span>
                  <span>Os Mais Pedidos</span>
                </h2>
                <div className="relative -mx-3 sm:-mx-4 px-3 sm:px-4 overflow-x-auto scrollbar-hide flex gap-3 sm:gap-4 pb-2">
                  {highlights.map(product => (
                    <div
                      key={product.id}
                      onClick={() => product.disponivel && handleOpenProductSelection(product)}
                      className="w-56 sm:w-64 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-150/70 dark:border-zinc-800 shadow-xs flex-shrink-0 cursor-pointer overflow-hidden p-3 sm:p-4 hover:translate-y-[-2px] transition"
                    >
                      {product.foto_url ? (
                        <div className="relative w-full h-28 sm:h-32 rounded-xl overflow-hidden mb-2.5 bg-zinc-50 dark:bg-zinc-800">
                          <img src={product.foto_url} alt={product.name} className="w-full h-full object-cover" />
                          <span className="absolute top-2 left-2 z-10 bg-amber-500 text-white font-extrabold text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-md shadow-xs animate-pulse">
                            Destaque
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-28 sm:h-32 rounded-xl mb-2.5 flex items-center justify-center text-3xl font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-300">
                          🍔
                        </div>
                      )}
                      
                      <div className="space-y-1">
                        <h3 className="font-black text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">{product.name}</h3>
                        <p className="text-zinc-400 dark:text-zinc-500 text-[10px] sm:text-xs line-clamp-1 leading-snug">{product.description || 'Lanche artesanal preparado com capricho especial.'}</p>
                        
                        <div className="flex items-center justify-between pt-2">
                          <span className="font-black text-sm text-[#1ebd5c] dark:text-emerald-400">
                            R$ {Number(product.preco_promocional || product.preco).toFixed(2)}
                          </span>
                          <span className="w-6.5 h-6.5 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center shadow-xs">
                            <Plus size={12} className="stroke-[3.5]" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Main catalog items rendering - Left image / Right text layout */}
            <div className="space-y-6 sm:space-y-8 mt-4 animate-fade-in">
              {(selectedCategory === 'all' ? categories : categories.filter(c => c.id === selectedCategory)).map(category => {
                const catProducts = filteredProducts.filter(p => p.category_id === category.id);
                if (catProducts.length === 0) return null;
                
                const nameNorm = (category.name || category.nome || '').toLowerCase();
                const emoji = nameNorm.includes('hamb') || nameNorm.includes('burger') ? '🍔' : 
                              nameNorm.includes('bebida') || nameNorm.includes('suco') || nameNorm.includes('refr') ? '🥤' : 
                              nameNorm.includes('porç') || nameNorm.includes('frita') || nameNorm.includes('batat') ? '🍟' : 
                              nameNorm.includes('pizz') ? '🍕' : 
                              nameNorm.includes('doce') || nameNorm.includes('sobre') || nameNorm.includes('mous') ? '🍰' : '🍽️';

                return (
                  <div
                    key={category.id}
                    ref={(el) => { categoryRefs.current[category.id] = el; }}
                    className="scroll-mt-24 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-200 dark:border-zinc-800">
                      <h2 className="text-sm sm:text-base font-black tracking-tight text-zinc-900 dark:text-zinc-50 uppercase flex items-center gap-1.5">
                        <span>{emoji}</span>
                        <span>{category.name}</span>
                      </h2>
                      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-bold">{catProducts.length} itens</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:gap-3.5">
                      {catProducts.map((p) => {
                        const isPromo = !!p.preco_promocional;
                        return (
                          <div
                            key={p.id}
                            onClick={() => p.disponivel && handleOpenProductSelection(p)}
                            style={{ opacity: p.disponivel ? 1 : 0.5 }}
                            className={`bg-white dark:bg-zinc-900 rounded-2xl p-3 sm:p-4 border border-zinc-150/70 dark:border-zinc-800 shadow-xs flex items-center gap-3 sm:gap-4 transition select-none ${p.disponivel ? 'cursor-pointer hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.99]' : 'cursor-not-allowed'}`}
                          >
                            {/* Product photo on the left */}
                            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shadow-xs shrink-0 bg-zinc-50 dark:bg-zinc-800">
                              {p.foto_url ? (
                                <img src={p.foto_url} alt={p.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-300">
                                  🍔
                                </div>
                              )}
                              
                              {/* Exclusive SÓ HOJE / Urgent badge */}
                              {isPromo && p.disponivel && (
                                <span className="absolute top-1 left-1 z-10 bg-indigo-600 text-white font-black text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded-md shadow-xs">
                                  PROMO
                                </span>
                              )}
                            </div>

                            {/* Details text on the right side */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="font-extrabold text-xs sm:text-sm text-zinc-950 dark:text-zinc-50 tracking-tight leading-tight">{p.name}</h3>
                                {p.is_novo && (
                                  <span className="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-md uppercase tracking-wider">Novo</span>
                                )}
                              </div>
                              
                              <p className="text-zinc-500 dark:text-zinc-400 text-[11px] sm:text-xs mt-1 line-clamp-2 leading-relaxed">
                                {p.description || 'Lanche artesanal preparado com ingredientes selecionados.'}
                              </p>

                              {/* Prep time metadata */}
                              <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 text-[10px] font-bold mt-1">
                                <Clock size={11} className="stroke-[2.5]" />
                                <span>{p.tempo_preparo || 15}-{ (p.tempo_preparo || 15) + 10} min</span>
                              </div>
                              
                              {/* Price calculation block with red & green layouts */}
                              <div className="flex items-baseline gap-2 mt-1.5">
                                {isPromo ? (
                                  <>
                                    <span className="text-[11px] text-zinc-400 line-through">R$ {Number(p.preco).toFixed(2)}</span>
                                    <span className="text-sm sm:text-base font-black text-[#1ebd5c] dark:text-emerald-400">R$ {Number(p.preco_promocional).toFixed(2)}</span>
                                  </>
                                ) : (
                                  <span className="text-sm sm:text-base font-black text-zinc-900 dark:text-zinc-50">R$ {Number(p.preco).toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                            
                            {/* Simple add button bullet */}
                            {p.disponivel && (
                              <div className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 transition-all active:scale-90 shrink-0 shadow-xs">
                                <Plus size={14} className="stroke-[3.5]" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ======================================= */}
        {/* TAB 2: PROMOÇÕES (COUPONS & SPECIALS)   */}
        {/* ======================================= */}
        {activeTab === 'promocoes' && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="space-y-6 mt-4 pb-20 text-left"
          >
            {/* Header / Brand Banner with Sparkle Tag */}
            <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 dark:from-black dark:via-zinc-900 dark:to-black text-white rounded-3xl p-6 border border-zinc-800 shadow-[0_12px_30px_rgba(0,0,0,0.12)] space-y-2">
              <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-36 h-36 bg-rose-500/10 rounded-full blur-2xl" />
              <div className="absolute left-1/3 bottom-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl" />
              
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest text-[#1ebd5c]">
                <span>⚡</span> Ofertas Ativas
              </div>
              <h2 className="text-xl font-[900] tracking-tight text-white leading-tight mt-1">
                Central de Benefícios
              </h2>
              <p className="text-[11px] text-zinc-400 font-medium max-w-[280px]">
                Garanta descontos exclusivos e promoções imperdíveis para economizar muito no seu pedido hoje.
              </p>
            </div>

            {/* Dynamic Shipping / Free Delivery Goal Progress Meter */}
            {(() => {
              const subtotal = getSubtotal();
              const limit = store?.frete_gratis_acima || 50;
              const completedPct = Math.min((subtotal / limit) * 100, 100);
              const needed = limit - subtotal;
              
              return (
                <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-100 dark:border-zinc-850 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🛵</span>
                      <span className="text-xs font-black uppercase tracking-tight text-zinc-800 dark:text-zinc-100">
                        Progresso de Entrega Grátis
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold bg-[#1ebd5c]/10 text-[#1ebd5c] px-2 py-0.5 rounded-full">
                      Acima de R$ {limit.toFixed(2)}
                    </span>
                  </div>

                  {subtotal === 0 ? (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-bold">
                      🛍️ Adicione itens ao seu carrinho para começar a pontuar para <span className="text-[#1ebd5c]">Entrega Grátis</span>!
                    </p>
                  ) : needed > 0 ? (
                    <p className="text-[11px] text-zinc-650 dark:text-zinc-350 font-bold">
                      Falta apenas <span className="text-rose-500 font-black">R$ {needed.toFixed(2)}</span> para desbloquear <span className="text-[#1ebd5c] font-black uppercase tracking-wider">Frete Grátis</span>!
                    </p>
                  ) : (
                    <p className="text-[11px] text-emerald-600 dark:text-[#1ebd5c] font-black flex items-center gap-1.5 uppercase tracking-widest animate-pulse">
                      <span>🎉</span> VOCÊ GANHOU FRETE GRÁTIS NESTE PEDIDO!
                    </p>
                  )}

                  {subtotal > 0 && (
                    <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${completedPct}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-emerald-400 to-[#1ebd5c] rounded-full"
                      />
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Apply coupon typing input section with enhanced layout */}
            <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-sm border border-zinc-100 dark:border-zinc-850 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🎟️</span>
                <div>
                  <h3 className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase tracking-tight leading-none mb-1">
                    Ativar por Código
                  </h3>
                  <p className="text-[10px] text-zinc-400 font-bold leading-none">Digite o código do cupom manualmente</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: BURGER10"
                    value={cupomInput}
                    onChange={(e) => setCupomInput(e.target.value)}
                    className={`flex-1 min-w-0 px-4 py-3.5 bg-[#F9F9F9] dark:bg-zinc-800 border-none rounded-2xl text-xs font-extrabold uppercase placeholder-[#9E9E9E] dark:placeholder-zinc-500 focus:outline-hidden focus:bg-[#F2F2F2] dark:focus:bg-zinc-750 transition ${shakeCupom ? 'border border-rose-500 animate-wiggle' : ''}`}
                  />
                  <button
                    onClick={() => handleApplyCoupon()}
                    className="px-6 bg-zinc-950 dark:bg-white dark:text-zinc-950 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition active:scale-95 cursor-pointer block hover:opacity-90"
                  >
                    Ativar
                  </button>
                </div>
                {cupomError && <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1 pl-1"><span>⚠️</span> {cupomError}</p>}
                {cupomSuccess && <p className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 pl-1"><span>✓</span> {cupomSuccess}</p>}
              </div>
            </div>

            {/* Real aesthetic physical ticket layout for coupons */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest pl-1">
                Cupons de Desconto Disponíveis
              </h3>
              
              <div className="space-y-3.5">
                {/* Coupon ticket 1 - BURGER10 */}
                {(() => {
                  const isApplied = activeCupom === 'BURGER10';
                  return (
                    <div className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-105 dark:border-zinc-850 rounded-3xl flex items-stretch shadow-xs p-1">
                      {/* Left Part: Discount display */}
                      <div className="bg-rose-500 dark:bg-rose-950/20 text-white dark:text-rose-400 px-5 flex flex-col justify-center items-center rounded-2xl shrink-0 min-w-[95px] text-center select-none font-sans">
                        <span className="text-[22px] font-[900] tracking-tight leading-none">10%</span>
                        <span className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-85">OFF</span>
                      </div>

                      {/* Notch circles cutout details for perfect ticket aesthetic */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-[93px] w-4 h-4 bg-[#F5F5F5] dark:bg-zinc-950 rounded-full border-r border-zinc-105 dark:border-none shrink-0" />
                      <div className="absolute top-1/2 -translate-y-1/2 right-[calc(100%-109px)] w-4 h-4 bg-[#F5F5F5] dark:bg-zinc-950 rounded-full border-l border-zinc-105 dark:border-none shrink-0" />

                      {/* Right Part: Details */}
                      <div className="flex-1 p-4 pl-6 flex flex-col justify-between text-left space-y-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase bg-[#F9F9F9] dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-100 dark:border-zinc-750">
                              BURGER10
                            </span>
                            <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-[8px] font-black rounded-sm uppercase tracking-wider">
                              Inaugural
                            </span>
                          </div>
                          <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-50">Especial Hambúrgueres</h4>
                          <p className="text-[10px] text-zinc-450 dark:text-zinc-400 font-semibold leading-normal">
                            Desconto especial de 10% válido para todos os hambúrgueres do cardápio.
                          </p>
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-2.5">
                          <span className="text-[9px] text-[#9E9E9E] font-bold uppercase tracking-wider">💡 Sem valor mínimo</span>
                          <button 
                            type="button"
                            onClick={() => handleApplyCoupon('BURGER10')}
                            className={`py-2 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl flex-shrink-0 cursor-pointer transition active:scale-95 ${
                              isApplied 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-[#F9F9F9] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-750'
                            }`}
                          >
                            {isApplied ? '✓ Ativo' : 'Usar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Coupon ticket 2 - ENTREGAGRATIS */}
                {(() => {
                  const isApplied = activeCupom === 'ENTREGAGRATIS';
                  return (
                    <div className="relative overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-105 dark:border-zinc-850 rounded-3xl flex items-stretch shadow-xs p-1">
                      {/* Left Part: Discount display */}
                      <div className="bg-[#1ebd5c] dark:bg-emerald-950/20 text-white dark:text-emerald-400 px-5 flex flex-col justify-center items-center rounded-2xl shrink-0 min-w-[95px] text-center select-none font-sans">
                        <span className="text-[18px] font-[900] tracking-tight leading-none">FRETE</span>
                        <span className="text-[9px] font-black uppercase tracking-widest mt-1 opacity-85">GRÁTIS</span>
                      </div>

                      {/* Notch circles cutout details for perfect ticket aesthetic */}
                      <div className="absolute top-1/2 -translate-y-1/2 left-[93px] w-4 h-4 bg-[#F5F5F5] dark:bg-zinc-950 rounded-full border-r border-zinc-105 dark:border-none shrink-0" />
                      <div className="absolute top-1/2 -translate-y-1/2 right-[calc(100%-109px)] w-4 h-4 bg-[#F5F5F5] dark:bg-zinc-950 rounded-full border-l border-zinc-105 dark:border-none shrink-0" />

                      {/* Right Part: Details */}
                      <div className="flex-1 p-4 pl-6 flex flex-col justify-between text-left space-y-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase bg-[#F9F9F9] dark:bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-100 dark:border-zinc-750">
                              ENTREGAGRATIS
                            </span>
                            <span className="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-[#1ebd5c] text-[8px] font-black rounded-sm uppercase tracking-wider">
                              Frete
                            </span>
                          </div>
                          <h4 className="font-extrabold text-xs text-zinc-900 dark:text-zinc-50">Isenção de Delivery</h4>
                          <p className="text-[10px] text-zinc-450 dark:text-zinc-400 font-semibold leading-normal">
                            Isenção total na taxa de entrega padrão do delivery para seu endereço cadastrado.
                          </p>
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-2.5">
                          <span className="text-[9px] text-[#9E9E9E] font-bold uppercase tracking-wider">🛍️ Mínimo R$ {store?.frete_gratis_acima || 50},00</span>
                          <button 
                            type="button"
                            onClick={() => handleApplyCoupon('ENTREGAGRATIS')}
                            className={`py-2 px-4 font-black text-[10px] uppercase tracking-widest rounded-xl flex-shrink-0 cursor-pointer transition active:scale-95 ${
                              isApplied 
                                ? 'bg-emerald-600 text-white' 
                                : 'bg-[#F9F9F9] dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-750'
                            }`}
                          >
                            {isApplied ? '✓ Ativo' : 'Usar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Campaign Promos lists of items - Stunning cards and visual updates */}
            <div className="space-y-4">
              <h3 className="text-xs font-black text-zinc-450 dark:text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                <span>🔥</span>
                <span>Super Destaques com Desconto</span>
              </h3>
              
              <div className="grid grid-cols-1 gap-4">
                {products.filter(p => (p.destaque || p.preco_promocional) && p.disponivel).map((p, index) => {
                  const originalPrice = p.preco;
                  const promoPrice = p.preco_promocional || p.preco;
                  const discountAmount = originalPrice - promoPrice;
                  const discountPct = Math.round((discountAmount / originalPrice) * 100);

                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: index * 0.08 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOpenProductSelection(p)}
                      className="group p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-850 rounded-3xl flex items-center gap-4 cursor-pointer hover:border-zinc-350 dark:hover:border-zinc-700 transition-[border-color,transform] shadow-[0_4px_20px_rgba(0,0,0,0.01)] relative"
                    >
                      {/* Image or emoji wrapper with tag */}
                      <div className="relative shrink-0 w-20 h-20 rounded-2xl overflow-hidden bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center">
                        {p.foto_url ? (
                          <img 
                            src={p.foto_url} 
                            alt={p.name} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                          />
                        ) : (
                          <span className="text-3xl">🍔</span>
                        )}
                        {discountAmount > 0 && (
                          <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] font-black rounded-lg leading-tight uppercase select-none">
                            {discountPct}% OFF
                          </div>
                        )}
                      </div>

                      {/* Product copy details */}
                      <div className="flex-1 min-w-0 pr-1.5 space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50 leading-tight group-hover:text-amber-500 dark:group-hover:text-amber-400 transition truncate">
                            {p.name}
                          </h4>
                        </div>
                        {p.description && (
                          <p className="text-[10px] text-[#9E9E9E] dark:text-zinc-400 font-semibold line-clamp-1">
                            {p.description}
                          </p>
                        )}
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-xs text-zinc-400 line-through font-bold">
                            R$ {originalPrice.toFixed(2)}
                          </span>
                          <span className="text-sm font-[900] text-[#1ebd5c]">
                            R$ {promoPrice.toFixed(2)}
                          </span>
                        </div>
                        {discountAmount > 0 && (
                          <div className="text-[9px] text-rose-500 font-extrabold flex items-center gap-0.5">
                            Economize R$ {discountAmount.toFixed(2)}! ✨
                          </div>
                        )}
                      </div>

                      {/* Interactive click CTA arrow button inside card */}
                      <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-800 group-hover:bg-zinc-950 dark:group-hover:bg-white text-zinc-400 group-hover:text-white dark:group-hover:text-black flex items-center justify-center shrink-0 transition">
                        <span className="text-xs font-black text-center pr-0.5">→</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* ======================================= */}
        {/* TAB 3: FIDELIDADE (LOYALTY & CARDS)    */}
        {/* ======================================= */}
        {activeTab === 'fidelidade' && (() => {
          // Inner calculations for premium, responsive fidelity elements
          const getTierInfo = (points: number) => {
            if (points >= 600) {
              return {
                name: "Diamante",
                badge: "💎 Diamante",
                color: "from-purple-600 via-indigo-700 to-zinc-900 dark:from-purple-950 dark:via-indigo-900 dark:to-zinc-950 border-indigo-450 dark:border-indigo-800 text-indigo-100",
                accent: "text-indigo-400 bg-indigo-950/40",
                progressBarColor: "bg-gradient-to-r from-purple-500 to-indigo-500",
                shadow: "shadow-indigo-500/10",
                perks: [
                  "Ganhe 1.5x pontos em todos os seus pedidos 🚀",
                  "Canal de atendimento exclusivo no WhatsApp com fura-fila",
                  "Hambúrguer Gourmet cortesia no mês do seu aniversário 🎂",
                  "Taxa de entrega GRÁTIS definitiva para qualquer bairro!",
                ],
                nextTier: null,
              };
            } else if (points >= 300) {
              return {
                name: "Ouro",
                badge: "🥇 Ouro",
                color: "from-amber-500 via-yellow-650 to-stone-900 dark:from-amber-950 dark:via-yellow-905 dark:to-stone-950 border-amber-300 dark:border-amber-800 text-yellow-100",
                accent: "text-amber-400 bg-amber-950/40",
                progressBarColor: "bg-gradient-to-r from-amber-500 to-yellow-500",
                shadow: "shadow-amber-500/10",
                perks: [
                  "Ganhe 1.2x pontos em todos os seus pedidos 🍟",
                  "Refrigerante Lata cortesia em todas as quartas-feiras 🥤",
                  "Entrega prioritária rápida no seu endereço cadastrado",
                  "Acesso a sorteios mensais automáticos de combos do chef",
                ],
                nextTier: { name: "Diamante", pointsRequired: 600 },
              };
            } else if (points >= 150) {
              return {
                name: "Prata",
                badge: "🥈 Prata",
                color: "from-zinc-400 via-slate-500 to-zinc-850 dark:from-zinc-800 dark:via-slate-800 dark:to-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-150",
                accent: "text-zinc-300 bg-zinc-800/40",
                progressBarColor: "bg-gradient-to-r from-zinc-400 to-slate-400",
                shadow: "shadow-slate-500/10",
                perks: [
                  "Ganhe 1.0x pontos em todos os seus pedidos 🍔",
                  "Desconto exclusivo de R$ 5,00 em compras acima de R$ 60",
                  "Porção extra de batata frita simples cortesia a cada 5 pedidos",
                ],
                nextTier: { name: "Ouro", pointsRequired: 300 },
              };
            } else {
              return {
                name: "Bronze",
                badge: "🥉 Bronze",
                color: "from-amber-850 via-orange-950 to-zinc-950 border-amber-700 dark:border-amber-900 text-amber-200",
                accent: "text-amber-500 bg-amber-950/20",
                progressBarColor: "bg-gradient-to-r from-amber-700 to-orange-700",
                shadow: "shadow-orange-700/10",
                perks: [
                  "Ganhe 1.0x pontos em todos os seus pedidos 🥤",
                  "Acesso ao clube básico de vantagens para troca no catálogo",
                  "Notificações antecipadas de promoções relâmpago no app",
                ],
                nextTier: { name: "Prata", pointsRequired: 150 },
              };
            }
          };

          const activeTier = getTierInfo(loyaltyPoints);

          // Get registered users in localStorage dynamically
          let registeredUsersList: any[] = [];
          try {
            const rawUsers = localStorage.getItem(storageKey('pedifacil_registered_users'));
            if (rawUsers) {
              const parsed = JSON.parse(rawUsers);
              if (Array.isArray(parsed)) {
                registeredUsersList = parsed.map((u: any) => {
                  const savedPts = localStorage.getItem(`${storageKey('pedifacil_loyalty_points')}_${u.whatsapp}`);
                  const pontosVal = savedPts ? parseInt(savedPts, 10) : 0;
                  
                  // Compute dynamic tier
                  let rankTier = "Bronze";
                  if (pontosVal >= 600) rankTier = "Diamante";
                  else if (pontosVal >= 300) rankTier = "Ouro";
                  else if (pontosVal >= 150) rankTier = "Prata";

                  // Dynamic icon/avatar
                  let avatarVal = "🥤";
                  if (rankTier === "Diamante") avatarVal = "💎";
                  else if (rankTier === "Ouro") avatarVal = "👑";
                  else if (rankTier === "Prata") avatarVal = "🏅";
                  else avatarVal = "🔥";

                  return {
                    nome: u.nome,
                    whatsapp: u.whatsapp,
                    pontos: pontosVal,
                    tier: rankTier,
                    avatar: avatarVal,
                    isCurrentUser: false,
                  };
                });
              }
            }
          } catch (e) {}

          const userName = customerInfo.nome.trim() || (userLoggedIn ? "Você" : "Convidado sem Conta");
          const cleanPhone = customerInfo.whatsapp.trim();

          const hasUserInRankIndex = registeredUsersList.findIndex(u => {
            if (cleanPhone && u.whatsapp === cleanPhone) return true;
            return (u.nome || u.name || '').toLowerCase() === (userName || '').toLowerCase();
          });

          if (hasUserInRankIndex === -1) {
            registeredUsersList.push({
              nome: userName,
              whatsapp: cleanPhone,
              pontos: loyaltyPoints,
              tier: activeTier.name,
              avatar: activeTier.name === "Diamante" ? "💎" : activeTier.name === "Ouro" ? "👑" : activeTier.name === "Prata" ? "🏅" : "🔥",
              isCurrentUser: true,
            });
          } else {
            registeredUsersList[hasUserInRankIndex].pontos = loyaltyPoints;
            registeredUsersList[hasUserInRankIndex].tier = activeTier.name;
            registeredUsersList[hasUserInRankIndex].avatar = activeTier.name === "Diamante" ? "💎" : activeTier.name === "Ouro" ? "👑" : activeTier.name === "Prata" ? "🏅" : "🔥";
            registeredUsersList[hasUserInRankIndex].isCurrentUser = true;
          }

          const sortedList = registeredUsersList.sort((a, b) => b.pontos - a.pontos);
          const currentUserPosition = sortedList.findIndex(x => x.isCurrentUser) + 1;

          // Prizes Catalogue
          const prizes = [
            {
              id: "gift-coca",
              name: "Coca-cola Lata Trincando",
              points: 100,
              icon: "🥤",
              productIdFallback: "ref-101" // ID matched to sodas
            },
            {
              id: "gift-batata",
              name: "Batata Rústica Grande Crocante",
              points: 180,
              icon: "🍟",
              productIdFallback: "porcao-rustica"
            },
            {
              id: "gift-burger",
              name: "Hambúrguer Moda da Casa",
              points: 300,
              icon: "🍔",
              productIdFallback: "lanche-moda-casa"
            }
          ];

          const handleRedeemPoints = async (prizeName: string, pointsRequired: number, productIdFallback: string) => {
            if (loyaltyPoints < pointsRequired) {
              showToast(`Pontos insuficientes! Falta ${pointsRequired - loyaltyPoints} pts para resgatar.`, 'error');
              return;
            }

            const giftOrderItem = {
              id: `cart-gift-${Date.now()}`,
              product_id: productIdFallback,
              name: `🎁 BRINDE: ${prizeName}`,
              price: 0,
              quantity: 1,
              observacao: "Resgatado via Pontos de Fidelidade"
            };

            setCart(prev => [...prev, giftOrderItem]);
            const newPtsValue = loyaltyPoints - pointsRequired;
            setLoyaltyPoints(newPtsValue);
            localStorage.setItem(storageKey('pedifacil_loyalty_points'), String(newPtsValue));
            if (customerInfo.whatsapp) {
              localStorage.setItem(`${storageKey('pedifacil_loyalty_points')}_${customerInfo.whatsapp}`, String(newPtsValue));
              
              // Tenta sincronizar pontos no novo Supabase pós-resgate
              try {
                await supabase
                  .from('profiles')
                  .update({ loyalty_points: newPtsValue })
                  .eq('whatsapp', customerInfo.whatsapp);
              } catch (err) {
                console.warn('Ação de atualização de pontos Supabase pós-resgate ignorada:', err);
              }
            }
            showToast(`${prizeName} adicionado inteiramente grátis ao carrinho! 🎁`, 'success');
          };

          return (
            <div className="animate-fade-in space-y-7 mt-4 relative text-left">
              
              {/* Special Quest Reminder Banner for Guests */}
              {!userLoggedIn && (
                <div className="bg-amber-1000/10 dark:bg-amber-500/10 border border-amber-500/25 rounded-3xl p-5 text-left flex items-start gap-3.5 shadow-sm">
                  <span className="text-2xl animate-pulse">💡</span>
                  <div className="space-y-1.5 flex-1">
                    <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest leading-none">
                      Clube Desativado (Modo Convidado)
                    </h4>
                    <p className="text-[11px] text-zinc-650 dark:text-zinc-400 leading-relaxed font-semibold">
                      Você ainda não tem uma conta ativa. Cadastre ou acesse seu número do WhatsApp para começar a acumular pontos de fidelidade reais, subir de nível (Bronze ➔ Diamante) e ganhar prêmios grátis!
                    </p>
                    <button
                      onClick={() => setActiveTab('perfil')}
                      className="mt-2.5 py-2 px-4 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition shadow-md cursor-pointer"
                    >
                      🚀 Criar Minha Conta Grátis
                    </button>
                  </div>
                </div>
              )}

              {/* Premium Tier Card Header Banner */}
              <div className={`relative rounded-3xl p-6 bg-gradient-to-br ${activeTier.color} border shadow-xl ${activeTier.shadow} overflow-hidden transition-all duration-300`}>
                {/* Visual grid blur lines */}
                <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none transform translate-x-12 -translate-y-12"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 blur-xl pointer-events-none rounded-full"></div>

                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block text-[10px] font-black tracking-widest bg-white/20 text-white rounded-full px-2.5 py-1 uppercase backdrop-blur-xs mb-3">
                      CONTA {activeTier.badge}
                    </span>
                    <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none mb-1">
                      {userName}
                    </h2>
                    <p className="text-[11px] text-zinc-300 font-semibold uppercase tracking-wider">
                      ID FIDELIDADE: <span className="font-mono text-white select-all">{customerInfo.whatsapp ? `#FID-${customerInfo.whatsapp.slice(-4)}` : '#CONV-0000'}</span>
                    </p>
                  </div>
                  <span className="text-4xl filter drop-shadow-[0_2px_10px_rgba(255,255,255,0.15)] animate-bounce">
                    {activeTier.name === "Diamante" ? "💎" : activeTier.name === "Ouro" ? "👑" : activeTier.name === "Prata" ? "🏅" : "🔥"}
                  </span>
                </div>

                <div className="mt-6 flex justify-between items-baseline border-t border-white/10 pt-4">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-white/70 block leading-none">Seus Pontos de Vantagem</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-4xl font-extrabold font-sans tracking-tight text-white">{loyaltyPoints}</span>
                      <span className="text-xs uppercase font-black text-white/80 select-none">pts</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-white/50 leading-none">Sua Posição no Ranking</p>
                    <p className="text-lg font-black text-yellow-350 dark:text-yellow-400 mt-1">
                      🏆 {currentUserPosition ? `#${currentUserPosition}º Lugar` : "Não ranqueado"}
                    </p>
                  </div>
                </div>

                {/* Progress bar and countdown detail */}
                <div className="mt-5 space-y-1.5">
                  {activeTier.nextTier ? (
                    (() => {
                      const totalDiff = activeTier.nextTier.pointsRequired - (activeTier.name === "Bronze" ? 0 : activeTier.name === "Prata" ? 150 : 300);
                      const currentDiff = loyaltyPoints - (activeTier.name === "Bronze" ? 0 : activeTier.name === "Prata" ? 150 : 300);
                      const percentage = Math.min(100, Math.max(0, (currentDiff / totalDiff) * 100));

                      return (
                        <>
                          <div className="flex justify-between items-center text-[10px] font-sans font-extrabold text-white/90">
                            <span className="uppercase tracking-wider">Progresso rumo ao nível {activeTier.nextTier.name}</span>
                            <span className="font-mono">{loyaltyPoints} / {activeTier.nextTier.pointsRequired} pts</span>
                          </div>
                          <div className="w-full bg-white/15 rounded-full h-2 overflow-hidden border border-white/5">
                            <div className={`h-full rounded-full transition-all duration-1000 ${activeTier.progressBarColor}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                          <p className="text-[9px] font-semibold text-white/75 italic leading-tight text-right pt-0.5">
                            Faltam apenas {activeTier.nextTier.pointsRequired - loyaltyPoints} pontos para liberar mais benefícios!
                          </p>
                        </>
                      );
                    })()
                  ) : (
                    <>
                      <div className="flex justify-between items-center text-[10px] font-sans font-extrabold text-white/90">
                        <span className="uppercase tracking-wider">🎯 Nível Máximo Atingido!</span>
                        <span className="font-mono">{loyaltyPoints} pts</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2.5 overflow-hidden border border-white/10 shadow-inner">
                        <div className="h-full rounded-full bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-500 animate-pulse" style={{ width: '100%' }}></div>
                      </div>
                      <p className="text-[9px] font-bold text-yellow-300 text-right pt-0.5">
                        Você faz parte da nossa elite mais exclusiva de clientes! ⭐
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* Perks of Current Tier */}
              <div className="bg-zinc-50 dark:bg-zinc-900/60 rounded-3xl p-5 border border-zinc-150/50 dark:border-zinc-800/80 space-y-3.5">
                <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                  <span>💎</span> Seu Nível Atual Libera:
                </h3>
                <ul className="space-y-2">
                  {activeTier.perks.map((perk, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                      <span className="text-emerald-500 mt-0.5">✔</span>
                      <span>{perk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Leaderboard Section: "ranking de quem comprou mais" */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center px-1">
                  <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span>🏆</span> Ranking Premium de Clientes
                  </h3>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wide bg-emerald-500/10 px-2 py-0.5 rounded-md">
                    Atualizado Ao Vivo
                  </span>
                </div>

                <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-850 divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden shadow-xs">
                  {sortedList.length === 0 ? (
                    <div className="p-8 text-center bg-zinc-50/50 dark:bg-zinc-900/40 rounded-3xl space-y-2.5">
                      <span className="text-3xl block select-none">🏁</span>
                      <p className="text-xs font-black text-zinc-700 dark:text-zinc-300">Ainda não há clientes ranqueados!</p>
                      <p className="text-[11px] text-zinc-450 dark:text-zinc-500 leading-normal max-w-xs mx-auto">
                        Seja o primeiro a liderar o placar! Crie sua conta com WhatsApp na aba <strong className="text-amber-600 dark:text-amber-400 font-bold underline cursor-pointer hover:text-amber-700" onClick={() => setActiveTab('perfil')}>Perfil</strong> e ganhe pontos automaticamente em cada compra.
                      </p>
                    </div>
                  ) : (
                    sortedList.slice(0, 5).map((user, idx) => {
                      const isUser = (user as any).isCurrentUser;
                      const placeColors = idx === 0 ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-black' : idx === 1 ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 font-bold' : idx === 2 ? 'bg-amber-50 dark:bg-amber-950/20 text-yellow-700 dark:text-yellow-500 font-bold' : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-400';
                      return (
                        <div key={idx} className={`flex items-center justify-between p-4 transition-all ${isUser ? 'bg-amber-50/40 dark:bg-yellow-950/10 border-l-4 border-yellow-500' : ''}`}>
                          <div className="flex items-center gap-3">
                            {/* Rank Circle Badge */}
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${placeColors}`}>
                              {idx + 1}
                            </div>
                            
                            {/* Avatar icon */}
                            <div className="text-lg">{user.avatar}</div>
  
                            <div>
                              <span className={`text-xs block ${isUser ? 'font-black text-zinc-950 dark:text-zinc-50' : 'font-extrabold text-zinc-805 dark:text-zinc-250'}`}>
                                {user.nome} {isUser && '⭐ (Você)'}
                              </span>
                              <span className="text-[9px] text-zinc-400 uppercase font-black tracking-wider block">
                                Conta {user.tier}
                              </span>
                            </div>
                          </div>
  
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black font-mono text-zinc-850 dark:text-zinc-300">{user.pontos} Pts</span>
                            {idx === 0 && <span className="text-xs">👑</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Catalogo de Brindes / Prêmios Disponíveis */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pl-1 flex items-center gap-2">
                  <span>🎁</span> Resgate de Brindes Disponíveis
                </h3>
                
                <div className="space-y-3">
                  {prizes.map((prize) => {
                    const canRedeem = loyaltyPoints >= prize.points;
                    const percentProgress = Math.min(100, (loyaltyPoints / prize.points) * 100);

                    return (
                      <div key={prize.id} className={`bg-white dark:bg-zinc-900 rounded-3xl p-4 border transition-all ${canRedeem ? 'border-emerald-100 dark:border-emerald-900 shadow-sm' : 'border-zinc-100 dark:border-zinc-850 opacity-90'}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="text-3xl filter drop-shadow-sm select-none">{prize.icon}</span>
                            <div>
                              <h4 className="font-black text-xs text-zinc-900 dark:text-zinc-100 leading-snug">{prize.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] text-zinc-400 font-extrabold uppercase tracking-wide">Preço:</span>
                                <span className="text-[10px] bg-yellow-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-md font-black font-mono">{prize.points} PONTOS</span>
                              </div>
                            </div>
                          </div>
                          
                          {canRedeem ? (
                            <button
                              onClick={() => handleRedeemPoints(prize.name, prize.points, prize.productIdFallback)}
                              className="py-2.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition shadow-md shadow-emerald-500/10 flex-shrink-0 cursor-pointer"
                            >
                              🎁 Resgatar Gratis!
                            </button>
                          ) : (
                            <div className="text-right">
                              <span className="inline-block py-2 px-3 bg-zinc-100 dark:bg-zinc-800/80 text-zinc-450 dark:text-zinc-500 rounded-xl text-[10px] font-black uppercase tracking-wider flex-shrink-0 select-none">
                               🔒 Falta {prize.points - loyaltyPoints} pts
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Visual individual progress tracker for lock state */}
                        {!canRedeem && (
                          <div className="mt-3.5 space-y-1">
                            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                              <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${percentProgress}%` }}></div>
                            </div>
                            <div className="flex justify-between items-center text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                              <span>Progresso</span>
                              <span>{Math.floor(percentProgress)}%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explanations instructions: "Como Funciona?" layout timeline */}
              <div className="bg-zinc-50 dark:bg-zinc-900/40 rounded-3xl p-6 border border-zinc-150/45 dark:border-zinc-800 space-y-5 text-left">
                <h4 className="font-black text-xs text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  🎯 Como funciona o Clube de Fidelidade?
                </h4>
                
                <div className="relative border-l-2 border-dashed border-zinc-200 dark:border-zinc-800 pl-5 ml-2.5 space-y-6">
                  {/* Step 1 */}
                  <div className="relative">
                    <div className="absolute -left-[28.5px] top-0 w-4 h-4 rounded-full bg-yellow-500 text-white flex items-center justify-center text-[8px] font-bold border-2 border-white dark:border-zinc-900"></div>
                    <div>
                      <p className="text-xs font-extrabold text-zinc-950 dark:text-zinc-50">1. Cadastre seu WhatsApp em Segundos</p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Faça login com seu nome e WhatsApp no menu Perfil. É grátis e imediato!</p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="relative">
                    <div className="absolute -left-[28.5px] top-0 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[8px] font-bold border-2 border-white dark:border-zinc-900"></div>
                    <div>
                      <p className="text-xs font-extrabold text-zinc-950 dark:text-zinc-50">2. Faça Pedidos e Acumule Automático</p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Cada R$ 1,00 gasto equivale a exatamente 1 ponto de fidelidade na sua carteira digital.</p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="relative">
                    <div className="absolute -left-[28.5px] top-0 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[8px] font-bold border-2 border-white dark:border-zinc-900"></div>
                    <div>
                      <p className="text-xs font-extrabold text-zinc-950 dark:text-zinc-50">3. mude de Patamar (Bronze, Prata, Ouro, Diamante)</p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Ao acumular pontos, você sobe nos níveis de conta destravando mais benefícios e vantagens do chef.</p>
                    </div>
                  </div>

                  {/* Step 4 */}
                  <div className="relative">
                    <div className="absolute -left-[28.5px] top-0 w-4 h-4 rounded-full bg-violet-600 text-white flex items-center justify-center text-[8px] font-bold border-2 border-white dark:border-zinc-900"></div>
                    <div>
                      <p className="text-xs font-extrabold text-zinc-950 dark:text-zinc-50">4. Resgate inteiramente Grátis no Carrinho</p>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">Clique no botão de resgate no catálogo acima e o item é adicionado ao seu carrinho custando R$ 0,00!</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          );
        })()}

        {/* ======================================= */}
        {/* TAB 4: PEDIDOS (CART SUMMARY & STATUS)   */}
        {/* ======================================= */}
        {activeTab === 'pedidos' && (
          <div className="animate-fade-in space-y-6 text-left">
            {!userLoggedIn ? (
              /* LOGGED OUT STATE FOR OFF-SESSION USERS */
              <div className="flex flex-col items-center justify-center pt-20 pb-16 text-center animate-fade-in px-4">
                <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center mb-8 shadow-xs">
                  <ClipboardList size={38} className="text-zinc-400 dark:text-zinc-500 stroke-[1.5]" />
                </div>
                <h3 className="text-xl font-black text-zinc-950 dark:text-zinc-55 tracking-tight leading-none">
                  Acompanhe seus Pedidos
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 font-semibold text-xs mt-3.5 max-w-sm leading-relaxed">
                  Para ver seu histórico completo de pedidos realizados, acompanhar a preparação e acumular pontos no clube de fidelidade, faça o login com seu WhatsApp.
                </p>
                <button
                  onClick={() => setActiveTab('perfil')}
                  className="mt-8 py-3.5 px-10 bg-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 text-white rounded-full font-black text-xs uppercase tracking-widest transition duration-150 active:scale-95 shadow-md flex items-center gap-2 hover:bg-zinc-900"
                >
                  <span>Entrar ou Cadastrar-se</span>
                  <span>🚀</span>
                </button>
              </div>
            ) : (
              /* LOGGED IN USER STATE */
              <div className="space-y-6">
                {recentOrderNum && (
                  /* ORDER STATUS ACTIVE TRACKING IF HAS PLACED AN ORDER */
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-250 text-zinc-900 dark:text-zinc-100 rounded-3xl p-6 shadow-sm space-y-5 animate-slide-up">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-lg uppercase tracking-widest">Pedido Enviado!</span>
                      <span className="text-zinc-500 dark:text-zinc-400 font-mono text-xs">Pedido Ativo #{recentOrderNum}</span>
                    </div>
                    
                    <h4 className="font-extrabold text-sm text-zinc-800 dark:text-zinc-200">Status atual: {orderStatusLabel} {statusIsDelivered ? '✅' : currentOrder?.status === 'saiu_entrega' ? '🛵' : '🧑‍🍳'}</h4>

                    {/* Animated status stepper timeline layout */}
                    <div className="relative pt-4 pb-2">
                      <div className="absolute top-4 bottom-4 left-3 w-[2px] bg-emerald-200 dark:bg-emerald-800" />
                      
                      <div className="space-y-6 text-xs text-zinc-650 dark:text-zinc-300">
                        <div className="flex items-start gap-4">
                          <div className="w-6.5 h-6.5 rounded-full bg-emerald-500 border-4 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white relative z-10">✓</div>
                          <div>
                            <p className="font-black text-zinc-900 dark:text-white">Pedido Recebido</p>
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-500 mt-0.5">Sincronizado via WhatsApp</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className={`w-6.5 h-6.5 rounded-full border-4 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white relative z-10 ${statusIsPreparing ? 'bg-orange-500 animate-pulse' : statusIsOnTheWay || statusIsDelivered ? 'bg-emerald-500' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
                            {statusIsPreparing ? '●' : '✓'}
                          </div>
                          <div>
                            <p className={`font-black ${statusIsPreparing ? 'text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500'}`}>Na Grelha / Preparação</p>
                            <p className="text-[11px] text-zinc-550 dark:text-zinc-400 mt-0.5">Montando seu blend e fritando acompanhamentos</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4">
                          <div className={`w-6.5 h-6.5 rounded-full border-4 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold text-white relative z-10 ${statusIsOnTheWay || statusIsDelivered ? 'bg-indigo-500 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-transparent'}`}>
                            {statusIsOnTheWay || statusIsDelivered ? (statusIsDelivered ? '✓' : '●') : ''}
                          </div>
                          <div>
                            <p className={`${statusIsOnTheWay || statusIsDelivered ? 'font-black text-zinc-900 dark:text-white' : 'font-semibold text-zinc-400 dark:text-zinc-500'}`}>Saiu para Entrega</p>
                            <p className="text-[11px] text-zinc-400 dark:text-zinc-550 mt-0.5">Motoboy buscará sua residência</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white dark:bg-zinc-900 border border-emerald-100 dark:border-emerald-950 rounded-2xl text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug flex gap-2 shadow-xs">
                      <span>ℹ️</span>
                      <p>Caso precise alterar o endereço ou forma de pagamento, entre em contato imediatamente com o caixa através do link do WhatsApp!</p>
                    </div>
                  </div>
                )}

                {/* HISTORIC ORDERS LIST SECTION */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                    <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight flex items-center gap-1.5 leading-tight">
                      <span>📋</span>
                      <span>Histórico de Pedidos</span>
                    </h3>
                    <span className="font-mono text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded">
                      {historyOrders.length} {historyOrders.length === 1 ? 'pedido' : 'pedidos'}
                    </span>
                  </div>

                  {loadingHistory ? (
                    <div className="py-12 text-center text-xs font-semibold text-zinc-400 space-y-2">
                      <div className="w-6 h-6 border-2 border-zinc-900 dark:border-zinc-50 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <p>Buscando seus dados no banco de dados...</p>
                    </div>
                  ) : historyOrders.length === 0 ? (
                    /* EMPTY HISTORY USER NOT HAD ORDERS YET */
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-8 text-center space-y-3">
                      <span className="text-3xl text-zinc-300">🍔</span>
                      <h4 className="text-sm font-black text-zinc-900 dark:text-zinc-100">Nenhum pedido anterior no banco</h4>
                      <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                        Você ainda não efetuou compras ou as compras foram feitas com outro número. Monte seu carrinho e envie seu primeiro hamburguer!
                      </p>
                      <button
                        onClick={() => setActiveTab('inicio')}
                        className="py-2.5 px-6 bg-zinc-950 dark:bg-zinc-50 dark:text-zinc-950 text-white font-black text-[11px] uppercase tracking-wider rounded-xl transition hover:bg-zinc-800"
                      >
                        Ver Cardápio
                      </button>
                    </div>
                  ) : (
                    /* SCROLLABLE HISTORIC CONTAINER */
                    <div className="space-y-4">
                      {historyOrders.map((order, idx) => {
                        const statusObj = (() => {
                          switch (order.status) {
                            case 'novo':
                              return { label: 'Pendente', bg: 'bg-zinc-100 text-zinc-650', border: 'border-zinc-200' };
                            case 'preparando':
                              return { label: 'Na grelha 🧑‍🍳', bg: 'bg-amber-50 text-amber-700', border: 'border-amber-200' };
                            case 'saiu_entrega':
                              return { label: 'Em entrega 🛵', bg: 'bg-blue-50 text-blue-700', border: 'border-blue-200' };
                            case 'entregue':
                              return { label: 'Entregue ✓', bg: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-250' };
                            case 'cancelado':
                              return { label: 'Cancelado ✕', bg: 'bg-rose-50 text-rose-700', border: 'border-rose-200' };
                            default:
                              return { label: order.status, bg: 'bg-zinc-100 text-zinc-500', border: 'border-zinc-200' };
                          }
                        })();

                        const orderDate = (() => {
                          try {
                            const d = new Date(order.criado_em);
                            return d.toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          } catch (e) {
                            return order.criado_em;
                          }
                        })();

                        return (
                          <div
                            key={order.id || idx}
                            className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-5 shadow-xs space-y-4 hover:border-zinc-200 dark:hover:border-zinc-750 transition duration-150"
                          >
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <span className="font-mono text-xs font-black text-zinc-800 dark:text-zinc-200">
                                  #{order.numero_pedido || (order.id && order.id.slice(-4)) || 'PED'}
                                </span>
                                <p className="text-[10px] text-zinc-400 font-semibold">{orderDate}</p>
                              </div>
                              <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border ${statusObj.bg} ${statusObj.border}`}>
                                {statusObj.label}
                              </span>
                            </div>

                            {/* Products summary */}
                            <div className="border-t border-b border-zinc-100/80 dark:border-zinc-800/80 py-3 space-y-2.5">
                              {order.itens && Array.isArray(order.itens) ? (
                                order.itens.map((item: any, itemIdx: number) => {
                                  const qty = Number(item.quantity || item.qtd || 1);
                                  const price = Number(item.price || 0);
                                  const unitPrice = qty > 0 ? price / qty : price;
                                  const p = item.personalization;

                                  const added: string[] = [];
                                  if (p) {
                                    if (p.add_bacon) added.push('Bacon');
                                    if (p.add_cheddar) added.push('Cheddar');
                                    if (p.add_ovo) added.push('Ovo');
                                    if (p.add_catupiry) added.push('Catupiry');
                                    if (p.add_hamburguer) added.push('Hambúrguer Extra');
                                    if (p.add_cebola_caramelizada) added.push('Cebola Caramelizada');
                                    if (p.add_onion_rings) added.push('Onion Rings');
                                    if (p.add_molho_especial) added.push('Molho Especial');
                                    if (p.add_batata_extra) added.push('Batata Extra');
                                  }

                                  const removed: string[] = [];
                                  if (p) {
                                    if (p.remove_cebola) removed.push('Cebola');
                                    if (p.remove_tomate) removed.push('Tomate');
                                    if (p.remove_alface) removed.push('Alface');
                                    if (p.remove_picles) removed.push('Picles');
                                    if (p.remove_molho) removed.push('Molho');
                                    if (p.remove_queijo) removed.push('Queijo');
                                  }

                                  return (
                                    <div key={itemIdx} className="text-xs space-y-1 bg-zinc-50/50 dark:bg-zinc-850/40 p-2 rounded-xl border border-zinc-100 dark:border-zinc-800/60">
                                      <div className="flex justify-between items-start gap-2">
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <span className="bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-black text-[10px] px-1.5 py-0.5 rounded shrink-0">
                                            {qty}x
                                          </span>
                                          <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate">
                                            {item.name || item.titulo || 'Item'}
                                          </span>
                                        </div>
                                        <div className="text-right shrink-0">
                                          <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                                            R$ {price.toFixed(2)}
                                          </span>
                                          {qty > 1 && (
                                            <span className="block text-[9px] text-zinc-400">
                                              ({qty}x R$ {unitPrice.toFixed(2)})
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      {/* Complements preview */}
                                      {p && (p.sao_pao || p.carne_tipo || p.carne_ponto || added.length > 0 || removed.length > 0) && (
                                        <div className="text-[10px] text-zinc-500 dark:text-zinc-400 pl-6 space-y-0.5">
                                          {p.sao_pao && <div>🍞 Pão: {p.sao_pao}</div>}
                                          {p.carne_tipo && <div>🥩 Carne: {p.carne_tipo} ({p.carne_ponto || 'Ao Ponto'})</div>}
                                          {added.length > 0 && <div className="text-emerald-600 dark:text-emerald-400 font-medium">➕ {added.join(', ')}</div>}
                                          {removed.length > 0 && <div className="text-rose-500 font-medium line-through">❌ {removed.join(', ')}</div>}
                                        </div>
                                      )}

                                      {item.observacao && (
                                        <div className="text-[10px] text-amber-700 dark:text-amber-300 italic pl-6">
                                          📝 {item.observacao}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-[11px] text-zinc-455">Itens integrados via WhatsApp</p>
                              )}
                            </div>

                            {/* Order financial breakdown */}
                            <div className="space-y-1 text-xs pt-1">
                              <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400 text-[11px]">
                                <span>Subtotal dos Itens:</span>
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                                  R$ {Number(order.subtotal || (order.itens ? order.itens.reduce((acc: number, cur: any) => acc + (Number(cur.price) || 0), 0) : order.total)).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-zinc-500 dark:text-zinc-400 text-[11px]">
                                <span>Taxa de Entrega:</span>
                                <span className={`font-semibold ${Number(order.taxa_entrega || 0) === 0 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                  {Number(order.taxa_entrega || 0) === 0 ? 'GRÁTIS' : `+ R$ ${Number(order.taxa_entrega).toFixed(2)}`}
                                </span>
                              </div>
                              {Number(order.desconto || 0) > 0 && (
                                <div className="flex justify-between items-center text-rose-500 text-[11px] font-semibold">
                                  <span>Desconto do Cupom:</span>
                                  <span>- R$ {Number(order.desconto).toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center pt-2 border-t border-zinc-150 dark:border-zinc-800">
                                <div>
                                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Pagamento</p>
                                  <p className="font-bold text-zinc-800 dark:text-zinc-200">{order.forma_pagamento}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Total do Pedido</p>
                                  <p className="font-black text-emerald-600 dark:text-emerald-400 text-base">
                                    R$ {(order.total || 0).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ======================================= */}
        {/* TAB 5: PERFIL (ADDRESS REGISTER & SHOP)  */}
        {/* ======================================= */}
        {activeTab === 'perfil' && (
          <div className="animate-fade-in space-y-6 mt-4">
            
            {!userLoggedIn ? (
              /* Custom Login / Registration card */
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-800 space-y-5 text-left animate-slide-up">
                <div className="border-b border-zinc-150/50 dark:border-zinc-800 pb-3 flex justify-between items-center">
                  <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-50 uppercase tracking-tight flex items-center gap-1.5">
                    <span>{profileAction === 'register' ? '📝' : '🔑'}</span>
                    <span>{profileAction === 'register' ? 'Criar Nova Conta' : 'Acessar Conta'}</span>
                  </h3>
                  <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">
                    {profileAction === 'register' ? 'Cadastro' : 'Login'}
                  </span>
                </div>

                {profileAction === 'register' ? (
                  /* REGISTRATION FORM */
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!profileNameInput.trim() || !profilePhoneInput.trim()) {
                      showToast('Preencha os campos obrigatórios!', 'error');
                      return;
                    }
                    const cleanPhone = profilePhoneInput.replace(/\D/g, '');
                    if (cleanPhone.length < 8) {
                      showToast('Digite um telefone válido!', 'error');
                      return;
                    }

                    const alreadyRegistered = await findRegisteredUserByPhone(cleanPhone);
                    if (alreadyRegistered) {
                      showToast('Telefone já cadastrado. Faça login para continuar.', 'success');
                      setProfileAction('login');
                      setProfilePhoneInput(cleanPhone);
                      setProfileNameInput(alreadyRegistered.nome || profileNameInput.trim());
                      setOtpSent(false);
                      setPendingRegistration(null);
                      setOtpInput('');
                      return;
                    }

                    if (storeExtras.sms_verification_required) {
                      if (otpSent && pendingRegistration?.whatsapp === cleanPhone) {
                        showToast('Código já enviado. Digite o código recebido para concluir o cadastro.', 'success');
                        return;
                      }

                      await startSmsRegistration(cleanPhone, profileNameInput.trim());
                      return;
                    }

                    await completeUserRegistration(profileNameInput.trim(), cleanPhone);
                  }} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Seu Nome Completo *</label>
                      <input
                        required
                        type="text"
                        placeholder="Ex: João da Silva"
                        value={profileNameInput}
                        onChange={(e) => setProfileNameInput(e.target.value)}
                        className="w-full p-3.5 bg-zinc-55 dark:bg-zinc-800 border border-zinc-150/40 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-1 focus:ring-zinc-950 dark:text-zinc-100 focus:outline-hidden focus:bg-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Número de Telefone (WhatsApp) *</label>
                      <input
                        required
                        type="tel"
                        placeholder="Ex: 86994508722"
                        value={profilePhoneInput}
                        onChange={(e) => setProfilePhoneInput(e.target.value.replace(/\D/g, ''))}
                        className="w-full p-3.5 bg-zinc-55 dark:bg-zinc-800 border border-zinc-150/40 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-1 focus:ring-zinc-950 dark:text-zinc-100 focus:outline-hidden focus:bg-white"
                      />
                    </div>

                    {storeExtras.sms_verification_required && otpSent ? (
                      <div className="space-y-3 p-4 rounded-3xl border border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/10">
                        <p className="text-[12px] font-bold text-emerald-700 dark:text-emerald-300">Verificação por SMS ativada</p>
                        <p className="text-[11px] text-zinc-600 dark:text-zinc-300">Digite o código enviado para o seu WhatsApp para concluir o cadastro.</p>
                        <input
                          type="text"
                          value={otpInput}
                          onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                          placeholder="Código de verificação"
                          className="w-full p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        />
                        <div className="text-[11px] text-zinc-500">
                          Não recebeu? Clique em reenviar.
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (pendingRegistration) {
                              startSmsRegistration(pendingRegistration.whatsapp, pendingRegistration.nome);
                            }
                          }}
                          className="w-full py-3 bg-slate-900 text-white rounded-2xl text-xs uppercase font-black tracking-widest"
                        >
                          Reenviar código
                        </button>
                        <button
                          type="button"
                          onClick={verifyRegistrationCode}
                          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition active:scale-95"
                        >
                          Confirmar código
                        </button>
                      </div>
                    ) : null}

                    {!otpSent && (
                      <button
                        type="submit"
                        className="w-full py-4 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition active:scale-95"
                      >
                        Cadastrar
                      </button>
                    )}

                    {storeExtras.sms_verification_required && otpSent && (
                      <div className="text-xs text-zinc-500 text-center">
                        Código enviado para o telefone. Se não recebeu, verifique o número informado ou solicite novamente.
                      </div>
                    )}

                    {!storeExtras.sms_verification_required && (
                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileAction('login');
                            setProfilePhoneInput('');
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-bold underline decoration-emerald-500/50 underline-offset-4"
                        >
                          Já tem uma conta? Fazer login
                        </button>
                      </div>
                    )}

                    {storeExtras.sms_verification_required && (
                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setProfileAction('login');
                            setProfilePhoneInput('');
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-bold underline decoration-emerald-500/50 underline-offset-4"
                        >
                          Já tem uma conta? Fazer login
                        </button>
                      </div>
                    )}
                  </form>
                ) : (
                  /* LOGIN FORM */
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!profilePhoneInput.trim()) {
                      showToast('Digite seu número de telefone!', 'error');
                      return;
                    }
                    const cleanPhone = profilePhoneInput.replace(/\D/g, '');
                    
                    const usersInStore = JSON.parse(localStorage.getItem(storageKey('pedifacil_registered_users')) || '[]');
                    let found = usersInStore.find((u: any) => u.whatsapp === cleanPhone);

                    // Tenta sincronizar dados do novo Supabase se estiver configurado
                    try {
                      const { data: dbUser, error: dbError } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('whatsapp', cleanPhone)
                        .maybeSingle();
                      if (dbUser && !dbError) {
                        found = { nome: dbUser.nome, whatsapp: dbUser.whatsapp };
                        localStorage.setItem(`${storageKey('pedifacil_loyalty_points')}_${cleanPhone}`, String(dbUser.loyalty_points || 0));
                      }
                    } catch (err) {
                      console.warn('Ação de leitura do Supabase ignorada:', err);
                    }

                    if (found) {
                      const updatedInfo = {
                        ...DEFAULT_CUSTOMER_INFO,
                        nome: found.nome,
                        whatsapp: cleanPhone,
                      };
                      setCustomerInfo(updatedInfo);
                      setProfileNameInput(found.nome);
                      localStorage.setItem(storageKey('pedifacil_customer_profile'), JSON.stringify(updatedInfo));
                      localStorage.setItem(storageKey('pedifacil_user_logged_in'), 'true');

                      // Load user specific loyalty points
                      const savedPhonePoints = localStorage.getItem(`${storageKey('pedifacil_loyalty_points')}_${cleanPhone}`);
                      const userPts = savedPhonePoints ? parseInt(savedPhonePoints, 10) : 0;
                      setLoyaltyPoints(userPts);

                      setUserLoggedIn(true);
                      showToast(`Boas-vindas de volta, ${found.nome}! 🌟`, 'success');
                    } else {
                        // fallback check current profile
                        const savedProfile = localStorage.getItem(storageKey('pedifacil_customer_profile'));
                        let matched = false;
                        if (savedProfile) {
                          try {
                            const parsed = JSON.parse(savedProfile);
                            if (parsed.whatsapp === cleanPhone && parsed.nome) {
                              setCustomerInfo(parsed);
                              setProfileNameInput(parsed.nome);
                              localStorage.setItem(storageKey('pedifacil_user_logged_in'), 'true');

                              // Load user specific loyalty points
                              const savedPhonePoints = localStorage.getItem(`${storageKey('pedifacil_loyalty_points')}_${cleanPhone}`);
                              const userPts = savedPhonePoints ? parseInt(savedPhonePoints, 10) : 0;
                              setLoyaltyPoints(userPts);

                              setUserLoggedIn(true);
                              showToast(`Boas-vindas de volta, ${parsed.nome}!`, 'success');
                              matched = true;
                            }
                          } catch (_) {}
                        }

                        if (!matched) {
                          if (store?.id) {
                            try {
                              const allOrders = await db.getOrders(store.id);
                              const orderMatch = allOrders.find((o) => (o.cliente_whatsapp || '').replace(/\D/g, '') === cleanPhone);
                              if (orderMatch) {
                                const matchedName = orderMatch.cliente_nome || profilePhoneInput || '';
                                const updatedInfo = {
                                  ...DEFAULT_CUSTOMER_INFO,
                                  nome: matchedName,
                                  whatsapp: cleanPhone,
                                };
                                setCustomerInfo(updatedInfo);
                                setProfileNameInput(matchedName);
                                localStorage.setItem(storageKey('pedifacil_customer_profile'), JSON.stringify(updatedInfo));
                                localStorage.setItem(storageKey('pedifacil_user_logged_in'), 'true');

                                const savedPhonePoints = localStorage.getItem(`${storageKey('pedifacil_loyalty_points')}_${cleanPhone}`);
                                const userPts = savedPhonePoints ? parseInt(savedPhonePoints, 10) : 0;
                                setLoyaltyPoints(userPts);

                                setUserLoggedIn(true);
                                showToast('Número encontrado em pedidos anteriores. Bem-vindo de volta!', 'success');
                                matched = true;
                              }
                            } catch (err) {
                              console.warn('Erro ao buscar pedidos anteriores por telefone:', err);
                            }
                          }
                        }

                        if (!matched) {
                          setProfileAction('register');
                          showToast('Telefone não cadastrado. Vamos criar sua conta agora.', 'success');
                        }
                      }
                  }} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-1">Número de Telefone (WhatsApp) *</label>
                      <input
                        required
                        type="tel"
                        placeholder="Ex: 86994508722"
                        value={profilePhoneInput}
                        onChange={(e) => setProfilePhoneInput(e.target.value.replace(/\D/g, ''))}
                        className="w-full p-3.5 bg-zinc-55 dark:bg-zinc-800 border border-zinc-150/40 dark:border-zinc-800 rounded-2xl text-xs font-semibold focus:ring-1 focus:ring-zinc-950 dark:text-zinc-100 focus:outline-hidden focus:bg-white"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-4 mt-2 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg transition active:scale-95"
                    >
                      Entrar (Login)
                    </button>

                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileAction('register');
                          setProfilePhoneInput('');
                        }}
                        className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 font-bold underline decoration-emerald-500/50 underline-offset-4"
                      >
                        Ainda não tem uma conta? Crie uma agora!
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : (
              /* REDESIGNED LOGGED-IN PROFILE PROFILE tab based on screenshot */
              <div className="space-y-6 text-left animate-slide-up mt-1">
                
                {profileSubSection === 'menu' ? (
                  <div className="space-y-6">
                    {/* Page header */}
                    <div className="px-1 pt-1">
                      <h1 className="text-3xl font-[900] text-black dark:text-white tracking-tight font-sans">
                        Perfil
                      </h1>
                    </div>

                    {/* Customer Info Card / Avatar */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 flex items-center gap-5 shadow-[0_8px_30px_rgba(0,0,0,0.03)] border border-zinc-100 dark:border-zinc-850">
                      <div className="w-16 h-16 rounded-full bg-violet-600 dark:bg-violet-700 flex items-center justify-center text-white font-extrabold text-2xl shadow-md shrink-0">
                        {customerInfo.nome ? customerInfo.nome.trim().charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="space-y-0.5">
                        <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight leading-normal">
                          {customerInfo.nome || 'Cliente'}
                        </h2>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold tracking-wide">
                          {customerInfo.whatsapp || 'Sem número'}
                        </p>
                      </div>
                    </div>

                    {/* Main Nav Items list */}
                    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-850 divide-y divide-zinc-100 dark:divide-zinc-800 shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('pedidos');
                          // Scroll tab to view
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full flex items-center justify-between p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30 transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <Clock className="text-black dark:text-zinc-100 stroke-[2.2px] group-hover:scale-105 transition duration-150" size={20} />
                          <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-[15px]">Histórico de Pedidos</span>
                        </div>
                        <ChevronRight className="text-zinc-400 group-hover:translate-x-0.5 transition" size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setProfileSubSection('endereco');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full flex items-center justify-between p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30 transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <MapPin className="text-black dark:text-zinc-100 stroke-[2.2px] group-hover:scale-105 transition duration-150" size={20} />
                          <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-[15px]">Meus Endereços</span>
                        </div>
                        <ChevronRight className="text-zinc-400 group-hover:translate-x-0.5 transition" size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('fidelidade');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="w-full flex items-center justify-between p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30 transition text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <Trophy className="text-black dark:text-zinc-100 stroke-[2.2px] group-hover:scale-105 transition duration-150" size={20} />
                          <span className="font-extrabold text-zinc-900 dark:text-zinc-100 text-[15px]">Ranking & Pontos</span>
                        </div>
                        <ChevronRight className="text-zinc-400 group-hover:translate-x-0.5 transition" size={16} />
                      </button>
                    </div>

                    {/* Sair da conta Button */}
                    <button
                      type="button"
                      onClick={() => {
                        resetCurrentProfileState();
                        setProfileAction('register');
                        showToast('Desconectado com sucesso.', 'success');
                      }}
                      className="w-full py-4 bg-rose-50 hover:bg-rose-100/80 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 font-extrabold text-sm rounded-3xl text-center block transition active:scale-[0.98] cursor-pointer shadow-xs"
                    >
                      Sair da conta
                    </button>
                  </div>
                ) : (
                  /* ADDRESS CONFIGURATION SUBSECTION */
                  <div className="space-y-5 animate-slide-up">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setProfileSubSection('menu');
                          setIsEditingAddress(false);
                        }}
                        className="flex items-center gap-2 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-bold text-xs cursor-pointer"
                      >
                        ← Voltar para o Perfil
                      </button>
                    </div>

                    {!isEditingAddress && (!customerInfo.endereco || !customerInfo.endereco.trim()) ? (
                      /* SCREENSHOT 1: NENHUM ENDEREÇO SALVO EMPTY STATE */
                      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 text-center border border-zinc-100 dark:border-zinc-850 shadow-[0_8px_30px_rgba(0,0,0,0.02)] space-y-6">
                        {/* Gray top horizontal indicator bar */}
                        <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto" />

                        {/* Title: Meus Endereços */}
                        <div className="text-left px-1">
                          <h1 className="text-2xl font-[900] text-black dark:text-white tracking-tight font-sans">
                            Meus Endereços
                          </h1>
                        </div>

                        {/* Map pin circular container */}
                        <div className="w-24 h-24 bg-zinc-50 dark:bg-zinc-850 rounded-full flex items-center justify-center mx-auto mb-2 shadow-xs mt-4">
                          <MapPin size={38} className="text-zinc-350 dark:text-zinc-500 stroke-[1.5]" />
                        </div>

                        <div className="space-y-1.5">
                          <h3 className="text-lg font-black text-zinc-950 dark:text-zinc-100 font-sans tracking-tight">
                            Nenhum endereço salvo
                          </h3>
                          <p className="text-[#9E9E9E] dark:text-zinc-400 font-semibold text-xs leading-relaxed max-w-[280px] mx-auto">
                            Você pode salvar seus endereços favoritos para agilizar seus próximos pedidos.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsEditingAddress(true)}
                          className="mt-6 py-4 px-12 bg-black dark:bg-white dark:text-black text-white hover:bg-zinc-900 transition font-black text-xs uppercase tracking-widest rounded-full shadow-md w-full max-w-[260px] mx-auto active:scale-95 cursor-pointer block"
                        >
                          + Adicionar Endereço
                        </button>
                      </div>
                    ) : !isEditingAddress ? (
                      /* SAVED ADDRESS VIEW CARD DETAILS */
                      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-850 shadow-[0_8px_30px_rgba(0,0,0,0.03)] text-left space-y-4">
                        {/* Gray top horizontal indicator bar */}
                        <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto mb-2" />

                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-650 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md inline-block">
                              Endereço Cadastrado
                            </span>
                            <h4 className="font-extrabold text-zinc-900 dark:text-zinc-50 text-sm mt-1">
                              {customerInfo.bairro ? `${customerInfo.bairro}` : 'Bairro não especificado'}
                            </h4>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold leading-relaxed">
                              {customerInfo.endereco}
                            </p>
                            {(customerInfo.complemento || customerInfo.referencia) && (
                              <p className="text-[11px] text-zinc-400 font-medium">
                                {customerInfo.complemento && `Comp: ${customerInfo.complemento}`}
                                {customerInfo.complemento && customerInfo.referencia && ' | '}
                                {customerInfo.referencia && `Ref: ${customerInfo.referencia}`}
                              </p>
                            )}
                          </div>
                          <div className="w-10 h-10 rounded-full bg-[#F9F9F9] dark:bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                            <MapPin size={18} className="stroke-[2px]" />
                          </div>
                        </div>

                        <div className="pt-2 grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setIsEditingAddress(true)}
                            className="w-full py-3 bg-[#F9F9F9] hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const clearedInfo = {
                                ...customerInfo,
                                endereco: '',
                                bairro: '',
                                complemento: '',
                                referencia: ''
                              };
                              setCustomerInfo(clearedInfo);
                              localStorage.setItem(storageKey('pedifacil_customer_profile'), JSON.stringify(clearedInfo));
                              showToast('Endereço removido com sucesso.', 'success');
                            }}
                            className="w-full py-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 font-black text-xs uppercase tracking-widest rounded-xl transition cursor-pointer"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* SCREENSHOT 2: ADDRESS REGISTRATION FORM WITH HIGH FIDELITY */
                      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm border border-zinc-100 dark:border-zinc-850 space-y-6">
                        {/* Gray top horizontal indicator bar */}
                        <div className="w-12 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full mx-auto" />

                        {/* Title is omitted per user's directive: 'não vai ter aquele nome onde entregamos' */}

                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            // Validação mais flexível - apenas bairro e endereço são obrigatórios
                            if (!customerInfo.whatsapp.trim()) {
                              showToast('WhatsApp é obrigatório.', 'error');
                              return;
                            }
                            if (!customerInfo.bairro || !customerInfo.bairro.trim()) {
                              showToast('Por favor, informe seu bairro.', 'error');
                              return;
                            }
                            if (!customerInfo.endereco.trim()) {
                              showToast('Preencha seu endereço completo.', 'error');
                              return;
                            }

                            const cleanPhone = customerInfo.whatsapp.replace(/\D/g, '');
                            const updatedInfo = {
                              ...customerInfo,
                              nome: customerInfo.nome.trim(),
                              whatsapp: customerInfo.whatsapp.trim(),
                              bairro: customerInfo.bairro.trim(),
                              endereco: customerInfo.endereco.trim(),
                              complemento: customerInfo.complemento.trim(),
                              referencia: customerInfo.referencia.trim(),
                            };
                            setCustomerInfo(updatedInfo);
                            localStorage.setItem(storageKey('pedifacil_customer_profile'), JSON.stringify(updatedInfo));

                            // Sync with pedifacil_registered_users if present
                            try {
                              const usersInStore = JSON.parse(localStorage.getItem(storageKey('pedifacil_registered_users')) || '[]');
                              const existingIdx = usersInStore.findIndex((u: any) => u.whatsapp === cleanPhone);
                              if (existingIdx >= 0) {
                                usersInStore[existingIdx].nome = customerInfo.nome.trim();
                                localStorage.setItem(storageKey('pedifacil_registered_users'), JSON.stringify(usersInStore));
                              }
                            } catch (err) {}

                            showToast('Endereço atualizado com sucesso! ✨', 'success');
                            setIsEditingAddress(false);
                          }}
                          className="space-y-5 text-left"
                        >
                          {/* SEU NOME */}
                          <div>
                            <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#9E9E9E] dark:text-[#A0A0A0] block mb-1.5 font-sans">
                              Seu Nome (Opcional)
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: João da Silva"
                              value={customerInfo.nome}
                              onChange={(e) => setCustomerInfo(prev => ({ ...prev, nome: e.target.value }))}
                              className="w-full p-4.5 bg-[#F9F9F9] dark:bg-zinc-800 border-none rounded-2xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-[#9E9E9E] dark:placeholder-zinc-500 focus:outline-hidden focus:bg-[#F2F2F2] dark:focus:bg-zinc-750 transition"
                            />
                          </div>

                          {/* WHATSAPP / CELULAR COM DDD * */}
                          <div>
                            <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#9E9E9E] dark:text-[#A0A0A0] block mb-1.5 font-sans">
                              WhatsApp / Celular com DDD *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Ex: 86994240872"
                              value={customerInfo.whatsapp}
                              onChange={(e) => setCustomerInfo(prev => ({ ...prev, whatsapp: e.target.value }))}
                              className="w-full p-4.5 bg-[#F9F9F9] dark:bg-zinc-800 border-none rounded-2xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-[#9E9E9E] dark:placeholder-zinc-500 focus:outline-hidden focus:bg-[#F2F2F2] dark:focus:bg-zinc-750 transition"
                            />
                          </div>

                          {/* BAIRRO OFICIAL * */}
                          <div>
                            <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#9E9E9E] dark:text-[#A0A0A0] block mb-1.5 font-sans">
                              Bairro Oficial *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Digite seu bairro..."
                              value={customerInfo.bairro}
                              onChange={(e) => setCustomerInfo(prev => ({ ...prev, bairro: e.target.value }))}
                              className="w-full p-4.5 bg-[#F9F9F9] dark:bg-zinc-800 border-none rounded-2xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-[#9E9E9E] dark:placeholder-zinc-500 focus:outline-hidden focus:bg-[#F2F2F2] dark:focus:bg-zinc-750 transition"
                            />
                            {customerInfo.bairro.trim() && (() => {
                              const mb = getHelperMatchedBairro(customerInfo.bairro);
                              const query = (customerInfo.bairro || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                              const suggestions = bairros.filter(b => {
                                const bClean = (b.nome || b.bairro || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                                return bClean.includes(query) && bClean !== query;
                              });

                              return (
                                <div className="space-y-1.5 mt-1.5">
                                  {/* Dynamic Recognition Feedbacks */}
                                  <div className="px-1 flex items-center justify-between text-[11px] font-bold">
                                    {mb ? (
                                      <span className="text-emerald-600 dark:text-emerald-400">
                                        ✓ Bairro reconhecido! Taxa: {mb.taxa === 0 ? 'Grátis' : `R$ ${mb.taxa.toFixed(2)}`}
                                      </span>
                                    ) : null}
                                  </div>

                                  {!mb && (
                                    <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-2.5 flex gap-2 items-center mt-1 text-amber-900 dark:text-amber-200 text-xs">
                                      <span className="text-sm shrink-0">📍</span>
                                      <div className="font-medium leading-tight">
                                        {storeExtras.fallback_bairro_msg || "Seu bairro não foi encontrado no sistema? Finaliza o pedido e manda a localização no WhatsApp!"}
                                      </div>
                                    </div>
                                  )}

                                  {/* Dynamic Autocomplete Suggestions */}
                                  {suggestions.length > 0 && (
                                    <div className="bg-white dark:bg-zinc-850 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-xs divide-y divide-zinc-50 dark:divide-zinc-800">
                                      {suggestions.slice(0, 3).map(b => (
                                        <button
                                          type="button"
                                          key={b.id}
                                          onClick={() => setCustomerInfo(prev => ({ ...prev, bairro: b.nome }))}
                                          className="w-full text-left px-4 py-2.5 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-bold flex justify-between items-center transition cursor-pointer"
                                        >
                                          <span>{b.nome}</span>
                                          <span className="text-[10px] text-zinc-400 font-bold">
                                            Taxa: {b.taxa === 0 ? 'Grátis' : `R$ ${b.taxa.toFixed(2)}`}
                                          </span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>

                          {/* ENDEREÇO COMPLETO (RUA E Nº) * */}
                          <div>
                            <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#9E9E9E] dark:text-[#A0A0A0] block mb-1.5 font-sans">
                              Endereço Completo (Rua e Nº) *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Rua das Acácias, Nº 145"
                              value={customerInfo.endereco}
                              onChange={(e) => setCustomerInfo(prev => ({ ...prev, endereco: e.target.value }))}
                              className="w-full p-4.5 bg-[#F9F9F9] dark:bg-zinc-800 border-none rounded-2xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-[#9E9E9E] dark:placeholder-zinc-500 focus:outline-hidden focus:bg-[#F2F2F2] dark:focus:bg-zinc-750 transition"
                            />
                          </div>

                          {/* COMPLEMENTO & REFERENCIA */}
                          <div className="grid grid-cols-2 gap-4 text-left">
                            <div>
                              <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#9E9E9E] dark:text-[#A0A0A0] block mb-1.5 font-sans">
                                Complemento
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: Apto 32"
                                value={customerInfo.complemento}
                                onChange={(e) => setCustomerInfo(prev => ({ ...prev, complemento: e.target.value }))}
                                className="w-full p-4.5 bg-[#F9F9F9] dark:bg-zinc-800 border-none rounded-2xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-[#9E9E9E] dark:placeholder-zinc-500 focus:outline-hidden focus:bg-[#F2F2F2] dark:focus:bg-zinc-750 transition"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-extrabold uppercase tracking-widest text-[#9E9E9E] dark:text-[#A0A0A0] block mb-1.5 font-sans">
                                Referência
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: Próximo à praça"
                                value={customerInfo.referencia}
                                onChange={(e) => setCustomerInfo(prev => ({ ...prev, referencia: e.target.value }))}
                                className="w-full p-4.5 bg-[#F9F9F9] dark:bg-zinc-800 border-none rounded-2xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-[#9E9E9E] dark:placeholder-zinc-500 focus:outline-hidden focus:bg-[#F2F2F2] dark:focus:bg-zinc-750 transition"
                              />
                            </div>
                          </div>

                          {customerInfo.bairro === 'Outro / Não encontrei' && (
                            <p className="text-[10px] font-bold text-rose-500 mt-1 leading-normal">
                              ⚠️ Não há problema! Ao finalizar no WhatsApp, envie sua localização em tempo real para o motoboy.
                            </p>
                          )}

                          <button
                            type="submit"
                            className="w-full mt-4 py-4 bg-zinc-950 hover:bg-zinc-900 dark:bg-white dark:text-black dark:hover:bg-zinc-150 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-md transition active:scale-95 cursor-pointer block"
                          >
                            Salvar Alterações
                          </button>
                        </form>
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}
          </div>
        )}

      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-8">
          <span className="text-4xl">🔍</span>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-3 font-medium">Nenhum produto correspondente encontrado.</p>
          <button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} className="mt-4 text-xs font-extrabold text-[#1ebd5c] uppercase tracking-widest hover:underline">
            Limpar filtros
          </button>
        </div>
      )}

      {/* Persistent Back To Top Arrow Trigger */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-24 left-4 z-40 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-3 rounded-full shadow-xl border border-zinc-200 dark:border-zinc-800 transition active:scale-95"
        >
          <ArrowUp size={16} />
        </button>
      )}

      {/* Floating Bottom Cart Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-16 inset-x-0 max-w-lg mx-auto p-3 sm:p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-150 dark:border-zinc-800 z-40 flex items-center gap-4 shadow-md">
          <button
            onClick={() => {
              if (!store?.aberto) {
                showToast('A loja está fechada. Pedidos não podem ser realizados agora.', 'error');
                return;
              }
              setIsCartOpen(true);
            }}
            className="flex-1 py-3.5 sm:py-4 px-5 sm:px-6 bg-[#1ebd5c] hover:bg-[#1ebd5c]/95 text-white font-extrabold rounded-2xl flex items-center justify-between transition animate-bounce-in shadow-xl active:scale-95 cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <span className="bg-white/20 text-white rounded-lg text-xs px-2 py-1">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
              <span className="text-sm tracking-wide font-bold">Ver Sacola</span>
            </span>
            <span className="text-sm font-black">R$ {getSubtotal().toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Universal persistent bottom tab navigation bar */}
      <div className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-white dark:bg-zinc-900 border-t border-zinc-150 dark:border-zinc-800 py-2.5 sm:py-3 px-2 z-40 flex justify-around items-center shadow-[0_-4px_12px_rgba(0,0,0,0.03)] pb-safe">
        <button
          onClick={() => setActiveTab('inicio')}
          className={`flex flex-col items-center gap-1 flex-1 transition-all duration-200 ${
            activeTab === 'inicio' ? 'text-zinc-950 dark:text-white scale-105' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
          id="btn-nav-inicio"
        >
          <Home size={20} className={activeTab === 'inicio' ? "stroke-[2.5px] text-zinc-950 dark:text-white" : "stroke-[1.8px]"} />
          <span className={`text-[10px] tracking-wide font-sans ${activeTab === 'inicio' ? 'font-black text-zinc-950 dark:text-white' : 'font-semibold text-zinc-400'}`}>Início</span>
        </button>

        <button
          onClick={() => setActiveTab('promocoes')}
          className={`flex flex-col items-center gap-1 flex-1 transition-all duration-200 ${
            activeTab === 'promocoes' ? 'text-zinc-950 dark:text-white scale-105' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
          id="btn-nav-promocoes"
        >
          <Tag size={20} className={activeTab === 'promocoes' ? "stroke-[2.5px] text-zinc-950 dark:text-white" : "stroke-[1.8px]"} />
          <span className={`text-[10px] tracking-wide font-sans ${activeTab === 'promocoes' ? 'font-black text-zinc-950 dark:text-white' : 'font-semibold text-zinc-400'}`}>Promoções</span>
        </button>

        <button
          onClick={() => setActiveTab('fidelidade')}
          className={`flex flex-col items-center gap-1 flex-1 transition-all duration-200 ${
            activeTab === 'fidelidade' ? 'text-zinc-950 dark:text-white scale-105' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
          id="btn-nav-fidelidade"
        >
          <Trophy size={20} className={activeTab === 'fidelidade' ? "stroke-[2.5px] text-zinc-950 dark:text-white" : "stroke-[1.8px]"} />
          <span className={`text-[10px] tracking-wide font-sans ${activeTab === 'fidelidade' ? 'font-black text-zinc-950 dark:text-white' : 'font-semibold text-zinc-400'}`}>Fidelidade</span>
        </button>

        <button
          onClick={() => setActiveTab('pedidos')}
          className={`flex flex-col items-center gap-1 flex-1 transition-all duration-200 ${
            activeTab === 'pedidos' ? 'text-zinc-950 dark:text-white scale-105' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
          id="btn-nav-pedidos"
        >
          <ClipboardList size={20} className={activeTab === 'pedidos' ? "stroke-[2.5px] text-zinc-950 dark:text-white" : "stroke-[1.8px]"} />
          <span className={`text-[10px] tracking-wide font-sans ${activeTab === 'pedidos' ? 'font-black text-zinc-950 dark:text-white' : 'font-semibold text-zinc-400'}`}>Pedidos</span>
        </button>

        <button
          onClick={() => setActiveTab('perfil')}
          className={`flex flex-col items-center gap-1 flex-1 transition-all duration-200 ${
            activeTab === 'perfil' ? 'text-zinc-950 dark:text-white scale-105' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
          }`}
          id="btn-nav-perfil"
        >
          <User size={20} className={activeTab === 'perfil' ? "stroke-[2.5px] text-zinc-950 dark:text-white" : "stroke-[1.8px]"} />
          <span className={`text-[10px] tracking-wide font-sans ${activeTab === 'perfil' ? 'font-black text-zinc-950 dark:text-white' : 'font-semibold text-zinc-400'}`}>Perfil</span>
        </button>
      </div>

      {/* MODAL ID COMPONENT: PRODUCT OPTIONS CHANGER */}
      <AnimatePresence>
        {activeProduct && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setActiveProduct(null);
                setActiveProductMeta(null);
              }}
              className="fixed inset-0 bg-black/80 z-50 backdrop-filter backdrop-blur-xs"
            ></motion.div>
            
            <motion.div
              initial={{ translateY: '100%' }}
              animate={{ translateY: 0 }}
              exit={{ translateY: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-t-[2rem] shadow-2xl z-50 overflow-hidden max-h-[92vh] flex flex-col border-t border-zinc-200 dark:border-zinc-800"
            >
              {/* Floating Close Button */}
              <button
                onClick={() => {
                  setActiveProduct(null);
                  setActiveProductMeta(null);
                }}
                className="absolute top-4 right-4 w-9 h-9 bg-zinc-100/90 dark:bg-zinc-800/95 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-full flex items-center justify-center transition active:scale-95 z-50 shadow-sm border border-zinc-200/50 dark:border-zinc-700/50"
              >
                <X size={18} className="stroke-[2.5]" />
              </button>

              {/* Top Drag Indicator Marker of the Modal */}
              <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-3 flex-shrink-0" />
              
              {/* Scrollable customizing body area */}
              <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
                
                {/* Product Picture header if available */}
                {activeProduct.foto_url && (
                  <div className="w-full h-48 md:h-52 rounded-2xl overflow-hidden shadow-sm relative bg-zinc-100">
                    <img src={activeProduct.foto_url} alt={activeProduct.name} className="w-full h-full object-cover" />
                  </div>
                )}

                <div>
                  <h2 className="text-2xl font-black text-zinc-900 dark:text-zinc-50">{activeProduct.name}</h2>
                  <p className="text-zinc-400 dark:text-zinc-500 text-xs mt-1.5 leading-relaxed">{activeProduct.description}</p>
                  <p className="text-rose-600 dark:text-rose-400 text-lg font-black mt-2">R$ {(activeProduct.preco_promocional || activeProduct.preco).toFixed(2)}</p>
                </div>

                {/* Validation Warnings Alarm */}
                {validationError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold rounded-xl flex items-center gap-2">
                    <AlertCircle size={14} />
                    <span>{validationError}</span>
                  </div>
                )}

                {/* nicho-specific customizing fields (Hambúrguer, etc.) */}
                {shouldShowHamburguerCustomization && (
                  <div className="space-y-6">
                    {/* BREAD CHOICE (PÃO REQUIRED GROUP) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Pão Escolhido *</h3>
                        <span className="text-[10px] bg-black dark:bg-white text-white dark:text-black font-black uppercase px-2 py-0.5 rounded-lg">Escolha 1</span>
                      </div>
                      <div className="space-y-2">
                        {['Brioche Artesanal Macio', 'Pão Australiano Nobre', 'Pão Tradicional com Gergelim'].map(pao => (
                          <div
                            key={pao}
                            onClick={() => {
                              if (selectPao === pao) {
                                setSelectPao('');
                              } else {
                                setSelectPao(pao);
                                setValidationError('');
                              }
                            }}
                            className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-between cursor-pointer transition ${selectPao === pao ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'}`}
                          >
                            <span>{pao}</span>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectPao === pao ? 'border-orange-500 bg-orange-500' : 'border-zinc-300'}`}>
                              {selectPao === pao && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* BLENDS OPTIONS WITH EXTRA PRICE TAGS */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Opção de Carne</h3>
                        <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold px-2 py-0.5 rounded-lg">Estilo Lanche</span>
                      </div>
                      <div className="space-y-2">
                        {[
                          { name: '1 blend de costela (180g)', extra: 0 },
                          { name: '2 blends de costela (360g)', extra: 8.00 },
                          { name: 'Smash Premium', extra: 4.00 },
                          { name: 'Frango Empanado extra (150g)', extra: 5.00 }
                        ].map(opt => (
                          <div
                            key={opt.name}
                            onClick={() => {
                              if (selectCarne === opt.name) {
                                setSelectCarne('');
                              } else {
                                setSelectCarne(opt.name);
                                setValidationError('');
                              }
                            }}
                            className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-between cursor-pointer transition ${selectCarne === opt.name ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'}`}
                          >
                            <span className="flex-1 pr-2">{opt.name}</span>
                            <span className="text-xs text-zinc-400 whitespace-nowrap">{opt.extra > 0 ? `+ R$ ${opt.extra.toFixed(2)}` : 'Grátis'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* COOKING POINTS REQUIRED GROUP */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Ponto da Carne *</h3>
                        <span className="text-[10px] bg-black dark:bg-white text-white dark:text-black font-black uppercase px-2 py-0.5 rounded-lg">Escolha 1</span>
                      </div>
                      <div className="space-y-2">
                        {['Ao Ponto (Rosado e Suculento)', 'Mal Passado (Rosado ao extremo)', 'Bem Passado (Bem cozido)'].map(ponto => (
                          <div
                            key={ponto}
                            onClick={() => {
                              if (selectPonto === ponto) {
                                setSelectPonto('');
                              } else {
                                setSelectPonto(ponto);
                                setValidationError('');
                              }
                            }}
                            className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-between cursor-pointer transition ${selectPonto === ponto ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'}`}
                          >
                            <span>{ponto}</span>
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectPonto === ponto ? 'border-orange-500 bg-orange-500' : 'border-zinc-300'}`}>
                              {selectPonto === ponto && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* PAID ADDONS LIST */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Adicionais Extras</h3>
                      <div className="grid grid-cols-1 gap-2">
                        {[
                          { key: 'bacon', name: 'Bacon Rústico extra', price: 4.50 },
                          { key: 'cheddar', name: 'Cheddar cremoso extra', price: 4.00 },
                          { key: 'ovo', name: 'Ovo frito na chapa', price: 2.00 },
                          { key: 'catupiry', name: 'Catupiry original extra', price: 4.00 },
                          { key: 'hamburguer_extra', name: 'Blend extra (180g)', price: 8.00 },
                          { key: 'cebola_caram', name: 'Cebola Caramelizada extra', price: 3.00 },
                          { key: 'onion_rings', name: 'Onion Rings no lanche', price: 4.00 },
                          { key: 'molho_esp', name: 'Molho do Gordo extra', price: 2.50 },
                          { key: 'batata_extra', name: 'Porção Batata Frita extra', price: 6.00 }
                        ].map(addon => {
                          const active = !!selectedAddons[addon.key];
                          return (
                            <div
                              key={addon.key}
                              onClick={() => {
                                setSelectedAddons(prev => ({ ...prev, [addon.key]: !prev[addon.key] }));
                              }}
                              className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-between cursor-pointer transition ${active ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'}`}
                            >
                              <span>{addon.name}</span>
                              <span className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400">+ R$ {addon.price.toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* REMOVE INGREDIENTS CHECKLIST (FREE REMOVAL) */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Remover Ingredientes</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { key: 'cebola', name: 'Sem Cebola' },
                          { key: 'tomate', name: 'Sem Tomate' },
                          { key: 'alface', name: 'Sem Alface' },
                          { key: 'picles', name: 'Sem Picles' },
                          { key: 'molho', name: 'Sem Molho' },
                          { key: 'queijo', name: 'Sem Queijo' }
                        ].map(ing => {
                          const active = !!removedIngredients[ing.key];
                          return (
                            <div
                              key={ing.key}
                              onClick={() => {
                                setRemovedIngredients(prev => ({ ...prev, [ing.key]: !prev[ing.key] }));
                              }}
                              className={`p-3.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition ${active ? 'bg-red-500/10 border-red-500 text-red-500' : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-650'}`}
                            >
                              <span>{ing.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Dynamic optionGroups from admin (rendered for all products) */}
                {activeProductMeta?.optionGroups && activeProductMeta.optionGroups.length > 0 && (
                  <div className="space-y-5">
                    {activeProductMeta.optionGroups.map(group => {
                      const chosen = selectedOptionItems[group.id] || [];
                      const isMulti = group.maxSelection !== 1;
                      const toggleItem = (itemId: string) => {
                        setSelectedOptionItems(prev => {
                          const current = prev[group.id] || [];
                          if (current.includes(itemId)) {
                            return { ...prev, [group.id]: current.filter(id => id !== itemId) };
                          }
                          if (!isMulti) {
                            return { ...prev, [group.id]: [itemId] };
                          }
                          if (group.maxSelection > 0 && current.length >= group.maxSelection) {
                            return prev;
                          }
                          return { ...prev, [group.id]: [...current, itemId] };
                        });
                        setValidationError('');
                      };
                      return (
                        <div key={group.id} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">
                              {group.label}{group.required ? ' *' : ''}
                            </h3>
                            <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold px-2 py-0.5 rounded-lg">
                              {group.required ? `Obrigatório` : 'Opcional'}
                              {group.maxSelection > 1 ? ` • máx ${group.maxSelection}` : ''}
                            </span>
                          </div>
                          <div className="space-y-2">
                            {group.items.filter(item => item.available !== false).map(item => {
                              const isSelected = chosen.includes(item.id);
                              const isCounter = group.controlType === 'counter';
                              const currentItemCount = chosen.filter(id => id === item.id).length;
                              const totalGroupSelected = chosen.length;

                              if (isCounter) {
                                // Counter mode: +/- buttons
                                const qty = currentItemCount;
                                const canAddMore = group.maxSelection <= 0 || totalGroupSelected < group.maxSelection;
                                const adjustQty = (delta: number) => {
                                  if (delta > 0) {
                                    if (!canAddMore) return;
                                    setSelectedOptionItems(prev => {
                                      const current = prev[group.id] || [];
                                      return { ...prev, [group.id]: [...current, item.id] };
                                    });
                                  } else if (delta < 0) {
                                    if (qty <= 0) return;
                                    setSelectedOptionItems(prev => {
                                      const current = prev[group.id] || [];
                                      const idx = current.lastIndexOf(item.id);
                                      if (idx === -1) return prev;
                                      const next = [...current];
                                      next.splice(idx, 1);
                                      return { ...prev, [group.id]: next };
                                    });
                                  }
                                  setValidationError('');
                                };
                                return (
                                  <div
                                    key={item.id}
                                    className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-between transition ${
                                      qty > 0
                                        ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400'
                                        : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 min-w-0">
                                      {item.foto_url && (
                                        <img
                                          src={item.foto_url}
                                          alt={item.name}
                                          className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                        />
                                      )}
                                      <div className="min-w-0">
                                        <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate">{item.name}</span>
                                        {item.description && (
                                          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal line-clamp-2 mt-0.5 leading-snug">{item.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-0.5">
                                          {!item.isFree && item.price > 0 && (
                                            <span className="text-xs text-zinc-500 font-medium">+ R$ {item.price.toFixed(2)}</span>
                                          )}
                                          {item.isFree && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Grátis</span>}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                      <button
                                        type="button"
                                        onClick={() => adjustQty(-1)}
                                        disabled={qty <= 0}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-black border-2 transition ${
                                          qty > 0
                                            ? 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white cursor-pointer'
                                            : 'border-zinc-300 dark:border-zinc-600 text-zinc-300 dark:text-zinc-600 cursor-not-allowed opacity-40'
                                        }`}
                                      >
                                        −
                                      </button>
                                      <span className="w-5 text-center text-sm font-black">{qty}</span>
                                      <button
                                        type="button"
                                        onClick={() => adjustQty(1)}
                                        disabled={!canAddMore}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-base font-black border-2 transition ${
                                          canAddMore
                                            ? 'border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white cursor-pointer'
                                            : 'border-zinc-300 dark:border-zinc-600 text-zinc-300 dark:text-zinc-600 cursor-not-allowed opacity-40'
                                        }`}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              // Radio/checkbox mode (bolinha - default)
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => toggleItem(item.id)}
                                  className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-between cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-orange-500/10 border-orange-500 text-orange-600 dark:text-orange-400'
                                      : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {item.foto_url && (
                                      <img
                                        src={item.foto_url}
                                        alt={item.name}
                                        className="w-12 h-12 rounded-xl object-cover shrink-0 border border-zinc-200 dark:border-zinc-700"
                                      />
                                    )}
                                    <div className="min-w-0">
                                      <span className="font-bold text-zinc-900 dark:text-zinc-100 block truncate">{item.name}</span>
                                      {item.description && (
                                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-normal line-clamp-2 mt-0.5 leading-snug">{item.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    {!item.isFree && item.price > 0 && (
                                      <span className="text-xs text-zinc-500">+ R$ {item.price.toFixed(2)}</span>
                                    )}
                                    {item.isFree && (
                                      <span className="text-xs text-zinc-400">Grátis</span>
                                    )}
                                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                                      isSelected ? 'border-orange-500 bg-orange-500' : 'border-zinc-300'
                                    }`}>
                                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* General observations text area feedback */}
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest">Alguma Observação?</h3>
                  <textarea
                    rows={2}
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    placeholder="Ex: Pão sem gergelim, molho à parte..."
                    className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 focus:ring-1 focus:ring-black dark:text-zinc-100 text-xs focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Bottom Fixed action checkout triggers inside customized modal */}
              <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-850 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-800 rounded-full px-4 py-2 border border-zinc-200/50 dark:border-zinc-700">
                  <button
                    onClick={() => setProductQty(q => Math.max(1, q - 1))}
                    className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-mono font-bold text-base w-6 text-center text-zinc-900 dark:text-zinc-100">
                    {productQty}
                  </span>
                  <button
                    onClick={() => setProductQty(q => q + 1)}
                    className="p-1 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <button
                  onClick={handleAddProductToCart}
                  className="flex-1 py-4 px-6 bg-black text-white dark:bg-white dark:text-black font-extrabold rounded-2xl transition duration-150 transform active:scale-98"
                >
                  Adicionar • R$ {calculateCustomizedPrice().toFixed(2)}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* UPSELL AUTOMATED RECOGNITION POPUP */}
      <AnimatePresence>
        {showUpsell && upsellProduct && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
            <motion.div
              initial={{ translateY: '100%', opacity: 0 }}
              animate={{ translateY: 0, opacity: 1 }}
              exit={{ translateY: '100%', opacity: 0 }}
              className="w-full max-w-[440px] bg-white dark:bg-zinc-900 rounded-3xl p-5 shadow-2xl relative border border-zinc-100 dark:border-zinc-800"
            >
              <button onClick={() => setShowUpsell(false)} className="absolute right-4 top-4 p-1 rounded-full text-zinc-400 hover:bg-zinc-100">
                <X size={16} />
              </button>
              <div className="flex gap-4">
                {upsellProduct.foto_url && (
                  <img src={upsellProduct.foto_url} alt="Batch" className="w-20 h-20 rounded-xl object-cover" />
                )}
                <div className="flex-1">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full inline-block mb-1">
                    Gordo Indica 🍟
                  </span>
                  <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50">Que tal {upsellProduct.name}?</h4>
                  <p className="text-xs text-zinc-450 mt-1">Aproveite para complementar seu lanche com esse delicioso adicional!</p>
                  <p className="text-xs text-zinc-900 dark:text-zinc-200 font-extrabold mt-2">Por apenas + R$ {upsellProduct.preco.toFixed(2)}</p>
                </div>
              </div>
              <div className="flex gap-3 mt-4 text-xs font-bold uppercase tracking-widest">
                <button onClick={() => setShowUpsell(false)} className="flex-1 py-3 text-center text-zinc-400 rounded-xl hover:text-zinc-900">
                  Ignorar
                </button>
                <button onClick={handleAddUpsell} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-center shadow-lg shadow-emerald-500/15">
                  Adicionar!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL ID COMPONENT: SACARRINHO/BAG DISPLAY */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/80 z-50"
            ></motion.div>
            
            <motion.div
              initial={{ translateY: '100%' }}
              animate={{ translateY: 0 }}
              exit={{ translateY: '100%' }}
              className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-t-[2rem] z-50 overflow-hidden max-h-[88vh] flex flex-col"
            >
              <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-3 flex-shrink-0" />
              
              <div className="px-6 flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex flex-col">
                  <h3 className="text-lg font-black text-zinc-950 dark:text-zinc-50">🛍️ Minha Sacola</h3>
                  <span className="text-xs text-zinc-450 dark:text-zinc-400 font-semibold">{cart.length} lanches</span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-full flex items-center justify-center transition active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Shopping bag list elements */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-10 space-y-3">
                    <span className="text-4xl text-zinc-300 dark:text-zinc-700 block">🛒</span>
                    <p className="text-zinc-500 text-sm">Seu carrinho está vazio!</p>
                  </div>
                ) : (
                  cart.map(item => (
                    <div key={item.id} className="flex justify-between items-start gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-850 rounded-2xl border border-zinc-200/80 dark:border-zinc-800">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">{item.name}</h4>
                        
                        {/* Customizations / Options / Addons */}
                        {item.personalization && (
                          <div className="text-xs text-zinc-600 dark:text-zinc-300 mt-2 space-y-1">
                            {item.personalization.sao_pao && (
                              <div className="flex items-center gap-1.5 font-medium">
                                <span>🍞</span>
                                <span>Pão: <strong className="text-zinc-900 dark:text-zinc-100">{item.personalization.sao_pao}</strong></span>
                              </div>
                            )}
                            {item.personalization.carne_tipo && (
                              <div className="flex items-center gap-1.5 font-medium">
                                <span>🥩</span>
                                <span>Carne: <strong className="text-zinc-900 dark:text-zinc-100">{item.personalization.carne_tipo}</strong></span>
                              </div>
                            )}
                            {item.personalization.carne_ponto && (
                              <div className="flex items-center gap-1.5 font-medium">
                                <span>🔥</span>
                                <span>Ponto: <strong className="text-amber-600 dark:text-amber-400">{item.personalization.carne_ponto}</strong></span>
                              </div>
                            )}
                            {(() => {
                              const p = item.personalization;
                              const added: string[] = [];
                              if (p.add_bacon) added.push('Bacon Rústico');
                              if (p.add_cheddar) added.push('Cheddar cremoso');
                              if (p.add_ovo) added.push('Ovo frito');
                              if (p.add_catupiry) added.push('Catupiry original');
                              if (p.add_hamburguer) added.push('Blend extra');
                              if (p.add_cebola_caramelizada) added.push('Cebola Caramelizada');
                              if (p.add_onion_rings) added.push('Onion Rings');
                              if (p.add_molho_especial) added.push('Molho do Gordo');
                              if (p.add_batata_extra) added.push('Batata frita');
                              
                              if (added.length > 0) {
                                return (
                                  <div className="flex items-start gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
                                    <span>➕</span>
                                    <span>Adicionais: <strong>{added.join(', ')}</strong></span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                            {(() => {
                              const p = item.personalization;
                              const removed: string[] = [];
                              if (p.remove_cebola) removed.push('Cebola');
                              if (p.remove_tomate) removed.push('Tomate');
                              if (p.remove_alface) removed.push('Alface');
                              if (p.remove_picles) removed.push('Picles');
                              if (p.remove_molho) removed.push('Molho');
                              if (p.remove_queijo) removed.push('Queijo');
                              
                              if (removed.length > 0) {
                                return (
                                  <div className="flex items-start gap-1.5 font-medium text-rose-500 dark:text-rose-400">
                                    <span>❌</span>
                                    <span>Sem: <strong>{removed.join(', ')}</strong></span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}

                        {/* Selected Dynamic Options and Customer Notes */}
                        {item.observacao && (
                          <div className="mt-2 space-y-1">
                            {item.observacao.split(' | ').map((line, idx) => {
                              const isCustomNote = line.toLowerCase().startsWith('obs:') || (!line.includes(':') && idx === item.observacao!.split(' | ').length - 1);
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-start gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium ${
                                    isCustomNote
                                      ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200'
                                      : 'bg-zinc-100/90 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200'
                                  }`}
                                >
                                  <span className="shrink-0">{isCustomNote ? '📝' : '✨'}</span>
                                  <span className="break-words leading-relaxed">{line}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="flex items-baseline gap-2 mt-2.5">
                          <span className="text-zinc-900 dark:text-zinc-100 text-sm font-black">
                            R$ {item.price.toFixed(2)}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-[10px] text-zinc-400 font-medium">
                              ({item.quantity}x de R$ {(item.price / item.quantity).toFixed(2)})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 bg-zinc-200/60 dark:bg-zinc-800 rounded-full px-2 py-1.5 flex-shrink-0 mt-0.5">
                        <button
                          onClick={() => {
                            const newQty = item.quantity - 1;
                            if (newQty <= 0) {
                              setCart(prev => prev.filter(i => i.id !== item.id));
                              showToast('Item removido do carrinho.', 'error');
                            } else {
                              setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty, price: (i.price / i.quantity) * newQty } : i));
                            }
                          }}
                          className="p-0.5 text-zinc-500 dark:text-zinc-400"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-200">{item.quantity}</span>
                        <button
                          onClick={() => {
                            const newQty = item.quantity + 1;
                            setCart(prev => prev.map(i => i.id === item.id ? { ...i, quantity: newQty, price: (i.price / i.quantity) * newQty } : i));
                          }}
                          className="p-0.5 text-zinc-500 dark:text-zinc-400"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}

                {/* Cupom discount input box */}
                {cart.length > 0 && (
                  <div className="bg-zinc-50 dark:bg-zinc-850 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 space-y-2 mt-6">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block">🎟️ Aplicar Cupom de Desconto</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="CÓDIGO77"
                        value={cupomInput}
                        onChange={(e) => setCupomInput(e.target.value)}
                        className={`flex-1 min-w-0 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold uppercase focus:outline-hidden ${shakeCupom ? 'border-red-500 animate-wiggle' : ''}`}
                      />
                      <button
                        onClick={() => handleApplyCoupon()}
                        className="px-5 flex-shrink-0 bg-black dark:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase"
                      >
                        OK
                      </button>
                    </div>
                    {cupomError && <p className="text-[10px] font-bold text-rose-500">{cupomError}</p>}
                    {cupomSuccess && <p className="text-[10px] font-bold text-emerald-500">{cupomSuccess}</p>}
                  </div>
                )}

                <div className="h-4" />
              </div>

              {/* Total calculations overlay layout */}
              {cart.length > 0 && (
                <div className="p-6 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-850 space-y-4">
                  <div className="space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <div className="flex justify-between">
                      <span>Subtotal lanches</span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-200 font-bold">R$ {getSubtotal().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxa de entrega</span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-200 font-bold">
                        {getDeliveryFeeDisplay()}
                      </span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-emerald-500">
                        <span>Desconto ativo</span>
                        <span className="font-mono font-bold">-R$ {discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-zinc-900 dark:text-zinc-50 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                      <span>Total final</span>
                      <span className="font-mono text-lg text-rose-600 dark:text-rose-400">R$ {getOrderTotal().toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!store?.aberto) {
                        showToast('A loja está fechada. Não é possível finalizar o pedido agora.', 'error');
                        return;
                      }
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    className="w-full py-4 text-center bg-black dark:bg-white text-white dark:text-black font-extrabold rounded-2xl shadow-xl shadow-black/10 text-sm tracking-wide"
                  >
                    Confirmar Endereço para Envio
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL ID COMPONENT: CHECKOUT INFORMAÇÕES CLIENTE */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCheckoutOpen(null)}
              className="fixed inset-0 bg-black/80 z-50"
            ></motion.div>
            
            <motion.div
              initial={{ translateY: '100%' }}
              animate={{ translateY: 0 }}
              exit={{ translateY: '100%' }}
              className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-t-[2rem] z-50 overflow-hidden max-h-[92vh] flex flex-col border-t border-zinc-200 dark:border-zinc-800"
            >
              <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-3 flex-shrink-0" />

              <div className="px-6 flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-lg font-black text-zinc-950 dark:text-zinc-50">📍 Onde entregamos?</h3>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-full flex items-center justify-center transition active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Address delivery and forms list container */}
              <form onSubmit={handleCheckout} className="flex-1 overflow-y-auto p-6 space-y-5">
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1.5">Seu Nome (Opcional)</label>
                    <input
                      type="text"
                      placeholder="Ex: João da Silva"
                      value={customerInfo.nome}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-black dark:text-zinc-100 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1.5">WhatsApp / Celular com DDD *</label>
                    <input
                      required
                      type="tel"
                      placeholder="Ex: 86994240872"
                      value={customerInfo.whatsapp}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, whatsapp: e.target.value.replace(/\D/g, '') }))}
                      className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-black dark:text-zinc-100 focus:outline-hidden"
                    />
                  </div>

                  {/* Neighborhood Selector with automatic delivery fee configuration */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1.5">Bairro Oficial</label>
                    <input
                      type="text"
                      placeholder="Digite seu bairro..."
                      value={customerInfo.bairro}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, bairro: e.target.value }))}
                      className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm font-bold focus:ring-1 focus:ring-black dark:text-zinc-100 focus:outline-hidden"
                    />
                    {customerInfo.bairro.trim() && (() => {
                      const mb = getHelperMatchedBairro(customerInfo.bairro);
                      const query = (customerInfo.bairro || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                      const suggestions = bairros.filter(b => {
                        const bClean = (b.nome || b.bairro || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        return bClean.includes(query) && bClean !== query;
                      });

                      return (
                        <div className="space-y-1.5 mt-1.5">
                          {/* Dynamic Recognition Feedbacks */}
                          <div className="px-0.5 flex items-center justify-between text-[11px] font-bold">
                            {mb ? (
                              <span className="text-emerald-600 dark:text-emerald-400">
                                ✓ Bairro reconhecido! Taxa: {mb.taxa === 0 ? 'Grátis' : `R$ ${mb.taxa.toFixed(2)}`}
                              </span>
                            ) : null}
                          </div>
                          
                          {!mb && (
                            <div className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200/60 dark:border-amber-800/40 rounded-xl p-2.5 flex gap-2 items-center mt-1 text-amber-900 dark:text-amber-200 text-xs">
                              <span className="text-sm shrink-0">📍</span>
                              <div className="font-medium leading-tight">
                                {storeExtras.fallback_bairro_msg || "Seu bairro não foi encontrado no sistema? Finaliza o pedido e manda a localização no WhatsApp!"}
                              </div>
                            </div>
                          )}

                          {/* Dynamic Autocomplete Suggestions */}
                          {suggestions.length > 0 && (
                            <div className="bg-white dark:bg-zinc-850 border border-zinc-100 dark:border-zinc-800/85 rounded-xl overflow-hidden shadow-xs divide-y divide-zinc-50 dark:divide-zinc-800">
                              {suggestions.slice(0, 3).map(b => (
                                <button
                                  type="button"
                                  key={b.id}
                                  onClick={() => setCustomerInfo(prev => ({ ...prev, bairro: b.nome }))}
                                  className="w-full text-left px-3.5 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 font-bold flex justify-between items-center transition cursor-pointer"
                                >
                                  <span>{b.nome}</span>
                                  <span className="text-[10px] text-zinc-400 font-bold">
                                    Taxa: {b.taxa === 0 ? 'Grátis' : `R$ ${b.taxa.toFixed(2)}`}
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1.5">Endereço Completo (Rua e Nº) *</label>
                    <input
                      required
                      type="text"
                      placeholder="Rua das Acácias, Nº 145"
                      value={customerInfo.endereco}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, endereco: e.target.value }))}
                      className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-black dark:text-zinc-100 focus:outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1.5">Complemento (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: Apto 32"
                        value={customerInfo.complemento}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, complemento: e.target.value }))}
                        className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-black dark:text-zinc-100 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1.5">Referência (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: Próximo à praça"
                        value={customerInfo.referencia}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, referencia: e.target.value }))}
                        className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-black dark:text-zinc-100 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Payment option selectors */}
                  <div className="pt-2">
                    <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-2">Forma de Pagamento Preferida *</label>
                    {(() => {
                      const availableFormas = [
                        store?.metodos_pagamento?.pix !== false && 'PIX',
                        store?.metodos_pagamento?.cartao !== false && 'Cartão',
                        store?.metodos_pagamento?.dinheiro !== false && 'Dinheiro',
                        store?.metodos_pagamento?.vr && 'Vale Refeição'
                      ].filter(Boolean) as ('PIX' | 'Cartão' | 'Dinheiro' | 'Vale Refeição')[];

                      const colsClass = availableFormas.length <= 2 ? 'grid-cols-2' : availableFormas.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4';

                      return (
                        <div className={`grid ${colsClass} gap-2`}>
                          {availableFormas.map(forma => {
                            const isSelected = customerInfo.formaPagamento === forma;
                            return (
                              <button
                                key={forma}
                                type="button"
                                onClick={() => {
                                  setCustomerInfo(prev => ({ ...prev, formaPagamento: forma as any }));
                                }}
                                className={`p-2.5 rounded-xl border text-xs font-black uppercase tracking-wide transition flex items-center justify-center gap-1.5 cursor-pointer ${
                                  isSelected 
                                    ? 'bg-zinc-950 dark:bg-white text-white dark:text-zinc-950 border-zinc-950 dark:border-white scale-[1.02] shadow-xs' 
                                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-750'
                                }`}
                              >
                                {forma === 'PIX' && <PixLogoIcon className="w-4.5 h-4.5 rounded-md" />}
                                {forma === 'Cartão' && <CartaoIcon className="w-4.5 h-4.5 rounded-md" />}
                                {forma === 'Dinheiro' && <DinheiroIcon className="w-4.5 h-4.5 rounded-md" />}
                                {forma === 'Vale Refeição' && <div className="w-4.5 h-4.5 rounded-md bg-orange-100 dark:bg-orange-950/40 text-orange-500 font-extrabold text-[9px] flex items-center justify-center">VR</div>}
                                <span>{forma}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Cash logic change input box */}
                  {customerInfo.formaPagamento === 'Dinheiro' && (
                    <div className="animate-slide-up">
                      <label className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-400 block mb-1.5">Troco para quanto?</label>
                      <input
                        type="text"
                        placeholder="Ex: Troco para R$ 50, R$ 100..."
                        value={customerInfo.troco}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, troco: e.target.value }))}
                        className="w-full p-3.5 bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl text-sm font-medium focus:ring-1 focus:ring-black dark:text-zinc-100 focus:outline-hidden"
                      />
                    </div>
                  )}
                </div>

                {/* Final receipt totals details card prior to WhatsApp sending */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-850 rounded-2xl border border-zinc-150/40 dark:border-zinc-800/80 mt-6 space-y-1.5 text-xs text-zinc-500">
                  <div className="flex justify-between text-zinc-700 dark:text-zinc-300 font-bold">
                    <span>Lanches total</span>
                    <span>R$ {getSubtotal().toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-700 dark:text-zinc-300 font-bold">
                    <span>Taxa entrega ({customerInfo.bairro || 'A consultar'})</span>
                    <span>{getDeliveryFeeDisplay()}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-emerald-500 font-bold">
                      <span>Cupom de desconto</span>
                      <span>-R$ {discount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-zinc-900 dark:text-zinc-100 pt-2 border-t border-zinc-200/50">
                    <span>A Pagar</span>
                    <span className="text-base text-rose-500">R$ {getOrderTotal().toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-4 text-center bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-2xl shadow-xl shadow-emerald-500/10 text-sm tracking-wide transition flex items-center justify-center gap-2"
                  >
                    <span>Enviar Pedido pelo WhatsApp</span>
                    <span>📲</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* STORE CONFIG INFO MODAL WITH PAYMENT METADATA TAB (Sobe de Baixo) */}
      <AnimatePresence>
        {isInfoOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInfoOpen(false)}
              className="fixed inset-0 bg-black/80 z-50"
            ></motion.div>
            
            <motion.div
              initial={{ translateY: '100%' }}
              animate={{ translateY: 0 }}
              exit={{ translateY: '100%' }}
              className="fixed bottom-0 inset-x-0 max-w-lg mx-auto bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-t-[2rem] z-50 overflow-hidden max-h-[85vh] flex flex-col border-t border-zinc-150 dark:border-zinc-800"
            >
              {/* Drag line handle */}
              <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto my-3 flex-shrink-0" />

              {/* Title Header with X Button */}
              <div className="px-6 flex items-center justify-between pb-3">
                <h3 className="text-2xl font-black text-zinc-950 dark:text-zinc-50">Sobre a loja</h3>
                <button
                  type="button"
                  onClick={() => setIsInfoOpen(false)}
                  className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-full flex items-center justify-center transition active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              {/* TAB BAR SELECTOR */}
              <div className="px-6 flex border-b border-zinc-100 text-[10px] font-black uppercase tracking-widest text-zinc-400 gap-6 pb-2 relative">
                <button
                  onClick={() => setInfoActiveTab('sobre')}
                  className={`pb-1.5 transition-all relative ${infoActiveTab === 'sobre' ? 'text-zinc-950' : 'text-zinc-400'}`}
                >
                  <span>Sobre</span>
                  {infoActiveTab === 'sobre' && (
                    <motion.span layoutId="activeTabUnderline" className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-zinc-950 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setInfoActiveTab('horario')}
                  className={`pb-1.5 transition-all relative ${infoActiveTab === 'horario' ? 'text-zinc-950' : 'text-zinc-400'}`}
                >
                  <span>Horário</span>
                  {infoActiveTab === 'horario' && (
                    <motion.span layoutId="activeTabUnderline" className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-zinc-950 rounded-full" />
                  )}
                </button>
                <button
                  onClick={() => setInfoActiveTab('pagamento')}
                  className={`pb-1.5 transition-all relative ${infoActiveTab === 'pagamento' ? 'text-zinc-950' : 'text-zinc-400'}`}
                >
                  <span>Pagamento</span>
                  {infoActiveTab === 'pagamento' && (
                    <motion.span layoutId="activeTabUnderline" className="absolute bottom-[-9px] left-0 right-0 h-[2.5px] bg-zinc-950 rounded-full" />
                  )}
                </button>
              </div>

              {/* TAB CONTENT PANEL */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5 text-sm text-zinc-600">
                
                {infoActiveTab === 'sobre' && (
                  <div className="space-y-5 animate-fade-in text-left">
                    {/* Micro Store info summary card */}
                    <div className="p-4 bg-zinc-50 rounded-3xl flex items-center gap-4">
                      {store.logo_url ? (
                        <img src={store.logo_url} referrerPolicy="no-referrer" className="w-14 h-14 rounded-full border border-zinc-200/50 object-cover" />
                      ) : (
                        <div className="w-14 h-14 bg-zinc-200 rounded-full flex items-center justify-center text-2xl">🍔</div>
                      )}
                      <div>
                        <h4 className="font-extrabold text-lg text-zinc-950 leading-tight">{store.name}</h4>
                        <p className="text-xs text-zinc-400 capitalize">{store.cidade || 'timon'}, {store.estado || 'ma'}</p>
                      </div>
                    </div>

                    {/* Instagram Button Card */}
                    <div className="p-4 bg-white border border-zinc-150 rounded-3xl flex items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-yellow-500 via-rose-500 to-purple-600 flex items-center justify-center text-white flex-shrink-0">
                          <Instagram size={20} className="stroke-[2.5]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold leading-none">Instagram</p>
                          <p className="text-zinc-950 font-black text-sm mt-1.5 leading-none truncate">
                            @{store.instagram ? store.instagram.replace(/^@+/, '') : 'beleensee'}
                          </p>
                        </div>
                      </div>
                      <a
                        href={`https://instagram.com/${store.instagram ? store.instagram.replace(/^@+/, '') : 'beleensee'}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2.5 px-4 sm:px-5 bg-gradient-to-r from-orange-500 via-rose-500 to-purple-600 hover:opacity-95 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-150 active:scale-95 shadow-sm flex-shrink-0 text-center"
                      >
                        Ver
                      </a>
                    </div>

                    {/* Service support header */}
                    <div className="space-y-3 pt-1">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Canais de atendimento</p>
                      <div className="p-4 bg-white border border-zinc-150 rounded-3xl flex items-center justify-between gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-11 h-11 rounded-full bg-[#1ebd5c] flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                            📞
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold leading-none">WhatsApp</p>
                            <span className="text-zinc-950 font-black text-xs sm:text-base tracking-wide mt-1.5 block truncate">
                              {formatPhone(store.whatsapp) || '86 99424-0872'}
                            </span>
                          </div>
                        </div>
                        <a
                          href={`https://wa.me/${(store.whatsapp || '5586994558787').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2.5 px-4 sm:px-5 bg-[#1ebd5c] hover:bg-[#1abd59] text-white font-black text-xs uppercase tracking-wider rounded-xl transition active:scale-95 shadow-sm flex-shrink-0 text-center"
                        >
                          Chamar
                        </a>
                      </div>
                    </div>

                    {/* Neighborhood address block */}
                    <div className="space-y-3 pt-1">
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Endereço</p>
                      <div className="p-4.5 bg-zinc-50 rounded-3xl flex items-start gap-3.5 border border-zinc-100/30">
                        <div className="w-10 h-10 bg-white border border-zinc-200/50 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 shadow-xs text-rose-500">
                          📍
                        </div>
                        <div>
                          <h5 className="font-extrabold text-zinc-950 capitalize text-sm">{(store?.rua || 'herculano dos santos').toLowerCase()}</h5>
                          <p className="text-xs text-zinc-500 mt-1 pb-1 leading-relaxed capitalize">
                            bairro {store?.bairro || 'Parque Aliança'} - {store?.cidade || 'timon'}/{store?.estado || 'ma'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {infoActiveTab === 'horario' && (
                  <div className="space-y-2 pt-1 animate-fade-in">
                    {[
                      { key: 'seg', label: 'Segunda' },
                      { key: 'ter', label: 'Terça' },
                      { key: 'qua', label: 'Quarta' },
                      { key: 'qui', label: 'Quinta' },
                      { key: 'sex', label: 'Sexta' },
                      { key: 'sab', label: 'Sábado' },
                      { key: 'dom', label: 'Domingo' }
                    ].map((d) => {
                      const h = store?.horarios?.[d.key];
                      const isFechado = h?.fechado;
                      const horarioStr = isFechado ? 'Fechado' : `${h?.abertura || '18:00'} - ${h?.fechamento || '23:59'}`;
                      
                      return (
                        <div key={d.key} className="bg-zinc-50/70 border border-zinc-100 rounded-2xl py-3.5 px-4.5 flex justify-between items-center shadow-[0_2px_6px_rgba(0,0,0,0.01)] transition hover:bg-zinc-50">
                          <span className="font-extrabold text-zinc-950 text-xs">{d.label}</span>
                          <span className={`font-black text-xs tracking-wide ${isFechado ? 'text-zinc-400' : 'text-[#1ebd5c]'}`}>
                            {horarioStr}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {infoActiveTab === 'pagamento' && (
                  <div className="space-y-4 animate-fade-in text-left">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Métodos na entrega</p>
                    
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {store?.metodos_pagamento?.pix !== false && (
                        <div className="p-4 bg-white dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl flex flex-col items-start gap-4 justify-between text-left shadow-xs min-h-[105px] transition hover:border-zinc-200">
                          <PixLogoIcon className="w-8 h-8 rounded-xl" />
                          <span className="font-extrabold text-zinc-950 dark:text-zinc-100 text-sm">Pix</span>
                        </div>
                      )}
                      
                      {store?.metodos_pagamento?.dinheiro !== false && (
                        <div className="p-4 bg-white dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl flex flex-col items-start gap-4 justify-between text-left shadow-xs min-h-[105px] transition hover:border-zinc-200">
                          <DinheiroIcon className="w-8 h-8 rounded-xl" />
                          <span className="font-extrabold text-zinc-950 dark:text-zinc-100 text-sm">Dinheiro</span>
                        </div>
                      )}

                      {store?.metodos_pagamento?.cartao !== false && (
                        <div className="p-4 bg-white dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl flex flex-col items-start gap-4 justify-between text-left shadow-xs min-h-[105px] transition hover:border-zinc-200">
                          <CartaoIcon className="w-8 h-8 rounded-xl" />
                          <span className="font-extrabold text-zinc-950 dark:text-zinc-100 text-sm">Cartão</span>
                        </div>
                      )}

                      {store?.metodos_pagamento?.vr && (
                        <div className="p-4 bg-white dark:bg-zinc-850 border border-zinc-150 dark:border-zinc-800/80 rounded-3xl flex flex-col items-start gap-4 justify-between text-left shadow-xs min-h-[105px] transition hover:border-zinc-200">
                          <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-500 font-extrabold text-xs flex items-center justify-center">VR</div>
                          <span className="font-extrabold text-zinc-950 dark:text-zinc-100 text-sm">Vale Refeição</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* CATEGORIES BOTTOM MODAL SELECTOR */}
      <AnimatePresence>
        {isCategoryModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCategoryModalOpen(false)}
              className="fixed inset-0 bg-black/80 z-50"
            ></motion.div>
            
            <motion.div
              initial={{ translateY: '100%' }}
              animate={{ translateY: 0 }}
              exit={{ translateY: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="fixed bottom-0 inset-x-0 shadow-2xl max-w-lg mx-auto bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-t-[2rem] z-50 overflow-hidden max-h-[75vh] flex flex-col border-t border-zinc-150 dark:border-zinc-800"
            >
              {/* Drag line handle */}
              <div className="w-12 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full mx-auto my-3 flex-shrink-0" />

              {/* Title Header with X Close Button */}
              <div className="px-6 flex items-center justify-between pb-3 flex-shrink-0">
                <h3 className="text-xl font-black text-zinc-950 dark:text-zinc-50">Categorias</h3>
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-255 dark:hover:bg-zinc-700 text-zinc-805 dark:text-zinc-200 rounded-full flex items-center justify-center transition active:scale-95"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable list container */}
              <div className="flex-1 overflow-y-auto px-6 pb-8 pt-2 space-y-2">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    scrollToCategory('all');
                    setIsCategoryModalOpen(false);
                  }}
                  className={`w-full p-4 rounded-2xl text-left text-sm font-extrabold flex items-center gap-3 transition active:scale-98 ${selectedCategory === 'all' ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-150 dark:hover:bg-zinc-800'}`}
                >
                  <span className="text-lg">📋</span>
                  <span>Todas as categorias</span>
                </button>

                {categories.map(cat => {
                  const nameNorm = (cat.name || cat.nome || '').toLowerCase();
                  const emoji = nameNorm.includes('hamb') || nameNorm.includes('burger') ? '🍔' : 
                                nameNorm.includes('bebida') || nameNorm.includes('suco') || nameNorm.includes('refr') ? '🥤' : 
                                nameNorm.includes('porç') || nameNorm.includes('frita') || nameNorm.includes('batat') ? '🍟' : 
                                nameNorm.includes('pizz') ? '🍕' : 
                                nameNorm.includes('doce') || nameNorm.includes('sobre') || nameNorm.includes('mous') ? '🍰' : '🍽️';
                  
                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        scrollToCategory(cat.id);
                        setIsCategoryModalOpen(false);
                      }}
                      className={`w-full p-4 rounded-2xl text-left text-sm font-extrabold flex items-center gap-3 transition active:scale-98 ${selectedCategory === cat.id ? 'bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-150 dark:hover:bg-zinc-800'}`}
                    >
                      <span className="text-lg">{emoji}</span>
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL: PROMOTIONS ENTRY DISCOVERY POPUP */}
      <AnimatePresence>
        {showPromoPopup && (() => {
          const promProds = products.filter(p => p.preco_promocional && p.preco_promocional < p.preco && p.disponivel);
          if (promProds.length === 0) {
            // Safety release to prevent scroll locking if there are no promotional products
            setTimeout(() => setShowPromoPopup(false), 0);
            return null;
          }
          
          return (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.65 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPromoPopup(false)}
                className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] cursor-pointer"
              />
              
              {/* Scrollable Container for Modal alignment */}
              <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4 z-[101] pointer-events-none">
                {/* Animated Card Body */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: 30 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  transition={{ type: "spring", damping: 25, stiffness: 350 }}
                  className="bg-white dark:bg-zinc-900 rounded-[32px] w-full max-w-[420px] shadow-[0_24px_50px_rgba(0,0,0,0.3)] border border-zinc-100 dark:border-zinc-800 pointer-events-auto overflow-hidden relative flex flex-col"
                >
                  {/* Top Banner Accent Decors */}
                  <div className="absolute top-0 inset-x-0 h-2.5 bg-gradient-to-r from-rose-500 via-amber-500 to-[#1ebd5c]" />
                  
                  {/* Close button top right */}
                  <button
                    onClick={() => setShowPromoPopup(false)}
                    className="absolute top-5 right-5 w-9 h-9 rounded-full bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center text-zinc-500 dark:text-zinc-300 transition active:scale-90 cursor-pointer"
                  >
                    <X size={18} className="stroke-[2.5]" />
                  </button>

                  <div className="p-6 md:p-7 space-y-5 text-left flex flex-col h-full">
                    {/* Tag Badge & Main Headers */}
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[10px] font-black rounded-full uppercase tracking-wider select-none">
                        <Tag size={12} className="stroke-[3]" />
                        <span>Promoção Ativa</span>
                      </div>
                      
                      <h2 className="text-xl md:text-2xl font-[900] tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                        Chegou o desconto especial! ✨
                      </h2>
                      <p className="text-xs text-zinc-400 dark:text-zinc-400 font-semibold leading-relaxed">
                        Preparamos as melhores ofertas de hoje para você economizar. Escolha um item abaixo ou veja a lista de cupons:
                      </p>
                    </div>

                    {/* List with all promos (scrollable if many) */}
                    <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1 select-none scrollbar-thin">
                      {promProds.map((product, index) => {
                        const originalPrice = product.preco;
                        const promoPrice = product.preco_promocional || product.preco;
                        const discountAmount = originalPrice - promoPrice;
                        const discountPct = Math.round((discountAmount / originalPrice) * 100);

                        return (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, x: -15 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.12 + index * 0.08 }}
                            onClick={() => {
                              setShowPromoPopup(false);
                              handleOpenProductSelection(product);
                            }}
                            className="p-3 bg-[#F9F9F9] dark:bg-zinc-850 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-100 dark:border-zinc-800/80 rounded-2xl flex items-center gap-3.5 cursor-pointer transition-[background-color,transform] active:scale-99 group"
                          >
                            {/* Image / Icon container with badge */}
                            <div className="relative shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-750 flex items-center justify-center">
                              {product.foto_url ? (
                                <img 
                                  src={product.foto_url} 
                                  alt={product.name} 
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                                />
                              ) : (
                                <span className="text-2xl">🍔</span>
                              )}
                              
                              <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-md uppercase tracking-wider select-none leading-none">
                                {discountPct}% OFF
                              </div>
                            </div>

                            {/* Details column */}
                            <div className="flex-1 min-w-0 space-y-0.5">
                              <h3 className="font-extrabold text-[13px] text-zinc-900 dark:text-zinc-50 truncate group-hover:text-amber-500 dark:group-hover:text-amber-400 transition leading-tight">
                                {product.name}
                              </h3>
                              {product.description && (
                                <p className="text-[10px] text-zinc-450 dark:text-zinc-405 font-medium line-clamp-1 leading-normal">
                                  {product.description}
                                </p>
                              )}
                              <div className="flex items-baseline gap-1.5 pt-0.5">
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 line-through font-extrabold">
                                  R$ {originalPrice.toFixed(2)}
                                </span>
                                <span className="text-xs font-black text-[#1ebd5c]">
                                  R$ {promoPrice.toFixed(2)}
                                </span>
                              </div>
                            </div>

                            {/* Go action button */}
                            <div className="w-7 h-7 rounded-full bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700/80 group-hover:bg-zinc-950 dark:group-hover:bg-white text-zinc-400 group-hover:text-white dark:group-hover:text-black flex items-center justify-center shrink-0 transition">
                              <span className="text-xs font-black select-none">→</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Bottom Primary Action Call to Actions */}
                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => {
                          setShowPromoPopup(false);
                          setActiveTab('promocoes');
                        }}
                        className="w-full py-4 bg-zinc-950 dark:bg-zinc-50 hover:bg-zinc-900 dark:hover:bg-zinc-100 text-white dark:text-zinc-950 font-black text-xs uppercase tracking-widest rounded-2xl shadow-xs transition active:scale-[0.98] cursor-pointer"
                      >
                        Ver todas as promoções
                      </button>
                      
                      <button
                        onClick={() => setShowPromoPopup(false)}
                        className="w-full py-1 text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 font-extrabold text-[10px] uppercase tracking-wider transition cursor-pointer"
                      >
                        Continuar navegando no cardápio
                      </button>
                    </div>

                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* RENDER DYNAMIC TOASTS */}
      {toastMessage && (
        <div className="fixed top-6 right-4 left-4 max-w-sm mx-auto z-50">
          <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 border text-xs font-black uppercase tracking-wider animate-bounce-in ${toastMessage.type === 'success' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-rose-500 border-rose-600 text-white'}`}>
            <span>{toastMessage.type === 'success' ? '✓' : '⚠️'}</span>
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}
