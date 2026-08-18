import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabaseClient';
import { db } from '../lib/db';
import { Store, Category, Product, ProductMeta, Bairro, Order, Cupom, Client } from '../types';
import useResetDiarioFaturamento from '../lib/useResetDiarioFaturamento';
import HistoricoFaturamento from './HistoricoFaturamento';
import { loadProductMeta, saveProductMeta, deleteProductMeta } from '../lib/productMeta';
import ErrorBoundary from './ErrorBoundary';
import ChatAdmin from './ChatAdmin';
import CriarProdutoModal from './CriarProdutoModal';
import RecuperacaoWhatsApp from './RecuperacaoWhatsApp';
import { 
  ShoppingBag, Search, Plus, Trash2, Edit2, AlertCircle, CheckCircle2, 
  Settings, Clock, Grid, Tag, DollarSign, LogOut, Check, X, ShieldAlert,
  ChevronDown, Phone, MapPin, Sparkles, Filter, Database, ToggleLeft, ToggleRight, Calendar, RefreshCw,
  Volume2, VolumeX, Music, Play, Upload, Printer, Download
} from 'lucide-react';

export default function PainelAdmin({ storeSlug }: { storeSlug?: string }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Store states
  const [currentStore, setCurrentStore] = useState<any | null>(null);
  const [storeStatus, setStoreStatus] = useState<'normal' | 'paused' | 'blocked'>('normal');

  // Sub-sections - expanded for premium restaurant control
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'orders' | 'settings' | 'categories' | 'products' | 'coupons' | 'fid' | 'recovery' | 'neighborhoods' | 'sounds' | 'calendar'>('dashboard');

  // Active selected notification sound
  const [selectedSoundId, setSelectedSoundId] = useState<string>(() => {
    return localStorage.getItem('pedifacil_selected_sound_id') || 'ifood';
  });

  // Active volume
  const [soundVolume, setSoundVolume] = useState<number>(() => {
    const vol = localStorage.getItem('pedifacil_sound_volume');
    return vol ? Number(vol) : 0.85;
  });

  // Audio permission and unlocking states for background tab sound reproduction
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [notifyPermission, setNotifyPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'denied';
  });

  // Request browser permission for system notification banner
  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setNotifyPermission(res);
        if (res === 'granted') {
          showToast('Excelente! Notificações ativadas para outras guias do navegador. 🔔', 'success');
          new Notification('Alertas Ativos - Painel', {
            body: 'Agora você receberá avisos sonoros e pop-ups de novos pedidos mesmo fora desta página!',
            requireInteraction: true
          });
        } else {
          showToast('Permissão de notificações recusada.', 'error');
        }
      } catch (err) {
        console.error('Erro ao pedir permissão de notificações:', err);
      }
    } else {
      showToast('Este navegador não possui suporte a notificações integradas.', 'error');
    }
  };

  // Quick silent chime to register/activate user interaction with AudioContext API
  const handleUserInteractionUnlockAudio = () => {
    if (audioUnlocked) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
        setAudioUnlocked(true);
        console.log("Audio Context unlocked successfully!");
      }
    } catch (e) {
      console.warn("Could not unlock AudioContext:", e);
    }
  };

  // Main lists states loaded from Supabase/Fallback
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bairros, setBairros] = useState<Bairro[]>([]);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);

  // Main filters and Modals
  const [searchTerm, setSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'novo' | 'preparando' | 'saiu_entrega' | 'entregue' | 'cancelado'>('all');

  // Modals Core states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Realtime alarms
  const [activeAlarmPedidosIds, setActiveAlarmPedidosIds] = useState<string[]>([]);

  // Elegant high-fidelity double bell chime or custom synthesized sound using Web Audio API
  const playModernChime = (overrideSoundId?: string, overrideVolume?: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const destination = ctx.destination;

      const activeSound = overrideSoundId || selectedSoundId;
      const activeVolume = overrideVolume !== undefined ? overrideVolume : soundVolume;

      // Helper to play a single tone
      const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, startVol: number, sweepFreq?: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(destination);

        osc.type = type;
        osc.frequency.setValueAtTime(freq, startTime);
        if (sweepFreq) {
          osc.frequency.exponentialRampToValueAtTime(sweepFreq, startTime + duration);
        }

        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(startVol * activeVolume, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      switch (activeSound) {
        case 'ifood': {
          // Recreates the famous rapid, double ringing iFood chime ("priiiinnn ... priiiinnn") lengths
          const makeRing = (delay: number) => {
            const startNodeTime = ctx.currentTime + delay;
            const duration = 0.35; // iFood ring is very energetic and snappy, 0.35s database/ring

            // Main output gain for this ring
            const ringGain = ctx.createGain();
            ringGain.connect(destination);

            // Fast metal attack, flat ring, then smooth metallic decay
            ringGain.gain.setValueAtTime(0, startNodeTime);
            ringGain.gain.linearRampToValueAtTime(activeVolume, startNodeTime + 0.01);
            ringGain.gain.setValueAtTime(activeVolume, startNodeTime + duration - 0.08);
            ringGain.gain.exponentialRampToValueAtTime(0.001, startNodeTime + duration);

            // Create LFO for the rapid mechanical strike rattle (vibrato + tremolo)
            const lfo = ctx.createOscillator();
            lfo.type = 'sine';
            lfo.frequency.setValueAtTime(36, startNodeTime); // 36 Hz rapid metallic rattling hammer strike

            // Tremolo Gain (Volume Flutter) - this is crucial to make it sound like a rattling "priiiinnn"
            const tremoloGainNode = ctx.createGain();
            tremoloGainNode.gain.setValueAtTime(0.55, startNodeTime);
            
            const lfoTremoloDepth = ctx.createGain();
            lfoTremoloDepth.gain.setValueAtTime(0.45, startNodeTime);
            
            lfo.connect(lfoTremoloDepth);
            lfoTremoloDepth.connect(tremoloGainNode.gain);
            tremoloGainNode.connect(ringGain);

            // Vibrato Gain (Pitch Flutter)
            const vibratoGain = ctx.createGain();
            vibratoGain.gain.setValueAtTime(30, startNodeTime); // 30Hz frequency pitch vibration
            lfo.connect(vibratoGain);

            // Metallic frequencies of the premium double mechanical bell gongs
            const freqs = [920, 1180, 1450, 1900];
            const oscs = freqs.map((f, idx) => {
              const osc = ctx.createOscillator();
              osc.connect(tremoloGainNode);
              
              // Mix triangle (solid metallic tone) and sawtooth/sine (harmonics/buzz)
              if (idx === 0) osc.type = 'triangle';
              else if (idx === 1) osc.type = 'sawtooth';
              else if (idx === 2) osc.type = 'sine';
              else osc.type = 'triangle';

              vibratoGain.connect(osc.frequency);

              // Baseline frequency
              osc.frequency.setValueAtTime(f, startNodeTime);

              // Very slight pitch-up swipe to make it sound bright and punchy
              osc.frequency.exponentialRampToValueAtTime(f * 1.02, startNodeTime + duration);
              return osc;
            });

            lfo.start(startNodeTime);
            oscs.forEach(osc => osc.start(startNodeTime));

            lfo.stop(startNodeTime + duration);
            oscs.forEach(osc => osc.stop(startNodeTime + duration));
          };

          // Famous iFood double chime: "priiiinnnn ... priiiinnnn"
          makeRing(0);
          makeRing(0.42); // Plays the second ring very quickly after the first (0.42 seconds interval)
          break;
        }
        case 'trim_trim': {
          // "Prin Prin"
          playTone(1050, 'triangle', ctx.currentTime, 0.15, 0.65, 1300);
          playTone(1050, 'triangle', ctx.currentTime + 0.12, 0.18, 0.65, 1300);
          break;
        }
        case 'cristal': {
          playTone(1500, 'sine', ctx.currentTime, 0.6, 0.7);
          playTone(3000, 'sine', ctx.currentTime, 0.3, 0.2);
          break;
        }
        case 'ding_dong': {
          playTone(523.25, 'sine', ctx.currentTime, 0.4, 0.7); // C5
          playTone(392.00, 'sine', ctx.currentTime + 0.25, 0.6, 0.7); // G4
          break;
        }
        case 'alerta_urgente': {
          playTone(880, 'sawtooth', ctx.currentTime, 0.12, 0.5);
          playTone(880, 'sawtooth', ctx.currentTime + 0.15, 0.12, 0.5);
          playTone(880, 'sawtooth', ctx.currentTime + 0.3, 0.25, 0.5);
          break;
        }
        case 'sonar': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.8);
          gain.gain.setValueAtTime(0.7 * activeVolume, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
          osc.start();
          osc.stop(ctx.currentTime + 1.2);
          break;
        }
        case 'bip_espacial': {
          playTone(1800, 'sine', ctx.currentTime, 0.18, 0.6, 600);
          break;
        }
        case 'zen': {
          playTone(220, 'sine', ctx.currentTime, 0.8, 0.8); // A3
          playTone(330, 'sine', ctx.currentTime + 0.1, 0.7, 0.5); // E4
          break;
        }
        case 'assobio': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 0.15);
          osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.35);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.5 * activeVolume, ctx.currentTime + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
          break;
        }
        case 'sucesso_vitoria': {
          const tempo = 0.08;
          playTone(523.25, 'triangle', ctx.currentTime, 0.12, 0.6); // C5
          playTone(659.25, 'triangle', ctx.currentTime + tempo, 0.12, 0.6); // E5
          playTone(783.99, 'triangle', ctx.currentTime + (tempo * 2), 0.12, 0.6); // G5
          playTone(1046.50, 'triangle', ctx.currentTime + (tempo * 3), 0.35, 0.7); // C6
          break;
        }
        case 'tempo_arcade': {
          playTone(300, 'square', ctx.currentTime, 0.25, 0.45, 1200);
          break;
        }
        case 'gongo': {
          const now = ctx.currentTime;
          playTone(180, 'sine', now, 1.2, 0.8);
          playTone(220, 'triangle', now, 1.0, 0.5);
          playTone(270, 'sine', now, 0.8, 0.4);
          break;
        }
        case 'harpa': {
          const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
          notes.forEach((freq, index) => {
            playTone(freq, 'sine', ctx.currentTime + (index * 0.06), 0.4, 0.6);
          });
          break;
        }
        case 'ploc_wood': {
          playTone(400, 'triangle', ctx.currentTime, 0.08, 0.75, 80);
          break;
        }
        case 'bumbo_prato': {
          playTone(80, 'sine', ctx.currentTime, 0.15, 0.85);
          playTone(4000, 'triangle', ctx.currentTime + 0.02, 0.15, 0.3);
          break;
        }
        case 'sintetizador_lfo': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(destination);
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(150, ctx.currentTime + 0.1);
          osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.25);
          gain.gain.setValueAtTime(0, ctx.currentTime);
          gain.gain.linearRampToValueAtTime(0.5 * activeVolume, ctx.currentTime + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
          break;
        }
        default: {
          playTone(1050, 'triangle', ctx.currentTime, 0.15, 0.65, 1300);
          playTone(1050, 'triangle', ctx.currentTime + 0.12, 0.18, 0.65, 1300);
        }
      }
    } catch (e) {
      console.warn('Som indisponível ou permissão de áudio pendente:', e);
    }
  };

  // Form parameters
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');

  // Modal Encerrar Dia
  const [encerrarDiaModalOpen, setEncerrarDiaModalOpen] = useState(false);

  // Calendário & Filtro no Painel Geral
  const [calendarFilterMode, setCalendarFilterMode] = useState<'single' | 'range'>('single');
  const [calendarSingleDate, setCalendarSingleDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [calendarStartDate, setCalendarStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [calendarEndDate, setCalendarEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [calendarMonth, setCalendarMonth] = useState(() => { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() }; });
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<string | null>(() => new Date().toISOString().split('T')[0]);
  const [calendarDayOrders, setCalendarDayOrders] = useState<Order[]>([]);
  const [calendarDayLoading, setCalendarDayLoading] = useState(false);
  const [calendarDaySummary, setCalendarDaySummary] = useState<Record<string, { count: number; revenue: number }>>({});
  const [calendarDayModalOpen, setCalendarDayModalOpen] = useState(false);

  const loadCalendarMonthSummary = async (year: number, month: number) => {
    if (!currentStore) return;
    const start = new Date(year, month, 1, 0, 0, 0).toISOString();
    const end = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
    const { data } = await supabase
      .from('pedidos')
      .select('created_at, total, status')
      .eq('loja_id', currentStore.id)
      .gte('created_at', start)
      .lte('created_at', end);
    if (data) {
      const summary: Record<string, { count: number; revenue: number }> = {};
      data.forEach((o: any) => {
        const day = new Date(o.created_at).toISOString().split('T')[0];
        if (!summary[day]) summary[day] = { count: 0, revenue: 0 };
        summary[day].count++;
        if (o.status !== 'cancelado') summary[day].revenue += Number(o.total || 0);
      });
      setCalendarDaySummary(summary);
    }
  };

  const handleLoadDayOrders = async (dayStr: string) => {
    if (!currentStore) return;
    setCalendarDayLoading(true);
    const [y, m, d] = dayStr.split('-').map(Number);
    const startOfDay = new Date(y, m - 1, d, 0, 0, 0).toISOString();
    const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
    const { data } = await supabase
      .from('pedidos')
      .select('*')
      .eq('loja_id', currentStore.id)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: true });
    if (data) {
      setCalendarDayOrders(data.map((o: any) => ({
        id: o.id,
        store_id: o.loja_id,
        numero_pedido: o.numero_pedido,
        cliente_nome: o.cliente_nome,
        cliente_whatsapp: o.cliente_whatsapp,
        cliente_endereco: o.cliente_endereco,
        cliente_bairro: o.cliente_bairro,
        subtotal: Number(o.subtotal || 0),
        taxa_entrega: Number(o.taxa_entrega || 0),
        desconto: Number(o.desconto || 0),
        total: Number(o.total || 0),
        forma_pagamento: o.forma_pagamento,
        troco: o.troco || undefined,
        status: o.status,
        itens: Array.isArray(o.itens) ? o.itens : [],
        criado_em: o.created_at || o.criado_em
      })));
    }
    setCalendarDayLoading(false);
  };

  const handleDownloadCalendarData = async () => {
    if (!currentStore) return;
    setCalendarDayLoading(true);
    try {
      let startIso: string;
      let endIso: string;
      let titleRange: string;

      if (calendarFilterMode === 'single') {
        const [y, m, d] = calendarSingleDate.split('-').map(Number);
        startIso = new Date(y, m - 1, d, 0, 0, 0).toISOString();
        endIso = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
        titleRange = `Dia ${d.toString().padStart(2, '0')}/${m.toString().padStart(2, '0')}/${y}`;
      } else {
        const [y1, m1, d1] = calendarStartDate.split('-').map(Number);
        const [y2, m2, d2] = calendarEndDate.split('-').map(Number);
        startIso = new Date(y1, m1 - 1, d1, 0, 0, 0).toISOString();
        endIso = new Date(y2, m2 - 1, d2, 23, 59, 59, 999).toISOString();
        titleRange = `Período de ${d1.toString().padStart(2, '0')}/${m1.toString().padStart(2, '0')}/${y1} até ${d2.toString().padStart(2, '0')}/${m2.toString().padStart(2, '0')}/${y2}`;
      }

      const { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('loja_id', currentStore.id)
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .order('created_at', { ascending: true });

      if (error) {
        showToast('Erro ao carregar dados dos pedidos.', 'error');
        setCalendarDayLoading(false);
        return;
      }

      const list = data || [];
      const activeOrders = list.filter((o: any) => o.status !== 'cancelado');
      const totalFat = activeOrders.reduce((s: number, o: any) => s + Number(o.total || 0), 0);
      const cancelados = list.filter((o: any) => o.status === 'cancelado').length;
      const ticketMedio = activeOrders.length > 0 ? totalFat / activeOrders.length : 0;

      const lines: string[] = [];
      lines.push(`====================================================`);
      lines.push(`RELATÓRIO DE VENDAS E PEDIDOS - ${titleRange.toUpperCase()}`);
      lines.push(`====================================================`);
      lines.push(`Loja: ${currentStore.nome || ''}`);
      lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
      lines.push(``);
      lines.push(`--- RESUMO GERAL ---`);
      lines.push(`Total de Pedidos:           ${list.length}`);
      lines.push(`Pedidos Ativos / Concluídos:${activeOrders.length}`);
      lines.push(`Pedidos Cancelados:         ${cancelados}`);
      lines.push(`Faturamento Total:          R$ ${totalFat.toFixed(2)}`);
      lines.push(`Ticket Médio:               R$ ${ticketMedio.toFixed(2)}`);
      lines.push(``);
      lines.push(`====================================================`);
      lines.push(`DETALHAMENTO DOS PEDIDOS (${list.length})`);
      lines.push(`====================================================`);

      if (list.length === 0) {
        lines.push(`Nenhum pedido registrado para o período/dia selecionado.`);
      } else {
        list.forEach((order: any, idx: number) => {
          const hora = new Date(order.created_at || order.criado_em).toLocaleString('pt-BR');
          lines.push(`\n[#${idx + 1}] PEDIDO #${order.numero_pedido || order.id} - ${hora}`);
          lines.push(`Status: ${String(order.status || '').toUpperCase()}`);
          lines.push(`Cliente: ${order.cliente_nome || 'Não informado'} | WhatsApp: ${order.cliente_whatsapp || 'Não informado'}`);
          lines.push(`Endereço: ${order.cliente_endereco || ''} ${order.cliente_bairro ? `- ${order.cliente_bairro}` : ''}`);
          lines.push(`Forma de Pagamento: ${order.forma_pagamento || 'Não informada'} ${order.troco ? `(Troco para R$ ${order.troco})` : ''}`);
          lines.push(`Subtotal: R$ ${Number(order.subtotal || 0).toFixed(2)} | Taxa Entrega: R$ ${Number(order.taxa_entrega || 0).toFixed(2)} | Desconto: R$ ${Number(order.desconto || 0).toFixed(2)}`);
          lines.push(`VALOR TOTAL: R$ ${Number(order.total || 0).toFixed(2)}`);

          const itens = Array.isArray(order.itens) ? order.itens : [];
          if (itens.length > 0) {
            lines.push(`Itens do Pedido:`);
            itens.forEach((item: any) => {
              lines.push(`  - ${item.quantity || item.qtd || 1}x ${item.name || item.title || 'Produto'} (R$ ${Number(item.price || 0).toFixed(2)})`);
            });
          }
          lines.push(`----------------------------------------------------`);
        });
      }

      const filename = calendarFilterMode === 'single'
        ? `relatorio_vendas_${calendarSingleDate}.txt`
        : `relatorio_vendas_${calendarStartDate}_ate_${calendarEndDate}.txt`;

      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Relatório do ${titleRange} baixado com sucesso! 📄`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao baixar relatório.', 'error');
    } finally {
      setCalendarDayLoading(false);
    }
  };

  useEffect(() => {
    if (currentStore?.id) {
      loadCalendarMonthSummary(calendarMonth.year, calendarMonth.month);
    }
  }, [currentStore?.id, calendarMonth.year, calendarMonth.month]);

  // Estado simples para modal de cadastro de produto
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productModalStep, setProductModalStep] = useState<'info' | 'selos' | 'adicionais'>('info');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductCategoryId, setNewProductCategoryId] = useState('');
  const [newProductImage, setNewProductImage] = useState('');
  const [newProductImageFile, setNewProductImageFile] = useState<File | null>(null);

  // Selos
  const [productSeals, setProductSeals] = useState<Array<{ id: string; label: string; color: string; textColor: string }>>([]);
  const [newSealLabel, setNewSealLabel] = useState('');
  const [newSealColor, setNewSealColor] = useState('#FF6B35');
  const [newSealTextColor, setNewSealTextColor] = useState('#FFFFFF');

  // Adicionais/Grupos de opções
  const [productGroups, setProductGroups] = useState<Array<{
    id: string;
    name: string;
    required: boolean;
    maxSelection: number;
    items: Array<{ id: string; name: string; price: number; isFree: boolean }>
  }>>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupRequired, setGroupRequired] = useState(false);
  const [groupMaxSelection, setGroupMaxSelection] = useState(1);
  const [groupItems, setGroupItems] = useState<Array<{ id: string; name: string; price: number; isFree: boolean }>>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemIsFree, setNewItemIsFree] = useState(true);

  const handleOpenProductModal = (prod: Product | null = null) => {
    setEditingProduct(prod);
    setProductModalStep('info');
    if (prod) {
      setNewProductName(prod.name);
      setNewProductDesc(prod.description);
      setNewProductPrice(prod.preco.toString());
      setNewProductCategoryId(prod.category_id);
      setNewProductImage(prod.foto_url || '');
      let meta = loadProductMeta(prod.id);
      if (!meta && prod.sku && typeof prod.sku === 'string' && prod.sku.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(prod.sku);
          if (parsed && (parsed.optionGroups || parsed.badges)) {
            meta = parsed;
            try {
              localStorage.setItem(`pedifacil_product_meta_${prod.id}`, prod.sku);
            } catch {}
          }
        } catch {}
      }

      setProductSeals(meta?.badges?.map((b: any) => ({
        id: b.id,
        label: b.label,
        color: b.backgroundColor || b.color || '',
        textColor: b.textColor
      })) || []);
      setProductGroups(meta?.optionGroups?.map((g: any) => ({
        id: g.id,
        name: g.label,
        required: g.required || false,
        maxSelection: g.maxSelection || 1,
        items: g.items?.map((i: any) => ({
          id: i.id,
          name: i.name,
          price: i.price || 0,
          isFree: i.isFree !== false
        })) || []
      })) || []);
    } else {
      setNewProductName('');
      setNewProductDesc('');
      setNewProductPrice('');
      setNewProductCategoryId(categories[0]?.id || '');
      setNewProductImage('');
      setNewProductImageFile(null);
      setProductSeals([]);
      setProductGroups([]);
    }
    setProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setProductModalOpen(false);
    setProductModalStep('info');
    setEditingProduct(null);
    setNewProductName('');
    setNewProductDesc('');
    setNewProductPrice('');
    setNewProductCategoryId('');
    setNewProductImage('');
    setNewProductImageFile(null);
    setProductSeals([]);
    setProductGroups([]);
    setEditingGroupId(null);
    setGroupName('');
    setGroupRequired(false);
    setGroupMaxSelection(1);
    setGroupItems([]);
    setNewSealLabel('');
    setNewSealColor('#FF6B35');
    setNewSealTextColor('#FFFFFF');
  };

  const handleAddSeal = () => {
    if (!newSealLabel.trim()) {
      showToast('Digite o nome do selo.', 'error');
      return;
    }
    setProductSeals([...productSeals, {
      id: crypto.randomUUID(),
      label: newSealLabel,
      color: newSealColor,
      textColor: newSealTextColor
    }]);
    setNewSealLabel('');
    setNewSealColor('#FF6B35');
    setNewSealTextColor('#FFFFFF');
  };

  const handleRemoveSeal = (id: string) => {
    setProductSeals(productSeals.filter(s => s.id !== id));
  };

  const handleAddGroupItem = () => {
    if (!newItemName.trim()) {
      showToast('Digite o nome do item.', 'error');
      return;
    }
    setGroupItems([...groupItems, {
      id: crypto.randomUUID(),
      name: newItemName,
      price: newItemIsFree ? 0 : Number(newItemPrice || 0),
      isFree: newItemIsFree
    }]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemIsFree(true);
  };

  const handleRemoveGroupItem = (id: string) => {
    setGroupItems(groupItems.filter(i => i.id !== id));
  };

  const handleSaveGroup = () => {
    if (!groupName.trim() || groupItems.length === 0) {
      showToast('Preencha o nome e adicione itens ao grupo.', 'error');
      return;
    }
    if (editingGroupId) {
      setProductGroups(productGroups.map(g => g.id === editingGroupId ? {
        ...g,
        name: groupName,
        required: groupRequired,
        maxSelection: groupMaxSelection,
        items: groupItems
      } : g));
    } else {
      setProductGroups([...productGroups, {
        id: crypto.randomUUID(),
        name: groupName,
        required: groupRequired,
        maxSelection: groupMaxSelection,
        items: groupItems
      }]);
    }
    setEditingGroupId(null);
    setGroupName('');
    setGroupRequired(false);
    setGroupMaxSelection(1);
    setGroupItems([]);
  };

  const handleEditGroup = (id: string) => {
    const group = productGroups.find(g => g.id === id);
    if (!group) return;
    setEditingGroupId(id);
    setGroupName(group.name);
    setGroupRequired(group.required);
    setGroupMaxSelection(group.maxSelection);
    setGroupItems(group.items);
  };

  const handleRemoveGroup = (id: string) => {
    setProductGroups(productGroups.filter(g => g.id !== id));
  };

  const handleCancelEditGroup = () => {
    setEditingGroupId(null);
    setGroupName('');
    setGroupRequired(false);
    setGroupMaxSelection(1);
    setGroupItems([]);
    setNewItemName('');
    setNewItemPrice('');
    setNewItemIsFree(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductPrice || !newProductCategoryId) {
      showToast('Preencha todos os campos obrigatórios.', 'error');
      return;
    }

    try {
      if (!currentStore) {
        showToast('Loja não selecionada.', 'error');
        return;
      }

      let imageUrl = newProductImage;

      // Se houver arquivo de imagem, fazer upload
      if (newProductImageFile) {
        try {
          const fileName = `${crypto.randomUUID()}-${newProductImageFile.name}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(fileName, newProductImageFile);
          
          if (uploadError) throw uploadError;
          
          const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(fileName);
          
          imageUrl = publicUrl;
        } catch (uploadErr) {
          console.error('Erro ao fazer upload da imagem:', uploadErr);
          showToast('Erro ao fazer upload da imagem. Continuando sem imagem...', 'info');
        }
      }

      const productId = editingProduct?.id || crypto.randomUUID();
      // Build meta early so we can include sku in the main product payload
      const meta: ProductMeta = {
        badges: productSeals.map(s => ({ id: s.id, label: s.label, backgroundColor: s.color, textColor: s.textColor })),
        optionGroups: productGroups.map(g => ({ id: g.id, label: g.name, required: g.required, minSelection: 0, maxSelection: g.maxSelection, items: g.items.map((item: any, idx) => ({ id: item.id, name: item.name, price: item.price, isFree: item.isFree, order: idx, available: true, description: item.description, foto_url: item.foto_url })) }))
      };

      const payload = {
        id: productId,
        loja_id: currentStore.id,
        nome: newProductName.trim(),
        descricao: newProductDesc.trim(),
        // include sku (metadata) directly to avoid temporary gaps between product update and meta sync
        sku: JSON.stringify(meta),
        preco: Number(newProductPrice),
        preco_promocional: null,
        categoria_id: newProductCategoryId,
        foto_url: imageUrl || null,
        disponivel: true,
        destaque: productSeals.some(s => s.label.toLowerCase().includes('destaque')),
        is_novo: productSeals.some(s => s.label.toLowerCase().includes('novo')),
        ordem: editingProduct ? editingProduct.ordem : products.length + 1
      };

      try {
        if (editingProduct) {
          const { error } = await supabase
            .from('produtos')
            .update(payload)
            .eq('id', editingProduct.id);
          if (error) console.error('Erro ao atualizar produto no Supabase:', error);
        } else {
          const { error } = await supabase
            .from('produtos')
            .insert([payload]);
          if (error) console.error('Erro ao inserir produto no Supabase:', error);
        }
      } catch (cloudErr) {
        console.warn('Falha na comunicação direta com Supabase:', cloudErr);
      }

      // Sincronizar em localStorage para redundância offline
      try {
        const localKey = `pedifacil_local_products_${currentStore.id}`;
        const localProds = JSON.parse(localStorage.getItem(localKey) || '[]');
        const index = localProds.findIndex((p: any) => p.id === productId);
        if (index >= 0) localProds[index] = payload;
        else localProds.push(payload);
        localStorage.setItem(localKey, JSON.stringify(localProds));
      } catch {}

      showToast(editingProduct ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!', 'success');

      // Salvar metadados (selos e adicionais) — meta já criado acima
      await saveProductMeta(productId, meta);

      // 📡 Notificar CardapioPublico sobre mudança de produtos
      notifyCardapioUpdate('products');

      handleCloseProductModal();
      loadStoreConfigurations();
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerenciar produto.', 'error');
    }
  };

  // Duplicate Product ID helper
  const handleDuplicateProduct = async (prod: Product) => {
    try {
      const payload: any = {
        id: crypto.randomUUID(),
        loja_id: currentStore.id,
        nome: `${prod.name} (Cópia)`,
        descricao: prod.description || (prod as any).descricao || '',
        preco: prod.preco,
        preco_promocional: prod.preco_promocional || null,
        categoria_id: prod.category_id,
        foto_url: prod.foto_url || null,
        disponivel: prod.disponivel,
        destaque: prod.destaque,
        is_novo: prod.is_novo,
        ordem: products.length + 1
      };

      try {
        await supabase.from('produtos').insert([payload]);
      } catch (err) {
        console.warn('Erro ao duplicar produto no Supabase:', err);
      }

      const originMeta = loadProductMeta(prod.id);
      if (originMeta) {
        await saveProductMeta(payload.id, originMeta);
      }
      
      // Also update local fallback list
      const localProds = JSON.parse(localStorage.getItem(`pedifacil_local_products_${currentStore.id}`) || '[]');
      localProds.push({
        id: payload.id,
        loja_id: payload.loja_id,
        categoria_id: payload.categoria_id,
        nome: payload.nome,
        descricao: payload.descricao,
        preco: payload.preco,
        preco_promocional: payload.preco_promocional,
        foto_url: payload.foto_url,
        disponivel: payload.disponivel,
        destaque: payload.destaque,
        is_novo: payload.is_novo,
        ordem: payload.ordem
      });
      localStorage.setItem(`pedifacil_local_products_${currentStore.id}`, JSON.stringify(localProds));

      showToast('Produto duplicado com sucesso!', 'success');
      
      // 📡 Notificar CardapioPublico sobre mudança de produtos
      notifyCardapioUpdate('products');
      
      loadStoreConfigurations();
    } catch (err) {
      showToast('Erro ao duplicar produto.', 'error');
    }
  };

  const [bairroModalOpen, setBairroModalOpen] = useState(false);
  const [editingBairro, setEditingBairro] = useState<Bairro | null>(null);
  const [bName, setBName] = useState('');
  const [bTax, setBTax] = useState(0);

  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Cupom | null>(null);
  const [cpCode, setCpCode] = useState('');
  const [cpType, setCpType] = useState<'percentual' | 'fixo'>('percentual');
  const [cpVal, setCpVal] = useState(0);
  const [cpMin, setCpMin] = useState(0);

  // Store settings & Extended info (100% editable burger-specific checklists)
  const [cfgName, setCfgName] = useState('');
  const [cfgSlogan, setCfgSlogan] = useState('');
  const [cfgDesc, setCfgDesc] = useState('');
  const [cfgLogo, setCfgLogo] = useState('');
  const [cfgBanner, setCfgBanner] = useState('');
  const [cfgLogoFile, setCfgLogoFile] = useState<File | null>(null);
  const [cfgBannerFile, setCfgBannerFile] = useState<File | null>(null);
  const [cfgBannerPromo, setCfgBannerPromo] = useState('');
  const [cfgFavicon, setCfgFavicon] = useState('');
  const [cfgPhone, setCfgPhone] = useState('');
  const [cfgWhatsapp, setCfgWhatsapp] = useState('');
  const [cfgInstagram, setCfgInstagram] = useState('');
  const [cfgFacebook, setCfgFacebook] = useState('');
  const [cfgEmail, setCfgEmail] = useState('');
  const [cfgCnpj, setCfgCnpj] = useState('');
  const [cfgCep, setCfgCep] = useState('');
  const [cfgRua, setCfgRua] = useState('');
  const [cfgNumero, setCfgNumero] = useState('');
  const [cfgBairro, setCfgBairro] = useState('');
  const [cfgCidade, setCfgCidade] = useState('');
  const [cfgEstado, setCfgEstado] = useState('');
  const [cfgComplemento, setCfgComplemento] = useState('');
  const [cfgReferencia, setCfgReferencia] = useState('');
  const [cfgMsgTopo, setCfgMsgTopo] = useState('');
  const [cfgMsgRodape, setCfgMsgRodape] = useState('');
  const [cfgCorPrimaria, setCfgCorPrimaria] = useState('#FF3D00');
  const [cfgCorSecundaria, setCfgCorSecundaria] = useState('#111111');
  const [cfgPrepMin, setCfgPrepMin] = useState(30);
  const [cfgPrepMax, setCfgPrepMax] = useState(50);
  const [cfgDeliveryFeePadrao, setCfgDeliveryFeePadrao] = useState(5.0);
  const [cfgMinVal, setCfgMinVal] = useState(0);
  const [cfgFreeVal, setCfgFreeVal] = useState(0);
  const [cfgSmsVerificationRequired, setCfgSmsVerificationRequired] = useState(false);
  const [cfgOpen, setCfgOpen] = useState(true);
  const [cfgHorarios, setCfgHorarios] = useState<{
    [key: string]: { abertura: string; fechamento: string; fechado: boolean }
  }>({
    seg: { abertura: '18:00', fechamento: '23:59', fechado: false },
    ter: { abertura: '18:00', fechamento: '23:59', fechado: false },
    qua: { abertura: '18:00', fechamento: '23:59', fechado: false },
    qui: { abertura: '18:00', fechamento: '23:59', fechado: false },
    sex: { abertura: '18:00', fechamento: '23:59', fechado: false },
    sab: { abertura: '18:00', fechamento: '23:59', fechado: false },
    dom: { abertura: '18:00', fechamento: '23:59', fechado: false },
  });
  const [cfgMetodosPagamento, setCfgMetodosPagamento] = useState<{
    pix: boolean;
    dinheiro: boolean;
    cartao: boolean;
    vr: boolean;
  }>({
    pix: true,
    dinheiro: true,
    cartao: true,
    vr: false,
  });

  // Adjusted Revenue for testing ("Faturamento Editável")
  const [cfgFaturamentoExtra, setCfgFaturamentoExtra] = useState(() => {
    return Number(localStorage.getItem(`pedifacil_faturamento_extra_${currentStore?.id || 'default'}`) || '0');
  });

  // Fallback WhatsApp message for unrecognized neighborhood
  const [cfgFallbackBairroMsg, setCfgFallbackBairroMsg] = useState('Seu bairro não foi encontrado no sistema? Finaliza o pedido e manda a localização no WhatsApp!');

  // Fidelidade states
  const [fidBrindeAtivo, setFidBrindeAtivo] = useState(true);
  const [fidBrindeTxt, setFidBrindeTxt] = useState('01 Smash Burger com Batata Frita Rústica');
  const [fidMetaPedidos, setFidMetaPedidos] = useState(5);
  const [fidPtsPorReal, setFidPtsPorReal] = useState(1);
  const [fidCashbackPct, setFidCashbackPct] = useState(5);
  const [fidBronzeMin, setFidBronzeMin] = useState(0);
  const [fidPrataMin, setFidPrataMin] = useState(150);
  const [fidOuroMin, setFidOuroMin] = useState(400);

  // Campaign templates
  const [campaignMessages, setCampaignMessages] = useState<string[]>([
    '🔥 QUARTA DO SMASH DOBRADO! 🍔 Compre 1 Smash burguer e leve OUTRO de graça! Somente hoje. Peça já clicando aqui: {link}',
    '⚡ FOME MONSTRUOSA? 🍟 Combo Supremo (Hambúrguer de Costela + Refrigerante + Batata) com 20% OFF! Aproveite essa oferta relâmpago: {link}',
    '🎁 CUPOM DE VOLTA! 🎟️ Sumiu por aqui parceiro? Use o cupom VOLTAGORDO para ganhar R$ 15,00 de desconto na sua próxima compra: {link}',
    '🎉 LANÇAMENTO CHEGOU! 🧀 Novo burguer Cheddar Cremoso Artesanal com muito Bacon. Venha experimentar o campeão da temporada: {link}',
    '🍨 COMPROU, GANHOU DOCE! 🍰 Só hoje nas compras acima de R$ 60,00 você ganha uma super sobremesa de ninho com morango: {link}'
  ]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // 📡 Notifica CardapioPublico sobre mudanças (para sincronização em tempo real entre abas/dispositivos)
  const notifyCardapioUpdate = (updateType: 'products' | 'categories' | 'full') => {
    try {
      const bc = new BroadcastChannel('pedifacil_store_update');
      bc.postMessage({
        type: 'cardapio_data_changed',
        updateType: updateType,
        storeId: currentStore?.id,
        timestamp: new Date().toISOString()
      });
      bc.close();
    } catch (e) {
      console.log('BroadcastChannel não suportado, usando fallback storage');
      // Fallback: triggar storage event para qualquer listener
      window.dispatchEvent(new Event('storage'));
    }
  };

  const getStoreSessionKey = (value?: string | number | null) => {
    const raw = String(value || '').trim();
    if (!raw) return 'pedifacil_store_admin_logged_in';
    return `pedifacil_store_admin_logged_in_${raw
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')}`;
  };

  // 🔄 Hook para reset diário automático
  useResetDiarioFaturamento(currentStore?.id);

  useEffect(() => {
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

    const findStoreBySlug = (slug?: string) => {
      if (!slug) return null;
      try {
        const localStores = JSON.parse(localStorage.getItem('pedifacil_db_stores') || '[]');
        return localStores.find((s: any) => {
          const candidate = normalizeSlug(String(s.slug || s.nome || s.name || ''));
          return candidate === normalizeSlug(slug);
        }) || null;
      } catch {
        return null;
      }
    };

    const directSessionKey = storeSlug ? getStoreSessionKey(storeSlug) : 'pedifacil_store_admin_logged_in';
    const directSavedSession = storeSlug ? localStorage.getItem(directSessionKey) : null;
    const generalSavedSession = localStorage.getItem('pedifacil_store_admin_logged_in');

    if (directSavedSession) {
      const parsedSession = JSON.parse(directSavedSession);
      if (parsedSession?.id) {
        const savedSlug = normalizeSlug(String(parsedSession.slug || parsedSession.nome || parsedSession.id || ''));
        const expectedSlug = normalizeSlug(String(storeSlug || ''));
        if (!storeSlug || savedSlug === expectedSlug) {
          setCurrentStore(parsedSession);
          setIsLoggedIn(true);
          return;
        }
      }
    }

    if (generalSavedSession && storeSlug) {
      try {
        const parsedSession = JSON.parse(generalSavedSession);
        const savedSlug = normalizeSlug(String(parsedSession.slug || parsedSession.nome || parsedSession.id || ''));
        const expectedSlug = normalizeSlug(String(storeSlug || ''));
        if (parsedSession?.id && savedSlug === expectedSlug) {
          setCurrentStore(parsedSession);
          setIsLoggedIn(true);
          return;
        }
      } catch {
        // ignore stale generic session
      }
    }

    const storeByRoute = findStoreBySlug(storeSlug);
    if (storeByRoute) {
      setCurrentStore(storeByRoute);
      setIsLoggedIn(true);
    }
  }, [storeSlug]);

  useEffect(() => {
    if (isLoggedIn && currentStore) {
      loadStoreConfigurations();
    }
  }, [isLoggedIn, currentStore]);

  // Audio warning chime loop triggered on active alarm IDs
  useEffect(() => {
    if (activeAlarmPedidosIds.length === 0) return;

    // Play once right away
    playModernChime();

    // Loop interval of warning tone (extremely snappy repetition to mimic real-time busy store notifications)
    const soundInterval = setInterval(() => {
      playModernChime();
    }, 1200);

    return () => {
      clearInterval(soundInterval);
    };
  }, [activeAlarmPedidosIds]);

  // Supabase Realtime Channel Registration for Orders Instant Update
  useEffect(() => {
    if (!isLoggedIn || !currentStore) return;

    const channel = supabase
      .channel(`realtime-orders-${currentStore.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pedidos',
          filter: `loja_id=eq.${currentStore.id}`
        },
        (payload: any) => {
          console.log('Fato Pedidos Realtime:', payload);
          if (payload.eventType === 'INSERT') {
            const o = payload.new;
            const createdAt = o.created_at || o.criado_em || new Date().toISOString();
            const resetTs = getEffectiveResetTimestamp(currentStore.id);
            if (resetTs && new Date(createdAt).toISOString() <= resetTs) {
              return;
            }
            const mapped = {
              id: o.id,
              store_id: o.loja_id,
              numero_pedido: o.numero_pedido,
              cliente_nome: o.cliente_nome,
              cliente_whatsapp: o.cliente_whatsapp,
              cliente_endereco: o.cliente_endereco,
              cliente_bairro: o.cliente_bairro,
              subtotal: Number(o.subtotal || 0),
              taxa_entrega: Number(o.taxa_entrega || 0),
              desconto: Number(o.desconto || 0),
              total: Number(o.total || 0),
              forma_pagamento: o.forma_pagamento,
              status: o.status,
              itens: Array.isArray(o.itens) ? o.itens : [],
              criado_em: o.created_at || o.criado_em || new Date().toISOString()
            };

            // Update live state
            setOrders(prev => {
              if (prev.some(x => x.id === mapped.id)) return prev;
              const newList = [mapped, ...prev];
              localStorage.setItem(`pedifacil_local_orders_${currentStore.id}`, JSON.stringify(newList));
              return newList;
            });

            // Trigger alarm for new inserts unless explicitly cancelled
            if (mapped.status !== 'cancelado') {
              setActiveAlarmPedidosIds(prev => {
                if (prev.includes(mapped.id)) return prev;
                return [...prev, mapped.id];
              });

              // Instant sound feedback
              playModernChime();

              // Send native browser notification if allowed (acts "like a chat")
              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  const notif = new Notification(`🍔 Novo Pedido #${mapped.numero_pedido || mapped.id.substring(0, 6)}!`, {
                    body: `Cliente: ${mapped.cliente_nome}\nTotal: R$ ${mapped.total.toFixed(2)}\nTocar som de alerta...`,
                    requireInteraction: true
                  });
                  notif.onclick = () => {
                    window.focus();
                    setActiveMenu('orders');
                    notif.close();
                  };
                } catch (err) {
                  console.warn('Could not fire browser notification:', err);
                }
              }
            }

            showToast(`🍔 Novo pedido #${mapped.numero_pedido || mapped.id.substring(0, 6)} de ${mapped.cliente_nome}!`, 'success');
          } else if (payload.eventType === 'UPDATE') {
            const o = payload.new;
            const mapped = {
              id: o.id,
              store_id: o.loja_id,
              numero_pedido: o.numero_pedido,
              cliente_nome: o.cliente_nome,
              cliente_whatsapp: o.cliente_whatsapp,
              cliente_endereco: o.cliente_endereco,
              cliente_bairro: o.cliente_bairro,
              subtotal: Number(o.subtotal || 0),
              taxa_entrega: Number(o.taxa_entrega || 0),
              desconto: Number(o.desconto || 0),
              total: Number(o.total || 0),
              forma_pagamento: o.forma_pagamento,
              status: o.status,
              itens: Array.isArray(o.itens) ? o.itens : [],
              criado_em: o.created_at || o.criado_em || new Date().toISOString()
            };

            setOrders(prev => {
              const newList = prev.map(x => x.id === mapped.id ? mapped : x);
              localStorage.setItem(`pedifacil_local_orders_${currentStore.id}`, JSON.stringify(newList));
              return newList;
            });

              // If an order was updated to 'novo' (e.g., status set after creation),
              // ensure we trigger the alarm — especially handle cash ('Dinheiro') cases.
              if (mapped.status === 'novo') {
                setActiveAlarmPedidosIds(prev => {
                  if (prev.includes(mapped.id)) return prev;
                  return [...prev, mapped.id];
                });

                // Play immediate chime
                playModernChime();

                // Send native browser notification if allowed
                if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    const notif = new Notification(`🍔 Pedido Atualizado #${mapped.numero_pedido || mapped.id.substring(0,6)} - Novo!`, {
                      body: `Cliente: ${mapped.cliente_nome}\nPagamento: ${mapped.forma_pagamento || '—'}\nTotal: R$ ${mapped.total.toFixed(2)}`,
                      requireInteraction: true
                    });
                    notif.onclick = () => {
                      window.focus();
                      setActiveMenu('orders');
                      notif.close();
                    };
                  } catch (err) {
                    console.warn('Could not fire browser notification on UPDATE:', err);
                  }
                }
              }

            // Discard alarm if status changes
            if (mapped.status !== 'novo') {
              setActiveAlarmPedidosIds(prev => prev.filter(id => id !== mapped.id));
            }
          } else if (payload.eventType === 'DELETE') {
            const delId = payload.old.id;
            setOrders(prev => {
              const newList = prev.filter(x => x.id !== delId);
              localStorage.setItem(`pedifacil_local_orders_${currentStore.id}`, JSON.stringify(newList));
              return newList;
            });
            setActiveAlarmPedidosIds(prev => prev.filter(id => id !== delId));
          }
        }
      )
      .subscribe();

    // Supabase Realtime Channel for Clients Instant Registration ("Like a Chat")
    const clientsChannel = supabase
      .channel(`realtime-clients-${currentStore.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes',
          filter: `loja_id=eq.${currentStore.id}`
        },
        (payload: any) => {
          console.log('Realtime Clientes Event:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const c = payload.new;
            const clientObj: Client = {
              id: c.id || `cl-${Date.now()}`,
              store_id: c.loja_id || c.store_id || currentStore.id,
              nome: c.nome,
              whatsapp: c.whatsapp,
              rua: c.rua,
              bairro: c.bairro,
              total_pedidos: Number(c.total_pedidos || 0),
              total_gasto: Number(c.total_gasto || 0),
              ultimo_pedido_em: c.ultimo_pedido_em,
              is_vip: Boolean(c.is_vip),
              level: c.level || 'Bronze',
              bloqueado: Boolean(c.bloqueado)
            };

            setClients(prev => {
              const cleanPhone = (clientObj.whatsapp || '').replace(/\D/g, '');
              const exists = prev.some(x => x.id === clientObj.id || (x.whatsapp && x.whatsapp.replace(/\D/g, '') === cleanPhone));
              let updated: Client[];
              if (exists) {
                updated = prev.map(x => (x.id === clientObj.id || (x.whatsapp && x.whatsapp.replace(/\D/g, '') === cleanPhone)) ? { ...x, ...clientObj } : x);
              } else {
                updated = [clientObj, ...prev];
              }
              try {
                const storeKey = `pedifacil_db_clients_${currentStore.id}`;
                localStorage.setItem(storeKey, JSON.stringify(updated));
              } catch {}
              return updated;
            });

            if (payload.eventType === 'INSERT') {
              playModernChime();
              showToast(`🎉 Novo cliente cadastrado: ${c.nome} (${c.whatsapp})`, 'success');

              if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(`🎉 Novo Cliente na Loja!`, {
                    body: `${c.nome} (${c.whatsapp}) acabou de se cadastrar na sua loja.`,
                  });
                } catch {}
              }
            }
          }
        }
      )
      .subscribe();

    // Cross-tab broadcast listener for immediate local registration feedback
    const handleStorageOrBroadcast = (e: StorageEvent) => {
      if (e.key === `pedifacil_db_clients_${currentStore.id}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setClients(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageOrBroadcast);

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(clientsChannel);
      window.removeEventListener('storage', handleStorageOrBroadcast);
    };
  }, [isLoggedIn, currentStore]);

  // Load configuration and data context
  const loadStoreConfigurations = async () => {
    setLoading(true);
    try {
      if (currentStore?.id) {
        await db.syncLocalDataToCloud(currentStore.id);
      }
      // 1. Obter status atualizado da loja para verificação de bloqueio/pausa
      const { data: storeCheck, error: errC } = await supabase
        .from('lojas')
        .select('*')
        .eq('id', currentStore.id)
        .maybeSingle();

      const localStores = JSON.parse(localStorage.getItem('pedifacil_db_stores') || '[]');
      const foundLocal = localStores.find((s: any) => s.id === currentStore.id);
      const matchedStore = {
        ...(foundLocal || {}),
        ...(storeCheck || {})
      };

      if (matchedStore) {
        setStoreStatus(
          matchedStore.bloqueado ? 'blocked' : matchedStore.pausado ? 'paused' : 'normal'
        );

        // Preencher variáveis para formulário de configurações do Hambúrguer Checklist
        setCfgName(matchedStore.nome || matchedStore.name || 'Burger do Gordo');
        setCfgSlogan(matchedStore.slogan || 'Estúpido de tão suculento! 🍔🔥');
        setCfgDesc(matchedStore.descricao || matchedStore.description || '');
        setCfgLogo(matchedStore.logo_url || '');
        setCfgBanner(matchedStore.banner_url || '');
        setCfgBannerPromo(matchedStore.banner_promo_url || '');
        setCfgFavicon(matchedStore.favicon || matchedStore.favicon_url || '');
        setCfgPhone(matchedStore.phone || matchedStore.telefone || '');
        setCfgWhatsapp(matchedStore.whatsapp || '');
        setCfgInstagram(matchedStore.instagram || '');
        setCfgFacebook(matchedStore.facebook || '');
        setCfgEmail(matchedStore.email || '');
        setCfgCnpj(matchedStore.cnpj || '');
        setCfgCep(matchedStore.cep || '');
        setCfgRua(matchedStore.rua || '');
        setCfgNumero(matchedStore.numero || '');
        setCfgBairro(matchedStore.bairro || '');
        setCfgCidade(matchedStore.cidade || '');
        setCfgEstado(matchedStore.estado || '');
        setCfgComplemento(matchedStore.complemento || '');
        setCfgReferencia(matchedStore.referencia || '');
        setCfgMsgTopo(matchedStore.mensagem_topo || '');
        setCfgMsgRodape(matchedStore.mensagem_rodape || '');
        setCfgCorPrimaria(matchedStore.cor_primaria || '#FF3D00');
        setCfgCorSecundaria(matchedStore.cor_secundaria || '#111111');
        setCfgPrepMin(Number(matchedStore.tempo_entrega_min || 30));
        setCfgPrepMax(Number(matchedStore.tempo_entrega_max || 50));
        setCfgDeliveryFeePadrao(Number(matchedStore.taxa_entrega_padrao || 5.0));
        setCfgMinVal(Number(matchedStore.pedido_minimo || 0));
        setCfgFreeVal(Number(matchedStore.frete_gratis_acima || 0));
        setCfgOpen(matchedStore.aberto !== false);

        // Horários de funcionamento
        const localExtras = localStorage.getItem(`pedifacil_store_extras_${currentStore.id}`);
        let parsedExt: any = null;
        if (localExtras) {
          try { parsedExt = JSON.parse(localExtras); } catch (e) {}
        }

        const hSrc = storeCheck?.horarios || foundLocal?.horarios || parsedExt?.horarios || currentStore?.horarios;
        if (hSrc) {
          setCfgHorarios({
            seg: { abertura: hSrc.seg?.abertura || '18:00', fechamento: hSrc.seg?.fechamento || '23:59', fechado: !!hSrc.seg?.fechado },
            ter: { abertura: hSrc.ter?.abertura || '18:00', fechamento: hSrc.ter?.fechamento || '23:59', fechado: !!hSrc.ter?.fechado },
            qua: { abertura: hSrc.qua?.abertura || '18:00', fechamento: hSrc.qua?.fechamento || '23:59', fechado: !!hSrc.qua?.fechado },
            qui: { abertura: hSrc.qui?.abertura || '18:00', fechamento: hSrc.qui?.fechamento || '23:59', fechado: !!hSrc.qui?.fechado },
            sex: { abertura: hSrc.sex?.abertura || '18:00', fechamento: hSrc.sex?.fechamento || '23:59', fechado: !!hSrc.sex?.fechado },
            sab: { abertura: hSrc.sab?.abertura || '18:00', fechamento: hSrc.sab?.fechamento || '23:59', fechado: !!hSrc.sab?.fechado },
            dom: { abertura: hSrc.dom?.abertura || '18:00', fechamento: hSrc.dom?.fechamento || '23:59', fechado: !!hSrc.dom?.fechado },
          });
        }

        const mSrc = storeCheck?.metodos_pagamento || foundLocal?.metodos_pagamento || parsedExt?.metodos_pagamento || currentStore?.metodos_pagamento;
        if (mSrc) {
          setCfgMetodosPagamento({
            pix: mSrc.pix !== false,
            dinheiro: mSrc.dinheiro !== false,
            cartao: mSrc.cartao !== false,
            vr: !!mSrc.vr,
          });
        }

        // Load specific extra configs
        if (parsedExt) {
          if (parsedExt.fallback_bairro_msg) {
            if (parsedExt.fallback_bairro_msg.includes('não foi listado na entrega') || parsedExt.fallback_bairro_msg.includes('não fazemos entregas automáticas')) {
              parsedExt.fallback_bairro_msg = 'Seu bairro não foi encontrado no sistema? Finaliza o pedido e manda a localização no WhatsApp!';
            }
            setCfgFallbackBairroMsg(parsedExt.fallback_bairro_msg);
          }
          if (parsedExt.fid_brinde_ativo !== undefined) setFidBrindeAtivo(parsedExt.fid_brinde_ativo);
          if (parsedExt.fid_brinde_txt) setFidBrindeTxt(parsedExt.fid_brinde_txt);
          if (parsedExt.fid_meta_pedidos) setFidMetaPedidos(parsedExt.fid_meta_pedidos);
          if (parsedExt.fid_pts_por_real) setFidPtsPorReal(parsedExt.fid_pts_por_real);
          if (parsedExt.fid_cashback_pct) setFidCashbackPct(parsedExt.fid_cashback_pct);
          if (parsedExt.fid_bronze_min) setFidBronzeMin(parsedExt.fid_bronze_min);
          if (parsedExt.fid_prata_min) setFidPrataMin(parsedExt.fid_prata_min);
          if (parsedExt.fid_ouro_min) setFidOuroMin(parsedExt.fid_ouro_min);
          if (parsedExt.sms_verification_required !== undefined) setCfgSmsVerificationRequired(parsedExt.sms_verification_required);
          if (parsedExt.campaign_messages) setCampaignMessages(parsedExt.campaign_messages);
        }
      }

      // 2. Buscar categorias
      const { data: cats, error: errCats } = await supabase
        .from('categorias')
        .select('*')
        .eq('loja_id', currentStore.id)
        .order('ordem', { ascending: true });
      if (errCats) throw errCats;

      if (cats && cats.length > 0) {
        setCategories(cats.map((c: any) => ({
          id: c.id,
          store_id: c.loja_id,
          name: c.nome || c.name || '',
          ordem: c.ordem,
          is_active: c.ativo !== false
        })));
        localStorage.setItem(`pedifacil_local_categories_${currentStore.id}`, JSON.stringify(cats));
      } else {
        const local = localStorage.getItem(`pedifacil_local_categories_${currentStore.id}`);
        if (local) {
          const parsed = JSON.parse(local);
          setCategories(parsed.map((c: any) => ({
            id: c.id,
            store_id: c.loja_id,
            name: c.nome || c.name || '',
            ordem: c.ordem,
            is_active: c.ativo !== false
          })));
        } else {
          setCategories([
            { id: 'cat-1', store_id: currentStore.id, name: '🍔 Hambúrgueres', ordem: 1, is_active: true },
            { id: 'cat-2', store_id: currentStore.id, name: '🥤 Bebidas', ordem: 2, is_active: true }
          ]);
        }
      }

      // 3. Buscar produtos
      const { data: prods, error: errProds } = await supabase
        .from('produtos')
        .select('*')
        .eq('loja_id', currentStore.id)
        .order('ordem', { ascending: true });
      if (errProds) throw errProds;

      if (prods && prods.length > 0) {
        prods.forEach((p: any) => {
          if (p.sku && typeof p.sku === 'string' && p.sku.trim().startsWith('{')) {
            try {
              const metaObj = JSON.parse(p.sku);
              if (metaObj && (metaObj.optionGroups || metaObj.badges)) {
                localStorage.setItem(`pedifacil_product_meta_${p.id}`, p.sku);
              }
            } catch (e) {}
          }
        });
        const mapped = prods.map((p: any) => ({
          id: p.id,
          store_id: p.loja_id,
          category_id: p.categoria_id || p.category_id,
          name: p.nome || p.name || '',
          description: p.descricao || p.description || '',
          preco: Number(p.preco || 0),
          preco_promocional: p.preco_promocional ? Number(p.preco_promocional) : undefined,
          foto_url: p.foto_url,
          disponivel: p.disponivel !== false,
          destaque: p.destaque === true,
          is_novo: p.is_novo === true,
          sku: p.sku || '',
          tempo_preparo: p.tempo_preparo || 0,
          ordem: p.ordem || 0
        }));
        setProducts(mapped);
        localStorage.setItem(`pedifacil_local_products_${currentStore.id}`, JSON.stringify(prods));
      } else {
        const local = localStorage.getItem(`pedifacil_local_products_${currentStore.id}`);
        if (local) {
          const parsed = JSON.parse(local);
          parsed.forEach((p: any) => {
            if (p.sku && typeof p.sku === 'string' && p.sku.trim().startsWith('{')) {
              try {
                const metaObj = JSON.parse(p.sku);
                if (metaObj && (metaObj.optionGroups || metaObj.badges)) {
                  localStorage.setItem(`pedifacil_product_meta_${p.id}`, p.sku);
                }
              } catch (e) {}
            }
          });
          setProducts(parsed.map((p: any) => ({
            id: p.id,
            store_id: p.loja_id,
            category_id: p.categoria_id || p.category_id,
            name: p.nome || p.name || '',
            description: p.descricao || p.description || '',
            preco: Number(p.preco || 0),
            preco_promocional: p.preco_promocional ? Number(p.preco_promocional) : undefined,
            foto_url: p.foto_url,
            disponivel: p.disponivel !== false,
            destaque: p.destaque === true,
            is_novo: p.is_novo === true,
            sku: p.sku || '',
            tempo_preparo: p.tempo_preparo || 0,
            ordem: p.ordem || 0
          })));
        } else {
          setProducts([]);
        }
      }

      // 4. Buscar bairros taxas
      const { data: bList, error: errBList } = await supabase
        .from('taxas_entrega')
        .select('*')
        .eq('loja_id', currentStore.id);
      if (errBList) throw errBList;

      if (bList && bList.length > 0) {
        setBairros(bList.map((b: any) => ({
          id: b.id,
          store_id: b.loja_id,
          nome: b.bairro || b.nome || '',
          taxa: Number(b.taxa || 0),
          tempo_estimado: b.tempo_estimado || ''
        })));
        localStorage.setItem(`pedifacil_local_bairros_${currentStore.id}`, JSON.stringify(bList));
      } else {
        const local = localStorage.getItem(`pedifacil_local_bairros_${currentStore.id}`);
        if (local) {
          const parsed = JSON.parse(local);
          setBairros(parsed.map((b: any) => ({
            id: b.id,
            store_id: b.loja_id,
            nome: b.bairro || b.nome || '',
            taxa: Number(b.taxa || 0),
            tempo_estimado: b.tempo_estimado || ''
          })));
        } else {
          setBairros([]);
        }
      }

      // 5. Buscar cupons
      const { data: cpList, error: errCpList } = await supabase
        .from('cupons')
        .select('*')
        .eq('loja_id', currentStore.id);
      if (errCpList) throw errCpList;

      if (cpList && cpList.length > 0) {
        setCupons(cpList.map((c: any) => ({
          id: c.id,
          store_id: c.loja_id,
          codigo: c.codigo || '',
          tipo: c.tipo || 'fixo',
          valor: Number(c.valor || 0),
          min_compra: Number(c.valor_minimo || 0),
          max_usos: c.quantidade_maxima || 999,
          usos: c.quantidade_usada || 0,
          is_active: c.ativo !== false
        })));
        localStorage.setItem(`pedifacil_local_cupons_${currentStore.id}`, JSON.stringify(cpList));
      } else {
        const local = localStorage.getItem(`pedifacil_local_cupons_${currentStore.id}`);
        if (local) {
          const parsed = JSON.parse(local);
          setCupons(parsed.map((c: any) => ({
            id: c.id,
            store_id: c.loja_id,
            codigo: c.codigo || '',
            tipo: c.tipo || 'fixo',
            valor: Number(c.valor || 0),
            min_compra: Number(c.valor_minimo || 0),
            max_usos: c.quantidade_maxima || 999,
            usos: c.quantidade_usada || 0,
            is_active: c.ativo !== false
          })));
        } else {
          setCupons([]);
        }
      }

      // 6. Buscar pedidos recebidos
      const resetTimestamp = getEffectiveResetTimestamp(currentStore.id, storeCheck?.data_ultimo_reset);

      let orderQuery = supabase
        .from('pedidos')
        .select('*')
        .eq('loja_id', currentStore.id);

      if (resetTimestamp) {
        orderQuery = orderQuery.gt('created_at', resetTimestamp);
      }

      const { data: ords, error: errOrds } = await orderQuery.order('created_at', { ascending: false });
      if (errOrds) throw errOrds;

      if (ords && ords.length > 0) {
        setOrders(ords.map((o: any) => ({
          id: o.id,
          store_id: o.loja_id,
          numero_pedido: o.numero_pedido,
          cliente_nome: o.cliente_nome,
          cliente_whatsapp: o.cliente_whatsapp,
          cliente_endereco: o.cliente_endereco,
          cliente_bairro: o.cliente_bairro,
          subtotal: Number(o.subtotal || 0),
          taxa_entrega: Number(o.taxa_entrega || 0),
          desconto: Number(o.desconto || 0),
          total: Number(o.total || 0),
          forma_pagamento: o.forma_pagamento,
          troco: o.troco || undefined,
          status: o.status,
          itens: Array.isArray(o.itens) ? o.itens : [],
          criado_em: o.created_at || o.criado_em
        })));
        localStorage.setItem(`pedifacil_local_orders_${currentStore.id}`, JSON.stringify(ords));
      } else {
        const local = localStorage.getItem(`pedifacil_local_orders_${currentStore.id}`);
        if (local) {
          const parsed = JSON.parse(local).filter((o: any) => {
            if (!resetTimestamp) return true;
            const createdAt = new Date(o.criado_em || o.created_at || '').toISOString();
            return createdAt > resetTimestamp;
          });

          setOrders(parsed.map((o: any) => ({
            id: o.id,
            store_id: o.loja_id,
            numero_pedido: o.numero_pedido,
            cliente_nome: o.cliente_nome,
            cliente_whatsapp: o.cliente_whatsapp,
            cliente_endereco: o.cliente_endereco,
            cliente_bairro: o.cliente_bairro,
            subtotal: Number(o.subtotal || 0),
            taxa_entrega: Number(o.taxa_entrega || 0),
            desconto: Number(o.desconto || 0),
            total: Number(o.total || 0),
            forma_pagamento: o.forma_pagamento,
            troco: o.troco || undefined,
            status: o.status,
            itens: Array.isArray(o.itens) ? o.itens : [],
            criado_em: o.created_at || o.criado_em
          })));
        } else {
          setOrders([]);
        }
      }

    } catch (err) {
      console.warn('Erro ao carregar do Supabase. Utilizando fallback local offline:', err);
      
      // Fallback de categorias
      const lCats = localStorage.getItem(`pedifacil_local_categories_${currentStore.id}`);
      if (lCats) {
        setCategories(JSON.parse(lCats).map((c: any) => ({
          id: c.id,
          store_id: c.loja_id,
          name: c.nome || c.name || '',
          ordem: c.ordem,
          is_active: c.ativo !== false
        })));
      } else {
        setCategories([
          { id: 'cat-1', store_id: currentStore.id, name: '🍔 Hambúrgueres', ordem: 1, is_active: true },
          { id: 'cat-2', store_id: currentStore.id, name: '🥤 Bebidas', ordem: 2, is_active: true }
        ]);
      }

      // Fallback de produtos
      const lProds = localStorage.getItem(`pedifacil_local_products_${currentStore.id}`);
      if (lProds) {
        setProducts(JSON.parse(lProds).map((p: any) => ({
          id: p.id,
          store_id: p.loja_id,
          category_id: p.categoria_id || p.category_id,
          name: p.nome || p.name || '',
          description: p.descricao || p.description || '',
          preco: Number(p.preco || 0),
          preco_promocional: p.preco_promocional ? Number(p.preco_promocional) : undefined,
          foto_url: p.foto_url,
          disponivel: p.disponivel !== false,
          destaque: p.destaque === true,
          is_novo: p.is_novo === true,
          sku: p.sku || '',
          tempo_preparo: p.tempo_preparo || 0,
          ordem: p.ordem || 0
        })));
      }

      // Fallback de bairros
      const lB = localStorage.getItem(`pedifacil_local_bairros_${currentStore.id}`);
      if (lB) {
        setBairros(JSON.parse(lB).map((b: any) => ({
          id: b.id,
          store_id: b.loja_id,
          nome: b.bairro || b.nome || '',
          taxa: Number(b.taxa || 0),
          tempo_estimado: b.tempo_estimado || ''
        })));
      }

      // Fallback de cupons
      const lCp = localStorage.getItem(`pedifacil_local_cupons_${currentStore.id}`);
      if (lCp) {
        setCupons(JSON.parse(lCp).map((c: any) => ({
          id: c.id,
          store_id: c.loja_id,
          codigo: c.codigo || '',
          tipo: c.tipo || 'fixo',
          valor: Number(c.valor || 0),
          min_compra: Number(c.valor_minimo || 0),
          max_usos: c.quantidade_maxima || 999,
          usos: c.quantidade_usada || 0,
          is_active: c.ativo !== false
        })));
      }

      // Fallback de pedidos
      const resetTimestamp = getEffectiveResetTimestamp(currentStore.id);
      const lOrds = localStorage.getItem(`pedifacil_local_orders_${currentStore.id}`);
      if (lOrds) {
        const parsed = JSON.parse(lOrds).filter((o: any) => {
          if (!resetTimestamp) return true;
          const createdAt = new Date(o.criado_em || o.created_at || '').toISOString();
          return createdAt > resetTimestamp;
        });

        setOrders(parsed.map((o: any) => ({
          id: o.id,
          store_id: o.loja_id,
          numero_pedido: o.numero_pedido,
          cliente_nome: o.cliente_nome,
          cliente_whatsapp: o.cliente_whatsapp,
          cliente_endereco: o.cliente_endereco,
          cliente_bairro: o.cliente_bairro,
          subtotal: Number(o.subtotal || 0),
          taxa_entrega: Number(o.taxa_entrega || 0),
          desconto: Number(o.desconto || 0),
          total: Number(o.total || 0),
          forma_pagamento: o.forma_pagamento,
          troco: o.troco || undefined,
          status: o.status,
          itens: Array.isArray(o.itens) ? o.itens : [],
          criado_em: o.created_at || o.criado_em
        })));
      } else {
        setOrders([]);
      }

      // 7. Load store clients lists (strictly isolated by currentStore.id)
      try {
        const { data: dbClients } = await supabase
          .from('clientes')
          .select('*')
          .or(`loja_id.eq.${currentStore.id},store_id.eq.${currentStore.id}`);
          
        if (dbClients && dbClients.length > 0) {
          const mappedClients = dbClients.map((c: any) => ({
            id: c.id,
            store_id: currentStore.id,
            nome: c.nome,
            whatsapp: c.whatsapp,
            total_pedidos: Number(c.total_pedidos || 0),
            total_gasto: Number(c.total_gasto || 0),
            ultimo_pedido_em: c.ultimo_pedido_em,
            is_vip: c.is_vip === true,
            level: c.level || 'Bronze',
            bloqueado: c.bloqueado === true,
            rua: c.rua || c.endereco,
            bairro: c.bairro
          }));
          setClients(mappedClients);
          localStorage.setItem(`pedifacil_db_clients_${currentStore.id}`, JSON.stringify(mappedClients));
        } else {
          const localCl = JSON.parse(localStorage.getItem(`pedifacil_db_clients_${currentStore.id}`) || '[]');
          const filtered = Array.isArray(localCl) ? localCl.filter((c: any) => c.store_id === currentStore.id || !c.store_id) : [];
          setClients(filtered);
        }
      } catch (err) {
        console.warn('Erro ao carregar clientes do Supabase:', err);
        const localCl = JSON.parse(localStorage.getItem(`pedifacil_db_clients_${currentStore.id}`) || '[]');
        setClients(Array.isArray(localCl) ? localCl : []);
      }

    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    const normalizedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!normalizedEmail || !trimmedPassword) {
      setLoginError('E-mail do lojista ou senha inválidos.');
      return;
    }

    const normalizeString = (value: string) =>
      String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '')
        .replace(/burguer/g, 'burger');

    const isEquivalentPassword = (candidate: string, target: string) => {
      const first = String(candidate || '').trim();
      const second = String(target || '').trim();
      return (
        first === second ||
        first.toLowerCase() === second.toLowerCase() ||
        normalizeString(first) === normalizeString(second)
      );
    };

    const isMatchingCredentials = (store: any) => {
      const storeEmail = String(store?.owner_email || store?.email || '').trim();
      const storePhone = String(store?.whatsapp || store?.telefone || '').replace(/\D/g, '');
      const storeSlug = String(store?.slug || '').trim();
      const storePassword = String(store?.owner_password || store?.senha || '').trim();

      const inputNorm = normalizeString(normalizedEmail);
      const inputPhone = normalizedEmail.replace(/\D/g, '');

      const matchesEmail = storeEmail && normalizeString(storeEmail) === inputNorm;
      const matchesSlug = storeSlug && normalizeString(storeSlug) === inputNorm;
      const matchesPhone = inputPhone.length >= 8 && storePhone && (storePhone === inputPhone || storePhone.endsWith(inputPhone));
      const matchesPassword = isEquivalentPassword(storePassword, trimmedPassword);

      return (matchesEmail || matchesSlug || matchesPhone) && matchesPassword;
    };

    try {
      const { data: allStores, error } = await supabase.from('lojas').select('*');

      if (!error && Array.isArray(allStores)) {
        const matchedStore = allStores.find(isMatchingCredentials);
        if (matchedStore) {
          const storeSession = {
            id: matchedStore.id,
            nome: matchedStore.nome,
            slug: matchedStore.slug,
            owner_email: String(matchedStore.owner_email || matchedStore.email || '').trim(),
            owner_password: String(matchedStore.owner_password || matchedStore.senha || '').trim(),
          };

          const slugKey = String(matchedStore.slug || matchedStore.nome || matchedStore.id).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
          const sessionKey = `pedifacil_store_admin_logged_in_${slugKey}`;
          localStorage.setItem(sessionKey, JSON.stringify(storeSession));
          localStorage.setItem('pedifacil_store_admin_logged_in', JSON.stringify(storeSession));
          setCurrentStore(matchedStore);
          setIsLoggedIn(true);
          showToast('Login realizado com sucesso! 🍕', 'success');
          setTimeout(() => syncLocalStoresToSupabase(), 500);
          return;
        }
      }
    } catch (err) {
      console.warn('Erro ao consultar Supabase no login do lojista:', err);
    }

    const localStores = JSON.parse(localStorage.getItem('pedifacil_db_stores') || '[]');
    const foundIdx = Array.isArray(localStores) ? localStores.find(isMatchingCredentials) : null;

    if (foundIdx) {
      const slugKey = String(foundIdx.slug || foundIdx.nome || foundIdx.id).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '');
      const sessionKey = `pedifacil_store_admin_logged_in_${slugKey}`;
      localStorage.setItem(sessionKey, JSON.stringify(foundIdx));
      localStorage.setItem('pedifacil_store_admin_logged_in', JSON.stringify(foundIdx));
      setCurrentStore(foundIdx);
      setIsLoggedIn(true);
      showToast('Login realizado com sucesso! 🍕', 'success');
      return;
    }

    const knownFallbackMatches = [
      { owner_email: 'admin@burgerdogordo.com', owner_password: 'gordo123', slug: 'burger-do-gordo' },
      { owner_email: 'pmuniz668@gmail.com', owner_password: 'camamesa', slug: 'll-burguerro' },
      { owner_email: 'admin@pedifacil.com', owner_password: '123456', slug: 'pedifacil-demo' }
    ];

    const fallbackMatch = knownFallbackMatches.find((candidate) =>
      normalizeString(candidate.owner_email) === normalizeString(normalizedEmail) &&
      isEquivalentPassword(candidate.owner_password, trimmedPassword)
    );

    if (fallbackMatch) {
      const fallbackStore = {
        id: fallbackMatch.slug,
        nome: fallbackMatch.slug === 'burger-do-gordo' ? 'Burger do Gordo' : fallbackMatch.slug === 'll-burguerro' ? 'LL BURGUERRO' : 'Loja Demo',
        slug: fallbackMatch.slug,
        owner_email: fallbackMatch.owner_email,
        owner_password: fallbackMatch.owner_password,
      };

      const sessionKey = getStoreSessionKey(fallbackMatch.slug);
      localStorage.setItem(sessionKey, JSON.stringify(fallbackStore));
      localStorage.setItem('pedifacil_store_admin_logged_in', JSON.stringify(fallbackStore));
      setCurrentStore(fallbackStore);
      setIsLoggedIn(true);
      showToast('Login realizado com sucesso! 🍕', 'success');
      return;
    }

    setLoginError('E-mail do lojista ou senha inválidos.');
  };

  const handleLogout = () => {
    if (currentStore?.slug || currentStore?.nome || currentStore?.id) {
      localStorage.removeItem(getStoreSessionKey(currentStore.slug || currentStore.nome || currentStore.id));
    }
    Object.keys(localStorage)
      .filter((key) => key.startsWith('pedifacil_store_admin_logged_in_'))
      .forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('pedifacil_store_admin_logged_in');
    setIsLoggedIn(false);
    setCurrentStore(null);
    showToast('Sessão lojista finalizada.', 'info');
  };

  // Sync local stores to Supabase to ensure links work after browser data clear
  const syncLocalStoresToSupabase = async () => {
    try {
      const localStores = JSON.parse(localStorage.getItem('pedifacil_db_stores') || '[]');
      if (localStores.length === 0) return;

      for (const store of localStores) {
        if (!store.id || !store.nome) continue;

        const storePayload = {
          id: store.id,
          nome: store.nome || store.name,
          slug: store.slug || (store.nome || store.name || '').toLowerCase().replace(/\s+/g, '-'),
          owner_email: store.owner_email || store.email,
          owner_password: store.owner_password || store.senha,
          whatsapp: store.whatsapp,
          nicho: store.nicho,
          plano: store.plano,
          pago: store.pago !== false,
          pausado: store.pausado === true,
          bloqueado: store.bloqueado === true,
          vencimento: store.vencimento,
          slogan: store.slogan,
          descricao: store.descricao || store.description,
          logo_url: store.logo_url,
          banner_url: store.banner_url,
          banner_promo_url: store.banner_promo_url,
          telefone: store.phone || store.telefone,
          instagram: store.instagram,
          cep: store.cep,
          rua: store.rua,
          numero: store.numero,
          bairro: store.bairro,
          cidade: store.cidade,
          estado: store.estado,
          complemento: store.complemento,
          referencia: store.referencia,
          mensagem_topo: store.mensagem_topo,
          mensagem_rodape: store.mensagem_rodape,
          cor_primaria: store.cor_primaria,
          cor_secundaria: store.cor_secundaria,
          horarios: store.horarios,
          metodos_pagamento: store.metodos_pagamento
        };

        try {
          // Try upsert to ensure it's created or updated
          await supabase
            .from('lojas')
            .upsert([storePayload], { onConflict: 'id' });
        } catch (err) {
          console.warn(`Erro ao sincronizar loja ${store.nome} para Supabase:`, err);
        }
      }
    } catch (err) {
      console.warn('Erro ao sincronizar lojas:', err);
    }
  };

  const handleToggleStoreOpen = async () => {
    if (!currentStore) return;

    const nextOpen = !cfgOpen;
    setCfgOpen(nextOpen);

    try {
      const { error } = await supabase
        .from('lojas')
        .update({ aberto: nextOpen })
        .eq('id', currentStore.id);

      if (error) {
        throw error;
      }

      const updatedStoreSession = {
        ...currentStore,
        aberto: nextOpen
      };

      setCurrentStore(updatedStoreSession);
      localStorage.setItem('pedifacil_store_admin_logged_in', JSON.stringify(updatedStoreSession));

      const localStores = JSON.parse(localStorage.getItem('pedifacil_db_stores') || '[]');
      const index = localStores.findIndex((s: any) => s.id === currentStore.id);
      if (index >= 0) {
        localStores[index].aberto = nextOpen;
        localStorage.setItem('pedifacil_db_stores', JSON.stringify(localStores));
      }

      showToast(nextOpen ? 'Loja aberta com sucesso!' : 'Loja fechada com sucesso!', 'success');
    } catch (err) {
      setCfgOpen(!nextOpen);
      showToast('Erro ao alterar status da loja.', 'error');
    }
  };

  const downloadFile = (content: string, filename: string, mimeType = 'application/json') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDayReport = () => {
    if (!currentStore) return;
    if (!orders || orders.length === 0) {
      showToast('Não há pedidos para exportar.', 'error');
      return;
    }

    const allOrders = orders;
    const activeOrders = orders.filter(o => o.status !== 'cancelado');
    const totalRevenue = activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalDelivery = activeOrders.reduce((sum, order) => sum + Number(order.taxa_entrega || 0), 0);
    const totalDiscount = activeOrders.reduce((sum, order) => sum + Number(order.desconto || 0), 0);
    const statusCount = allOrders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const itemStats: Record<string, { quantity: number; revenue: number }> = {};
    activeOrders.forEach((order) => {
      const itens = Array.isArray(order.itens) ? order.itens : [];
      itens.forEach((item: any) => {
        const name = String(item.name || item.title || 'Item desconhecido');
        const qty = Number(item.quantity || item.qtd || 1);
        const price = Number(item.price || 0);

        if (!itemStats[name]) {
          itemStats[name] = { quantity: 0, revenue: 0 };
        }
        itemStats[name].quantity += qty;
        itemStats[name].revenue += price;
      });
    });

    const sortedItems = Object.entries(itemStats)
      .sort(([, a], [, b]) => b.quantity - a.quantity)
      .map(([name, stats]) => ({ name, ...stats }));

    const reportLines: string[] = [];
    reportLines.push(`Relatório de Pedidos - Loja: ${currentStore.nome}`);
    reportLines.push(`Slug: ${currentStore.slug}`);
    reportLines.push(`Gerado em: ${new Date().toISOString()}`);
    reportLines.push('');
    reportLines.push('--- Resumo ---');
    reportLines.push(`Total de pedidos: ${activeOrders.length}`);
    reportLines.push(`Receita total: R$ ${totalRevenue.toFixed(2)}`);
    reportLines.push(`Taxa de entrega total: R$ ${totalDelivery.toFixed(2)}`);
    reportLines.push(`Desconto total: R$ ${totalDiscount.toFixed(2)}`);
    reportLines.push(`Ticket médio: R$ ${activeOrders.length > 0 ? (totalRevenue / activeOrders.length).toFixed(2) : '0.00'}`);
    reportLines.push('Status dos pedidos:');
    Object.entries(statusCount).forEach(([status, count]) => {
      reportLines.push(`  - ${status}: ${count}`);
    });
    reportLines.push('');
    reportLines.push('--- Itens mais vendidos ---');
    if (sortedItems.length === 0) {
      reportLines.push('Nenhum item vendido.');
    } else {
      sortedItems.forEach((item, index) => {
        reportLines.push(`  ${index + 1}. ${item.name} — Quantidade: ${item.quantity}, Receita: R$ ${item.revenue.toFixed(2)}`);
      });
    }
    reportLines.push('');
    reportLines.push('--- Pedidos ---');
    activeOrders.forEach((order, idx) => {
      reportLines.push(`Pedido ${idx + 1} - #${order.numero_pedido}`);
      reportLines.push(`Cliente: ${order.cliente_nome}`);
      reportLines.push(`WhatsApp: ${order.cliente_whatsapp}`);
      reportLines.push(`Endereço: ${order.cliente_endereco}`);
      if (order.cliente_bairro) reportLines.push(`Bairro: ${order.cliente_bairro}`);
      reportLines.push(`Status: ${order.status}`);
      reportLines.push(`Total: R$ ${Number(order.total || 0).toFixed(2)}`);
      reportLines.push(`Taxa de entrega: R$ ${Number(order.taxa_entrega || 0).toFixed(2)}`);
      reportLines.push(`Desconto: R$ ${Number(order.desconto || 0).toFixed(2)}`);
      reportLines.push(`Criado em: ${order.criado_em}`);
      const itens = Array.isArray(order.itens) ? order.itens : [];
      if (itens.length > 0) {
        reportLines.push('Itens:');
        itens.forEach((item: any) => {
          const name = String(item.name || item.title || 'Item desconhecido');
          const qty = Number(item.quantity || item.qtd || 1);
          const price = Number(item.price || 0);
          reportLines.push(`  - ${name} x${qty} — R$ ${price.toFixed(2)}`);
        });
      }
      reportLines.push('');
    });

    const filename = `relatorio_pedidos_${currentStore.slug}_${new Date().toISOString().slice(0,10)}.txt`;
    downloadFile(reportLines.join('\n'), filename, 'text/plain');
    showToast('Relatório de pedidos salvo com sucesso!', 'success');
  };

  const handlePrintDayReport = () => {
    if (!currentStore) return;
    if (!orders || orders.length === 0) {
      showToast('Não há pedidos para imprimir.', 'error');
      return;
    }

    const activeOrders = orders.filter(o => o.status !== 'cancelado');
    const totalRevenue = activeOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const totalDelivery = activeOrders.reduce((sum, order) => sum + Number(order.taxa_entrega || 0), 0);
    const totalDiscount = activeOrders.reduce((sum, order) => sum + Number(order.desconto || 0), 0);
    const statusCount = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const itemStats: Record<string, { quantity: number; revenue: number }> = {};
    activeOrders.forEach((order) => {
      const itens = Array.isArray(order.itens) ? order.itens : [];
      itens.forEach((item: any) => {
        const name = String(item.name || item.title || 'Item desconhecido');
        const qty = Number(item.quantity || item.qtd || 1);
        const price = Number(item.price || 0);

        if (!itemStats[name]) {
          itemStats[name] = { quantity: 0, revenue: 0 };
        }
        itemStats[name].quantity += qty;
        itemStats[name].revenue += price * qty;
      });
    });

    const sortedItems = Object.entries(itemStats)
      .sort(([, a], [, b]) => b.quantity - a.quantity)
      .map(([name, stats]) => ({ name, ...stats }));

    const orderBlocks = activeOrders.map((order, idx) => {
      const itens = Array.isArray(order.itens) ? order.itens : [];
      const itemRows = itens.map((item: any) => {
        const name = String(item.name || item.title || 'Item desconhecido');
        const qty = Number(item.quantity || item.qtd || 1);
        const price = Number(item.price || 0).toFixed(2);
        return `<tr><td>${name}</td><td>${qty}</td><td>R$ ${price}</td></tr>`;
      }).join('');

      return `
        <div class="order-block">
          <h3>Pedido #${order.numero_pedido}</h3>
          <p><strong>Cliente:</strong> ${order.cliente_nome}</p>
          <p><strong>WhatsApp:</strong> ${order.cliente_whatsapp}</p>
          <p><strong>Endereço:</strong> ${order.cliente_endereco}${order.cliente_bairro ? ' - ' + order.cliente_bairro : ''}</p>
          <p><strong>Status:</strong> ${order.status}</p>
          <p><strong>Total:</strong> R$ ${Number(order.total || 0).toFixed(2)}</p>
          <table class="items-table">
            <thead>
              <tr><th>Item</th><th>Qtd</th><th>Preço</th></tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
        </div>
      `;
    }).join('<div class="section-divider"></div>');

    const html = `<!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Pedidos - ${currentStore.nome}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 24px; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            h2 { font-size: 18px; margin: 20px 0 8px; }
            h3 { font-size: 16px; margin: 16px 0 8px; }
            p { margin: 4px 0; }
            .summary, .section { margin-bottom: 20px; }
            .items-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            .items-table th, .items-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            .section-divider { margin: 24px 0; border-top: 1px dashed #ccc; }
            .order-block { page-break-inside: avoid; }
            @media print {
              body { padding: 12mm; }
              .section-divider { display: block; page-break-after: always; }
            }
          </style>
        </head>
        <body>
          <h1>Relatório de Pedidos</h1>
          <p><strong>Loja:</strong> ${currentStore.nome}</p>
          <p><strong>Slug:</strong> ${currentStore.slug}</p>
          <p><strong>Gerado em:</strong> ${new Date().toLocaleString()}</p>
          <div class="summary">
            <h2>Resumo</h2>
            <p>Total de pedidos: ${activeOrders.length}</p>
            <p>Receita total: R$ ${totalRevenue.toFixed(2)}</p>
            <p>Taxa de entrega total: R$ ${totalDelivery.toFixed(2)}</p>
            <p>Desconto total: R$ ${totalDiscount.toFixed(2)}</p>
            <p>Ticket médio: R$ ${activeOrders.length > 0 ? (totalRevenue / activeOrders.length).toFixed(2) : '0.00'}</p>
            <p>Status dos pedidos: ${Object.entries(statusCount).map(([status, count]) => `${status}: ${count}`).join(' | ')}</p>
          </div>
          <div class="summary">
            <h2>Itens mais vendidos</h2>
            ${sortedItems.length === 0 ? '<p>Nenhum item vendido.</p>' : `<ul>${sortedItems.map(item => `<li>${item.name} — Qtd: ${item.quantity} — Receita: R$ ${item.revenue.toFixed(2)}</li>`).join('')}</ul>`}
          </div>
          <div class="section">
            <h2>Pedidos</h2>
            ${orderBlocks}
          </div>
        </body>
      </html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.overflow = 'hidden';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      showToast('Não foi possível iniciar a impressão.', 'error');
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    const attemptPrint = () => {
      if (!iframe.contentWindow) return;
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (error) {
        console.warn('Falha ao iniciar a impressão automaticamente:', error);
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 500);
      }
    };

    if (iframeDoc.readyState === 'complete') {
      attemptPrint();
    } else {
      iframe.onload = attemptPrint;
      setTimeout(attemptPrint, 700);
    }
  };

  const getResetKey = (storeId: string) => `pedifacil_store_reset_${storeId}`;

  const getResetTimestamp = (storeId: string) => {
    return localStorage.getItem(getResetKey(storeId));
  };

  const getEffectiveResetTimestamp = (storeId: string, dbResetDate?: string | null) => {
    const localTs = getResetTimestamp(storeId);
    if (!localTs && !dbResetDate) return null;
    if (!localTs) return dbResetDate || null;
    if (!dbResetDate) return localTs;
    return new Date(localTs) > new Date(dbResetDate) ? localTs : dbResetDate;
  };

  const handleRestartDay = async () => {
    if (!currentStore) return;
    const confirmRestart = window.confirm('Deseja realmente reiniciar o dia? Isso irá zerar os pedidos locais e métricas atuais do painel.');
    if (!confirmRestart) return;

    const newResetIso = new Date().toISOString();

    localStorage.setItem(getResetKey(currentStore.id), newResetIso);
    localStorage.removeItem(`pedifacil_local_orders_${currentStore.id}`);
    setOrders([]);
    setActiveAlarmPedidosIds([]);

    try {
      await supabase.rpc('resetar_faturamento_diario');
    } catch (e) {
      console.warn('Aviso RPC resetar_faturamento_diario:', e);
    }

    try {
      await supabase
        .from('lojas')
        .update({
          faturamento_hoje: 0,
          pedidos_hoje: 0,
          data_ultimo_reset: newResetIso
        })
        .eq('id', currentStore.id);
    } catch (e) {
      console.warn('Aviso ao atualizar data_ultimo_reset:', e);
    }

    showToast('Dia encerrado com sucesso! Métricas e pedidos foram zerados.', 'success');
  };

  // 🏪 CATEGORIES FUNCTIONS
  const handleOpenCatModal = (cat: Category | null = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatName(cat.name);
    } else {
      setEditingCategory(null);
      setCatName('');
    }
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categorias')
          .update({ nome: catName.trim() })
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categorias')
          .insert([{
            id: crypto.randomUUID(),
            loja_id: currentStore.id,
            nome: catName.trim(),
            ordem: categories.length + 1,
            ativo: true
          }]);
        if (error) throw error;
      }
      showToast('Categoria gravada com sucesso.', 'success');
      
      // 📡 Notificar CardapioPublico sobre mudança de categorias
      notifyCardapioUpdate('categories');
      
      setCategoryModalOpen(false);
      loadStoreConfigurations();
    } catch (err) {
      showToast('Erro ao processar alteração.', 'error');
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Excluir esta categoria? Todos os produtos vinculados poderão ficar sem categoria.')) return;
    try {
      const { error } = await supabase
        .from('categorias')
        .delete()
        .eq('id', catId);
      if (error) throw error;
      showToast('Categoria excluída.', 'success');
      
      // 📡 Notificar CardapioPublico sobre mudança de categorias
      notifyCardapioUpdate('categories');
      
      loadStoreConfigurations();
    } catch (err) {
      showToast('Impossível deletar.', 'error');
    }
  };

  // 🍔 PRODUCTS FUNCTIONS

  const handleDeleteProduct = async (prodId: string) => {
    if (!confirm('Deseja excluir este produto permanentemente?')) return;
    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', prodId);
      if (error) throw error;
      deleteProductMeta(prodId);
      showToast('Produto deletado.', 'success');
      
      // 📡 Notificar CardapioPublico sobre mudança de produtos
      notifyCardapioUpdate('products');
      
      loadStoreConfigurations();
    } catch (err) {
      showToast('Erro ao remover.', 'error');
    }
  };

  // 🏡 NEIGHBORHOOD DELIVERIES
  const handleOpenBairroModal = (b: Bairro | null = null) => {
    if (b) {
      setEditingBairro(b);
      setBName(b.nome);
      setBTax(b.taxa);
    } else {
      setEditingBairro(null);
      setBName('');
      setBTax(0);
    }
    setBairroModalOpen(true);
  };

  const handleSaveBairro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bName.trim()) return;

    try {
      if (editingBairro) {
        const { error } = await supabase
          .from('taxas_entrega')
          .update({ bairro: bName.trim(), taxa: Number(bTax) })
          .eq('id', editingBairro.id);
        if (error) throw error;
      } else {
        await supabase
          .from('taxas_entrega')
          .insert([{
            id: crypto.randomUUID(),
            loja_id: currentStore.id,
            bairro: bName.trim(),
            taxa: Number(bTax)
          }]);
      }
      showToast('Taxas de bairro gravada.', 'success');
      setBairroModalOpen(false);
      loadStoreConfigurations();
    } catch (err) {
      showToast('Erro ao salvar bairro.', 'error');
    }
  };

  const handleDeleteBairro = async (bId: string) => {
    try {
      await supabase.from('taxas_entrega').delete().eq('id', bId);
      showToast('Bairro removido.', 'success');
      loadStoreConfigurations();
    } catch (err) {}
  };

  // 🎟️ COUPONS
  const handleOpenCouponModal = (c: Cupom | null = null) => {
    if (c) {
      setEditingCoupon(c);
      setCpCode(c.codigo);
      setCpType(c.tipo);
      setCpVal(c.valor);
      setCpMin(c.min_compra || 0);
    } else {
      setEditingCoupon(null);
      setCpCode('');
      setCpType('percentual');
      setCpVal(0);
      setCpMin(0);
    }
    setCouponModalOpen(true);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpCode.trim()) return;

    try {
      const payload = {
        codigo: cpCode.trim().toUpperCase(),
        tipo: cpType,
        valor: Number(cpVal),
        valor_minimo: Number(cpMin)
      };

      if (editingCoupon) {
        await supabase.from('cupons').update(payload).eq('id', editingCoupon.id);
      } else {
        await supabase.from('cupons').insert([{
          id: crypto.randomUUID(),
          loja_id: currentStore.id,
          quantidade_maxima: 999,
          quantidade_usada: 0,
          ativo: true,
          ...payload
        }]);
      }
      showToast('Cupom cadastrado com sucesso!', 'success');
      setCouponModalOpen(false);
      loadStoreConfigurations();
    } catch (err) {}
  };

  const handleDeleteCoupon = async (cpId: string) => {
    await supabase.from('cupons').delete().eq('id', cpId);
    showToast('Cupom excluído.', 'success');
    loadStoreConfigurations();
  };

  // 📝 ORDERS CONTROLS
  const handleUpdateOrderStatus = async (ordId: string, nextStatus: string) => {
    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: nextStatus })
        .eq('id', ordId);
      if (error) throw error;
      
      // Clear active alarm instantly when user accepts/rejects the order
      setActiveAlarmPedidosIds(prev => prev.filter(id => id !== ordId));
      
      showToast('Status do pedido atualizado!', 'success');
      loadStoreConfigurations();
    } catch (err) {}
  };

  const buildPrintHtml = (order: Order, copyTitle: string) => {
    const itemsHtml = Array.isArray(order.itens) ? order.itens.map((item: any, idx: number) => {
      const qty = Number(item.quantity || item.qtd || 1);
      const title = item.name || item.titulo || item.title || 'Item';
      const price = Number(item.price || 0);
      const unitPrice = qty > 0 ? (price / qty) : price;
      const p = item.personalization || {};
      const lines: string[] = [];

      if (p.sao_pao) lines.push(`🍞 Pão: ${p.sao_pao}`);
      if (p.carne_tipo) lines.push(`🥩 Carne: ${p.carne_tipo}`);
      if (p.carne_ponto) lines.push(`🔥 Ponto: ${p.carne_ponto}`);
      if (p.add_bacon) lines.push('+ Bacon Rústico');
      if (p.add_cheddar) lines.push('+ Cheddar Cremoso');
      if (p.add_ovo) lines.push('+ Ovo Frito');
      if (p.add_catupiry) lines.push('+ Catupiry Original');
      if (p.add_hamburguer) lines.push('+ Hambúrguer Extra');
      if (p.add_cebola_caramelizada) lines.push('+ Cebola Caramelizada');
      if (p.add_onion_rings) lines.push('+ Onion Rings');
      if (p.add_molho_especial) lines.push('+ Molho Especial');
      if (p.add_batata_extra) lines.push('+ Batata Frita Extra');
      if (p.remove_cebola) lines.push('- Sem cebola');
      if (p.remove_tomate) lines.push('- Sem tomate');
      if (p.remove_alface) lines.push('- Sem alface');
      if (p.remove_picles) lines.push('- Sem picles');
      if (p.remove_molho) lines.push('- Sem molho');
      if (p.remove_queijo) lines.push('- Sem queijo');
      if (item.observacao) lines.push(`📝 Obs: ${item.observacao}`);

      return `
        <div style="margin-bottom:12px; padding-bottom:8px; border-bottom:1px dashed #ccc;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; font-size:14px; font-weight:800;">
            <span>[ ${qty}x ] ${title}</span>
            <span>R$ ${price.toFixed(2)}</span>
          </div>
          ${qty > 1 ? `<div style="font-size:11px; color:#666; margin-top:2px;">(${qty}x de R$ ${unitPrice.toFixed(2)})</div>` : ''}
          ${lines.length > 0 ? `<div style="margin-left:8px; margin-top:4px; font-size:12px; line-height:1.4; color:#333;">${lines.join('<br/>')}</div>` : ''}
        </div>
      `;
    }).join('') : '<div style="font-size:12px;color:#444;">Nenhum item encontrado.</div>';

    return `
      <div style="padding:16px; border:1px solid #222; margin-bottom:24px; font-family: monospace, sans-serif;">
        <div style="text-align:center; margin-bottom:12px;">
          <div style="font-size:18px; font-weight:900; text-transform:uppercase;">${copyTitle}</div>
          <div style="font-size:16px; font-weight:800; margin-top:4px;">PEDIDO #${order.numero_pedido}</div>
          <div style="font-size:11px; color:#555;">${new Date(order.criado_em || '').toLocaleString('pt-BR')}</div>
        </div>
        
        <div style="border-top:1px dashed #444; border-bottom:1px dashed #444; padding:8px 0; margin-bottom:12px; font-size:12px; line-height:1.5;">
          <div><strong>CLIENTE:</strong> ${order.cliente_nome}</div>
          <div><strong>WHATSAPP:</strong> ${order.cliente_whatsapp}</div>
          <div><strong>ENDEREÇO:</strong> ${order.cliente_endereco}</div>
          ${order.cliente_bairro ? `<div><strong>BAIRRO:</strong> ${order.cliente_bairro}</div>` : ''}
          ${order.cliente_complemento ? `<div><strong>COMPLEMENTO:</strong> ${order.cliente_complemento}</div>` : ''}
          ${order.observacoes ? `<div style="color:#b45309; margin-top:4px;"><strong>OBS DO PEDIDO:</strong> ${order.observacoes}</div>` : ''}
          <div style="margin-top:4px;"><strong>PAGAMENTO:</strong> ${order.forma_pagamento}${order.troco ? ` | <strong>TROCO P/:</strong> R$ ${order.troco}` : ''}</div>
        </div>

        <div style="margin-bottom:8px; font-size:13px; font-weight:800;">PRODUTOS DO PEDIDO:</div>
        ${itemsHtml}

        <div style="margin-top:12px; font-size:12px; line-height:1.6;">
          <div style="display:flex; justify-content:space-between;">
            <span>Subtotal:</span>
            <span>R$ ${Number(order.subtotal || 0).toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between;">
            <span>Taxa de Entrega:</span>
            <span>${Number(order.taxa_entrega || 0) === 0 ? 'GRÁTIS' : `R$ ${Number(order.taxa_entrega).toFixed(2)}`}</span>
          </div>
          ${Number(order.desconto || 0) > 0 ? `
          <div style="display:flex; justify-content:space-between; color:#b91c1c;">
            <span>Desconto:</span>
            <span>- R$ ${Number(order.desconto).toFixed(2)}</span>
          </div>` : ''}
          <div style="display:flex; justify-content:space-between; margin-top:8px; padding-top:6px; border-top:1px solid #222; font-size:16px; font-weight:900;">
            <span>TOTAL:</span>
            <span>R$ ${Number(order.total || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrintOrder = (order: Order) => {
    if (typeof window === 'undefined') return;

    const html = `<!DOCTYPE html>
      <html>
        <head>
          <title>Pedido #${order.numero_pedido}</title>
          <style>
            @media print {
              .page-break { display: block; page-break-after: always; break-after: page; }
            }
            body { font-family: Arial, sans-serif; color: #111; padding: 20px; }
            .copy-title { margin-bottom: 8px; font-size: 18px; font-weight: 800; }
            .order-section { margin-bottom: 24px; }
            .order-section hr { border: 1px dashed #444; margin: 24px 0; }
            .order-line { margin-bottom: 8px; }
          </style>
        </head>
        <body>
          ${buildPrintHtml(order, 'CÓPIA RESTAURANTE')}
          <div class="page-break"></div>
          ${buildPrintHtml(order, 'CÓPIA ENTREGA')}
        </body>
      </html>`;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.overflow = 'hidden';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) {
      showToast('Não foi possível iniciar a impressão.', 'error');
      document.body.removeChild(iframe);
      return;
    }

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    const attemptPrint = () => {
      if (!iframe.contentWindow) return;
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } catch (error) {
        console.warn('Falha ao iniciar impressão automaticamente:', error);
      } finally {
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 500);
      }
    };

    if (iframeDoc.readyState === 'complete') {
      attemptPrint();
    } else {
      iframe.onload = attemptPrint;
      setTimeout(attemptPrint, 700);
    }
  };

  // ⚙️ SAVE STORE ROOT CONFIGURATION - Hamburger Checklist Compliant
  const handleSaveGeneralConfig = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      let logoUrl = cfgLogo;
      let bannerUrl = cfgBanner;

      const uploadFile = async (file: File, folder: string) => {
        const safeName = `${currentStore.id}-${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
        const filePath = `${folder}/${safeName}`;
        const { error: uploadError } = await supabase
          .storage
          .from('uploads')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase
          .storage
          .from('uploads')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) {
          throw new Error('Falha ao gerar URL pública do arquivo');
        }

        return publicUrlData.publicUrl;
      };

      if (cfgLogoFile) {
        logoUrl = await uploadFile(cfgLogoFile, 'logos');
        setCfgLogo(logoUrl);
      }

      if (cfgBannerFile) {
        bannerUrl = await uploadFile(cfgBannerFile, 'banners');
        setCfgBanner(bannerUrl);
      }

      // Auto-generate normalized slug from store name for public URL access
      const normalizedSlug = cfgName
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');

      // 1. Save to Supabase (Nuvem)
      const { error } = await supabase
        .from('lojas')
        .update({
          nome: cfgName.trim(),
          slug: normalizedSlug || currentStore.slug,
          slogan: cfgSlogan.trim(),
          descricao: cfgDesc.trim(),
          logo_url: logoUrl.trim() || null,
          banner_url: bannerUrl.trim() || null,
          banner_promo_url: cfgBannerPromo.trim() || null,
          telefone: cfgPhone.trim() || null,
          whatsapp: cfgWhatsapp.trim() || null,
          instagram: cfgInstagram.trim() || null,
          cep: cfgCep.trim() || null,
          rua: cfgRua.trim() || null,
          numero: cfgNumero.trim() || null,
          bairro: cfgBairro.trim() || null,
          cidade: cfgCidade.trim() || null,
          estado: cfgEstado.trim() || null,
          complemento: cfgComplemento.trim() || null,
          referencia: cfgReferencia.trim() || null,
          mensagem_topo: cfgMsgTopo.trim() || null,
          mensagem_rodape: cfgMsgRodape.trim() || null,
          cor_primaria: cfgCorPrimaria,
          cor_secundaria: cfgCorSecundaria,
          tempo_entrega_min: Number(cfgPrepMin),
          tempo_entrega_max: Number(cfgPrepMax),
          taxa_entrega_padrao: Number(cfgDeliveryFeePadrao),
          pedido_minimo: Number(cfgMinVal),
          frete_gratis_acima: Number(cfgFreeVal),
          aberto: cfgOpen,
          horarios: cfgHorarios,
          metodos_pagamento: cfgMetodosPagamento
        })
        .eq('id', currentStore.id);

      if (error) console.warn('Supabase DB Update warning (Normal if columns customized/not present):', error);

      // 2. Clear & Update Login state
      const updatedStoreSession = {
        ...currentStore,
        nome: cfgName,
        name: cfgName,
        slug: normalizedSlug || currentStore.slug,
        slogan: cfgSlogan,
        descricao: cfgDesc,
        description: cfgDesc,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        banner_promo_url: cfgBannerPromo,
        phone: cfgPhone,
        whatsapp: cfgWhatsapp,
        instagram: cfgInstagram,
        facebook: cfgFacebook,
        email: cfgEmail,
        cep: cfgCep,
        rua: cfgRua,
        numero: cfgNumero,
        bairro: cfgBairro,
        cidade: cfgCidade,
        estado: cfgEstado,
        complemento: cfgComplemento,
        referencia: cfgReferencia,
        mensagem_topo: cfgMsgTopo,
        mensagem_rodape: cfgMsgRodape,
        cor_primaria: cfgCorPrimaria,
        cor_secundaria: cfgCorSecundaria,
        tempo_entrega_min: cfgPrepMin,
        tempo_entrega_max: cfgPrepMax,
        taxa_entrega_padrao: cfgDeliveryFeePadrao,
        pedido_minimo: cfgMinVal,
        frete_gratis_acima: cfgFreeVal,
        aberto: cfgOpen,
        favicon: cfgFavicon,
        horarios: cfgHorarios,
        metodos_pagamento: cfgMetodosPagamento
      };
      
      setCurrentStore(updatedStoreSession);
      localStorage.setItem('pedifacil_store_admin_logged_in', JSON.stringify(updatedStoreSession));

      // 3. Save to Local fallback db pedifacil_db_stores, so public-facing menu gets updated INSTANTLY!
      const localStores = JSON.parse(localStorage.getItem('pedifacil_db_stores') || '[]');
      const index = localStores.findIndex((s: any) => s.id === currentStore.id);
      if (index >= 0) {
        localStores[index] = updatedStoreSession;
      } else {
        localStores.push(updatedStoreSession);
      }
      localStorage.setItem('pedifacil_db_stores', JSON.stringify(localStores));

      // 4. Save to specific extras config storage
      const extras = {
        horarios: cfgHorarios,
        metodos_pagamento: cfgMetodosPagamento,
        fallback_bairro_msg: cfgFallbackBairroMsg,
        sms_verification_required: cfgSmsVerificationRequired,
        fid_brinde_ativo: fidBrindeAtivo,
        fid_brinde_txt: fidBrindeTxt,
        fid_meta_pedidos: fidMetaPedidos,
        fid_pts_por_real: fidPtsPorReal,
        fid_cashback_pct: fidCashbackPct,
        fid_bronze_min: fidBronzeMin,
        fid_prata_min: fidPrataMin,
        fid_ouro_min: fidOuroMin,
        campaign_messages: campaignMessages
      };
      localStorage.setItem(`pedifacil_store_extras_${currentStore.id}`, JSON.stringify(extras));

      // 5. Notificar CardapioPublico via BroadcastChannel (atualização instantânea na mesma aba e outras abas)
      try {
        const bc = new BroadcastChannel('pedifacil_store_update');
        bc.postMessage({
          type: 'store_config_updated',
          horarios: cfgHorarios,
          metodos_pagamento: cfgMetodosPagamento,
          storeData: updatedStoreSession
        });
        bc.close();
      } catch (e) {
        // BroadcastChannel não suportado; fallback via storage event
        window.dispatchEvent(new Event('storage'));
      }

      showToast('Configurações salvas e atualizadas no Cardápio! 🥞🍔', 'success');
      loadStoreConfigurations();
    } catch (err) {
      showToast('Erro ao atualizar configurações.', 'error');
    }
  };

  // Financial Summary from active store orders + Adjustable Owner testing value
  const storeFinancials = (() => {
    const activeOrders = orders.filter(o => o.status !== 'cancelado');
    const income = activeOrders.reduce((acc, cur) => acc + Number(cur.total || 0), 0);
    const deliveredCount = activeOrders.filter(o => o.status === 'entregue').length;
    return {
      revenue: income + cfgFaturamentoExtra,
      count: orders.length + (cfgFaturamentoExtra > 0 ? Math.round(cfgFaturamentoExtra / 42.5) : 0),
      deliveredCount
    };
  })();

  // Hourly distribution computed from real store orders
  const hourlyFlowData = (() => {
    const activeOrders = orders.filter(o => o.status !== 'cancelado');
    const bins = [
      { h: '18:00h - 19:00h', start: 18, end: 19, orders: 0, pct: 0, style: 'bg-slate-750', isMax: false },
      { h: '19:00h - 20:00h', start: 19, end: 20, orders: 0, pct: 0, style: 'bg-orange-500/60', isMax: false },
      { h: '20:00h - 21:00h', start: 20, end: 21, orders: 0, pct: 0, style: 'bg-orange-500', isMax: false },
      { h: '21:00h - 22:00h', start: 21, end: 22, orders: 0, pct: 0, style: 'bg-orange-500/50', isMax: false },
      { h: '22:00h - 23:00h', start: 22, end: 23, orders: 0, pct: 0, style: 'bg-slate-755', isMax: false },
    ];

    bins.forEach(bin => {
      bin.orders = activeOrders.filter(o => {
        try {
          const date = new Date(o.criado_em);
          const hour = date.getHours();
          return hour >= bin.start && hour < bin.end;
        } catch {
          return false;
        }
      }).length;
    });

    const maxOrders = Math.max(...bins.map(b => b.orders));
    bins.forEach(bin => {
      bin.pct = maxOrders > 0 ? (bin.orders / maxOrders) * 100 : 0;
      bin.isMax = maxOrders > 0 && bin.orders === maxOrders;
    });

    return bins;
  })();

  const hottestHourLabel = (() => {
    const peak = hourlyFlowData.find(bin => bin.isMax && bin.orders > 0);
    if (!peak) return 'Sem pedidos ainda';
    return `${peak.h} — ${peak.orders} pedido${peak.orders === 1 ? '' : 's'}`;
  })();

  // Product sales ranking computed dynamically or defaulted empty style for matching actual user products
  const productSalesRanking = (() => {
    const counts: Record<string, number> = {};
    const activeOrders = orders.filter(o => o.status !== 'cancelado');
    activeOrders.forEach(order => {
      const itemsList = Array.isArray(order.itens) ? order.itens : [];
      itemsList.forEach((item: any) => {
        const pName = item.name || item.titulo || '';
        if (pName) {
          counts[pName] = (counts[pName] || 0) + Number(item.quantity || item.qtd || 1);
        }
      });
    });

    // Take current products to show they are zeroed out and ready
    const list = products.slice(0, 4).map((prod: any) => {
      const name = prod.nome || prod.name || '';
      return {
        name,
        price: Number(prod.preco || prod.price || 0),
        qty: counts[name] || 0,
        rating: 5.0,
        img: prod.imagem || prod.image || 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200&auto=format&fit=crop'
      };
    });

    // Add any order items not in product list slice
    Object.entries(counts).forEach(([name, qty]) => {
      if (!list.some(item => item.name === name)) {
        list.push({
          name,
          price: 0,
          qty,
          rating: 5.0,
          img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=200&auto=format&fit=crop'
        });
      }
    });

    // Sort by qty desc
    return list.sort((a, b) => b.qty - a.qty).slice(0, 4);
  })();

  if (!isLoggedIn || !currentStore) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white" id="owner-login">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-950 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6"
        >
          <div className="flex flex-col items-center space-y-2 text-center">
            <div className="bg-sky-500/10 p-3 rounded-2xl border border-sky-500/20 text-sky-450">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">PAINEL DO LOJISTA</h1>
            <p className="text-slate-400 text-sm">Cadastre seus produtos e monte seu cardápio</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">E-mail Cadastrado</label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: joao@burger.com"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1">Senha de Acesso</label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-sky-500 text-sm"
                required
              />
            </div>

            {loginError && (
              <p className="text-red-400 text-xs text-center font-medium bg-red-950/25 py-2 px-3 border border-red-500/10 rounded-xl flex items-center gap-2 justify-center">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {loginError}
              </p>
            )}

            <button 
              type="submit"
              className="w-full bg-sky-500 hover:bg-sky-600 text-black font-extrabold rounded-xl py-3 text-sm transition-all shadow-lg shadow-sky-500/10"
            >
              Entrar em Minha Conta
            </button>
          </form>

          <p className="text-center text-xs text-slate-600">
            Acesso concedido através do Administrador Master para parceiros do PediFácil.
          </p>
        </motion.div>
      </div>
    );
  }

  // Blocking Check if paused/blocked
  if (storeStatus === 'blocked') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-white text-center">
        <div className="max-w-md bg-slate-950 border border-red-500/25 p-8 rounded-3xl space-y-4">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-red-400">🚨 ESTABELECIMENTO SUSPENSO</h2>
          <p className="text-sm text-slate-400">
            Este cardápio e painel foram temporariamente bloqueados pelo administrador geral por razões pendentes.
          </p>
          <p className="text-xs text-slate-500">Por favor, entre em contato com o suporte geral para realizar sua liberação.</p>
          <button onClick={handleLogout} className="bg-slate-900 border border-slate-800 text-slate-300 rounded-xl px-4 py-2 text-xs">Deslogar</button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-slate-950 text-white font-sans flex flex-col relative" 
      id="owner-workspace"
      onClick={handleUserInteractionUnlockAudio}
    >
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 bg-slate-900 border border-slate-800 text-white px-5 py-4 rounded-xl shadow-2xl animate-bounce">
          <CheckCircle2 className="text-sky-400 w-5 h-5 animate-pulse" />
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="bg-slate-900 border-b border-slate-850 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          
          <div className="flex items-center gap-3">
            <div className="bg-sky-500 text-black p-2 rounded-xl font-bold">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-1.5">
                {currentStore.nome} 
                <span className="text-[10px] bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded px-2 font-medium">Lojista</span>
              </h1>
                      <a
                href={`${window.location.origin}/#${(() => {
                  const rawSlug = String(currentStore.slug || '').trim().toLowerCase();
                  const rawName = String(currentStore.nome || currentStore.name || '').trim().toLowerCase();
                  const source = rawSlug && rawSlug !== 'burger-do-gordo' ? rawSlug : rawName || rawSlug;
                  return source
                    .normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '')
                    .replace(/[^a-z0-9\s-]/g, '')
                    .replace(/\s+/g, '-')
                    .replace(/-+/g, '-')
                    .replace(/^-+|-+$/g, '');
                })()}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-slate-450 hover:underline flex items-center gap-1"
              >
                Link: /{currentStore.slug}
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button 
              onClick={loadStoreConfigurations} 
              className="bg-slate-800 text-xs hover:bg-slate-700 px-3 py-2 rounded-lg border border-slate-750 text-slate-300"
            >
              Atualizar
            </button>
            <button 
              onClick={() => setEncerrarDiaModalOpen(true)}
              className="bg-orange-600 text-xs hover:bg-orange-700 px-3 py-2 rounded-lg border border-orange-600 text-white flex items-center gap-1.5 font-semibold"
            >
              <X className="w-4 h-4" />
              Encerrar Dia
            </button>

            <button 
              onClick={handleToggleStoreOpen}
              className={`text-xs px-3 py-2 rounded-lg font-semibold shadow-sm transition ${cfgOpen ? 'bg-red-500 border-red-500 text-white hover:bg-red-600' : 'bg-emerald-500 border-emerald-500 text-white hover:bg-emerald-600'}`}
            >
              {cfgOpen ? 'Fechar Loja' : 'Abrir Loja'}
            </button>
            <button 
              onClick={handleLogout}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg px-3 py-2 text-xs flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Deslogar
            </button>
          </div>

        </div>
      </header>
 
      {/* MODAL ENCERRAR DIA */}
      {encerrarDiaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-white font-black text-lg">Encerrar Dia</h2>
                <p className="text-orange-100 text-xs mt-0.5">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>

              <button onClick={() => setEncerrarDiaModalOpen(false)} className="text-white/70 hover:text-white transition p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do dia */}
            <div className="px-6 py-4 border-b border-slate-800">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Resumo do Dia</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-emerald-400 font-black text-lg">{orders.filter(o => o.status !== 'cancelado').length}</p>
                  <p className="text-slate-400 text-[10px] font-semibold mt-0.5">Pedidos</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-sky-400 font-black text-lg">R${storeFinancials.revenue.toFixed(0)}</p>
                  <p className="text-slate-400 text-[10px] font-semibold mt-0.5">Faturamento</p>
                </div>
                <div className="bg-slate-800 rounded-xl p-3 text-center">
                  <p className="text-orange-400 font-black text-lg">{orders.filter(o => o.status === 'cancelado').length}</p>
                  <p className="text-slate-400 text-[10px] font-semibold mt-0.5">Cancelados</p>
                </div>
              </div>
            </div>

            {/* Ações */}
            <div className="px-6 py-5 space-y-3">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">O que deseja fazer?</p>

              {/* Baixar Dados */}
              <button
                onClick={() => {
                  handleExportDayReport();
                }}
                className="w-full bg-sky-600 hover:bg-sky-700 text-white rounded-xl px-4 py-3.5 flex items-center gap-3 transition group"
              >
                <div className="bg-sky-500/30 rounded-lg p-2 group-hover:bg-sky-500/50 transition">
                  <Upload className="w-5 h-5 text-sky-300" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Baixar Dados do Dia</p>
                  <p className="text-sky-200 text-xs mt-0.5">Salva arquivo com pedidos, faturamento e horários</p>
                </div>
              </button>

              {/* Imprimir Dados */}
              <button
                onClick={() => {
                  handlePrintDayReport();
                }}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl px-4 py-3.5 flex items-center gap-3 transition group"
              >
                <div className="bg-violet-500/30 rounded-lg p-2 group-hover:bg-violet-500/50 transition">
                  <Printer className="w-5 h-5 text-violet-300" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Imprimir Dados do Dia</p>
                  <p className="text-violet-200 text-xs mt-0.5">Abre relatório completo para impressão</p>
                </div>
              </button>

              {/* Divisor */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-slate-800"></div>
                <span className="text-slate-600 text-xs">ou encerre o dia</span>
                <div className="flex-1 h-px bg-slate-800"></div>
              </div>

              {/* Zerar Dia */}
              <button
                onClick={() => {
                  const confirmar = window.confirm(
                    '⚠️ Zerar o dia irá apagar todos os pedidos do painel e resetar o faturamento para R$ 0. Tem certeza?\n\nDica: Baixe ou imprima os dados antes de zerar!');
                  if (!confirmar) return;
                  handleRestartDay();
                  setEncerrarDiaModalOpen(false);
                }}
                className="w-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl px-4 py-3.5 flex items-center gap-3 transition group"
              >
                <div className="bg-red-500/20 rounded-lg p-2 group-hover:bg-red-500/30 transition">
                  <RefreshCw className="w-5 h-5 text-red-400" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Zerar Dia</p>
                  <p className="text-red-400/70 text-xs mt-0.5">Reseta pedidos e faturamento para zero</p>
                </div>
              </button>
            </div>

            {/* Rodapé */}
            <div className="px-6 pb-5">
              <button
                onClick={() => setEncerrarDiaModalOpen(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 text-sm font-semibold rounded-xl py-3 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BACKGROUND AUDIO UNLOCK PROMPT */}
      {!audioUnlocked && (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            handleUserInteractionUnlockAudio();
          }}
          className="bg-sky-500/10 border-b border-sky-500/20 text-sky-400 px-6 py-3 text-center text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer hover:bg-sky-500/15 transition-all font-sans"
        >
          <Sparkles className="w-4 h-4 animate-pulse shrink-0 text-sky-400" />
          <span>Controles de som ativados! Clique aqui para habilitar o toque de novos pedidos em segundo plano (outras abas).</span>
        </div>
      )}

      {/* BODY WORKSPACE AREA */}
      <div className="flex-grow max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* SIDE BAR NAVIGATION */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 space-y-4">
            
            {/* GRUPO PRINCIPAL */}
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-2">Análise & Pedidos</span>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveMenu('dashboard')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${activeMenu === 'dashboard' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  Painel Geral / Dash
                </button>

                <button 
                  onClick={() => setActiveMenu('orders')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${activeMenu === 'orders' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  Pedidos ({orders.length})
                </button>

                <button 
                  onClick={() => {
                    setActiveMenu('calendar');
                    if (currentStore?.id) {
                      loadCalendarMonthSummary(calendarMonth.year, calendarMonth.month);
                    }
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${activeMenu === 'calendar' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
                >
                  <Calendar className="w-4 h-4 shrink-0" />
                  Calendário & Filtro
                </button>

              </div>
            </div>

            {/* GRUPO DADOS */}
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-2">Empresa & Marca</span>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveMenu('settings')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${activeMenu === 'settings' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  Dados do Restaurante
                </button>
              </div>
            </div>

            {/* GRUPO CARDAPIO */}
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-2">Cardápio Hamburgueria</span>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveMenu('products')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${activeMenu === 'products' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  Produtos / Burgers ({products.length})
                </button>

                <button 
                  onClick={() => setActiveMenu('categories')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${activeMenu === 'categories' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
                >
                  <Grid className="w-4 h-4 shrink-0" />
                  Categorias ({categories.length})
                </button>

              </div>
            </div>

            {/* GRUPO CLIENTES & FIDELIDADE */}
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-2">Retenção de Clientes</span>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveMenu('recovery')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${activeMenu === 'recovery' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
                >
                  <Filter className="w-4 h-4 shrink-0" />
                  Recuperação WhatsApp
                </button>

                <button 
                  onClick={() => setActiveMenu('fid')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${activeMenu === 'fid' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  Fidelidade / Pontuação
                </button>
              </div>
            </div>

            {/* GRUPO ENTREGA */}
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block mb-2 px-2">Envio / Cupons</span>
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveMenu('coupons')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${activeMenu === 'coupons' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
                >
                  <Tag className="w-4 h-4 shrink-0" />
                  Cupons Promocionais ({cupons.length})
                </button>

                <button 
                  onClick={() => setActiveMenu('neighborhoods')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${activeMenu === 'neighborhoods' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
                >
                  <MapPin className="w-4 h-4 shrink-0" />
                  Bairros de Entrega ({bairros.length})
                </button>

                <button 
                  onClick={() => setActiveMenu('sounds')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all flex items-center gap-2.5 ${activeMenu === 'sounds' ? 'bg-sky-500 text-black' : 'text-slate-400 hover:text-white hover:bg-slate-850'}`}
                >
                  <Volume2 className="w-4 h-4 shrink-0" />
                  Sons de Notificação
                </button>
              </div>
            </div>

          </div>

          {/* Quick Stats Widget */}
          <div className="bg-slate-900 border border-slate-850 rounded-2xl p-4 text-center space-y-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest block font-bold">Faturamento Ajustado</span>
            <span className="text-2xl font-black text-emerald-450 text-emerald-400 block pt-1">R$ {storeFinancials.revenue.toFixed(2)}</span>
            <span className="text-[10px] text-slate-400 block">{storeFinancials.count} pedidos totais</span>
          </div>
        </div>

        {/* MAIN WORK WINDOW */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* loading helper */}
          {loading && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center flex items-center justify-center gap-2.5 text-xs text-sky-400 font-semibold mb-2">
              <RefreshCw className="w-4 h-4 animate-spin" /> Carregando base do Supabase...
            </div>
          )}

          {/* ASSINATURA INDICAÇÃO */}
          {(() => {
            const getRemainingDays = () => {
              if (!currentStore || !currentStore.vencimento) return 15; // default trial secure fallback
              const expiry = new Date(currentStore.vencimento).getTime();
              const diff = expiry - Date.now();
              return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
            };
            const remainingDays = getRemainingDays();
            if (remainingDays <= 5 && remainingDays > 0) {
              return (
                <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 p-4 rounded-2xl flex items-center gap-3 text-xs shadow-md">
                  <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 animate-pulse" />
                  <div>
                    <span className="font-extrabold text-amber-400 block mb-0.5">AVISO DE COBRANÇA DE ASSINATURA</span>
                    <p>Sua licença expira em <strong className="font-black text-amber-200 underline">{remainingDays} dias</strong>. Renove agora por apenas <strong className="font-black text-amber-200">R$ 49,90/mês</strong> e mantenha seu cardápio Hamburger ativo e integrado!</p>
                  </div>
                </div>
              );
            }
            if (remainingDays <= 0) {
              return (
                <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-2xl flex items-center gap-3 text-xs shadow-md">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-rose-500 animate-bounce" />
                  <div>
                    <span className="font-extrabold text-rose-400 block mb-0.5 animate-pulse">AVISO DE ASSINATURA EXPIRADA</span>
                    <p>Licença expirada ou suspensa. Efetue o pagamento da mensalidade de <strong>R$ 49,90/mês</strong> por Pix para liberar novamente o envio de pedidos automáticos para o WhatsApp e salvar alterações na nuvem!</p>
                  </div>
                </div>
              );
            }
            return null;
          })()}
          {activeMenu === 'calendar' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 md:p-6 space-y-5 shadow-sm">
                
                {/* Header do Módulo */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
                      <Calendar className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-slate-900 font-black text-lg flex items-center gap-2 uppercase tracking-wide">
                        Calendário & Filtro de Vendas
                      </h2>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Escolha um dia específico ou um período para analisar e baixar o relatório completo
                      </p>
                    </div>
                  </div>

                  {/* Botão Baixar Dados */}
                  <button
                    type="button"
                    onClick={handleDownloadCalendarData}
                    disabled={calendarDayLoading}
                    className="bg-sky-500 hover:bg-sky-600 text-white font-black text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md hover:shadow-sky-500/20 transition-all shrink-0 active:scale-95 disabled:opacity-50"
                  >
                    {calendarDayLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Download className="w-4 h-4 text-white" />
                    )}
                    <span>
                      {calendarFilterMode === 'single'
                        ? `Baixar Dados do Dia (${calendarSingleDate.split('-').reverse().join('/')})`
                        : `Baixar Dados do Período`}
                    </span>
                  </button>
                </div>

                {/* Seletor de Modo & Entradas de Data */}
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    
                    {/* Toggle de Modo */}
                    <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl border border-slate-300/60">
                      <button
                        type="button"
                        onClick={() => setCalendarFilterMode('single')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          calendarFilterMode === 'single'
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        Dia Específico
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarFilterMode('range')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                          calendarFilterMode === 'range'
                            ? 'bg-sky-500 text-white shadow-sm'
                            : 'text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        Intervalo de Datas
                      </button>
                    </div>

                    {/* Inputs de Data */}
                    <div className="flex flex-wrap items-center gap-3">
                      {calendarFilterMode === 'single' ? (
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-bold text-slate-600 uppercase">Dia:</label>
                          <input
                            type="date"
                            value={calendarSingleDate}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                setCalendarSingleDate(val);
                                setCalendarSelectedDay(val);
                                handleLoadDayOrders(val);
                              }
                            }}
                            className="bg-white border border-slate-300 text-slate-900 font-extrabold text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500 shadow-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              setCalendarSingleDate(today);
                              setCalendarSelectedDay(today);
                              handleLoadDayOrders(today);
                            }}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase px-3 py-2 rounded-xl transition shadow-sm"
                          >
                            Hoje
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs font-bold text-slate-600">De:</label>
                            <input
                              type="date"
                              value={calendarStartDate}
                              onChange={(e) => setCalendarStartDate(e.target.value)}
                              className="bg-white border border-slate-300 text-slate-900 font-extrabold text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500 shadow-sm"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-xs font-bold text-slate-600">Até:</label>
                            <input
                              type="date"
                              value={calendarEndDate}
                              onChange={(e) => setCalendarEndDate(e.target.value)}
                              className="bg-white border border-slate-300 text-slate-900 font-extrabold text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-sky-500 shadow-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 0. SECTION: DASHBOARD (Bento Grid, Heatmap, Top Selling) */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Bento Quickstats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. FATURAMENTO TOTAL AJUSTADO */}
                <div className="bg-slate-900 border border-slate-850 p-5 rounded-3xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-16 h-16 text-sky-500" />
                  </div>
                  <span className="text-[10px] text-slate-400 block font-black uppercase tracking-wider">Faturamento de Hoje</span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-sky-400">R$ {storeFinancials.revenue.toFixed(2)}</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input 
                      type="number" 
                      value={cfgFaturamentoExtra || ''}
                      onChange={(e) => setCfgFaturamentoExtra(Number(e.target.value))}
                      placeholder="Faturamento extra teste"
                      className="bg-slate-950 border border-slate-800 text-[10px] px-2 py-1 rounded w-full focus:outline-none focus:border-sky-500 text-slate-300"
                    />
                    <button 
                      onClick={() => {
                        localStorage.setItem(`pedifacil_fat_add_${currentStore.id}`, String(cfgFaturamentoExtra));
                        showToast('Simulador de Faturamento atualizado com sucesso! 🍔', 'success');
                      }}
                      className="bg-sky-500 text-black font-extrabold text-[10px] px-3 py-1.5 rounded hover:bg-sky-450 shrink-0"
                    >
                      Ajustar
                    </button>
                  </div>
                  <span className="text-[9px] text-slate-500 block mt-1.5">* Altere o faturamento livremente para simular suas metas de faturamento.</span>
                </div>

                {/* 2. PEDIDOS TOTAIS */}
                <div className="bg-slate-900 border border-slate-850 p-5 rounded-3xl relative overflow-hidden group flex flex-col justify-between">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <ShoppingBag className="w-16 h-16 text-emerald-400" />
                  </div>
                  <div>
                    <span className="text-[10px] block font-black uppercase tracking-wider text-slate-450">Total de Pedidos</span>
                    <span className="text-3xl font-black text-emerald-400 mt-2 block">{storeFinancials.count} chamados</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-3">Média de R$ 42,50 por compra</span>
                </div>

                {/* 3. HORARIO DE PICO */}
                <div className="bg-slate-900 border border-slate-850 p-5 rounded-3xl flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] block font-black uppercase tracking-wider text-slate-450">Horário Mais Quente</span>
                    <span className="text-base font-extrabold text-orange-400 mt-2 block">{hottestHourLabel}</span>
                  </div>
                  <div className="flex gap-1 items-end h-8 mt-3">
                    {hourlyFlowData.map((item, idx) => (
                      <div key={idx} className={`${item.style || 'bg-slate-800'} rounded-t-sm`} style={{ width: `${100 / hourlyFlowData.length}%`, height: `${Math.max(12, item.pct)}%` }}></div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Peak hours analytics and top sellers */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Popular Peak Times Heatmap */}
                <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wide">
                      <Clock className="w-4 h-4 text-sky-500" /> Fluxo de Pedidos no Fim de Semana
                    </h3>
                    <span className="text-[10px] text-sky-400 font-medium bg-sky-500/10 px-2 py-0.5 rounded-full">Hamburgueria Pico</span>
                  </div>

                  <div className="space-y-3 pt-2">
                    {hourlyFlowData.map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className={`${(item as any).isMax ? 'text-orange-400 font-semibold' : 'text-slate-400'}`}>{item.h}</span>
                          <span className="text-slate-500 font-mono">{item.orders} burgers pedidos</span>
                        </div>
                        <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                          <div className={`h-full ${item.style || 'bg-slate-800'} rounded-full`} style={{ width: `${item.pct}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top burgers and ranking */}
                <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-2 uppercase tracking-wide">
                      <ShoppingBag className="w-4 h-4 text-emerald-400" /> Ranking de Mais Vendidos (Burger Top)
                    </h3>
                    <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full">Burgers Líderes</span>
                  </div>

                  <div className="space-y-4 pt-2">
                    {productSalesRanking.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        Nenhum produto cadastrado para exibir no ranking.
                      </div>
                    ) : (
                      productSalesRanking.map((burger, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-3 bg-slate-950/40 p-2.5 rounded-2xl border border-slate-850/50">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-black text-slate-500 w-4">#{idx+1}</span>
                            <img src={burger.img} referrerPolicy="no-referrer" alt={burger.name} className="w-9 h-9 object-cover rounded-xl" />
                            <div>
                              <p className="text-xs font-bold text-white leading-tight">{burger.name || 'Produto Sem Nome'}</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">R$ {burger.price.toFixed(2)} • ★ {burger.rating}</p>
                            </div>
                          </div>
                          <span className="text-xs font-extrabold text-sky-400 font-mono bg-sky-500/5 px-2.5 py-1 rounded-lg border border-sky-500/10">{burger.qty} saídas</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Bottom highlights: Combos and Couplings */}
            </div>
          )}


          {/* 0.3 SECTION: FIDELIDADE CLUB */}
          {activeMenu === 'fid' && (
            <div className="bg-slate-900 border border-slate-855 rounded-3xl p-6 space-y-6">
              
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider flex items-center gap-1">🌟 Programa de Fidelidade & Requalificação</h2>
                  <p className="text-xs text-slate-400">Estimule o retorno recorrente dos clientes recompensando a fidelidade com brindes grátis.</p>
                </div>
                <span className="text-xs bg-sky-500 text-black px-2.5 py-1 rounded font-black uppercase">Clube VIP ativo</span>
              </div>

              {/* form edit layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                
                {/* Metas e Recompensas */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Configurações Básicas do Clube</h3>
                  
                  <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Brinde oferecido aos Campeões</label>
                      <input 
                        type="text" 
                        value={fidBrindeTxt} 
                        onChange={(e) => setFidBrindeTxt(e.target.value)}
                        placeholder="Ex: 1 Combo Smash Cheddar + Refri Cola"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 text-xs font-bold text-sky-400"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Meta de Pedidos para resgate</label>
                        <input 
                          type="number" 
                          value={fidMetaPedidos} 
                          onChange={(e) => setFidMetaPedidos(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 text-xs font-bold font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Pontos ganhos por real gasto</label>
                        <input 
                          type="number" 
                          value={fidPtsPorReal} 
                          onChange={(e) => setFidPtsPorReal(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 text-xs font-bold font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Porcentagem Cashback das compras (%)</label>
                      <input 
                        type="number" 
                        value={fidCashbackPct} 
                        onChange={(e) => setFidCashbackPct(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-sky-500 text-xs font-bold text-emerald-400 font-mono"
                        required
                      />
                    </div>

                    <div className="flex items-center justify-between pointer-events-auto h-8 pt-2">
                      <span className="text-xs font-extrabold text-white uppercase">Habilitar Brinde na Entrega</span>
                      <button 
                        onClick={() => setFidBrindeAtivo(!fidBrindeAtivo)}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${fidBrindeAtivo ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}
                      >
                        {fidBrindeAtivo ? 'clube ativo' : 'clube desligado'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* VIP Tiers configure */}
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">Tiers / Status Fidelidade dos Compradores</h3>
                  
                  <div className="space-y-4 bg-slate-950 p-5 rounded-2xl border border-slate-850">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex justify-between">
                        <span>Requisitos Nível BRONZE</span>
                        <span className="text-[10px] text-orange-500">A partir de</span>
                      </label>
                      <input 
                        type="number" 
                        value={fidBronzeMin} 
                        onChange={(e) => setFidBronzeMin(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono font-bold text-slate-300"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex justify-between">
                        <span>Requisitos Nível PRATA</span>
                        <span className="text-[10px] text-sky-400">A partir de</span>
                      </label>
                      <input 
                        type="number" 
                        value={fidPrataMin} 
                        onChange={(e) => setFidPrataMin(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono font-bold text-sky-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase mb-1 flex justify-between">
                        <span>Requisitos Nível OURO</span>
                        <span className="text-[10px] text-emerald-400">A partir de</span>
                      </label>
                      <input 
                        type="number" 
                        value={fidOuroMin} 
                        onChange={(e) => setFidOuroMin(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono font-bold text-emerald-400"
                      />
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-800-60 flex items-center justify-between text-[11px] text-slate-400 leading-relaxed font-sans">
                      <span>Os tiers ajustam automaticamente ao final de cada pedido faturado para dar frete grátis ou porções rústicas aos clientes OURO.</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* VIP Clients list in progress */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">Membros Qualificados no Clube</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {clients.map(c => (
                    <div key={c.id} className="bg-slate-950 p-3 rounded-2xl border border-slate-850 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-extrabold text-white leading-snug">{c.nome}</p>
                        <p className="text-[10px] text-slate-500">Pedidos: {c.total_pedidos} • Gasto: R$ {Number(c.total_gasto || 0).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase inline-block ${c.level === 'Ouro' ? 'bg-emerald-500 text-black' : c.level === 'Prata' ? 'bg-sky-500 text-black' : 'bg-slate-800 text-slate-400'}`}>
                          VIP {c.level}
                        </span>
                        <p className="text-[9px] text-slate-500 mt-0.5 font-mono">{c.whatsapp.substring(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save button explicitly */}
              <div className="flex justify-end pt-2 border-t border-slate-805">
                <button 
                  onClick={() => handleSaveGeneralConfig(null as any)}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl transition-all"
                >
                  Confirmar Metas de Fidelidade
                </button>
              </div>

            </div>
          )}

          {/* 0.4 SECTION: WA CLIENT RECOVERY */}
          {activeMenu === 'recovery' && (
            <RecuperacaoWhatsApp
              currentStore={currentStore}
              orders={orders}
              clients={clients}
              products={products}
              cupons={cupons}
              bairros={bairros}
              showToast={showToast}
              onRefreshClients={() => loadStoreConfigurations()}
              onRefreshCupons={() => loadStoreConfigurations()}
              onAddClient={(newClient) => {
                setClients(prev => [newClient, ...prev.filter(c => c.whatsapp !== newClient.whatsapp)]);
              }}
            />
          )}

          {/* 1. SECTION: ORDERS */}
          {activeMenu === 'orders' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-900 p-4 border border-slate-850 rounded-2xl">
                <h2 className="text-base font-bold">Pedidos Solicitados</h2>
                <div className="flex items-center gap-2">
                  <select 
                    value={orderStatusFilter} 
                    onChange={(e: any) => setOrderStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-800 text-xs px-2.5 py-1.5 rounded-lg"
                  >
                    <option value="all">Todos os Status</option>
                    <option value="novo">Novo / Pendente</option>
                    <option value="preparando">Preparando</option>
                    <option value="saiu_entrega">Saiu para entrega</option>
                    <option value="entregue">Entregues</option>
                    <option value="cancelado">Cancelados</option>
                  </select>
                </div>
              </div>

              {/* LIST PEDIDOS */}
              <div className="space-y-3">
                {orders.filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter).length === 0 ? (
                  <p className="text-sm text-slate-550 italic text-center py-20 bg-slate-900/40 rounded-2xl border border-slate-900">Não há registros correspondentes.</p>
                ) : (
                  orders.filter(o => orderStatusFilter === 'all' || o.status === orderStatusFilter).map(order => {
                    const isRinging = activeAlarmPedidosIds.includes(order.id);
                    return (
                        <div 
                          key={order.id} 
                          className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-2xl flex flex-col gap-4 transition-all duration-300 shadow-sm ${isRinging ? 'ringing-order-card bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30' : ''}`}
                        >
                          {/* TOP HEADER: PEDIDO #, DATA, STATUS, TOTAL & BOTOES DE AÇÃO EM DESTAQUE */}
                          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3.5 border-b border-slate-100 dark:border-slate-800">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-base sm:text-lg text-slate-900 dark:text-white">#{order.numero_pedido || order.id.substring(0, 6)}</span>
                              <span className="text-xs text-slate-400 font-medium">• {new Date(order.criado_em || '').toLocaleString('pt-BR')}</span>
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                order.status === 'novo' ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-400/40 animate-pulse' : 
                                order.status === 'preparando' ? 'bg-sky-500 text-slate-950 font-extrabold' : 
                                order.status === 'saiu_entrega' ? 'bg-indigo-600 text-white font-extrabold' : 
                                order.status === 'entregue' ? 'bg-emerald-500 text-slate-950 font-extrabold' : 
                                'bg-slate-700 text-slate-300'
                              }`}>
                                {order.status === 'novo' ? '🔥 Novo Pedido' : order.status === 'preparando' ? '👨‍🍳 Preparando' : order.status === 'saiu_entrega' ? '🛵 Saiu p/ Entrega' : order.status === 'entregue' ? '✅ Entregue' : '❌ Cancelado'}
                              </span>
                              {isRinging && (
                                <span className="bg-amber-500 text-white font-black text-[10px] uppercase px-2.5 py-1 rounded-full animate-bounce flex items-center gap-1 shadow-sm">
                                  🔔 NOVO PEDIDO CHEGOU!
                                </span>
                              )}
                            </div>

                            {/* AÇÕES E TOTAL NO TOPO DO CARD - IMEDIATAMENTE ACESSÍVEL */}
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-850 p-2 rounded-xl border border-slate-200/80 dark:border-slate-750">
                              <div className="px-2 text-left sm:text-right border-r border-slate-200 dark:border-slate-700 pr-3">
                                <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Total com Taxas</span>
                                <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                  R$ {Number(order.total).toFixed(2)}
                                </span>
                              </div>

                              {/* Botões de Ação Rápidos no Topo */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                {order.status === 'novo' && (
                                  <button 
                                    onClick={() => handleUpdateOrderStatus(order.id, 'preparando')}
                                    className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm px-3.5 sm:px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer ring-2 ring-emerald-400/40"
                                  >
                                    <span>👨‍🍳</span> Aceitar Pedido
                                  </button>
                                )}
                                {order.status === 'preparando' && (
                                  <button 
                                    onClick={() => handleUpdateOrderStatus(order.id, 'saiu_entrega')}
                                    className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-xs sm:text-sm px-3.5 sm:px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>🛵</span> Enviar Entrega
                                  </button>
                                )}
                                {order.status === 'saiu_entrega' && (
                                  <button 
                                    onClick={() => handleUpdateOrderStatus(order.id, 'entregue')}
                                    className="bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs sm:text-sm px-3.5 sm:px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span>✅</span> Finalizar Entrega
                                  </button>
                                )}
                                {(order.status === 'novo' || order.status === 'preparando' || order.status === 'saiu_entrega') && (
                                  <button
                                    onClick={() => handlePrintOrder(order)}
                                    className="bg-amber-400 hover:bg-amber-300 active:scale-95 text-slate-950 font-bold text-xs px-3 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                                    title="Imprimir Pedido"
                                  >
                                    <span>🖨️</span> Imprimir
                                  </button>
                                )}
                                {order.status !== 'cancelado' && order.status !== 'entregue' && (
                                  <button 
                                    onClick={() => handleUpdateOrderStatus(order.id, 'cancelado')}
                                    className="bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold px-2.5 py-2 rounded-xl active:scale-95 transition-all cursor-pointer"
                                  >
                                    Recusar
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3 font-sans text-slate-800">
                            <p className="text-sm font-semibold flex items-center gap-2 flex-wrap text-slate-900">
                              <span className="text-slate-500 font-medium">👤 Cliente:</span>
                              <span className="text-slate-900 font-black text-base">{order.cliente_nome}</span>
                              <a 
                                href={`https://wa.me/55${order.cliente_whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-xl text-xs font-black flex items-center gap-1 transition-all"
                                title="Abrir WhatsApp"
                              >
                                💬 {order.cliente_whatsapp}
                              </a>
                            </p>

                            {/* ENDEREÇO DETALHADO */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs text-slate-800 space-y-2">
                              <div className="flex items-start gap-1.5">
                                <span className="text-sky-500 mt-0.5 select-none text-base leading-none shrink-0">📍</span>
                                <div className="space-y-1 w-full">
                                  <span className="font-extrabold text-slate-500">Endereço de Entrega:</span>
                                  <p className="text-slate-900 leading-relaxed font-bold text-[13px]">
                                    {order.cliente_endereco} — Bairro <span className="text-sky-700 font-black">{order.cliente_bairro}</span>
                                  </p>
                                  {order.cliente_complemento && (
                                    <p className="text-slate-700 text-xs bg-white px-2.5 py-1 rounded-lg inline-block border border-slate-200 mt-1">
                                      <span className="font-bold text-slate-450">Complemento:</span> {order.cliente_complemento}
                                    </p>
                                  )}
                                  {order.observacoes && (
                                    <div className="text-amber-800 text-xs bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 mt-1.5 leading-relaxed">
                                      <span className="font-black text-amber-900">⚠️ Ponto de Referência / Observação:</span> {order.observacoes}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* FORMA DE PAGAMENTO E FINANCEIRO */}
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 text-xs space-y-1.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-emerald-500 text-base leading-none shrink-0 select-none">💵</span>
                                <span className="font-extrabold text-slate-500">Forma de Pagamento:</span>
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-xl font-black text-xs uppercase select-none">
                                  {order.forma_pagamento}
                                </span>
                                {order.troco && (
                                  <span className="font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl text-xs leading-none">
                                    Precisa de Troco para: <span className="font-black text-amber-900">{order.troco}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* LISTA DOS LANCHES / ITENS E SUAS COMPLEMENTAÇÕES */}
                            <div className="bg-white p-4 rounded-xl border border-slate-200/80 text-xs space-y-3 mt-2 shadow-xs">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                <p className="font-black text-slate-700 uppercase tracking-wider text-[11px] select-none flex items-center gap-1.5">
                                  <span>🛍️</span>
                                  <span>Produtos do Pedido ({order.itens?.length || 0} {order.itens?.length === 1 ? 'item' : 'itens'}):</span>
                                </p>
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  Qtd • Unitário • Subtotal
                                </span>
                              </div>
                              
                              <div className="space-y-3 divide-y divide-slate-100">
                                {order.itens && Array.isArray(order.itens) ? (
                                  order.itens.map((item: any, idx: number) => {
                                    const qty = Number(item.quantity || item.qtd || 1);
                                    const title = item.name || item.titulo || item.title || 'Item sem nome';
                                    const price = Number(item.price || 0);
                                    const unitPrice = qty > 0 ? (price / qty) : price;
                                    const p = item.personalization;
                                    const itemObs = item.observacao || item.obs;

                                    // Map dynamic custom selections
                                    const added: string[] = [];
                                    if (p) {
                                      if (p.add_bacon) added.push('Bacon Rústico');
                                      if (p.add_cheddar) added.push('Cheddar Cremoso');
                                      if (p.add_ovo) added.push('Ovo Frito');
                                      if (p.add_catupiry) added.push('Catupiry Original');
                                      if (p.add_hamburguer) added.push('Blend Extra');
                                      if (p.add_cebola_caramelizada) added.push('Cebola Caramelizada');
                                      if (p.add_onion_rings) added.push('Onion Rings');
                                      if (p.add_molho_especial) added.push('Molho Especial');
                                      if (p.add_batata_extra) added.push('Batata Frita Extra');
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
                                      <div key={idx} className={`space-y-2.5 ${idx > 0 ? 'pt-3' : ''}`}>
                                        {/* Product header row with quantity & clear pricing */}
                                        <div className="flex justify-between items-start gap-2">
                                          <div className="flex items-start gap-2 min-w-0">
                                            <span className="inline-flex items-center justify-center bg-zinc-900 text-amber-400 font-black text-xs px-2 py-0.5 rounded-md min-w-[28px] shrink-0 shadow-xs">
                                              {qty}x
                                            </span>
                                            <span className="font-black text-slate-900 text-sm leading-snug">
                                              {title}
                                            </span>
                                          </div>
                                          
                                          <div className="text-right shrink-0">
                                            {qty > 1 && (
                                              <span className="text-[10px] text-slate-400 font-medium block">
                                                {qty}x R$ {unitPrice.toFixed(2)}
                                              </span>
                                            )}
                                            <span className="font-mono text-emerald-700 font-black text-sm">
                                              R$ {price.toFixed(2)}
                                            </span>
                                          </div>
                                        </div>

                                        {/* Complements, options and custom selections */}
                                        {p && (p.sao_pao || p.carne_tipo || p.carne_ponto || added.length > 0 || removed.length > 0) && (
                                          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 space-y-1.5 text-slate-700 text-xs ml-1 sm:ml-7">
                                            {/* Pão, Carne e Ponto */}
                                            {(p.sao_pao || p.carne_tipo || p.carne_ponto) && (
                                              <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-slate-200/60">
                                                {p.sao_pao && (
                                                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 text-[11px] font-semibold">
                                                    <span>🍞</span>
                                                    <span>Pão: <strong className="text-slate-900 font-bold">{p.sao_pao}</strong></span>
                                                  </span>
                                                )}
                                                {p.carne_tipo && (
                                                  <span className="inline-flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-700 text-[11px] font-semibold">
                                                    <span>🥩</span>
                                                    <span>Carne: <strong className="text-slate-900 font-bold">{p.carne_tipo}</strong></span>
                                                  </span>
                                                )}
                                                {p.carne_ponto && (
                                                  <span className="inline-flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-amber-800 text-[11px] font-semibold">
                                                    <span>🔥</span>
                                                    <span>Ponto: <strong className="text-amber-900 font-black">{p.carne_ponto}</strong></span>
                                                  </span>
                                                )}
                                              </div>
                                            )}

                                            {/* Adicionais com tags verdes */}
                                            {added.length > 0 && (
                                              <div className="flex items-start gap-1.5 flex-wrap pt-0.5">
                                                <span className="text-[11px] font-bold text-emerald-700 shrink-0">➕ Adicionais:</span>
                                                {added.map((addName, aIdx) => (
                                                  <span key={aIdx} className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2 py-0.5 rounded-md text-[11px] font-bold">
                                                    +{addName}
                                                  </span>
                                                ))}
                                              </div>
                                            )}

                                            {/* Removidos com tags vermelhas */}
                                            {removed.length > 0 && (
                                              <div className="flex items-start gap-1.5 flex-wrap pt-0.5">
                                                <span className="text-[11px] font-bold text-rose-700 shrink-0">❌ Sem:</span>
                                                {removed.map((remName, rIdx) => (
                                                  <span key={rIdx} className="bg-rose-50 text-rose-700 border border-rose-200/80 px-2 py-0.5 rounded-md text-[11px] font-bold line-through">
                                                    {remName}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        )}

                                        {/* Item specific notes, dynamic options, groups and choices */}
                                        {itemObs && (() => {
                                          const segments = String(itemObs).split(' | ').map(s => s.trim()).filter(Boolean);
                                          const optionGroups: { label: string; items: string[] }[] = [];
                                          const clientNotes: string[] = [];

                                          segments.forEach(seg => {
                                            if (seg.toLowerCase().startsWith('obs:') || seg.toLowerCase().startsWith('observação:') || seg.toLowerCase().startsWith('observacao:')) {
                                              const cleanNote = seg.replace(/^(obs|observação|observacao):\s*/i, '').trim();
                                              if (cleanNote) clientNotes.push(cleanNote);
                                            } else if (seg.includes(':')) {
                                              const cIdx = seg.indexOf(':');
                                              const label = seg.substring(0, cIdx).trim();
                                              const val = seg.substring(cIdx + 1).trim();
                                              if (val) {
                                                const subList = val.split(',').map(v => v.trim()).filter(Boolean);
                                                optionGroups.push({
                                                  label,
                                                  items: subList.length > 0 ? subList : [val]
                                                });
                                              }
                                            } else {
                                              clientNotes.push(seg);
                                            }
                                          });

                                          return (
                                            <div className="ml-1 sm:ml-7 space-y-2 pt-1">
                                              {/* Structured Option Groups (Flavors, Drinks, Extras) */}
                                              {optionGroups.map((grp, gIdx) => (
                                                <div key={gIdx} className="bg-slate-50/90 border border-slate-200 rounded-xl p-2.5 space-y-1.5 shadow-2xs">
                                                  <div className="flex items-center gap-1.5 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                                                    <span className="text-amber-500">✨</span>
                                                    <span>{grp.label}:</span>
                                                  </div>
                                                  <div className="flex flex-wrap gap-1.5 pl-1">
                                                    {grp.items.map((optItem, optIdx) => {
                                                      const priceMatch = optItem.match(/\(\+?R\$\s*[\d.,]+\)/i);
                                                      const priceTag = priceMatch ? priceMatch[0] : null;
                                                      let textWithoutPrice = priceTag ? optItem.replace(priceTag, '').trim() : optItem;
                                                      const hasQty = /^\d+x\s/i.test(textWithoutPrice);
                                                      const qtyPart = hasQty ? textWithoutPrice.split(' ')[0] : null;
                                                      const labelPart = hasQty ? textWithoutPrice.substring(textWithoutPrice.indexOf(' ') + 1) : textWithoutPrice;

                                                      return (
                                                        <span 
                                                          key={optIdx} 
                                                          className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-800 px-2.5 py-1 rounded-lg text-xs font-bold shadow-2xs"
                                                        >
                                                          {qtyPart && (
                                                            <span className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[10px] font-black leading-none">
                                                              {qtyPart}
                                                            </span>
                                                          )}
                                                          <span>{labelPart}</span>
                                                          {priceTag && (
                                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold leading-none">
                                                              {priceTag.replace(/[()]/g, '')}
                                                            </span>
                                                          )}
                                                        </span>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              ))}

                                              {/* Client Notes (Observações) */}
                                              {clientNotes.map((note, nIdx) => (
                                                <div 
                                                  key={nIdx} 
                                                  className="text-xs px-3 py-2 rounded-xl border border-amber-200 bg-amber-50/90 text-amber-950 flex items-start gap-2 font-medium leading-relaxed shadow-2xs"
                                                >
                                                  <span className="shrink-0 text-sm select-none">📝</span>
                                                  <div>
                                                    <strong className="font-extrabold text-amber-900 block text-[11px] uppercase tracking-wider">Observação do Cliente:</strong>
                                                    <span className="italic font-bold">"{note}"</span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <p className="text-slate-500 italic py-2">Nenhum produto detalhado encontrado.</p>
                                )}
                              </div>

                              {/* ORDER FINANCIAL SUMMARY FOOTER */}
                              <div className="mt-3 pt-3 border-t border-slate-200/90 bg-slate-50 -mx-4 -mb-4 p-3 rounded-b-xl space-y-1 text-xs text-slate-600">
                                <div className="flex justify-between items-center">
                                  <span>Subtotal dos Produtos:</span>
                                  <span className="font-bold text-slate-800">
                                    R$ {Number(order.subtotal || (order.itens ? order.itens.reduce((acc: number, cur: any) => acc + (Number(cur.price) || 0), 0) : order.total)).toFixed(2)}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span>Taxa de Entrega:</span>
                                  <span className={`font-bold ${Number(order.taxa_entrega || 0) === 0 ? 'text-emerald-600 font-extrabold' : 'text-slate-800'}`}>
                                    {Number(order.taxa_entrega || 0) === 0 ? 'GRÁTIS' : `+ R$ ${Number(order.taxa_entrega).toFixed(2)}`}
                                  </span>
                                </div>
                                {Number(order.desconto || 0) > 0 && (
                                  <div className="flex justify-between items-center text-rose-600 font-bold">
                                    <span>Desconto (Cupom):</span>
                                    <span>- R$ {Number(order.desconto).toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 text-sm font-black text-slate-900">
                                  <span className="text-slate-900">VALOR TOTAL DO PEDIDO:</span>
                                  <span className="text-emerald-700 text-base font-black">
                                    R$ {Number(order.total || 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 2. SECTION: CATEGORIES */}
          {activeMenu === 'categories' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-900 p-4 border border-slate-850 rounded-2xl">
                <h2 className="text-base font-bold">Gerenciar Categorias</h2>
                <button 
                  onClick={() => handleOpenCatModal(null)}
                  className="bg-sky-500 text-black text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Nova Categoria
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden divide-y divide-slate-800">
                {categories.length === 0 ? (
                  <p className="text-sm text-slate-550 italic p-6 text-center">Nenhuma categoria registrada.</p>
                ) : (
                  categories.map(cat => (
                    <div key={cat.id} className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm text-white">{cat.name}</p>
                        <p className="text-[10px] text-slate-550">Ordem na listagem: {cat.ordem}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenCatModal(cat)}
                          className="bg-slate-800 hover:bg-slate-700 p-1.5 rounded text-slate-400 hover:text-white"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDeleteCategory(cat.id)}
                          className="bg-red-500/10 hover:bg-red-500/20 p-1.5 rounded text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 3. SECTION: PRODUCTS */}
          {activeMenu === 'products' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-900 p-4 border border-slate-850 rounded-2xl">
                <h2 className="text-base font-bold">Cardápio Produtos</h2>
                <button 
                  onClick={() => handleOpenProductModal(null)}
                  className="bg-sky-500 text-black text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Criar Produto
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.length === 0 ? (
                  <p className="col-span-2 text-sm text-slate-500 italic text-center py-10">Nenhum produto cadastrado no momento.</p>
                ) : (
                  products.map(prod => {
                    const cat = categories.find(c => c.id === prod.category_id);
                    return (
                      <div
                        key={prod.id}
                        className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex gap-3.5 relative overflow-hidden pointer-events-auto cursor-pointer"
                        onClick={() => handleOpenProductModal(prod)}
                      >
                        {prod.foto_url && (
                          <img src={prod.foto_url} alt={prod.name} className="w-16 h-16 rounded-xl object-cover shrink-0 bg-slate-950" />
                        )}
                        <div className="flex-1 space-y-1">
                          <p className="font-bold text-sm text-white">{prod.name}</p>
                          <p className="text-[10px] text-sky-400 uppercase font-semibold">{cat?.name || 'Sem Categoria'}</p>
                          <p className="text-slate-400 text-xs line-clamp-2">{prod.description}</p>
                          <div className="flex items-center gap-1.5 pt-1">
                            <span className="text-emerald-400 font-bold text-sm">R$ {prod.preco.toFixed(2)}</span>
                            {prod.preco_promocional && (
                              <span className="text-xs text-slate-500 line-through">R$ {prod.preco_promocional.toFixed(2)}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-1 shrink-0">
                          <button 
                            type="button"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleOpenProductModal(prod); 
                            }}
                            className="bg-slate-950 text-xs px-2 py-1 border border-slate-800 text-slate-300 rounded relative z-50 pointer-events-auto cursor-pointer hover:bg-slate-800"
                          >
                            Editar
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeleteProduct(prod.id); }}
                            className="bg-red-500/10 text-xs px-2 py-1 text-red-400 rounded relative z-50 pointer-events-auto cursor-pointer hover:bg-red-500/20"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* 4. NEIGHBORHOOD RATES SECTION */}
          {activeMenu === 'neighborhoods' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-900 p-4 border border-slate-850 rounded-2xl">
                <h2 className="text-base font-bold">Taxas de Entrega / Bairros</h2>
                <button 
                  onClick={() => handleOpenBairroModal(null)}
                  className="bg-sky-500 text-black text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Vincular Bairro
                </button>
              </div>

              <div className="bg-slate-900 border border-slate-850 rounded-2xl overflow-hidden divide-y divide-slate-800">
                {bairros.length === 0 ? (
                  <p className="text-sm text-slate-550 italic p-6 text-center">Nenhum bairro registrado.</p>
                ) : (
                  bairros.map(b => (
                    <div key={b.id} className="p-4 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-sm text-white">{b.nome}</p>
                        <p className="text-emerald-400 text-xs font-bold">Taxa de envio: R$ {b.taxa.toFixed(2)}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => handleOpenBairroModal(b)}
                          className="bg-slate-800 p-1.5 text-slate-400 rounded text-xs"
                        >
                          Alterar
                        </button>
                        <button 
                          onClick={() => handleDeleteBairro(b.id)}
                          className="bg-red-500/10 p-1.5 text-red-400 rounded text-xs"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 5. COUPONS SECTION */}
          {activeMenu === 'coupons' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-900 p-4 border border-slate-850 rounded-2xl">
                <h2 className="text-base font-bold">Promoções e Cupons</h2>
                <button 
                  onClick={() => handleOpenCouponModal(null)}
                  className="bg-sky-500 text-black text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" /> Criar Cupom
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cupons.length === 0 ? (
                  <p className="col-span-2 text-sm text-slate-555 italic text-center p-6">Nenhum cupom listado.</p>
                ) : (
                  cupons.map(cp => (
                    <div key={cp.id} className="bg-slate-900 border border-slate-850 p-4 rounded-2xl flex justify-between items-center">
                      <div>
                        <span className="bg-amber-400/15 text-amber-400 border border-amber-400/20 px-2 py-0.5 rounded text-xs font-mono font-bold tracking-widest uppercase">
                          {cp.codigo}
                        </span>
                        <p className="text-xs font-semibold mt-1.5">
                          Desconto: {cp.tipo === 'percentual' ? `${cp.valor}%` : `R$ ${cp.valor.toFixed(2)}`}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">Mín. compra: R$ {(cp as any).valor_minimo || 0}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleOpenCouponModal(cp)} className="bg-slate-800 p-1.5 text-slate-450 rounded text-[11px]">Editar</button>
                        <button onClick={() => handleDeleteCoupon(cp.id)} className="bg-red-500/10 p-1.5 text-red-400 rounded text-[11px]">Deletar</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 6. GENERAL CONFIG SETTINGS */}
          {activeMenu === 'settings' && (
            <form onSubmit={handleSaveGeneralConfig} className="bg-slate-900 border border-slate-850 rounded-3xl p-6 space-y-8">
              
              {/* HEADER TITLE */}
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-1.5 font-sans">
                  <Settings className="w-5 h-5 text-sky-400" /> Ficha Técnica & Dados da Hamburgueria
                </h2>
                <p className="text-xs text-slate-450 mt-1">Configure todos os campos da sua loja. Os dados salvos são atualizados instantaneamente em seu cardápio público.</p>
              </div>

              {/* SEÇÃO 1: INFORMAÇÕES PRINCIPAIS */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-sky-450 text-sky-400 flex items-center gap-2 border-b border-slate-850 pb-2">
                  📌 INFORMAÇÕES PRINCIPAIS
                </h3>
                
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nome da Hamburgueria *</label>
                    <input 
                      type="text"
                      value={cfgName}
                      onChange={(e) => setCfgName(e.target.value)}
                      placeholder="Ex: Pampa Burger"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Slogan Comercial *</label>
                    <input 
                      type="text"
                      value={cfgSlogan}
                      onChange={(e) => setCfgSlogan(e.target.value)}
                      placeholder="Ex: Estúpido de saboroso!"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Descrição / Apresentação da Loja</label>
                  <textarea 
                    value={cfgDesc}
                    onChange={(e) => setCfgDesc(e.target.value)}
                    placeholder="Ex: Hamburgueria artesanal especializada em blends bovinos grelhados no fogo brando..."
                    className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500 h-20 resize-none font-sans leading-normal"
                  />
                </div>
              </div>

              {/* SEÇÃO 2: CONTATO DA LOJA */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2 border-b border-slate-850 pb-2">
                  📞 CONTATO E ATENDIMENTO
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">WhatsApp Oficial para Receber Pedidos *</label>
                    <input 
                      type="text"
                      value={cfgWhatsapp}
                      onChange={(e) => setCfgWhatsapp(e.target.value)}
                      placeholder="WhatsApp (Ex: 5586999998888)"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500 font-mono"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Instagram (@usuario)</label>
                    <input 
                      type="text"
                      value={cfgInstagram}
                      onChange={(e) => setCfgInstagram(e.target.value)}
                      placeholder="Ex: pampaburger_oficial"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: ENDEREÇO E LOCALIZAÇÃO */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2 border-b border-slate-850 pb-2">
                  📍 LOCALIZAÇÃO E ENDEREÇO DA HAMBURGUERIA
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">CEP *</label>
                    <input 
                      type="text"
                      value={cfgCep}
                      onChange={(e) => setCfgCep(e.target.value)}
                      placeholder="64000-000"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500 font-mono"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Rua / Logradouro *</label>
                    <input 
                      type="text"
                      value={cfgRua}
                      onChange={(e) => setCfgRua(e.target.value)}
                      placeholder="Avenida Nossa Senhora de Fátima"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Número *</label>
                    <input 
                      type="text"
                      value={cfgNumero}
                      onChange={(e) => setCfgNumero(e.target.value)}
                      placeholder="1451"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bairro *</label>
                    <input 
                      type="text"
                      value={cfgBairro}
                      onChange={(e) => setCfgBairro(e.target.value)}
                      placeholder="Fátima"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Cidade *</label>
                    <input 
                      type="text"
                      value={cfgCidade}
                      onChange={(e) => setCfgCidade(e.target.value)}
                      placeholder="Teresina"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Estado *</label>
                    <input 
                      type="text"
                      value={cfgEstado}
                      onChange={(e) => setCfgEstado(e.target.value)}
                      placeholder="PI"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Complemento (Opcional)</label>
                    <input 
                      type="text"
                      value={cfgComplemento}
                      onChange={(e) => setCfgComplemento(e.target.value)}
                      placeholder="Sala A / Ao lado do banco"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Ponto de Referência (Opcional)</label>
                    <input 
                      type="text"
                      value={cfgReferencia}
                      onChange={(e) => setCfgReferencia(e.target.value)}
                      placeholder="Próximo à praça principal"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 4: IDENTIDADE VISUAL */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2 border-b border-slate-850 pb-2">
                  🎨 IDENTIDADE VISUAL
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Upload da Imagem da Logo</label>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCfgLogoFile(file);
                          const url = URL.createObjectURL(file);
                          setCfgLogo(url);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Upload do Banner Principal</label>
                    <input 
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCfgBannerFile(file);
                          const url = URL.createObjectURL(file);
                          setCfgBanner(url);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 6: ENTREGAS, PRAZOS E LIMIARES */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-orange-400 flex items-center gap-2 border-b border-slate-850 pb-2">
                  🛵 LOGÍSTICA DE ENTREGAS & PRAZOS DO CHEF
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Pedido Mínimo (R$)</label>
                    <input 
                      type="number"
                      value={cfgMinVal}
                      onChange={(e) => setCfgMinVal(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500 font-mono font-bold text-sky-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Frete Grátis Acima (R$)</label>
                    <input 
                      type="number"
                      value={cfgFreeVal}
                      onChange={(e) => setCfgFreeVal(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500 font-mono font-bold text-emerald-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Taxa Entrega Padrão (R$)</label>
                    <input 
                      type="number"
                      value={cfgDeliveryFeePadrao}
                      onChange={(e) => setCfgDeliveryFeePadrao(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Preparo Mín (Minutos)</label>
                    <input 
                      type="number"
                      value={cfgPrepMin}
                      onChange={(e) => setCfgPrepMin(Number(e.target.value))}
                      placeholder="35"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Preparo Máx (Minutos)</label>
                    <input 
                      type="number"
                      value={cfgPrepMax}
                      onChange={(e) => setCfgPrepMax(Number(e.target.value))}
                      placeholder="50"
                      className="w-full bg-slate-950 border border-slate-800 text-sm px-3 py-2 rounded-xl text-white focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                </div>
              </div>


              {/* SEÇÃO: HORÁRIOS DE FUNCIONAMENTO DA LOJA */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-850 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                    ⏰ Horários de Funcionamento da Loja
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const seg = cfgHorarios['seg'] || { abertura: '18:00', fechamento: '23:59', fechado: false };
                      setCfgHorarios({
                        seg: { ...seg },
                        ter: { ...seg },
                        qua: { ...seg },
                        qui: { ...seg },
                        sex: { ...seg },
                        sab: { ...seg },
                        dom: { ...seg },
                      });
                      showToast('Horário de Segunda replicado para toda a semana!', 'info');
                    }}
                    className="text-[11px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-xl transition cursor-pointer"
                  >
                    Replicar Segunda p/ todos os dias
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'seg', label: 'Segunda-feira' },
                    { key: 'ter', label: 'Terça-feira' },
                    { key: 'qua', label: 'Quarta-feira' },
                    { key: 'qui', label: 'Quinta-feira' },
                    { key: 'sex', label: 'Sexta-feira' },
                    { key: 'sab', label: 'Sábado' },
                    { key: 'dom', label: 'Domingo' },
                  ].map((dia) => {
                    const h = cfgHorarios[dia.key] || { abertura: '18:00', fechamento: '23:59', fechado: false };
                    return (
                      <div key={dia.key} className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 flex flex-col gap-2.5">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-extrabold text-white">{dia.label}</span>
                          <label className="inline-flex items-center gap-2 cursor-pointer text-xs select-none">
                            <input
                              type="checkbox"
                              checked={!h.fechado}
                              onChange={(e) => {
                                const isAberto = e.target.checked;
                                setCfgHorarios(prev => ({
                                  ...prev,
                                  [dia.key]: {
                                    ...(prev[dia.key] || { abertura: '18:00', fechamento: '23:59' }),
                                    fechado: !isAberto
                                  }
                                }));
                              }}
                              className="w-4 h-4 rounded accent-purple-500 cursor-pointer"
                            />
                            <span className={`font-bold ${!h.fechado ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {!h.fechado ? 'Aberto' : 'Fechado'}
                            </span>
                          </label>
                        </div>

                        {!h.fechado && (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Abertura</label>
                              <input
                                type="time"
                                value={h.abertura || '18:00'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCfgHorarios(prev => ({
                                    ...prev,
                                    [dia.key]: {
                                      ...(prev[dia.key] || { fechamento: '23:59', fechado: false }),
                                      abertura: val
                                    }
                                  }));
                                }}
                                className="w-full bg-slate-900 border border-slate-800 text-xs px-2.5 py-1.5 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Fechamento</label>
                              <input
                                type="time"
                                value={h.fechamento || '23:59'}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCfgHorarios(prev => ({
                                    ...prev,
                                    [dia.key]: {
                                      ...(prev[dia.key] || { abertura: '18:00', fechado: false }),
                                      fechamento: val
                                    }
                                  }));
                                }}
                                className="w-full bg-slate-900 border border-slate-800 text-xs px-2.5 py-1.5 rounded-xl text-white font-mono focus:outline-none focus:border-purple-500"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SEÇÃO: MÉTODOS DE PAGAMENTO ACEITOS */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-2 border-b border-slate-850 pb-2">
                  💳 Métodos de Pagamento Aceitos na Entrega/Retirada
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { key: 'pix', label: 'Pix', icon: '⚡' },
                    { key: 'dinheiro', label: 'Dinheiro', icon: '💵' },
                    { key: 'cartao', label: 'Cartão (Crédito/Débito)', icon: '💳' },
                    { key: 'vr', label: 'Vale Refeição', icon: '🍽️' },
                  ].map((metodo) => {
                    const isAtivo = (cfgMetodosPagamento as any)[metodo.key] !== false;
                    return (
                      <label
                        key={metodo.key}
                        className={`p-4 rounded-2xl border flex items-center justify-between cursor-pointer transition select-none ${
                          isAtivo
                            ? 'bg-slate-950 border-teal-500/50 text-white'
                            : 'bg-slate-950/40 border-slate-850 text-slate-500'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-lg">{metodo.icon}</span>
                          <span className="text-xs font-extrabold">{metodo.label}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isAtivo}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setCfgMetodosPagamento(prev => ({
                              ...prev,
                              [metodo.key]: checked
                            }));
                          }}
                          className="w-4 h-4 rounded accent-teal-500 cursor-pointer"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* BUTTON TRIGGER */}
              <div className="pt-4 flex justify-end border-t border-slate-800">
                <button 
                  type="submit"
                  className="bg-sky-500 hover:bg-sky-600 text-black font-extrabold px-8 py-3.5 rounded-2xl text-xs transition-all uppercase tracking-wide cursor-pointer decoration-clone"
                >
                  Salvar Ficha da Hamburgueria 🍔🥞
                </button>
              </div>


            </form>
          )}

          {/* BONUS SECTION: NOTIFICATION SOUNDS SELECTION */}
          {activeMenu === 'sounds' && (
            <div className="bg-slate-900 border border-slate-850 rounded-3xl p-6 space-y-6">
              {/* HEADER TITLE */}
              <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 font-sans">
                <div>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-1.5 font-sans">
                    <Volume2 className="w-5 h-5 text-sky-400" /> Sons de Notificação do Painel
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Configure o toque de alerta que será tocado repetidamente quando chegarem novos pedidos pendentes.</p>
                </div>
                <div className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-xl px-3 py-1.5 text-[11px] font-bold">
                  ⚡ Sintetizador Web Audio API Ativo
                </div>
              </div>

              {/* CONTROLE DE VOLUME */}
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 md:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      🔊 Volume de Alerta: {Math.round(soundVolume * 100)}%
                    </h3>
                    <p className="text-xs text-slate-400">Arraste para ajustar o volume ideal da campainha do estabelecimento.</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSoundVolume(1.0);
                        localStorage.setItem('pedifacil_sound_volume', '1.0');
                        playModernChime(selectedSoundId, 1.0);
                        showToast('Volume máximo (100%) ativado!', 'info');
                      }}
                      className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                    >
                      Volume Máximo ⚡
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSoundVolume(0.0);
                        localStorage.setItem('pedifacil_sound_volume', '0.0');
                        showToast('Toques silenciados (0%)', 'info');
                      }}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/25 px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center"
                    >
                      <VolumeX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <VolumeX className="w-4 h-4 text-slate-500 mr-1" />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={soundVolume}
                    onChange={(e) => {
                      const newVol = parseFloat(e.target.value);
                      setSoundVolume(newVol);
                      localStorage.setItem('pedifacil_sound_volume', String(newVol));
                    }}
                    onMouseUp={() => playModernChime(selectedSoundId)}
                    onTouchEnd={() => playModernChime(selectedSoundId)}
                    className="flex-grow accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <Volume2 className="w-4 h-4 text-sky-400" />
                </div>
              </div>

              {/* OUTRAS ABAS / ALERTA DE SEGUNDO PLANO */}
              <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 md:p-6 space-y-4 font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" /> Alertas em Segundo Plano (Outras Abas)
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
                      Ative as notificações integradas do navegador. Funcionando igual a aplicativos de chat, mesmo se você estiver navegando em outros sites ou trabalhando em outra janela, você ouvirá o toque e receberá um aviso instantâneo do novo pedido!
                    </p>
                  </div>
                  <div className="shrink-0">
                    {notifyPermission === 'granted' ? (
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 uppercase">
                        <Check className="w-4 h-4" /> Ativo no Navegador
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={requestNotificationPermission}
                        className="bg-sky-500 hover:bg-sky-400 text-black px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 uppercase tracking-wider shadow-lg shadow-sky-500/10"
                      >
                        🔔 Permitir Alertas
                      </button>
                    )}
                  </div>
                </div>
                {notifyPermission === 'denied' && (
                  <p className="text-xs text-amber-500/90 font-semibold bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex items-center gap-2">
                    ⚠️ As notificações parecem estar silenciadas no navegador. Clique no ícone de cadeado do site na barra de endereços para dar permissão de som e notificações em segundo plano!
                  </p>
                )}
              </div>

              {/* LISTA DOS SONS DISPONÍVEIS */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  🎵 Escolha seu Alerta Favorito:
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-sans">
                  {[
                    { id: 'ifood', name: '🔴 iFood Toque Oficial ("Priiiinnn")', desc: 'Vibração clássica de campainha dupla de pedidos do iFood' },
                    { id: 'trim_trim', name: '🔔 Trim Trim Clássico ("Prin Prin")', desc: 'Par de notas finas e cristalinas (Padrão)' },
                    { id: 'cristal', name: '💎 Sino de Cristal', desc: 'Nota aguda pura que decai como cristal' },
                    { id: 'ding_dong', name: '🚪 Campainha "Ding Dong"', desc: 'Campainha clássica de duas notas em cascata' },
                    { id: 'alerta_urgente', name: '🚨 Alerta Urgente Radar', desc: 'Sinal sonoro contínuo de alta frequência' },
                    { id: 'sonar', name: '📡 Sonar Aquático', desc: 'Ressonância profunda estilo radar de submarino' },
                    { id: 'bip_espacial', name: '🚀 Bip Cibernético Laser', desc: 'Nota de tecnologia de rampa espacial rápida' },
                    { id: 'zen', name: '🌸 Meditação Zen Suave', desc: 'Calmo, relaxante de harmônicos quentes' },
                    { id: 'assobio', name: '😙 Assobio Retro Sweep', desc: 'Frequência de rampa suave contínua descendente' },
                    { id: 'sucesso_vitoria', name: '🏆 Arpejo de Vitória', desc: 'Quatro notas triunfais em escala ascendente' },
                    { id: 'tempo_arcade', name: '👾 Arcade Jump 8-Bit', desc: 'Som divertido estilo pulo de plataforma retro' },
                    { id: 'gongo', name: '🏮 Gongo Oriental', desc: 'Toque encorpado com oscilação metálica e harmônicos' },
                    { id: 'harpa', name: '✨ Harpa Celestial', desc: 'Quatro notas rápidas flutuando em harmonia' },
                    { id: 'ploc_wood', name: '🪵 Ploc de Madeira', desc: 'Batida seca de bloco de madeira acústico' },
                    { id: 'bumbo_prato', name: '🥁 Bumbo & Chimbal Tok', desc: 'Graves encorpados com sopro agudo de prato' },
                    { id: 'sintetizador_lfo', name: '👽 Alien Sci-Fi Wave', desc: 'Som flutuante com rampa de modulação rápida' }
                  ].map((s) => {
                    const isSelected = selectedSoundId === s.id;
                    return (
                      <div
                        key={s.id}
                        className={`border rounded-2xl p-4 flex items-center justify-between transition-all duration-300 ${
                          isSelected 
                            ? 'bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/5' 
                            : 'bg-slate-950/50 border-slate-850 hover:border-slate-800'
                        }`}
                      >
                        <div className="space-y-1 pr-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isSelected ? 'text-sky-400' : 'text-white'}`}>
                              {s.name}
                            </span>
                            {isSelected && (
                              <span className="bg-sky-500 text-black text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                Ativo
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400">{s.desc}</p>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => playModernChime(s.id)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs flex items-center justify-center transition-all border border-slate-750"
                            title="Testar som"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                          
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSoundId(s.id);
                              localStorage.setItem('pedifacil_selected_sound_id', s.id);
                              playModernChime(s.id);
                              showToast(`Som de notificação alterado para: ${s.name}`, 'success');
                            }}
                            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                              isSelected
                                ? 'bg-sky-500 text-black'
                                : 'bg-slate-900 border border-slate-800 text-slate-450 hover:text-white'
                            }`}
                          >
                            {isSelected ? '✓ Ativo' : 'Ativar'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

              
          )}

        </div>

      </div>

      {/* FOOTER METADATA */}
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-600">
        <p>PediFácil Restaurante Controller • Central de Comando Inteligente v1.2</p>
      </footer>

      {/* MODAL CATEGORY */}
      {categoryModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCategory} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-white text-sm">{editingCategory ? 'Renomear Categoria' : 'Criar Nova Categoria'}</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Nome da Categoria *</label>
              <input 
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Ex: 🍔 Smash Burgers"
                className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-sm"
                required
              />
            </div>
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setCategoryModalOpen(false)} className="bg-slate-800 px-4 py-2 rounded-xl">Cancelar</button>
              <button type="submit" className="bg-sky-500 text-black px-4 py-2 rounded-xl">Gravar</button>
            </div>
          </form>
        </div>
      )}


      <ErrorBoundary>
        {/* MODAL CADASTRO DE PRODUTO — novo componente por etapas */}
        <CriarProdutoModal
          visible={productModalOpen}
          product={editingProduct}
          categories={categories}
          storeId={currentStore?.id || ''}
          storeNicho={currentStore?.nicho || 'hamburgueria'}
          onClose={handleCloseProductModal}
          onSaved={() => {
            loadStoreConfigurations();
            showToast('Produto salvo com sucesso! ✅', 'success');
          }}
          showToast={showToast}
        />
      </ErrorBoundary>

      {/* MODAL BAIRRO */}
      {bairroModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveBairro} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-white text-sm">{editingBairro ? 'Modificar Taxa por Bairro' : 'Adicionar Novo Bairro'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nome do Bairro *</label>
                <input 
                  type="text"
                  value={bName}
                  onChange={(e) => setBName(e.target.value)}
                  placeholder="Ex: Lourival Parente"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Valor de Envio (R$) *</label>
                <input 
                  type="number"
                  value={bTax}
                  onChange={(e) => setBTax(Number(e.target.value))}
                  placeholder="Ex: 5.00"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-sm"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs font-bold">
              <button type="button" onClick={() => setBairroModalOpen(false)} className="bg-slate-800 px-4 py-2 rounded-xl">Cancelar</button>
              <button type="submit" className="bg-sky-500 text-black px-4 py-2 rounded-xl font-bold">Vincular</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL COUPON */}
      {couponModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSaveCoupon} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-4">
            <h3 className="font-bold text-white text-sm">{editingCoupon ? 'Editar Detalhes Cupom' : 'Vincular Novo Cupom'}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Código Promocional (Sem espaços) *</label>
                <input 
                  type="text"
                  value={cpCode}
                  onChange={(e) => setCpCode(e.target.value)}
                  placeholder="Ex: GORDO10"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2.5 rounded-xl text-sm font-mono tracking-wider"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tipo Desconto</label>
                  <select 
                    value={cpType}
                    onChange={(e) => setCpType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 px-2 py-2 rounded-xl text-xs text-white"
                  >
                    <option value="percentual">Percentual %</option>
                    <option value="fixo">Dinheiro R$</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Valor Abatido *</label>
                  <input 
                    type="number"
                    value={cpVal}
                    onChange={(e) => setCpVal(Number(e.target.value))}
                    placeholder="Ex: 10"
                    className="w-full bg-slate-950 border border-slate-800 px-2 py-2 rounded-xl text-xs"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Pedido Mínimo (R$)</label>
                <input 
                  type="number"
                  value={cpMin}
                  onChange={(e) => setCpMin(Number(e.target.value))}
                  placeholder="Ex: 50.00"
                  className="w-full bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs font-bold pt-2">
              <button type="button" onClick={() => setCouponModalOpen(false)} className="bg-slate-800 px-4 py-2 rounded-xl">Cancelar</button>
              <button type="submit" className="bg-sky-500 text-black px-4 py-2 rounded-xl">Confirmar</button>
            </div>
          </form>
        </div>
      )}

      {/* SECTION: CALENDÁRIO DE DIAS */}
      {activeMenu === 'calendar' && (() => {
        const { year, month } = calendarMonth;
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const weekDays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        const today = new Date().toISOString().split('T')[0];

        const goToPrevMonth = async () => {
          const newMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
          setCalendarMonth(newMonth);
          if (!currentStore) return;
          const start = new Date(newMonth.year, newMonth.month, 1).toISOString();
          const end = new Date(newMonth.year, newMonth.month + 1, 0, 23, 59, 59).toISOString();
          const { data } = await supabase.from('pedidos').select('created_at, total, status').eq('loja_id', currentStore.id).gte('created_at', start).lte('created_at', end);
          if (data) {
            const summary: Record<string, { count: number; revenue: number }> = {};
            data.forEach((o: any) => {
              const day = new Date(o.created_at).toISOString().split('T')[0];
              if (!summary[day]) summary[day] = { count: 0, revenue: 0 };
              summary[day].count++;
              if (o.status !== 'cancelado') summary[day].revenue += Number(o.total || 0);
            });
            setCalendarDaySummary(summary);
          }
        };

        const goToNextMonth = async () => {
          const newMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
          setCalendarMonth(newMonth);
          if (!currentStore) return;
          const start = new Date(newMonth.year, newMonth.month, 1).toISOString();
          const end = new Date(newMonth.year, newMonth.month + 1, 0, 23, 59, 59).toISOString();
          const { data } = await supabase.from('pedidos').select('created_at, total, status').eq('loja_id', currentStore.id).gte('created_at', start).lte('created_at', end);
          if (data) {
            const summary: Record<string, { count: number; revenue: number }> = {};
            data.forEach((o: any) => {
              const day = new Date(o.created_at).toISOString().split('T')[0];
              if (!summary[day]) summary[day] = { count: 0, revenue: 0 };
              summary[day].count++;
              if (o.status !== 'cancelado') summary[day].revenue += Number(o.total || 0);
            });
            setCalendarDaySummary(summary);
          }
        };

        const handleDayClick = async (dayStr: string) => {
          if (!currentStore) return;
          setCalendarSelectedDay(dayStr);
          setCalendarDayLoading(true);
          setCalendarDayModalOpen(true);
          setCalendarDayOrders([]);
          const startOfDay = `${dayStr}T00:00:00.000Z`;
          const endOfDay = `${dayStr}T23:59:59.999Z`;
          const { data } = await supabase
            .from('pedidos')
            .select('*')
            .eq('loja_id', currentStore.id)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .order('created_at', { ascending: true });
          if (data) {
            setCalendarDayOrders(data.map((o: any) => ({
              id: o.id,
              store_id: o.loja_id,
              numero_pedido: o.numero_pedido,
              cliente_nome: o.cliente_nome,
              cliente_whatsapp: o.cliente_whatsapp,
              cliente_endereco: o.cliente_endereco,
              cliente_bairro: o.cliente_bairro,
              subtotal: Number(o.subtotal || 0),
              taxa_entrega: Number(o.taxa_entrega || 0),
              desconto: Number(o.desconto || 0),
              total: Number(o.total || 0),
              forma_pagamento: o.forma_pagamento,
              troco: o.troco || undefined,
              status: o.status,
              itens: Array.isArray(o.itens) ? o.itens : [],
              criado_em: o.created_at || o.criado_em
            })));
          }
          setCalendarDayLoading(false);
        };

        return null; // render via separate section below
      })()}

      {activeMenu === 'calendar' && (() => {
        const { year, month } = calendarMonth;
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
        const weekDays = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
        const today = new Date().toISOString().split('T')[0];

        const goToPrevMonth = async () => {
          const newMonth = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
          setCalendarMonth(newMonth);
          if (!currentStore) return;
          const start = new Date(newMonth.year, newMonth.month, 1).toISOString();
          const end = new Date(newMonth.year, newMonth.month + 1, 0, 23, 59, 59).toISOString();
          const { data } = await supabase.from('pedidos').select('created_at, total, status').eq('loja_id', currentStore.id).gte('created_at', start).lte('created_at', end);
          if (data) {
            const summary: Record<string, { count: number; revenue: number }> = {};
            data.forEach((o: any) => {
              const day = new Date(o.created_at).toISOString().split('T')[0];
              if (!summary[day]) summary[day] = { count: 0, revenue: 0 };
              summary[day].count++;
              if (o.status !== 'cancelado') summary[day].revenue += Number(o.total || 0);
            });
            setCalendarDaySummary(summary);
          }
        };

        const goToNextMonth = async () => {
          const newMonth = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
          setCalendarMonth(newMonth);
          if (!currentStore) return;
          const start = new Date(newMonth.year, newMonth.month, 1).toISOString();
          const end = new Date(newMonth.year, newMonth.month + 1, 0, 23, 59, 59).toISOString();
          const { data } = await supabase.from('pedidos').select('created_at, total, status').eq('loja_id', currentStore.id).gte('created_at', start).lte('created_at', end);
          if (data) {
            const summary: Record<string, { count: number; revenue: number }> = {};
            data.forEach((o: any) => {
              const day = new Date(o.created_at).toISOString().split('T')[0];
              if (!summary[day]) summary[day] = { count: 0, revenue: 0 };
              summary[day].count++;
              if (o.status !== 'cancelado') summary[day].revenue += Number(o.total || 0);
            });
            setCalendarDaySummary(summary);
          }
        };

        const handleDayClick = async (dayStr: string) => {
          if (!currentStore) return;
          setCalendarSelectedDay(dayStr);
          setCalendarDayLoading(true);
          setCalendarDayModalOpen(true);
          setCalendarDayOrders([]);
          // Ajusta fuso horário para buscar o dia local correto
          const [y, m, d] = dayStr.split('-').map(Number);
          const startOfDay = new Date(y, m - 1, d, 0, 0, 0).toISOString();
          const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
          const { data } = await supabase
            .from('pedidos')
            .select('*')
            .eq('loja_id', currentStore.id)
            .gte('created_at', startOfDay)
            .lte('created_at', endOfDay)
            .order('created_at', { ascending: true });
          if (data) {
            setCalendarDayOrders(data.map((o: any) => ({
              id: o.id,
              store_id: o.loja_id,
              numero_pedido: o.numero_pedido,
              cliente_nome: o.cliente_nome,
              cliente_whatsapp: o.cliente_whatsapp,
              cliente_endereco: o.cliente_endereco,
              cliente_bairro: o.cliente_bairro,
              subtotal: Number(o.subtotal || 0),
              taxa_entrega: Number(o.taxa_entrega || 0),
              desconto: Number(o.desconto || 0),
              total: Number(o.total || 0),
              forma_pagamento: o.forma_pagamento,
              troco: o.troco || undefined,
              status: o.status,
              itens: Array.isArray(o.itens) ? o.itens : [],
              criado_em: o.created_at || o.criado_em
            })));
          }
          setCalendarDayLoading(false);
        };

        // Build calendar grid
        const cells: (number | null)[] = [];
        for (let i = 0; i < firstDay; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);

        return (
          <>
            {/* CALENDAR VIEW */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {/* Calendar Header */}
              <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-white font-black text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Calendário de Pedidos
                  </h2>
                  <p className="text-sky-200 text-xs mt-0.5">Clique em um dia para ver todos os pedidos e faturamento</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={goToPrevMonth} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white">
                    <ChevronDown className="w-4 h-4 rotate-90" />
                  </button>
                  <span className="text-white font-bold text-sm min-w-[140px] text-center">{monthNames[month]} {year}</span>
                  <button onClick={goToNextMonth} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-white">
                    <ChevronDown className="w-4 h-4 -rotate-90" />
                  </button>
                </div>
              </div>

              {/* Week day headers */}
              <div className="grid grid-cols-7 border-b border-slate-800">
                {weekDays.map(d => (
                  <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7">
                {cells.map((day, idx) => {
                  if (!day) return <div key={`empty-${idx}`} className="border-b border-r border-slate-800/50 min-h-[80px]" />;
                  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const summary = calendarDaySummary[dateStr];
                  const isToday = dateStr === today;
                  const hasData = !!summary;
                  return (
                    <button
                      key={dateStr}
                      onClick={() => handleDayClick(dateStr)}
                      className={`border-b border-r border-slate-800/50 min-h-[80px] p-2 text-left transition hover:bg-slate-800/60 group relative ${
                        isToday ? 'bg-sky-500/10 border-sky-500/30' : ''
                      }`}
                    >
                      <span className={`text-xs font-bold block mb-1 ${
                        isToday ? 'text-sky-400' : 'text-slate-400 group-hover:text-white'
                      }`}>
                        {day}{isToday && <span className="ml-1 text-[9px] bg-sky-500 text-black px-1 rounded font-black">Hoje</span>}
                      </span>
                      {hasData && (
                        <div className="space-y-0.5">
                          <div className="bg-emerald-500/20 rounded px-1.5 py-0.5">
                            <span className="text-emerald-400 text-[10px] font-bold">{summary.count} pedido{summary.count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="bg-sky-500/20 rounded px-1.5 py-0.5">
                            <span className="text-sky-400 text-[10px] font-bold">R$ {summary.revenue.toFixed(0)}</span>
                          </div>
                        </div>
                      )}
                      {!hasData && (
                        <span className="text-slate-700 text-[10px]">Sem pedidos</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="px-6 py-3 border-t border-slate-800 flex items-center gap-5 text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-emerald-500/30"></div> Pedidos</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-sky-500/30"></div> Faturamento</div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded bg-sky-500/20 border border-sky-500/30"></div> Hoje</div>
              </div>
            </div>

            {/* MODAL DETALHE DO DIA */}
            {calendarDayModalOpen && calendarSelectedDay && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                  {/* Header do modal */}
                  <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-6 py-4 flex items-center justify-between shrink-0">
                    <div>
                      <h2 className="text-white font-black text-base flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        {new Date(calendarSelectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                      </h2>
                      <p className="text-sky-200 text-xs mt-0.5">Todos os pedidos deste dia</p>
                    </div>
                    <button onClick={() => setCalendarDayModalOpen(false)} className="text-white/70 hover:text-white transition p-1">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {calendarDayLoading ? (
                    <div className="flex-1 flex items-center justify-center py-16">
                      <div className="flex items-center gap-3 text-sky-400">
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span className="text-sm font-semibold">Carregando pedidos do dia...</span>
                      </div>
                    </div>
                  ) : calendarDayOrders.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-500">
                      <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm font-semibold">Nenhum pedido encontrado neste dia</p>
                    </div>
                  ) : (
                    <div className="flex-1 overflow-y-auto">
                      {/* Resumo do dia */}
                      <div className="px-6 py-4 border-b border-slate-800 grid grid-cols-4 gap-3">
                        <div className="bg-slate-800 rounded-xl p-3 text-center">
                          <p className="text-emerald-400 font-black text-lg">{calendarDayOrders.filter(o => o.status !== 'cancelado').length}</p>
                          <p className="text-slate-400 text-[10px] font-semibold mt-0.5">Realizados</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-3 text-center">
                          <p className="text-sky-400 font-black text-lg">R$ {calendarDayOrders.filter(o => o.status !== 'cancelado').reduce((s, o) => s + o.total, 0).toFixed(0)}</p>
                          <p className="text-slate-400 text-[10px] font-semibold mt-0.5">Faturamento</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-3 text-center">
                          <p className="text-orange-400 font-black text-lg">{calendarDayOrders.filter(o => o.status === 'cancelado').length}</p>
                          <p className="text-slate-400 text-[10px] font-semibold mt-0.5">Cancelados</p>
                        </div>
                        <div className="bg-slate-800 rounded-xl p-3 text-center">
                          <p className="text-violet-400 font-black text-lg">
                            R$ {calendarDayOrders.filter(o => o.status !== 'cancelado').length > 0
                              ? (calendarDayOrders.filter(o => o.status !== 'cancelado').reduce((s, o) => s + o.total, 0) / calendarDayOrders.filter(o => o.status !== 'cancelado').length).toFixed(0)
                              : '0'}
                          </p>
                          <p className="text-slate-400 text-[10px] font-semibold mt-0.5">Ticket Médio</p>
                        </div>
                      </div>

                      {/* Lista de pedidos */}
                      <div className="px-6 py-4 space-y-3">
                        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Pedidos do Dia</p>
                        {calendarDayOrders.map((order) => {
                          const hora = new Date(order.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                          const statusColors: Record<string, string> = {
                            novo: 'bg-blue-500/20 text-blue-400',
                            preparando: 'bg-amber-500/20 text-amber-400',
                            saiu_entrega: 'bg-orange-500/20 text-orange-400',
                            entregue: 'bg-emerald-500/20 text-emerald-400',
                            cancelado: 'bg-red-500/20 text-red-400',
                          };
                          const itens = Array.isArray(order.itens) ? order.itens : [];
                          return (
                            <div key={order.id} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-black text-sm">#{order.numero_pedido}</span>
                                  <span className="text-slate-400 text-xs">• {hora}</span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColors[order.status] || 'bg-slate-700 text-slate-400'}`}>{order.status}</span>
                                </div>
                                <span className="text-emerald-400 font-black text-sm">R$ {order.total.toFixed(2)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-slate-400">
                                <div><span className="text-slate-500">Cliente: </span><span className="text-slate-300 font-semibold">{order.cliente_nome}</span></div>
                                <div><span className="text-slate-500">WhatsApp: </span><span className="text-slate-300">{order.cliente_whatsapp}</span></div>
                                <div><span className="text-slate-500">Endereço: </span><span className="text-slate-300">{order.cliente_endereco}{order.cliente_bairro ? ` - ${order.cliente_bairro}` : ''}</span></div>
                                <div><span className="text-slate-500">Pagamento: </span><span className="text-slate-300">{order.forma_pagamento}</span></div>
                                {order.taxa_entrega > 0 && <div><span className="text-slate-500">Entrega: </span><span className="text-slate-300">R$ {order.taxa_entrega.toFixed(2)}</span></div>}
                                {order.desconto > 0 && <div><span className="text-slate-500">Desconto: </span><span className="text-red-400">-R$ {order.desconto.toFixed(2)}</span></div>}
                              </div>
                              {itens.length > 0 && (
                                <div className="border-t border-slate-700/50 pt-2 space-y-1">
                                  {itens.map((item: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                      <span className="text-slate-300">{item.quantity || item.qtd || 1}x {item.name || item.title || 'Item'}</span>
                                      <span className="text-slate-400">R$ {Number(item.price || 0).toFixed(2)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Rodapé */}
                  <div className="px-6 py-4 border-t border-slate-800 flex gap-3 shrink-0">
                    <button
                      onClick={() => {
                        // Gerar e baixar relatório do dia selecionado
                        const activeOrders = calendarDayOrders.filter(o => o.status !== 'cancelado');
                        const total = activeOrders.reduce((s, o) => s + o.total, 0);
                        const lines: string[] = [];
                        lines.push(`RELATÓRIO DO DIA - ${calendarSelectedDay}`);
                        lines.push(`Loja: ${currentStore?.nome || ''}`);
                        lines.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
                        lines.push('');
                        lines.push(`Total de pedidos: ${calendarDayOrders.length}`);
                        lines.push(`Faturamento: R$ ${total.toFixed(2)}`);
                        lines.push(`Cancelados: ${calendarDayOrders.filter(o => o.status === 'cancelado').length}`);
                        lines.push('');
                        lines.push('--- PEDIDOS ---');
                        calendarDayOrders.forEach(order => {
                          const hora = new Date(order.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                          lines.push(`\n#${order.numero_pedido} [${hora}] - ${order.status.toUpperCase()}`);
                          lines.push(`Cliente: ${order.cliente_nome} | WhatsApp: ${order.cliente_whatsapp}`);
                          lines.push(`Endereço: ${order.cliente_endereco}${order.cliente_bairro ? ` - ${order.cliente_bairro}` : ''}`);
                          lines.push(`Pagamento: ${order.forma_pagamento} | Total: R$ ${order.total.toFixed(2)}`);
                          const itens = Array.isArray(order.itens) ? order.itens : [];
                          itens.forEach((item: any) => lines.push(`  - ${item.quantity || 1}x ${item.name || item.title} = R$ ${Number(item.price || 0).toFixed(2)}`));
                        });
                        const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `relatorio_${calendarSelectedDay}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl py-3 flex items-center justify-center gap-2 transition"
                    >
                      <Upload className="w-4 h-4" /> Baixar Relatório
                    </button>
                    <button
                      onClick={() => setCalendarDayModalOpen(false)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold text-sm rounded-xl py-3 transition"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      })()}

      <ChatAdmin
        lojaId={currentStore?.id || null}
        nomeAdmin={currentStore?.nome || email || 'Admin'}
        corPrimaria="#38bdf8"
      />
    </div>
  );
}
