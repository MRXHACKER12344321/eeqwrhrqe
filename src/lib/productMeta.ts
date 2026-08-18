import { ProductMeta } from '../types';
import { supabase } from './supabaseClient';

const STORAGE_PREFIX = 'pedifacil_product_meta_';

export function loadProductMeta(productId: string): ProductMeta | undefined {
  if (!productId) return undefined;

  // 1. Check direct localStorage key
  try {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${productId}`);
    if (saved) {
      const parsed = JSON.parse(saved) as ProductMeta;
      if (parsed && (parsed.optionGroups || parsed.badges)) {
        return parsed;
      }
    }
  } catch {}

  // 2. Fallback check inside local product caches (pedifacil_local_products_* or pedifacil_db_products)
  try {
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && (key === 'pedifacil_db_products' || key.startsWith('pedifacil_local_products_'))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list)) {
            const item = list.find((p: any) => p && p.id === productId);
            if (item && item.sku && typeof item.sku === 'string' && item.sku.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(item.sku);
                if (parsed && (parsed.optionGroups || parsed.badges)) {
                  localStorage.setItem(`${STORAGE_PREFIX}${productId}`, item.sku);
                  return parsed;
                }
              } catch {}
            }
          }
        }
      }
    }
  } catch {}

  return undefined;
}

export async function saveProductMeta(productId: string, meta: ProductMeta): Promise<void> {
  if (!productId) return;
  const metaJson = JSON.stringify(meta);

  // 1. Direct key persistence in localStorage
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${productId}`, metaJson);
  } catch {}

  // 2. Atualiza fallback local de produto para manter sku sincronizado em todos os caches locais
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key) keys.push(key);
    }

    keys.forEach((key) => {
      if (key === 'pedifacil_db_products' || key.startsWith('pedifacil_local_products_')) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) return;
          const list = JSON.parse(raw);
          if (!Array.isArray(list)) return;
          let changed = false;
          const updated = list.map((item: any) => {
            if (item && item.id === productId) {
              changed = true;
              return { ...item, sku: metaJson };
            }
            return item;
          });
          if (changed) {
            localStorage.setItem(key, JSON.stringify(updated));
          }
        } catch {}
      }
    });
  } catch {}

  // 3. Sincronizar permanentemente com Supabase na coluna sku da tabela produtos
  try {
    const { error } = await supabase.from('produtos').update({ sku: metaJson }).eq('id', productId);
    if (!error) return;
  } catch (err) {
    console.warn('Aviso ao sincronizar meta no Supabase:', err);
  }

  // Tentar novamente com retry resiliente
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { error } = await supabase.from('produtos').update({ sku: metaJson }).eq('id', productId);
      if (!error) return;
    } catch {}
    await new Promise(res => setTimeout(res, 400));
  }
}

export function deleteProductMeta(productId: string): void {
  if (!productId) return;
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${productId}`);
  } catch {}
}

