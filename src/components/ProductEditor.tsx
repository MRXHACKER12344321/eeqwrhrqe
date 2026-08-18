import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Product, Category, ProductMeta, ProductBadge, ProductOptionGroup } from '../types';
import { Plus, Upload, X, Sparkles, Star, Flame, Badge } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface ProductEditorProps {
  visible: boolean;
  product: Product | null;
  categories: Category[];
  meta?: ProductMeta;
  onClose: () => void;
  onSave: (productPayload: any, meta: ProductMeta, newId: string | null) => Promise<void>;
}

const emptyBadge: ProductBadge = {
  id: crypto.randomUUID(),
  label: '',
  backgroundColor: '#FF8A00',
  textColor: '#FFFFFF'
};

const emptyOptionGroup = (): ProductOptionGroup => ({
  id: crypto.randomUUID(),
  label: 'Novo grupo',
  required: false,
  minSelection: 0,
  maxSelection: 1,
  items: [
    { id: crypto.randomUUID(), name: 'Opção 1', price: 0, isFree: true, order: 1, available: true }
  ]
});

const defaultMeta: ProductMeta = {
  badges: [],
  optionGroups: []
};

function getProductType(category: Category | undefined) {
  const name = category?.name.toLowerCase() || '';
  if (name.includes('pizza')) return 'pizza';
  if (name.includes('açaí') || name.includes('acai')) return 'acai';
  if (name.includes('executivo') || name.includes('marmita') || name.includes('prato')) return 'restaurante';
  if (name.includes('hamburguer') || name.includes('burger')) return 'hamburgueria';
  return 'general';
}

export default function ProductEditor({ visible, product, categories, meta, onClose, onSave }: ProductEditorProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState(0);
  const [promoPrice, setPromoPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [available, setAvailable] = useState(true);
  const [badgeList, setBadgeList] = useState<ProductBadge[]>([]);
  const [optionGroups, setOptionGroups] = useState<ProductOptionGroup[]>([]);
  const [customBadgeLabel, setCustomBadgeLabel] = useState('');
  const [customBadgeBg, setCustomBadgeBg] = useState('#FF8A00');
  const [customBadgeText, setCustomBadgeText] = useState('#FFFFFF');
  const [pizzaSizes, setPizzaSizes] = useState([{ id: crypto.randomUUID(), label: 'Pequena', price: 0 }, { id: crypto.randomUUID(), label: 'Média', price: 0 }, { id: crypto.randomUUID(), label: 'Grande', price: 0 }]);
  const [acaiSizes, setAcaiSizes] = useState([{ id: crypto.randomUUID(), label: '300ml', price: 0 }, { id: crypto.randomUUID(), label: '500ml', price: 0 }, { id: crypto.randomUUID(), label: '700ml', price: 0 }, { id: crypto.randomUUID(), label: '1 Litro', price: 0 }]);
  const [score, setScore] = useState('');
  const [validationError, setValidationError] = useState('');

  const selectedCategory = useMemo(() => categories.find(c => c.id === categoryId), [categories, categoryId]);
  const productType = useMemo(() => getProductType(selectedCategory), [selectedCategory]);
  const productTypeLabel = useMemo(() => {
    switch (productType) {
      case 'pizza': return 'Pizza';
      case 'acai': return 'Açaí';
      case 'restaurante': return 'Restaurante';
      case 'hamburgueria': return 'Lanchonete';
      default: return 'Geral';
    }
  }, [productType]);

  const hasBadge = (label: string) => badgeList.some(b => b.label.toLowerCase() === label.toLowerCase());
  const togglePresetBadge = (label: string, color: string, textColor: string) => {
    setBadgeList(prev => {
      if (prev.some(b => b.label.toLowerCase() === label.toLowerCase())) {
        return prev.filter(b => b.label.toLowerCase() !== label.toLowerCase());
      }
      return [...prev, { id: crypto.randomUUID(), label, backgroundColor: color, textColor }];
    });
  };

  useEffect(() => {
    if (!visible) return;
    setName(product?.name || '');
    setDescription(product?.description || '');
    setPrice(product?.preco || 0);
    setPromoPrice(product?.preco_promocional ? String(product.preco_promocional) : '');
    setCategoryId(product?.category_id || categories[0]?.id || '');
    setImageUrl(product?.foto_url || '');
    setImagePreview(product?.foto_url || '');
    setAvailable(product?.disponivel ?? true);
    setBadgeList(meta?.badges || []);
    setOptionGroups(meta?.optionGroups || []);
    setImageFile(null);
    setStep(0);
  }, [visible, product, meta, categories]);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  if (!visible) {
    console.log('❌ ProductEditor não visível (visible = false)');
    return null;
  }

  console.log('✅ ProductEditor renderizando com product:', product?.name);

  const stepTitles = ['Informações', 'Selos', 'Adicionais'];

  const handleAddBadge = () => {
    if (!customBadgeLabel.trim()) return;
    setBadgeList(prev => [...prev, { id: crypto.randomUUID(), label: customBadgeLabel.trim(), backgroundColor: customBadgeBg, textColor: customBadgeText }]);
    setCustomBadgeLabel('');
  };

  const handleRemoveBadge = (id: string) => setBadgeList(prev => prev.filter(b => b.id !== id));

  const handleAddOptionGroup = () => setOptionGroups(prev => [...prev, emptyOptionGroup()]);

  const handleRemoveOptionGroup = (groupId: string) => setOptionGroups(prev => prev.filter(group => group.id !== groupId));

  const handleUpdateGroup = (groupId: string, next: Partial<ProductOptionGroup>) => {
    setOptionGroups(prev => prev.map(group => group.id === groupId ? { ...group, ...next } : group));
  };

  const handleAddGroupItem = (groupId: string) => {
    setOptionGroups(prev => prev.map(group => group.id === groupId ? {
      ...group,
      items: [...group.items, { id: crypto.randomUUID(), name: `Opção ${group.items.length + 1}`, price: 0, isFree: true, order: group.items.length + 1, available: true }]
    } : group));
  };

  const handleUpdateGroupItem = (groupId: string, itemId: string, next: Partial<ProductOptionGroup['items'][0]>) => {
    setOptionGroups(prev => prev.map(group => group.id === groupId ? {
      ...group,
      items: group.items.map(item => item.id === itemId ? { ...item, ...next } : item)
    } : group));
  };

  const itemPriceRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleRemoveGroupItem = (groupId: string, itemId: string) => {
    setOptionGroups(prev => prev.map(group => group.id === groupId ? {
      ...group,
      items: group.items.filter(item => item.id !== itemId)
    } : group));
  };

  const handleDropImage = (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setValidationError('Informe o nome do produto antes de salvar.');
      return;
    }
    if (!categoryId) {
      setValidationError('Escolha uma categoria antes de salvar.');
      return;
    }
    setValidationError('');
    const newId = product?.id || crypto.randomUUID();
    const metaPayload: ProductMeta = {
      badges: badgeList,
      optionGroups
    };
    const payload: any = {
      id: newId,
      nome: name.trim(),
      descricao: description.trim(),
      preco: Number(price),
      preco_promocional: promoPrice ? Number(promoPrice) : null,
      category_id: categoryId,
      categoria_id: categoryId,
      foto_url: imageUrl.trim() || null,
      disponivel: available,
      destaque: badgeList.some(b => b.label.toLowerCase().includes('destaque')),
      is_novo: badgeList.some(b => b.label.toLowerCase().includes('novo')),
      sku: JSON.stringify(metaPayload),
      tempo_preparo: 15,
      ordem: product?.ordem || 0
    };
    await onSave(payload, metaPayload, product ? product.id : newId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-6xl rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        <div className="relative flex flex-col lg:flex-row gap-4 p-6 bg-slate-900 border-b border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white transition z-10"
          >
            <X size={18} />
          </button>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.25em] text-sky-400 font-black">Cadastro de Produtos</p>
            <h2 className="mt-3 text-2xl font-extrabold text-white">Nova Tela Profissional de Produto</h2>
            <p className="mt-2 text-sm text-slate-400 max-w-2xl">Preencha o produto em etapas, organize selos, adicionais e grupos obrigatórios para restaurantes, pizzas, açaí e lanchonetes.</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {stepTitles.map((title, index) => (
              <button
                key={title}
                type="button"
                onClick={() => setStep(index)}
                className={`rounded-full px-3 py-2 text-xs font-bold transition ${step === index ? 'bg-sky-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
              >
                {title}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 p-6">
          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <Badge className="w-5 h-5 text-amber-300" />
                <div>
                  <p className="text-sm font-bold text-white">Resumo do Produto</p>
                  <p className="text-xs text-slate-400">A configuração salva aparecerá instantaneamente no painel de produtos.</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-slate-300">
                <p><span className="font-semibold text-slate-100">Categoria:</span> {selectedCategory?.name || 'Sem seleção'}</p>
                <p><span className="font-semibold text-slate-100">Tipo:</span> {productType}</p>
                <p><span className="font-semibold text-slate-100">Visibilidade:</span> {available ? 'Disponível' : 'Oculto do cardápio'}</p>
                <p><span className="font-semibold text-slate-100">Selos:</span> {badgeList.length || 0}</p>
                <p><span className="font-semibold text-slate-100">Grupos ativos:</span> {optionGroups.length || 0}</p>
              </div>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 p-5 shadow-lg">
              <p className="text-sm font-bold text-white mb-3">Upload de Imagem</p>
              <label className="group block rounded-3xl border-2 border-dashed border-slate-700 bg-slate-950/50 p-6 text-center cursor-pointer transition hover:border-sky-400 hover:bg-slate-950/80">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) handleDropImage(file);
                  }}
                />
                <Upload className="mx-auto h-12 w-12 text-sky-400 group-hover:scale-110 transition-transform" />
                <p className="mt-3 text-sm font-medium text-slate-300 group-hover:text-sky-400 transition-colors">Arraste ou clique para enviar</p>
                <p className="mt-1 text-[11px] text-slate-500">PNG, JPG até 5MB</p>
              </label>
              {imagePreview && (
                <div className="mt-4 overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 shadow-lg">
                  <img src={imagePreview} alt="Preview do produto" className="h-48 w-full object-cover" />
                </div>
              )}
            </div>
          </aside>

          <section className="space-y-6">
            {step === 0 && (
              <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Informações Básicas</h3>
                    <p className="text-sm text-slate-400">Nome, preço, categoria e visibilidade do produto.</p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">Passo 1</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Nome do Produto *</label>
                    <input
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Ex: Smash Cheeseburger"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 hover:border-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Categoria *</label>
                    <select
                      value={categoryId}
                      onChange={e => setCategoryId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white hover:border-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
                      required
                    >
                      <option value="">Escolha a categoria</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Preço padrão (R$) *</label>
                    <input
                      type="number"
                      value={price}
                      onChange={e => setPrice(Number(e.target.value))}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 hover:border-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Preço promocional</label>
                    <input
                      type="number"
                      value={promoPrice}
                      onChange={e => setPromoPrice(e.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 hover:border-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors"
                      placeholder="Opcional"
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="flex items-center gap-2 bg-slate-950 rounded-2xl border border-slate-700 px-4 py-3">
                      <input type="checkbox" checked={available} onChange={e => setAvailable(e.target.checked)} className="w-4 h-4 rounded accent-sky-500" />
                      <label className="text-sm font-medium text-white cursor-pointer">Visível no cardápio</label>
                    </div>
                  </div>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-2">Descrição / O que vem</label>
                    <textarea
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      rows={5}
                      placeholder="Ex: Massa crocante, mussarela, pepperoni, cebola caramelizada e molho de tomate caseiro."
                      className="w-full rounded-3xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 hover:border-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none transition-colors"
                    />
                    <p className="text-[11px] text-slate-500 mt-2">Descreva o produto e o que vem junto, como ingredientes ou recheios.</p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Selos do Produto</h3>
                    <p className="text-sm text-slate-400">Marque promoções, destaques ou crie seu selo personalizado.</p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">Passo 2</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => togglePresetBadge('Promoção', '#FF6B00', '#FFFFFF')}
                    className={`rounded-3xl border p-4 text-left transition ${hasBadge('Promoção') ? 'border-sky-500 bg-slate-800' : 'border-slate-800 bg-slate-950 hover:border-sky-500'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Flame className="w-5 h-5 text-orange-400" />
                      <div>
                        <p className="font-semibold text-white">🔥 Promoção</p>
                        <p className="text-xs text-slate-500">Exibe selo de oferta no cardápio.</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePresetBadge('Destaque', '#FFD43B', '#0F172A')}
                    className={`rounded-3xl border p-4 text-left transition ${hasBadge('Destaque') ? 'border-sky-500 bg-slate-800' : 'border-slate-800 bg-slate-950 hover:border-sky-500'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-yellow-400" />
                      <div>
                        <p className="font-semibold text-white">⭐ Destaque</p>
                        <p className="text-xs text-slate-500">Mostra o produto em destaque no cardápio.</p>
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => togglePresetBadge('Novo', '#22C55E', '#FFFFFF')}
                    className={`rounded-3xl border p-4 text-left transition ${hasBadge('Novo') ? 'border-sky-500 bg-slate-800' : 'border-slate-800 bg-slate-950 hover:border-sky-500'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-sky-400" />
                      <div>
                        <p className="font-semibold text-white">🆕 Novidade</p>
                        <p className="text-xs text-slate-500">Indica produto novo no cardápio.</p>
                      </div>
                    </div>
                  </button>
                </div>

                <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do selo</label>
                      <input value={customBadgeLabel} onChange={e => setCustomBadgeLabel(e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-600 hover:border-slate-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Cor de fundo</label>
                      <input type="color" value={customBadgeBg} onChange={e => setCustomBadgeBg(e.target.value)} className="w-full h-12 rounded-2xl border border-slate-700 bg-slate-950 p-0 hover:border-slate-600 focus:border-sky-500 transition-colors cursor-pointer" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Cor do texto</label>
                      <input type="color" value={customBadgeText} onChange={e => setCustomBadgeText(e.target.value)} className="w-full h-12 rounded-2xl border border-slate-700 bg-slate-950 p-0 hover:border-slate-600 focus:border-sky-500 transition-colors cursor-pointer" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <button type="button" onClick={handleAddBadge} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-sky-500 to-sky-400 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/50 transition-all hover:scale-105">
                      <Plus className="w-4 h-4" /> Adicionar selo
                    </button>
                    <span className="text-xs text-slate-500">Ex: Mais Vendido, Exclusivo, Oferta Relâmpago.</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {badgeList.map(badge => (
                      <span key={badge.id} className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold" style={{ backgroundColor: badge.backgroundColor, color: badge.textColor }}>
                        {badge.label}
                        <button type="button" onClick={() => handleRemoveBadge(badge.id)} className="rounded-full bg-black/20 p-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Adicionais e Grupos</h3>
                    <p className="text-sm text-slate-400">Configure grupos, extras e opções obrigatórias ou opcionais para o produto.</p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">Passo 3</span>
                </div>

                <div className="space-y-4">
                  <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">Extras rápidos</p>
                        <p className="text-xs text-slate-500">Crie grupos de escolhas com valores, obrigatoriedade e itens.</p>
                      </div>
                      <button type="button" onClick={handleAddOptionGroup} className="rounded-2xl bg-sky-500 px-3 py-2 text-xs font-bold text-black">Novo Grupo</button>
                    </div>
                  </div>

                  {optionGroups.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-950 p-6 text-center text-sm text-slate-500">Nenhum grupo configurado ainda. Adicione um grupo obrigatório ou opcional.</div>
                  ) : (
                    optionGroups.map(group => (
                      <div key={group.id} className="space-y-4 rounded-3xl border border-slate-800 bg-slate-950 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <input value={group.label} onChange={e => handleUpdateGroup(group.id, { label: e.target.value })} className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white" />
                            <p className="text-xs text-slate-500 mt-1">Nome do grupo de escolhas.</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-300">
                              <input type="checkbox" checked={group.required} onChange={e => handleUpdateGroup(group.id, { required: e.target.checked, minSelection: e.target.checked ? 1 : 0 })} className="h-4 w-4 rounded border-slate-700 text-sky-500" /> Obrigatório
                            </label>
                            <button type="button" onClick={() => handleRemoveOptionGroup(group.id)} className="rounded-2xl bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20">Remover</button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Mínimo</label>
                            <input
                              type="number"
                              value={group.minSelection === 0 ? '' : group.minSelection}
                              min={0}
                              max={group.maxSelection}
                              onChange={e => handleUpdateGroup(group.id, { minSelection: Number(e.target.value) })}
                              className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white"
                            />
                            <p className="mt-1 text-[11px] text-slate-500">Deixe em branco ou 0 para sem mínimo.</p>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Máximo</label>
                            <input
                              type="number"
                              value={group.maxSelection === 0 ? '' : group.maxSelection}
                              min={group.minSelection}
                              onChange={e => handleUpdateGroup(group.id, { maxSelection: Number(e.target.value) })}
                              className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-white"
                            />
                            <p className="mt-1 text-[11px] text-slate-500">Deixe em branco ou 0 para ilimitado.</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {group.items.map(item => (
                            <div key={item.id} className="grid grid-cols-1 lg:grid-cols-[48px_1fr_120px_120px_90px] gap-3 rounded-3xl border border-slate-800 bg-slate-900 p-4 items-center">
                              <label className="relative flex items-center justify-center w-12 h-12 rounded-2xl border border-slate-800 bg-slate-950 cursor-pointer overflow-hidden group shrink-0" title="Enviar foto do adicional">
                                {item.foto_url ? (
                                  <img src={item.foto_url} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Upload size={16} className="text-slate-500 group-hover:text-sky-400 transition-colors" />
                                )}
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      let url: string | null = null;
                                      try {
                                        const fileName = `option-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                                        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
                                        if (!uploadError) {
                                          const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
                                          url = publicUrl;
                                        }
                                      } catch (err) {
                                        console.warn('Erro ao salvar foto:', err);
                                      }
                                      if (!url) {
                                        url = await new Promise<string>((resolve) => {
                                          const reader = new FileReader();
                                          reader.onloadend = () => resolve(reader.result as string);
                                          reader.readAsDataURL(file);
                                        });
                                      }
                                      handleUpdateGroupItem(group.id, item.id, { foto_url: url });
                                    }
                                  }}
                                />
                              </label>
                              <input value={item.name} onChange={e => handleUpdateGroupItem(group.id, item.id, { name: e.target.value })} className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white" placeholder="Nome da opção" />
                              <input
                                type="number"
                                ref={el => { itemPriceRefs.current[item.id] = el; }}
                                value={item.isFree ? 0 : item.price}
                                min={0}
                                onChange={e => handleUpdateGroupItem(group.id, item.id, { price: Number(e.target.value) })}
                                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white"
                                placeholder={item.isFree ? "Gratuito" : "Valor"}
                                disabled={item.isFree}
                              />
                              <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-3 text-xs text-slate-500">
                                <input
                                  type="checkbox"
                                  checked={item.isFree}
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    handleUpdateGroupItem(group.id, item.id, { isFree: checked, ...(checked ? { price: 0 } : {}) });
                                    if (!checked) {
                                      setTimeout(() => {
                                        itemPriceRefs.current[item.id]?.focus();
                                        itemPriceRefs.current[item.id]?.select();
                                      }, 0);
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-slate-700 text-sky-500"
                                /> Gratuito
                              </label>
                              <button type="button" onClick={() => handleRemoveGroupItem(group.id, item.id)} className="rounded-2xl bg-rose-500/10 px-3 py-3 text-xs font-semibold text-rose-400">Excluir</button>
                            </div>
                          ))}
                          <button type="button" onClick={() => handleAddGroupItem(group.id)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700">
                            <Plus className="w-4 h-4" /> Adicionar opção
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="space-y-6">
                  {productType === 'pizza' ? (
                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                      <p className="font-semibold text-white mb-2">Pizza Especial</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Tamanho</label>
                          {pizzaSizes.map((size, index) => (
                            <div key={size.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3">
                              <span className="flex-1 text-sm text-white">{size.label}</span>
                              <input type="number" value={size.price} min={0} onChange={e => setPizzaSizes(prev => prev.map((item, idx) => idx === index ? { ...item, price: Number(e.target.value) } : item))} className="w-28 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
                            </div>
                          ))}
                        </div>
                        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                          <p className="text-sm font-semibold text-white mb-3">Modos de pizza</p>
                          <div className="space-y-2 text-sm text-slate-300">
                            <p>Selecione se a pizza será inteira ou meia pizza com 2 sabores.</p>
                            <p className="text-slate-400">A visualização de meia pizza aparecerá automaticamente no cardápio.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : productType === 'acai' ? (
                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                      <p className="font-semibold text-white mb-2">Açaí Premium</p>
                      <div className="space-y-3">
                        {acaiSizes.map((size, index) => (
                          <div key={size.id} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-3">
                            <span className="flex-1 text-sm text-white">{size.label}</span>
                            <input type="number" value={size.price} min={0} onChange={e => setAcaiSizes(prev => prev.map((item, idx) => idx === index ? { ...item, price: Number(e.target.value) } : item))} className="w-28 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4">
                      <p className="font-semibold text-white mb-2">Crie grupos obrigatórios ou opcionais</p>
                      <p className="text-sm text-slate-400">Por exemplo: Tipo de pão, ponto da carne, bebida, escolha de arroz e proteína.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-3 pt-6 border-t border-slate-800">
              <button type="button" onClick={onClose} className="rounded-2xl bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700 transition-colors">Cancelar</button>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => setStep(prev => Math.max(0, prev - 1))} className="rounded-2xl bg-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-600 transition-colors">Anterior</button>
                <button type="submit" className="rounded-2xl bg-gradient-to-r from-sky-500 to-sky-400 px-7 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/30 hover:shadow-xl hover:shadow-sky-500/50 transition-all hover:scale-105">Salvar Produto</button>
              </div>
            </div>
            {validationError && (
              <div className="mt-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-700">
                {validationError}
              </div>
            )}
          </section>
        </form>
      </div>
    </div>
  );
}
