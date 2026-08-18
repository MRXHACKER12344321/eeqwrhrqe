import { useState, useEffect, useRef, Fragment, type ReactNode } from 'react';
import {
  X, ChevronLeft, ChevronRight, Check, Upload, Plus, Trash2,
  Flame, Info, AlertCircle, Edit2, Save
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { loadProductMeta, saveProductMeta } from '../lib/productMeta';
import { Category, Product } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Badge {
  id: string;
  label: string;
  backgroundColor: string;
  textColor: string;
  isCustom?: boolean;
}

interface GroupItem {
  id: string;
  name: string;
  isFree: boolean;
  price: number;
  foto_url?: string;
  description?: string;
}

interface OptionGroup {
  id: string;
  label: string;
  required: boolean;
  maxSelection: number; // 0 = unlimited
  controlType?: 'radio' | 'counter';
  items: GroupItem[];
  order: number;
}

interface PizzaSize {
  id: string;
  label: string;
  price: number;
  enabled: boolean;
}

interface PizzaMass {
  id: string;
  label: string;
  isFree: boolean;
  price: number;
}

interface PizzaBorder {
  id: string;
  label: string;
  isFree: boolean;
  price: number;
}

interface AcaiSize {
  id: string;
  label: string;
  price: number;
  enabled: boolean;
}

interface ProductSpecificConfig {
  // Pizza
  pizzaSizes?: PizzaSize[];
  pizzaMasses?: PizzaMass[];
  pizzaBorders?: PizzaBorder[];
  pizzaSaborMode?: 'single' | 'double';
  // Açaí
  acaiSizes?: AcaiSize[];
}

interface CriarProdutoModalProps {
  visible: boolean;
  product: Product | null;
  categories: Category[];
  storeId: string;
  storeNicho: string; // 'hamburgueria' | 'pizzaria' | 'acaiteria' | 'restaurante' | 'lanchonete'
  onClose: () => void;
  onSaved: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'info', label: 'Informações', icon: '📋' },
  { id: 'selos', label: 'Selos', icon: '🏷️' },
  { id: 'adicionais', label: 'Adicionais', icon: '➕' },
  { id: 'negocio', label: 'Tipo', icon: '⚙️' },
  { id: 'revisao', label: 'Revisão', icon: '✅' },
];

const PRESET_BADGES: Badge[] = [
  { id: 'destaque', label: '⭐ Destaque', backgroundColor: '#F59E0B', textColor: '#1C1917', isCustom: false },
  { id: 'novo', label: '🆕 Novo', backgroundColor: '#10B981', textColor: '#FFFFFF', isCustom: false },
  { id: 'mais-vendido', label: '🔥 Mais Vendido', backgroundColor: '#EF4444', textColor: '#FFFFFF', isCustom: false },
];

const DEFAULT_PIZZA_SIZES: PizzaSize[] = [
  { id: 'p', label: 'Pequena', price: 0, enabled: true },
  { id: 'm', label: 'Média', price: 0, enabled: true },
  { id: 'g', label: 'Grande', price: 0, enabled: true },
  { id: 'f', label: 'Família', price: 0, enabled: false },
];

const DEFAULT_PIZZA_MASSES: PizzaMass[] = [
  { id: 'trad', label: 'Tradicional', isFree: true, price: 0 },
  { id: 'fina', label: 'Fina', isFree: true, price: 0 },
  { id: 'pan', label: 'Pan', isFree: false, price: 3 },
];

const DEFAULT_PIZZA_BORDERS: PizzaBorder[] = [
  { id: 'sem', label: 'Sem borda', isFree: true, price: 0 },
  { id: 'cat', label: 'Catupiry', isFree: false, price: 8 },
  { id: 'ched', label: 'Cheddar', isFree: false, price: 8 },
  { id: 'choc', label: 'Chocolate', isFree: false, price: 8 },
];

const DEFAULT_ACAI_SIZES: AcaiSize[] = [
  { id: '300', label: '300ml', price: 0, enabled: true },
  { id: '500', label: '500ml', price: 0, enabled: true },
  { id: '700', label: '700ml', price: 0, enabled: true },
  { id: '1l', label: '1 Litro', price: 0, enabled: false },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepIndicator({ steps, current, onGoTo }: {
  steps: typeof STEPS;
  current: number;
  onGoTo: (i: number) => void;
}) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1 scrollbar-hide">
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <Fragment key={step.id}>
            <button
              type="button"
              onClick={() => onGoTo(i)}
              className={`flex flex-col items-center gap-1.5 min-w-[64px] transition-all duration-200 ${active ? 'opacity-100 scale-105' : done ? 'opacity-80 hover:opacity-100' : 'opacity-40 hover:opacity-60'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all duration-300 shadow-lg ${
                done
                  ? 'bg-gradient-to-br from-emerald-400 to-green-600 border-emerald-400 text-white shadow-emerald-500/30'
                  : active
                  ? 'bg-gradient-to-br from-blue-500 to-blue-700 border-blue-400 text-white shadow-blue-500/40'
                  : 'bg-gray-200 border-gray-300 text-gray-600'
              }`}>
                {done ? <Check size={16} /> : <span>{step.icon}</span>}
              </div>
              <span className={`text-[10px] font-bold whitespace-nowrap tracking-wide ${
                active ? 'text-blue-600' : done ? 'text-emerald-600' : 'text-gray-600'
              }`}>
                {step.label}
              </span>
            </button>
            {i < steps.length - 1 && (
              <div className={`h-0.5 flex-1 min-w-[16px] mx-1 rounded-full transition-all duration-500 ${
                i < current
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500'
                  : 'bg-gray-300'
              }`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

function SectionTitle({ children, subtitle }: { children: ReactNode; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">{children}</h3>
      {subtitle && <p className="text-sm text-gray-600 mt-1 leading-relaxed">{subtitle}</p>}
    </div>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
      {children}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

const inputCls = "w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-black placeholder-gray-500 hover:border-blue-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm";
const selectCls = "w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm text-black hover:border-blue-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CriarProdutoModal({
  visible, product, categories, storeId, storeNicho,
  onClose, onSaved, showToast
}: CriarProdutoModalProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedProductId, setSavedProductId] = useState<string | null>(null);

  // ── Step 1: Info ──
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preco, setPreco] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isPromo, setIsPromo] = useState(false);
  const [precoPromo, setPrecoPromo] = useState('');
  const [disponivel, setDisponivel] = useState(true);
  const [step1Saved, setStep1Saved] = useState(false);

  // ── Step 2: Selos ──
  const [activeBadgeIds, setActiveBadgeIds] = useState<string[]>([]);
  const [customBadges, setCustomBadges] = useState<Badge[]>([]);
  const [showCustomBadgeForm, setShowCustomBadgeForm] = useState(false);
  const [newBadgeLabel, setNewBadgeLabel] = useState('');
  const [newBadgeBg, setNewBadgeBg] = useState('#6366F1');
  const [newBadgeText, setNewBadgeText] = useState('#FFFFFF');
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);

  // ── Step 3: Adicionais ──
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  // Group form state
  const [gName, setGName] = useState('');
  const [gRequired, setGRequired] = useState(false);
  const [gMax, setGMax] = useState(1);
  const [gControlType, setGControlType] = useState<'radio' | 'counter'>('radio');
  const [gItems, setGItems] = useState<GroupItem[]>([]);
  // New item in group
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemFree, setNewItemFree] = useState(true);
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemFotoUrl, setNewItemFotoUrl] = useState('');
  const [newItemFotoFile, setNewItemFotoFile] = useState<File | null>(null);
  const [newItemFotoPreview, setNewItemFotoPreview] = useState('');
  const newItemFotoInputRef = useRef<HTMLInputElement>(null);

  // ── Step 4: Business specific ──
  const [pizzaSizes, setPizzaSizes] = useState<PizzaSize[]>(DEFAULT_PIZZA_SIZES);
  const [pizzaMasses, setPizzaMasses] = useState<PizzaMass[]>(DEFAULT_PIZZA_MASSES);
  const [pizzaBorders, setPizzaBorders] = useState<PizzaBorder[]>(DEFAULT_PIZZA_BORDERS);
  const [pizzaSaborMode, setPizzaSaborMode] = useState<'single' | 'double'>('single');
  const [acaiSizes, setAcaiSizes] = useState<AcaiSize[]>(DEFAULT_ACAI_SIZES);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  const nicho = storeNicho?.toLowerCase() || 'hamburgueria';
  const showBusinessStep = ['pizzaria', 'acaiteria', 'restaurante'].includes(nicho);

  const visibleSteps = showBusinessStep ? STEPS : STEPS.filter(s => s.id !== 'negocio');
  const currentStep = visibleSteps[stepIdx];

  // ── Load existing product ──
  useEffect(() => {
    if (!visible) return;
    setStepIdx(0);
    setSaving(false);

    if (product) {
      setSavedProductId(product.id);
      setName(product.name || '');
      setDescription(product.description || '');
      setPreco(String(product.preco || ''));
      setCategoryId(product.category_id || '');
      setImageUrl(product.foto_url || '');
      setImagePreview(product.foto_url || '');
      setIsPromo(!!product.preco_promocional);
      setPrecoPromo(product.preco_promocional ? String(product.preco_promocional) : '');
      setDisponivel(product.disponivel ?? true);
      setStep1Saved(true);
      setImageFile(null);

      let meta = loadProductMeta(product.id);
      if (!meta && product.sku && typeof product.sku === 'string' && product.sku.trim().startsWith('{')) {
        try {
          const parsed = JSON.parse(product.sku);
          if (parsed && (parsed.optionGroups || parsed.badges)) {
            meta = parsed;
            try {
              localStorage.setItem(`pedifacil_product_meta_${product.id}`, product.sku);
            } catch {}
          }
        } catch {}
      }

      if (meta) {
        const presetsActive = PRESET_BADGES.filter(pb =>
          meta.badges?.some(b => b.label.toLowerCase().includes(pb.label.toLowerCase().replace(/[^\w\s]/g, '').trim()))
        ).map(pb => pb.id);
        setActiveBadgeIds(presetsActive);

        const customs = (meta.badges || []).filter(b => {
          const match = PRESET_BADGES.find(pb =>
            b.label.toLowerCase().includes(pb.label.toLowerCase().replace(/[^\w\s]/g, '').trim())
          );
          return !match && b.label !== 'PROMOÇÃO' && b.label !== 'Promoção';
        }).map(b => ({
          id: b.id,
          label: b.label,
          backgroundColor: b.backgroundColor,
          textColor: b.textColor,
          isCustom: true,
        }));
        setCustomBadges(customs);

        setOptionGroups((meta.optionGroups || []).map((g: any, idx: number) => ({
          id: g.id,
          label: g.label,
          required: g.required,
          maxSelection: g.maxSelection,
          controlType: g.controlType || 'radio',
          items: g.items || [],
          order: idx + 1,
        })));

        // Load specific config
        const spec = (meta as any).specificConfig as ProductSpecificConfig | undefined;
        if (spec) {
          if (spec.pizzaSizes) setPizzaSizes(spec.pizzaSizes);
          if (spec.pizzaMasses) setPizzaMasses(spec.pizzaMasses);
          if (spec.pizzaBorders) setPizzaBorders(spec.pizzaBorders);
          if (spec.pizzaSaborMode) setPizzaSaborMode(spec.pizzaSaborMode);
          if (spec.acaiSizes) setAcaiSizes(spec.acaiSizes);
        }
      } else {
        resetBadges();
        resetGroups();
        resetSpecific();
      }
    } else {
      setSavedProductId(null);
      setStep1Saved(false);
      setName('');
      setDescription('');
      setPreco('');
      setCategoryId(categories[0]?.id || '');
      setImageFile(null);
      setImageUrl('');
      setImagePreview('');
      setIsPromo(false);
      setPrecoPromo('');
      setDisponivel(true);
      resetBadges();
      resetGroups();
      resetSpecific();
    }
  }, [visible, product]);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  function resetBadges() {
    setActiveBadgeIds([]);
    setCustomBadges([]);
    setShowCustomBadgeForm(false);
    setNewBadgeLabel('');
  }
  function resetGroups() {
    setOptionGroups([]);
    setEditingGroupId(null);
    setGName('');
    setGRequired(false);
    setGMax(1);
    setGItems([]);
    setNewItemName('');
    setNewItemFree(true);
    setNewItemPrice('');
  }
  function resetSpecific() {
    setPizzaSizes(DEFAULT_PIZZA_SIZES);
    setPizzaMasses(DEFAULT_PIZZA_MASSES);
    setPizzaBorders(DEFAULT_PIZZA_BORDERS);
    setPizzaSaborMode('single');
    setAcaiSizes(DEFAULT_ACAI_SIZES);
  }

  if (!visible) return null;

  const scrollToTop = () => {
    if (modalBodyRef.current) {
      modalBodyRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ── Step 1: Save Info ──
  async function handleSaveInfo() {
    if (!name.trim()) { showToast('Informe o nome do produto.', 'error'); return; }
    if (!preco || Number(preco) <= 0) { showToast('Informe um preço válido.', 'error'); return; }
    if (!categoryId) { showToast('Selecione uma categoria.', 'error'); return; }

    setSaving(true);
    const pid = savedProductId || product?.id || crypto.randomUUID();

    let finalImageUrl = imageUrl;
    if (imageFile) {
      try {
        const fileName = `${crypto.randomUUID()}-${imageFile.name}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, imageFile);
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
          finalImageUrl = publicUrl;
          setImageUrl(publicUrl);
          setImageFile(null);
        }
      } catch {
        // ignore upload failure, continue with base image
      }
    }

    let existingMeta = loadProductMeta(pid);
    if (!existingMeta && product?.sku && typeof product.sku === 'string' && product.sku.trim().startsWith('{')) {
      try {
        existingMeta = JSON.parse(product.sku);
      } catch {}
    }

    const skuToSave = existingMeta ? JSON.stringify(existingMeta) : (product?.sku || undefined);

    const dbPayload: any = {
      id: pid,
      loja_id: storeId,
      categoria_id: categoryId,
      nome: name.trim(),
      descricao: description.trim(),
      preco: Number(preco),
      preco_promocional: isPromo && precoPromo ? Number(precoPromo) : null,
      foto_url: finalImageUrl || null,
      disponivel,
      destaque: activeBadgeIds.includes('destaque'),
      is_novo: activeBadgeIds.includes('novo'),
      tempo_preparo: 15,
      ordem: product?.ordem ?? 0,
    };

    if (skuToSave) {
      dbPayload.sku = skuToSave;
    }

    // Assegurar que a categoria selecionada existe no Supabase para não violar Foreign Key
    if (categoryId) {
      try {
        const catObj = categories.find(c => c.id === categoryId);
        if (catObj) {
          await supabase.from('categorias').upsert({
            id: catObj.id,
            loja_id: storeId,
            nome: catObj.name || (catObj as any).nome || 'Categoria',
            ordem: catObj.ordem || 1,
            ativo: catObj.is_active !== false
          }, { onConflict: 'id' });
        }
      } catch (catErr) {
        console.warn('Aviso ao sincronizar categoria no Supabase:', catErr);
      }
    }

    let savedInCloud = false;
    try {
      if (product || savedProductId) {
        const { error } = await supabase.from('produtos').update(dbPayload).eq('id', pid);
        if (!error) savedInCloud = true;
        else console.error('Erro ao atualizar produto no Supabase:', error);
      } else {
        const { error } = await supabase.from('produtos').insert([dbPayload]);
        if (!error) savedInCloud = true;
        else console.error('Erro ao inserir produto no Supabase:', error);
      }
    } catch (err) {
      console.error('Erro de conexão ao salvar no Supabase:', err);
    }

    if (savedInCloud && existingMeta) {
      await saveProductMeta(pid, existingMeta);
    }

    // Always sync with local storage fallback so app works seamlessly
    try {
      const localKey = `pedifacil_local_products_${storeId}`;
      const localProds = JSON.parse(localStorage.getItem(localKey) || '[]');
      const index = localProds.findIndex((p: any) => p.id === pid);
      const localItem = {
        id: pid,
        store_id: storeId,
        loja_id: storeId,
        category_id: categoryId,
        name: name.trim(),
        nome: name.trim(),
        description: description.trim(),
        descricao: description.trim(),
        preco: Number(preco),
        preco_promocional: isPromo && precoPromo ? Number(precoPromo) : null,
        foto_url: finalImageUrl || null,
        disponivel,
        destaque: activeBadgeIds.includes('destaque'),
        is_novo: activeBadgeIds.includes('novo'),
        ordem: dbPayload.ordem,
        sku: existingMeta ? JSON.stringify(existingMeta) : (product?.sku || null),
      };

      if (index >= 0) {
        localProds[index] = { ...localProds[index], ...localItem };
      } else {
        localProds.push(localItem);
      }
      localStorage.setItem(localKey, JSON.stringify(localProds));

      // Global fallback database
      const dbProds = JSON.parse(localStorage.getItem('pedifacil_db_products') || '[]');
      const dbIndex = dbProds.findIndex((p: any) => p.id === pid);
      if (dbIndex >= 0) {
        dbProds[dbIndex] = { ...dbProds[dbIndex], ...localItem };
      } else {
        dbProds.push(localItem);
      }
      localStorage.setItem('pedifacil_db_products', JSON.stringify(dbProds));
    } catch {
      // local storage error ignored
    }

    setSavedProductId(pid);
    setStep1Saved(true);
    setSaving(false);
    showToast(savedInCloud ? '✅ Informações salvas!' : '✅ Salvo com sucesso!', 'success');
    
    // Advance to next step (Selos)
    setStepIdx(1);
    setTimeout(scrollToTop, 100);
  }

  // ── Step 2: Save Badges ──
  async function handleSaveBadges() {
    const pid = savedProductId;
    if (!pid) { showToast('Salve as informações primeiro.', 'error'); return; }

    const existing = loadProductMeta(pid) || { badges: [], optionGroups: [] };

    const promoBadge = isPromo ? [{
      id: 'auto-promo',
      label: 'PROMOÇÃO',
      backgroundColor: '#FF3D00',
      textColor: '#FFFFFF',
    }] : [];

    const presetActive = PRESET_BADGES.filter(pb => activeBadgeIds.includes(pb.id)).map(pb => ({
      id: pb.id,
      label: pb.label,
      backgroundColor: pb.backgroundColor,
      textColor: pb.textColor,
    }));

    const custom = customBadges.map(cb => ({
      id: cb.id,
      label: cb.label,
      backgroundColor: cb.backgroundColor,
      textColor: cb.textColor,
    }));

    await saveProductMeta(pid, {
      ...existing,
      badges: [...promoBadge, ...presetActive, ...custom],
    });

    showToast('✅ Selos salvos!', 'success');
    setStepIdx(prev => Math.min(prev + 1, visibleSteps.length - 1));
  }

  // ── Step 3: Group management ──
  function handleOpenNewGroup() {
    setEditingGroupId('__new__');
    setGName('');
    setGRequired(false);
    setGMax(1);
    setGControlType('radio');
    setGItems([]);
    setNewItemName('');
    setNewItemDescription('');
    setNewItemFree(true);
    setNewItemPrice('');
    setNewItemFotoUrl('');
    setNewItemFotoFile(null);
    setNewItemFotoPreview('');
  }

  function handleOpenEditGroup(g: OptionGroup) {
    setEditingGroupId(g.id);
    setGName(g.label);
    setGRequired(g.required);
    setGMax(g.maxSelection);
    setGControlType(g.controlType || 'radio');
    setGItems([...g.items]);
    setNewItemName('');
    setNewItemDescription('');
    setNewItemFree(true);
    setNewItemPrice('');
    setNewItemFotoUrl('');
    setNewItemFotoFile(null);
    setNewItemFotoPreview('');
  }

  async function uploadOptionImage(file: File): Promise<string | null> {
    try {
      const fileName = `option-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        return publicUrl;
      }
    } catch (err) {
      console.warn('Erro ao carregar foto do adicional:', err);
    }
    return null;
  }

  async function handleAddItemToGroup() {
    if (!newItemName.trim()) { showToast('Digite o nome do item.', 'error'); return; }

    let finalFotoUrl = newItemFotoUrl;
    if (newItemFotoFile) {
      const uploaded = await uploadOptionImage(newItemFotoFile);
      if (uploaded) {
        finalFotoUrl = uploaded;
      } else {
        finalFotoUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(newItemFotoFile);
        });
      }
    }

    setGItems(prev => [...prev, {
      id: crypto.randomUUID(),
      name: newItemName.trim(),
      description: newItemDescription.trim() || undefined,
      isFree: newItemFree,
      price: newItemFree ? 0 : Number(newItemPrice || 0),
      foto_url: finalFotoUrl || undefined,
    }]);
    setNewItemName('');
    setNewItemDescription('');
    setNewItemFree(true);
    setNewItemPrice('');
    setNewItemFotoUrl('');
    setNewItemFotoFile(null);
    setNewItemFotoPreview('');
  }

  async function handleSaveGroup() {
    if (!gName.trim()) { showToast('Digite o nome do grupo.', 'error'); return; }
    if (gItems.length === 0) { showToast('Adicione ao menos um item ao grupo.', 'error'); return; }

    const newItems = gItems.map((it, idx) => ({ ...it, order: idx, available: true }));
    let updatedGroups: OptionGroup[] = [];

    if (editingGroupId === '__new__') {
      const newGroup: OptionGroup = {
        id: crypto.randomUUID(),
        label: gName.trim(),
        required: gRequired,
        maxSelection: gMax,
        controlType: gControlType,
        items: newItems,
        order: optionGroups.length + 1,
      };
      updatedGroups = [...optionGroups, newGroup];
    } else {
      updatedGroups = optionGroups.map(g =>
        g.id === editingGroupId
          ? { ...g, label: gName.trim(), required: gRequired, maxSelection: gMax, controlType: gControlType, items: newItems }
          : g
      );
    }
    setOptionGroups(updatedGroups);

    // Persist immediately to Supabase and localStorage
    const pid = savedProductId || product?.id;
    if (pid) {
      const existing = loadProductMeta(pid) || { badges: [], optionGroups: [] };
      await saveProductMeta(pid, {
        ...existing,
        optionGroups: updatedGroups.map((g, idx) => ({
          id: g.id,
          label: g.label,
          required: g.required,
          minSelection: g.required ? 1 : 0,
          maxSelection: g.maxSelection,
          controlType: g.controlType || 'radio',
          items: g.items.map((it, i) => ({ ...it, order: i, available: true })),
          order: idx,
        })),
      });
    }

    setEditingGroupId(null);
    showToast('✅ Grupo salvo!', 'success');
  }

  async function handleRemoveGroup(id: string) {
    const updated = optionGroups.filter(g => g.id !== id).map((g, i) => ({ ...g, order: i + 1 }));
    setOptionGroups(updated);
    const pid = savedProductId || product?.id;
    if (pid) {
      const existing = loadProductMeta(pid) || { badges: [], optionGroups: [] };
      await saveProductMeta(pid, {
        ...existing,
        optionGroups: updated.map((g, idx) => ({
          id: g.id,
          label: g.label,
          required: g.required,
          minSelection: g.required ? 1 : 0,
          maxSelection: g.maxSelection,
          controlType: g.controlType || 'radio',
          items: g.items.map((it, i) => ({ ...it, order: i, available: true })),
          order: idx,
        })),
      });
    }
    showToast('Grupo removido.', 'info');
  }

  async function handleSaveAdicionais() {
    const pid = savedProductId || product?.id;
    if (!pid) { showToast('Salve as informações primeiro.', 'error'); return; }
    const existing = loadProductMeta(pid) || { badges: [], optionGroups: [] };
    await saveProductMeta(pid, {
      ...existing,
      optionGroups: optionGroups.map((g, idx) => ({
        id: g.id,
        label: g.label,
        required: g.required,
        minSelection: g.required ? 1 : 0,
        maxSelection: g.maxSelection,
        controlType: g.controlType || 'radio',
        items: g.items.map((it, i) => ({ ...it, order: i, available: true })),
        order: idx,
      })),
    });
    showToast('✅ Adicionais salvos!', 'success');
    setStepIdx(prev => Math.min(prev + 1, visibleSteps.length - 1));
  }

  // ── Step 4: Business-specific save ──
  async function handleSaveBusinessConfig() {
    const pid = savedProductId || product?.id;
    if (!pid) { showToast('Salve as informações primeiro.', 'error'); return; }
    const existing = loadProductMeta(pid) || { badges: [], optionGroups: [] };
    const specificConfig: ProductSpecificConfig = {
      pizzaSizes, pizzaMasses, pizzaBorders, pizzaSaborMode, acaiSizes,
    };
    await saveProductMeta(pid, { ...existing, specificConfig } as any);
    showToast('✅ Configurações salvas!', 'success');
    setStepIdx(prev => Math.min(prev + 1, visibleSteps.length - 1));
  }

  // ── Finish ──
  async function handleFinish() {
    const pid = savedProductId || product?.id;
    if (pid && optionGroups.length > 0) {
      const existing = loadProductMeta(pid) || { badges: [], optionGroups: [] };
      await saveProductMeta(pid, {
        ...existing,
        optionGroups: optionGroups.map((g, idx) => ({
          id: g.id,
          label: g.label,
          required: g.required,
          minSelection: g.required ? 1 : 0,
          maxSelection: g.maxSelection,
          controlType: g.controlType || 'radio',
          items: g.items.map((it, i) => ({ ...it, order: i, available: true })),
          order: idx,
        })),
      }).catch(() => {});
    }
    onSaved();
    onClose();
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  const precoNum = Number(preco) || 0;
  const precoPromoNum = Number(precoPromo) || 0;

  function renderStep1() {
    return (
      <div className="space-y-5">
        <SectionTitle subtitle="Preencha os dados básicos do produto. Clique em Salvar para continuar.">
          📋 Informações do Produto
        </SectionTitle>

        {/* Name + Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldLabel required>Nome do Produto</FieldLabel>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Smash Burger Especial" className={inputCls} />
          </div>
          <div>
            <FieldLabel required>Categoria</FieldLabel>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={selectCls}>
              <option value="">Selecione...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name || c.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <FieldLabel>Descrição / O que vem</FieldLabel>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
            placeholder="Ex: Pizza grande com mussarela, pepperoni, borda recheada e molho especial."
            className={inputCls + " resize-none"}
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">Use este campo para informar o que vem no produto, especialmente para pizzas e pratos especiais.</p>
        </div>

        {/* Price section */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 to-gray-50 p-5 space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30 text-base">
                💰
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Preço</p>
                <p className="text-xs text-gray-600">Normal e promoções</p>
              </div>
            </div>
            {/* Promo toggle */}
            <button
              type="button"
              onClick={() => setIsPromo(v => !v)}
              className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 transition-all duration-300 focus:outline-none ${isPromo ? 'border-orange-500 bg-gradient-to-r from-orange-500 to-amber-500 shadow-lg shadow-orange-500/40' : 'border-gray-400 bg-gray-300'}`}
            >
              <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transform transition-transform duration-300 mt-0.5 ${isPromo ? 'translate-x-7' : 'translate-x-0.5'}`} />
            </button>
          </div>

          <div className={`grid gap-4 ${isPromo ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            <div>
              <FieldLabel required>Preço Normal (R$)</FieldLabel>
              <input
                type="number"
                step="0.01"
                min="0"
                value={preco}
                onChange={e => setPreco(e.target.value)}
                placeholder="0,00"
                className={inputCls + (isPromo ? ' line-through text-gray-400' : '')}
              />
            </div>
            {isPromo && (
              <div>
                <FieldLabel required>Preço Promocional (R$)</FieldLabel>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precoPromo}
                  onChange={e => setPrecoPromo(e.target.value)}
                  placeholder="0,00"
                  className={inputCls + " border-orange-500/60 focus:border-orange-400 focus:ring-orange-400/30"}
                />
              </div>
            )}
          </div>

          {/* Promo Preview */}
          {isPromo && precoNum > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-orange-50 border border-orange-200">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-0.5">Preview no cardápio:</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-600 line-through text-sm">{formatBRL(precoNum)}</span>
                  {precoPromoNum > 0 && <span className="text-gray-900 font-bold text-lg">{formatBRL(precoPromoNum)}</span>}
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-orange-500 text-white animate-pulse">PROMOÇÃO</span>
                </div>
              </div>
            </div>
          )}

          {isPromo && (
            <p className="text-xs text-orange-600 flex items-center gap-1.5">
              <Flame size={12} /> O selo <strong>PROMOÇÃO</strong> será exibido automaticamente no cardápio.
            </p>
          )}
        </div>

        {/* Image upload */}
        <div>
          <FieldLabel>Imagem do Produto</FieldLabel>
          <div
            className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-center cursor-pointer hover:border-blue-500/60 hover:bg-blue-50 transition-all group relative overflow-hidden"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); }
              }}
            />
            {imagePreview ? (
              <div className="space-y-3 relative z-10">
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-2xl mx-auto border-2 border-violet-500/40 shadow-xl shadow-violet-500/20" />
                  <div className="absolute inset-0 rounded-2xl ring-2 ring-violet-500/20" />
                </div>
                <p className="text-xs text-violet-400 group-hover:text-violet-300 font-semibold">Clique para trocar a imagem</p>
              </div>
            ) : (
              <div className="relative z-10">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-blue-200 to-gray-200 flex items-center justify-center group-hover:from-blue-300 transition-all">
                  <Upload className="w-6 h-6 text-gray-600 group-hover:text-blue-600 transition-colors" />
                </div>
                <p className="text-sm font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">Arraste ou clique para enviar</p>
                <p className="text-xs text-gray-600 mt-1">PNG, JPG até 5MB</p>
              </div>
            )}
          </div>
          {imageUrl && !imageFile && (
            <div className="mt-2 flex items-center justify-between text-xs text-gray-600 bg-gray-100 rounded-lg px-3 py-2">
              <span>Imagem salva no sistema</span>
              <button type="button" onClick={() => { setImageUrl(''); setImagePreview(''); }} className="text-red-500 hover:text-red-600">Remover</button>
            </div>
          )}
        </div>

        {/* Visibility */}
        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-2xl border border-gray-300 bg-gradient-to-r from-blue-50 to-gray-50 hover:border-blue-400 hover:from-blue-100 transition-all">
          <div
            onClick={() => setDisponivel(v => !v)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-all ${disponivel ? 'border-emerald-500 bg-gradient-to-r from-emerald-400 to-green-500 shadow-md shadow-emerald-500/40' : 'border-gray-400 bg-gray-300'}`}
          >
            <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${disponivel ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">Produto visível no cardápio</span>
            <p className="text-xs text-gray-600">{disponivel ? 'Aparece para os clientes' : 'Escondido no cardápio'}</p>
          </div>
          <span className={`ml-auto text-xs font-bold px-2 py-1 rounded-lg ${
            disponivel ? 'text-emerald-700 bg-emerald-100' : 'text-gray-600 bg-gray-200'
          }`}>{disponivel ? 'Ativo' : 'Oculto'}</span>
        </label>

        {/* Save button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSaveInfo}
            disabled={saving}
            className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white hover:from-blue-500 hover:via-blue-600 hover:to-blue-700 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
          >
            {saving ? (
              <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Salvando...</>
            ) : (
              <><Save size={16} /> Salvar Informações</>
            )}
          </button>
          {step1Saved && (
            <p className="text-center text-xs text-emerald-600 mt-2 flex items-center justify-center gap-1">
              <Check size={12} /> Informações já salvas — você pode continuar
            </p>
          )}
        </div>
      </div>
    );
  }

  function renderStep2() {
    const allBadges = [...customBadges];

    return (
      <div className="space-y-6">
        <SectionTitle subtitle="Escolha selos para exibir no cardápio. A promoção é controlada pelo preço, não por selos.">
          🏷️ Selos do Produto
        </SectionTitle>

        {isPromo && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-orange-500/10 border border-orange-500/30">
            <Flame size={16} className="text-orange-400 shrink-0" />
            <p className="text-xs text-orange-300">
              Este produto está em <strong>PROMOÇÃO</strong> — o selo vermelho será exibido automaticamente no cardápio.
            </p>
            <span className="ml-auto px-2 py-0.5 rounded text-xs font-bold bg-orange-500 text-white shrink-0">PROMOÇÃO</span>
          </div>
        )}

        {/* Preset badges */}
        <div>
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Selos pré-definidos</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PRESET_BADGES.map(pb => {
              const active = activeBadgeIds.includes(pb.id);
              return (
                <button
                  key={pb.id}
                  type="button"
                  onClick={() => setActiveBadgeIds(prev =>
                    active ? prev.filter(id => id !== pb.id) : [...prev, pb.id]
                  )}
                  className={`rounded-2xl border-2 p-4 text-left transition-all ${active ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: pb.backgroundColor, color: pb.textColor }}
                    >
                      {pb.label}
                    </span>
                    {active && <Check size={14} className="text-blue-600 ml-auto" />}
                  </div>
                  <p className="text-xs text-gray-600">{active ? 'Ativo — clique para remover' : 'Clique para ativar'}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom badges */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Selos personalizados</p>
            <button
              type="button"
              onClick={() => { setShowCustomBadgeForm(true); setEditingBadgeId(null); setNewBadgeLabel(''); setNewBadgeBg('#6366F1'); setNewBadgeText('#FFFFFF'); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Plus size={14} /> Criar selo personalizado
            </button>
          </div>

          {showCustomBadgeForm && (
            <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3 mb-4">
              <p className="text-sm font-semibold text-gray-900">{editingBadgeId ? 'Editar Selo' : 'Novo Selo Personalizado'}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <FieldLabel required>Nome do Selo</FieldLabel>
                  <input value={newBadgeLabel} onChange={e => setNewBadgeLabel(e.target.value)} placeholder="Ex: Exclusivo" className={inputCls} />
                </div>
                <div>
                  <FieldLabel>Cor do Fundo</FieldLabel>
                  <input type="color" value={newBadgeBg} onChange={e => setNewBadgeBg(e.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white cursor-pointer p-1" />
                </div>
                <div>
                  <FieldLabel>Cor do Texto</FieldLabel>
                  <input type="color" value={newBadgeText} onChange={e => setNewBadgeText(e.target.value)} className="h-11 w-full rounded-lg border border-gray-300 bg-white cursor-pointer p-1" />
                </div>
              </div>
              {newBadgeLabel && (
                <div className="flex items-center gap-2">
                  <p className="text-xs text-gray-600">Preview:</p>
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: newBadgeBg, color: newBadgeText }}>{newBadgeLabel}</span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (!newBadgeLabel.trim()) { showToast('Digite o nome do selo.', 'error'); return; }
                    if (editingBadgeId) {
                      setCustomBadges(prev => prev.map(b => b.id === editingBadgeId ? { ...b, label: newBadgeLabel.trim(), backgroundColor: newBadgeBg, textColor: newBadgeText } : b));
                    } else {
                      setCustomBadges(prev => [...prev, { id: crypto.randomUUID(), label: newBadgeLabel.trim(), backgroundColor: newBadgeBg, textColor: newBadgeText, isCustom: true }]);
                    }
                    setShowCustomBadgeForm(false);
                    setEditingBadgeId(null);
                    setNewBadgeLabel('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 transition-colors"
                >
                  {editingBadgeId ? 'Salvar Edição' : 'Adicionar Selo'}
                </button>
                <button type="button" onClick={() => setShowCustomBadgeForm(false)} className="px-4 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-300 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {allBadges.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-4 border border-dashed border-gray-300 rounded-xl">Nenhum selo personalizado. Clique em "+ Criar" para adicionar.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {allBadges.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-300 bg-gray-50">
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: b.backgroundColor, color: b.textColor }}>{b.label}</span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setEditingBadgeId(b.id); setNewBadgeLabel(b.label); setNewBadgeBg(b.backgroundColor); setNewBadgeText(b.textColor); setShowCustomBadgeForm(true); }} className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors">
                      <Edit2 size={12} />
                    </button>
                    <button type="button" onClick={() => setCustomBadges(prev => prev.filter(cb => cb.id !== b.id))} className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleSaveBadges}
          className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/30 transition-all flex items-center justify-center gap-2"
        >
          <Save size={16} /> Salvar Selos e Continuar
        </button>
      </div>
    );
  }

  function renderStep3() {
    const isEditingGroup = editingGroupId !== null;

    return (
      <div className="space-y-6">
        <SectionTitle subtitle="Crie grupos de adicionais como molhos, bebidas, ponto da carne, etc.">
          ➕ Adicionais
        </SectionTitle>

        {/* Editing a group */}
        {isEditingGroup && (
          <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5 space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">{editingGroupId === '__new__' ? '📝 Novo Grupo' : `✏️ Editando: ${gName}`}</p>
              <button type="button" onClick={() => setEditingGroupId(null)} className="p-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600">
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FieldLabel required>Nome do Grupo</FieldLabel>
                <input value={gName} onChange={e => setGName(e.target.value)} placeholder="Ex: Escolha seu molho" className={inputCls} />
              </div>
              <div>
                <FieldLabel>Máximo de seleções</FieldLabel>
                <select value={gMax} onChange={e => setGMax(Number(e.target.value))} className={selectCls}>
                  <option value={0}>Ilimitado</option>
                  <option value={1}>1 item</option>
                  <option value={2}>até 2 itens</option>
                  <option value={3}>até 3 itens</option>
                  <option value={4}>até 4 itens</option>
                  <option value={5}>até 5 itens</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-300 bg-gray-50 hover:border-gray-400 transition-colors">
              <div
                onClick={() => setGRequired(v => !v)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-all ${gRequired ? 'border-rose-500 bg-rose-500' : 'border-gray-400 bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${gRequired ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Obrigatório</p>
                <p className="text-xs text-gray-600">{gRequired ? 'Cliente deve escolher neste grupo' : 'Seleção opcional'}</p>
              </div>
              <span className={`ml-auto text-xs font-bold ${gRequired ? 'text-rose-600' : 'text-gray-600'}`}>{gRequired ? 'SIM' : 'NÃO'}</span>
            </label>

            {/* Tipo de controle: Bolinha ou Botão + */}
            <div>
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Tipo de Seleção no Cardápio</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGControlType('radio')}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    gControlType === 'radio'
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    gControlType === 'radio' ? 'border-blue-500' : 'border-gray-400'
                  }`}>
                    {gControlType === 'radio' && <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-bold">Bolinha</p>
                    <p className="text-[10px] opacity-70">Seleciona clicando</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setGControlType('counter')}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    gControlType === 'counter'
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 font-black text-xs ${
                    gControlType === 'counter' ? 'border-orange-500 text-orange-500' : 'border-gray-400'
                  }`}>
                    +
                  </span>
                  <div className="text-left">
                    <p className="text-xs font-bold">Botão +</p>
                    <p className="text-[10px] opacity-70">Quantidade com +/−</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Items list */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Itens do Grupo ({gItems.length})</p>
              {gItems.length === 0 && (
                <p className="text-xs text-gray-600 text-center py-3 border border-dashed border-gray-300 rounded-xl">Nenhum item ainda. Adicione abaixo.</p>
              )}
              {gItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-300 bg-gray-50">
                  {item.foto_url ? (
                    <img src={item.foto_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-gray-300 shrink-0" />
                  ) : (
                    <label className="w-10 h-10 rounded-lg border border-dashed border-gray-400 hover:border-blue-500 flex flex-col items-center justify-center cursor-pointer shrink-0 bg-gray-100 text-gray-600 hover:text-blue-600 transition-colors" title="Enviar foto">
                      <Upload size={14} />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            let url = await uploadOptionImage(file);
                            if (!url) {
                              url = await new Promise<string>((resolve) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result as string);
                                reader.readAsDataURL(file);
                              });
                            }
                            setGItems(prev => prev.map(i => i.id === item.id ? { ...i, foto_url: url } : i));
                          }
                        }}
                      />
                    </label>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{item.description}</p>
                    )}
                    <p className="text-xs text-gray-600 mt-0.5">
                      {item.isFree ? <span className="text-emerald-400">✓ Grátis — R$ 0,00</span> : <span className="text-amber-400">R$ {item.price.toFixed(2).replace('.', ',')}</span>}
                    </p>
                  </div>
                  {item.foto_url && (
                    <button
                      type="button"
                      title="Remover foto"
                      onClick={() => setGItems(prev => prev.map(i => i.id === item.id ? { ...i, foto_url: undefined } : i))}
                      className="p-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-red-600 transition-colors text-xs"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <button type="button" onClick={() => setGItems(prev => prev.filter(i => i.id !== item.id))} className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add new item */}
            <div className="rounded-xl border border-gray-300 bg-gray-50 p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-700">+ Adicionar Item</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="Nome do item (ex: Ketchup)" className={inputCls} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddItemToGroup())} />
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-gray-300 bg-white hover:border-gray-400 transition-colors">
                  <div
                    onClick={() => setNewItemFree(v => !v)}
                    className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 transition-all ${newItemFree ? 'border-emerald-500 bg-emerald-500' : 'border-gray-400 bg-gray-300'}`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${newItemFree ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{newItemFree ? 'Grátis' : 'Pago'}</span>
                </label>
              </div>
              {!newItemFree && (
                <div>
                  <FieldLabel>Preço adicional (R$)</FieldLabel>
                  <input type="number" step="0.01" min="0" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)} placeholder="0,00" className={inputCls} />
                </div>
              )}

              {/* Descrição do item / O que vem (ex: Pizza de Calabresa) */}
              <div>
                <FieldLabel>Descrição do item / O que vem (Opcional)</FieldLabel>
                <input
                  value={newItemDescription}
                  onChange={e => setNewItemDescription(e.target.value)}
                  placeholder="Ex: Molho de tomate, queijo mussarela, calabresa fatiada, cebola e azeitonas"
                  className={inputCls}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddItemToGroup())}
                />
              </div>

              {/* Upload de foto do item */}
              <div>
                <FieldLabel>Foto do Adicional / Opção (Opcional)</FieldLabel>
                <div className="flex items-center gap-3 mt-1">
                  <input
                    ref={newItemFotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewItemFotoFile(file);
                        setNewItemFotoPreview(URL.createObjectURL(file));
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => newItemFotoInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-300 bg-gray-50 hover:bg-gray-100 text-xs font-semibold text-gray-700 transition-colors"
                  >
                    <Upload size={14} className="text-sky-400" />
                    {newItemFotoPreview || newItemFotoUrl ? 'Alterar foto' : 'Enviar Foto do Adicional'}
                  </button>
                  {(newItemFotoPreview || newItemFotoUrl) && (
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-300">
                      <img src={newItemFotoPreview || newItemFotoUrl} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setNewItemFotoFile(null); setNewItemFotoPreview(''); setNewItemFotoUrl(''); }}
                        className="absolute top-0 right-0 p-0.5 bg-black/70 text-white hover:bg-rose-600 rounded-bl"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button type="button" onClick={handleAddItemToGroup} className="w-full py-2.5 rounded-xl border border-gray-300 bg-gray-50 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
                <Plus size={14} /> Adicionar Item
              </button>
            </div>

            <button type="button" onClick={handleSaveGroup} className="w-full py-3 rounded-2xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20">
              <Check size={16} /> Salvar Grupo
            </button>
          </div>
        )}

        {/* Groups list */}
        {!isEditingGroup && (
          <>
            {optionGroups.length === 0 ? (
              <div className="text-center py-10 rounded-2xl border border-dashed border-gray-300">
                <p className="text-gray-600 text-sm mb-1">Nenhum grupo configurado ainda</p>
                <p className="text-xs text-gray-500">Crie grupos como: Escolha o molho, Adicionais, Bebidas...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {optionGroups.map((group, idx) => (
                  <div key={group.id} className="rounded-2xl border border-gray-300 bg-gray-50 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{group.label}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-600">
                          <span className={group.required ? 'text-red-600 font-medium' : ''}>{group.required ? '● Obrigatório' : '○ Opcional'}</span>
                          <span>•</span>
                          <span>{group.maxSelection === 0 ? 'Ilimitado' : `Máx. ${group.maxSelection}`}</span>
                          <span>•</span>
                          <span>{group.items.length} item(ns)</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {group.items.slice(0, 4).map(item => (
                            <span key={item.id} className="px-2 py-0.5 rounded-md bg-gray-200 text-gray-700 text-[10px]">{item.name}</span>
                          ))}
                          {group.items.length > 4 && <span className="px-2 py-0.5 rounded-md bg-gray-200 text-gray-600 text-[10px]">+{group.items.length - 4} mais</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <button type="button" onClick={() => handleOpenEditGroup(group)} className="p-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-600 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button type="button" onClick={() => handleRemoveGroup(group.id)} className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-600 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button type="button" onClick={handleOpenNewGroup} className="w-full py-3 rounded-2xl border-2 border-dashed border-gray-300 hover:border-blue-500/50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 text-sm font-semibold transition-all flex items-center justify-center gap-2">
              <Plus size={16} /> Novo Grupo de Adicionais
            </button>

            <button type="button" onClick={handleSaveAdicionais} className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
              <Save size={16} /> Salvar Adicionais e Continuar
            </button>
          </>
        )}
      </div>
    );
  }

  function renderStep4() {
    if (nicho === 'pizzaria') {
      return (
        <div className="space-y-6">
          <SectionTitle subtitle="Configure tamanhos, massas e bordas para produtos de pizza.">
            🍕 Configurações de Pizza
          </SectionTitle>

          {/* Pizza visual */}
          <div className="rounded-2xl border border-gray-300 bg-gray-50 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">Modo de sabores</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              {[
                { value: 'single', label: '🍕 Sabor único', desc: 'Pizza inteira com 1 sabor' },
                { value: 'double', label: '🍕 2 Sabores', desc: 'Pizza dividida em 2 metades' },
              ].map(m => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPizzaSaborMode(m.value as any)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all ${pizzaSaborMode === m.value ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-gray-400'}`}
                >
                  <p className="font-semibold text-gray-900 text-sm">{m.label}</p>
                  <p className="text-xs text-gray-600 mt-1">{m.desc}</p>
                </button>
              ))}
            </div>

            {/* Pizza visual SVG */}
            <div className="flex justify-center">
              <div className="relative w-40 h-40">
                <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                  <circle cx="50" cy="50" r="48" fill="#F59E0B" />
                  <circle cx="50" cy="50" r="42" fill="#DC2626" />
                  {pizzaSaborMode === 'double' && (
                    <line x1="50" y1="2" x2="50" y2="98" stroke="#F59E0B" strokeWidth="3" />
                  )}
                  <circle cx="50" cy="50" r="6" fill="#F59E0B" />
                  {pizzaSaborMode === 'single' ? (
                    <text x="50" y="55" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">Inteira</text>
                  ) : (
                    <>
                      <text x="30" y="55" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Lado 1</text>
                      <text x="70" y="55" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">Lado 2</text>
                    </>
                  )}
                </svg>
              </div>
            </div>
          </div>

          {/* Sizes */}
          <div className="rounded-2xl border border-gray-300 bg-gray-50 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">📏 Tamanhos e Preços</p>
            <div className="space-y-3">
              {pizzaSizes.map((size, i) => (
                <div key={size.id} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer w-20">
                    <input type="checkbox" checked={size.enabled} onChange={e => setPizzaSizes(prev => prev.map((s, idx) => idx === i ? { ...s, enabled: e.target.checked } : s))} className="w-4 h-4 rounded accent-blue-500" />
                    <span className="text-sm text-gray-700">{size.label}</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={size.price || ''}
                    onChange={e => setPizzaSizes(prev => prev.map((s, idx) => idx === i ? { ...s, price: Number(e.target.value) } : s))}
                    placeholder="R$ 0,00"
                    disabled={!size.enabled}
                    className={inputCls + " flex-1 " + (!size.enabled ? 'opacity-40' : '')}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Masses */}
          <div className="rounded-2xl border border-gray-300 bg-gray-50 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">🫓 Tipos de Massa</p>
            <div className="space-y-3">
              {pizzaMasses.map((mass, i) => (
                <div key={mass.id} className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-700 w-24 shrink-0">{mass.label}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={mass.isFree} onChange={e => setPizzaMasses(prev => prev.map((m, idx) => idx === i ? { ...m, isFree: e.target.checked, price: e.target.checked ? 0 : m.price } : m))} className="w-4 h-4 rounded accent-emerald-500" />
                    <span className="text-xs text-gray-600">Grátis</span>
                  </label>
                  {!mass.isFree && (
                    <input type="number" step="0.01" min="0" value={mass.price || ''} onChange={e => setPizzaMasses(prev => prev.map((m, idx) => idx === i ? { ...m, price: Number(e.target.value) } : m))} placeholder="Preço" className={inputCls + " flex-1 max-w-[120px]"} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Borders */}
          <div className="rounded-2xl border border-gray-300 bg-gray-50 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">🧀 Bordas</p>
            <div className="space-y-3">
              {pizzaBorders.map((border, i) => (
                <div key={border.id} className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-gray-700 w-28 shrink-0">{border.label}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={border.isFree} onChange={e => setPizzaBorders(prev => prev.map((b, idx) => idx === i ? { ...b, isFree: e.target.checked, price: e.target.checked ? 0 : b.price } : b))} className="w-4 h-4 rounded accent-emerald-500" />
                    <span className="text-xs text-gray-600">Grátis</span>
                  </label>
                  {!border.isFree && (
                    <input type="number" step="0.01" min="0" value={border.price || ''} onChange={e => setPizzaBorders(prev => prev.map((b, idx) => idx === i ? { ...b, price: Number(e.target.value) } : b))} placeholder="Preço" className={inputCls + " flex-1 max-w-[120px]"} />
                  )}
                </div>
              ))}
            </div>
          </div>

          <button type="button" onClick={handleSaveBusinessConfig} className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
            <Save size={16} /> Salvar Configurações de Pizza
          </button>
        </div>
      );
    }

    if (nicho === 'acaiteria') {
      return (
        <div className="space-y-6">
          <SectionTitle subtitle="Configure tamanhos com preços para o produto de açaí.">
            🍧 Configurações de Açaí
          </SectionTitle>

          <div className="rounded-2xl border border-gray-300 bg-gray-50 p-5">
            <p className="text-sm font-semibold text-gray-900 mb-4">📏 Tamanhos e Preços</p>
            <div className="space-y-3">
              {acaiSizes.map((size, i) => (
                <div key={size.id} className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer w-24">
                    <input type="checkbox" checked={size.enabled} onChange={e => setAcaiSizes(prev => prev.map((s, idx) => idx === i ? { ...s, enabled: e.target.checked } : s))} className="w-4 h-4 rounded accent-blue-500" />
                    <span className="text-sm text-gray-700">{size.label}</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={size.price || ''}
                    onChange={e => setAcaiSizes(prev => prev.map((s, idx) => idx === i ? { ...s, price: Number(e.target.value) } : s))}
                    placeholder="R$ 0,00"
                    disabled={!size.enabled}
                    className={inputCls + " flex-1 " + (!size.enabled ? 'opacity-40' : '')}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-xs text-amber-400 flex items-start gap-2">
              <Info size={14} className="shrink-0 mt-0.5" />
              Os grupos de complementos (frutas, cremes, coberturas, etc.) são configurados na etapa <strong>Adicionais</strong> — use o mesmo sistema de grupos.
            </p>
          </div>

          <button type="button" onClick={handleSaveBusinessConfig} className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-sky-500 to-blue-600 text-white hover:from-sky-400 hover:to-blue-500 shadow-lg shadow-sky-500/30 transition-all flex items-center justify-center gap-2">
            <Save size={16} /> Salvar Configurações de Açaí
          </button>
        </div>
      );
    }

    // restaurante / other
    return (
      <div className="space-y-6">
        <SectionTitle subtitle="Configure opções específicas do tipo de estabelecimento.">
          ⚙️ Configurações do Tipo
        </SectionTitle>
        <div className="text-center py-10 rounded-2xl border border-dashed border-gray-300">
          <p className="text-4xl mb-3">🍽️</p>
          <p className="text-gray-700 font-medium">Configurações genéricas</p>
          <p className="text-xs text-gray-600 mt-2">Para este tipo de negócio, use a etapa de Adicionais para configurar acompanhamentos, extras e variações.</p>
        </div>
        <button type="button" onClick={() => setStepIdx(prev => Math.min(prev + 1, visibleSteps.length - 1))} className="w-full py-3.5 rounded-2xl font-bold text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600 shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center gap-2">
          Continuar para Revisão <ChevronRight size={16} />
        </button>
      </div>
    );
  }

  function renderStep5() {
    const activePresets = PRESET_BADGES.filter(pb => activeBadgeIds.includes(pb.id));
    const allBadges = [
      ...(isPromo ? [{ label: 'PROMOÇÃO', backgroundColor: '#FF3D00', textColor: '#FFFFFF' }] : []),
      ...activePresets,
      ...customBadges,
    ];

    return (
      <div className="space-y-6">
        <SectionTitle subtitle="Confirme as informações antes de finalizar.">
          ✅ Revisão do Produto
        </SectionTitle>

        {/* Info summary */}
        <div className="rounded-2xl border border-gray-300 bg-gray-50 p-5 space-y-4">
          <div className="flex gap-4">
            {imagePreview && (
              <img src={imagePreview} alt={name} className="w-20 h-20 object-cover rounded-xl border border-gray-300 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-lg">{name || '—'}</p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{description || 'Sem descrição'}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {isPromo && precoNum > 0 ? (
                  <>
                    <span className="text-gray-600 line-through text-sm">{formatBRL(precoNum)}</span>
                    {precoPromoNum > 0 && <span className="text-emerald-600 font-bold">{formatBRL(precoPromoNum)}</span>}
                  </>
                ) : (
                  <span className="text-gray-900 font-bold">{preco ? formatBRL(precoNum) : '—'}</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-gray-100 space-y-1">
              <p className="text-gray-600 font-medium">Categoria</p>
              <p className="text-gray-900">{categories.find(c => c.id === categoryId)?.name || categories.find(c => c.id === categoryId)?.nome || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-gray-100 space-y-1">
              <p className="text-gray-600 font-medium">Visibilidade</p>
              <p className={disponivel ? 'text-emerald-600' : 'text-gray-600'}>{disponivel ? 'Visível' : 'Oculto'}</p>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="rounded-2xl border border-gray-300 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Selos ({allBadges.length})</p>
          {allBadges.length === 0 ? (
            <p className="text-xs text-gray-600">Nenhum selo configurado.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {allBadges.map((b, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: b.backgroundColor, color: b.textColor }}>{b.label}</span>
              ))}
            </div>
          )}
        </div>

        {/* Groups */}
        <div className="rounded-2xl border border-gray-300 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">Adicionais ({optionGroups.length} grupos)</p>
          {optionGroups.length === 0 ? (
            <p className="text-xs text-gray-600">Nenhum grupo de adicionais.</p>
          ) : (
            <div className="space-y-2">
              {optionGroups.map((g, i) => (
                <div key={g.id} className="flex items-center gap-2 text-xs">
                  <span className="w-5 h-5 rounded bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-[10px]">{i + 1}</span>
                  <span className="text-gray-900 font-medium">{g.label}</span>
                  <span className="text-gray-600">— {g.items.length} item(ns)</span>
                  {g.required && <span className="text-red-600 font-semibold">Obrigatório</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        {!step1Saved && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
            <AlertCircle size={16} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">As informações básicas ainda não foram salvas. Volte à etapa 1 e clique em <strong>Salvar Informações</strong>.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setStepIdx(prev => Math.max(0, prev - 1))} className="py-3 rounded-2xl font-semibold text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors flex items-center justify-center gap-2">
            <ChevronLeft size={16} /> Voltar
          </button>
          <button type="button" onClick={handleFinish} disabled={!step1Saved} className="py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:from-emerald-400 hover:to-green-500 shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            <Check size={16} /> Concluir
          </button>
        </div>
      </div>
    );
  }

  function renderCurrentStep() {
    const id = currentStep?.id;
    if (id === 'info') return renderStep1();
    if (id === 'selos') return renderStep2();
    if (id === 'adicionais') return renderStep3();
    if (id === 'negocio') return renderStep4();
    if (id === 'revisao') return renderStep5();
    return null;
  }

  return (
    <div 
      ref={modalBodyRef}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center p-3 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-2xl my-4 rounded-3xl border border-gray-200 bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

        {/* Header with gradient */}
        <div className="relative p-6 bg-gradient-to-br from-blue-50 via-white to-gray-50 border-b border-gray-200 overflow-hidden">
          {/* Decorative glow blobs */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-200/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-blue-100/30 rounded-full blur-2xl pointer-events-none" />

          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full border border-gray-300 bg-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-200 hover:border-gray-400 transition-all z-50 pointer-events-auto cursor-pointer"
          >
            <X size={16} />
          </button>

          <div className="pr-12 relative z-10">
            <div className="inline-flex items-center gap-2 bg-blue-100 border border-blue-300 rounded-full px-3 py-1 mb-3">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">
                {product ? 'Editar Produto' : 'Criar Produto'}
              </p>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">
              {name || (product ? 'Editar produto' : 'Novo produto')}
            </h2>
          </div>

          <div className="mt-6">
            <StepIndicator
              steps={visibleSteps}
              current={stepIdx}
              onGoTo={(i) => {
                if (i < stepIdx || step1Saved) setStepIdx(i);
                else showToast('Salve as informações primeiro.', 'error');
              }}
            />
          </div>
        </div>

        {/* Body */}
        <div className="p-6 bg-white">
          {renderCurrentStep()}
        </div>

        {/* Footer nav */}
        {currentStep?.id !== 'revisao' && currentStep?.id !== 'info' && (
          <div className="px-6 pb-6 flex items-center justify-between gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={() => setStepIdx(prev => Math.max(0, prev - 1))}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-300 transition-colors"
            >
              <ChevronLeft size={15} /> Anterior
            </button>
            <span className="text-xs text-gray-600">{stepIdx + 1} / {visibleSteps.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}
