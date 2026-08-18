// src/lib/deliveryService.ts
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient';
import type {
  GeocodeAddressRequest,
  GeocodeAddressResponse,
  DeliveryCalculationRequest,
  DeliveryCalculationResponse,
  UpdateRestaurantCoordsRequest,
  UpdateRestaurantCoordsResponse,
} from '../types';

const getAuthHeader = async () => {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token || supabaseAnonKey;
  return `Bearer ${token}`;
};

async function invokeEdgeFunction<T>(name: string, body: any): Promise<T> {
  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: await getAuthHeader(),
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Edge Function ${name} failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return JSON.parse(text) as T;
}

/**
 * Geocodifica um endereço usando a Edge Function
 */
export async function geocodeAddress(address: GeocodeAddressRequest): Promise<GeocodeAddressResponse> {
  try {
    return await invokeEdgeFunction<GeocodeAddressResponse>('geocode-address', { address });
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * Calcula a distância e taxa de entrega
 */
export async function calculateDelivery(
  request: DeliveryCalculationRequest
): Promise<DeliveryCalculationResponse> {
  try {
    return await invokeEdgeFunction<DeliveryCalculationResponse>('calculate-delivery', request);
  } catch (error) {
    console.error('Delivery calculation error:', error);
    throw error;
  }
}

/**
 * Atualiza as coordenadas (latitude/longitude) do restaurante
 */
export async function updateRestaurantCoords(
  request: UpdateRestaurantCoordsRequest
): Promise<UpdateRestaurantCoordsResponse> {
  try {
    return await invokeEdgeFunction<UpdateRestaurantCoordsResponse>('update-restaurant-coords', request);
  } catch (error) {
    console.error('Update restaurant coords error:', error);
    throw error;
  }
}

/**
 * Busca faixas de entrega de um restaurante
 */
export async function getDeliveryRules(restaurantId: string) {
  try {
    const { data, error } = await supabase
      .from('delivery_rules')
      .select('*')
      .eq('loja_id', restaurantId)
      .order('min_distance_km', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Get delivery rules error:', error);
    return [];
  }
}

/**
 * Salva faixas de entrega de um restaurante
 */
export async function saveDeliveryRules(restaurantId: string, rules: Array<{
  min_distance_km: number;
  max_distance_km: number;
  price: number;
}>) {
  try {
    // Deletar regras antigas
    await supabase
      .from('delivery_rules')
      .delete()
      .eq('loja_id', restaurantId);

    // Inserir novas
    const { data, error } = await supabase
      .from('delivery_rules')
      .insert(
        rules.map(rule => ({
          loja_id: restaurantId,
          min_distance_km: rule.min_distance_km,
          max_distance_km: rule.max_distance_km,
          price: rule.price,
        }))
      )
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Save delivery rules error:', error);
    throw error;
  }
}

/**
 * Busca endereço em cache
 */
export async function getAddressFromCache(addressHash: string) {
  try {
    const { data, error } = await supabase
      .from('address_cache')
      .select('latitude, longitude')
      .eq('address_hash', addressHash)
      .single();

    if (error) return null;
    return data;
  } catch (error) {
    return null;
  }
}
