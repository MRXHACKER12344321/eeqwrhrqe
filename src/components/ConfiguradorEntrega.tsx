import { useState, useEffect } from 'react';
import { Loader, MapPin, Trash2, Plus } from 'lucide-react';
import { updateRestaurantCoords, getDeliveryRules, saveDeliveryRules } from '../lib/deliveryService';
import { supabase } from '../lib/supabaseClient';
import type { Store, DeliveryRule } from '../types';

interface ConfiguradorEntregaProps {
  store: Store;
  onSave: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function ConfiguradorEntrega({ store, onSave, showToast }: ConfiguradorEntregaProps) {
  const [loading, setLoading] = useState(false);
  const [addressData, setAddressData] = useState({
    rua: store.rua || '',
    numero: store.numero || '',
    complemento: store.complemento || '',
    bairro: store.bairro || '',
    cidade: store.cidade || '',
    estado: store.estado || '',
    cep: store.cep || '',
  });
  const [deliveryConfig, setDeliveryConfig] = useState({
    delivery_enabled: store.delivery_enabled !== false,
    delivery_type: (store.delivery_type || 'faixas') as 'distancia' | 'faixas',
    delivery_min_distance_km: store.delivery_min_distance_km || 0.5,
    delivery_max_distance_km: store.delivery_max_distance_km || 20,
    delivery_base_price: store.delivery_base_price || 5,
    delivery_price_per_km: store.delivery_price_per_km || 2,
  });

  const [rules, setRules] = useState<Array<{
    min_distance_km: number;
    max_distance_km: number;
    price: number;
  }>>([]);

  const [newRule, setNewRule] = useState({
    min_distance_km: 0,
    max_distance_km: 3,
    price: 5,
  });

  useEffect(() => {
    setAddressData({
      rua: store.rua || '',
      numero: store.numero || '',
      complemento: store.complemento || '',
      bairro: store.bairro || '',
      cidade: store.cidade || '',
      estado: store.estado || '',
      cep: store.cep || '',
    });

    setDeliveryConfig({
      delivery_enabled: store.delivery_enabled !== false,
      delivery_type: (store.delivery_type || 'faixas') as 'distancia' | 'faixas',
      delivery_min_distance_km: store.delivery_min_distance_km || 0.5,
      delivery_max_distance_km: store.delivery_max_distance_km || 20,
      delivery_base_price: store.delivery_base_price || 5,
      delivery_price_per_km: store.delivery_price_per_km || 2,
    });

    loadRules();
  }, [store.id]);

  async function loadRules() {
    try {
      const data = await getDeliveryRules(store.id);
      if (data.length > 0) {
        setRules(data);
      }
    } catch (error) {
      console.error('Erro ao carregar faixas:', error);
    }
  }

  async function handleGeocodeAddress() {
    if (!addressData.rua || !addressData.numero || !addressData.cidade) {
      showToast('Preencha os campos obrigatórios (Rua, Número, Cidade)', 'error');
      return;
    }

    setLoading(true);
    try {
      const result = await updateRestaurantCoords({
        restaurant_id: store.id,
        rua: addressData.rua,
        numero: addressData.numero,
        complemento: addressData.complemento,
        bairro: addressData.bairro,
        cidade: addressData.cidade,
        estado: addressData.estado,
        cep: addressData.cep,
      });

      showToast('✅ Coordenadas atualizadas com sucesso!', 'success');
      onSave();
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Erro ao geocodificar endereço', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveDeliveryConfig() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lojas')
        .update({
          delivery_enabled: deliveryConfig.delivery_enabled,
          delivery_type: deliveryConfig.delivery_type,
          delivery_min_distance_km: deliveryConfig.delivery_min_distance_km,
          delivery_max_distance_km: deliveryConfig.delivery_max_distance_km,
          delivery_base_price: deliveryConfig.delivery_base_price,
          delivery_price_per_km: deliveryConfig.delivery_price_per_km,
        })
        .eq('id', store.id)
        .select()
        .single();

      if (error) throw error;

      showToast('✅ Configurações de entrega salvas!', 'success');
      onSave();
    } catch (error) {
      showToast('Erro ao salvar configurações', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveRules() {
    if (deliveryConfig.delivery_type !== 'faixas' || rules.length === 0) {
      return;
    }

    setLoading(true);
    try {
      await saveDeliveryRules(store.id, rules);
      showToast('✅ Faixas de entrega atualizadas!', 'success');
      onSave();
    } catch (error) {
      showToast('Erro ao salvar faixas', 'error');
    } finally {
      setLoading(false);
    }
  }

  const addRule = () => {
    if (newRule.max_distance_km <= newRule.min_distance_km) {
      showToast('Distância máxima deve ser maior que mínima', 'error');
      return;
    }
    setRules([...rules, newRule]);
    setNewRule({ min_distance_km: newRule.max_distance_km, max_distance_km: newRule.max_distance_km + 3, price: 5 });
  };

  const removeRule = (index: number) => {
    setRules(rules.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-3xl border border-gray-200 shadow-lg">
      <h2 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-2">
        <MapPin className="text-blue-600" /> Configurações de Entrega
      </h2>

      {/* Seção de Endereço */}
      <div className="space-y-4 mb-8 pb-8 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">📍 Endereço do Estabelecimento</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Rua"
            value={addressData.rua}
            onChange={(e) => setAddressData({ ...addressData, rua: e.target.value })}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <input
            type="text"
            placeholder="Número"
            value={addressData.numero}
            onChange={(e) => setAddressData({ ...addressData, numero: e.target.value })}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <input
          type="text"
          placeholder="Complemento (apto, sala, etc)"
          value={addressData.complemento}
          onChange={(e) => setAddressData({ ...addressData, complemento: e.target.value })}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Bairro"
            value={addressData.bairro}
            onChange={(e) => setAddressData({ ...addressData, bairro: e.target.value })}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <input
            type="text"
            placeholder="Cidade"
            value={addressData.cidade}
            onChange={(e) => setAddressData({ ...addressData, cidade: e.target.value })}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
          <input
            type="text"
            placeholder="Estado (Ex: MA)"
            value={addressData.estado}
            onChange={(e) => setAddressData({ ...addressData, estado: e.target.value })}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <input
          type="text"
          placeholder="CEP"
          value={addressData.cep}
          onChange={(e) => setAddressData({ ...addressData, cep: e.target.value })}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />

        {store.latitude && store.longitude && (
          <p className="text-xs text-green-600">
            ✅ Coordenadas salvas: {store.latitude.toFixed(4)}, {store.longitude.toFixed(4)}
            <br />
            Atualizado em: {new Date(store.latitude_longitude_atualizado_em || '').toLocaleDateString('pt-BR')}
          </p>
        )}

        <button
          onClick={handleGeocodeAddress}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader size={16} className="animate-spin" />}
          🌍 Geocodificar e Salvar Endereço
        </button>
      </div>

      {/* Seção de Tipo de Taxa */}
      <div className="space-y-4 mb-8 pb-8 border-b border-gray-200">
        <h3 className="text-lg font-bold text-gray-900">💰 Tipo de Taxa de Entrega</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              checked={deliveryConfig.delivery_type === 'distancia'}
              onChange={() => setDeliveryConfig({ ...deliveryConfig, delivery_type: 'distancia' })}
            />
            <span className="font-semibold text-gray-900">Taxa por Distância</span>
          </label>

          {deliveryConfig.delivery_type === 'distancia' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-8">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Taxa Base (R$)</label>
                <input
                  type="number"
                  step="0.50"
                  value={deliveryConfig.delivery_base_price}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_base_price: parseFloat(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Por km (R$)</label>
                <input
                  type="number"
                  step="0.50"
                  value={deliveryConfig.delivery_price_per_km}
                  onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_price_per_km: parseFloat(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            <input
              type="radio"
              checked={deliveryConfig.delivery_type === 'faixas'}
              onChange={() => setDeliveryConfig({ ...deliveryConfig, delivery_type: 'faixas' })}
            />
            <span className="font-semibold text-gray-900">Faixas de Distância</span>
          </label>
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={deliveryConfig.delivery_enabled}
              onChange={(e) => setDeliveryConfig({ ...deliveryConfig, delivery_enabled: e.target.checked })}
            />
            Entrega ativada
          </label>

          <button
            onClick={handleSaveDeliveryConfig}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader size={16} className="animate-spin" />}
            💾 Salvar Configurações de Entrega
          </button>
        </div>
      </div>

      {/* Faixas de Distância */}
      {deliveryConfig.delivery_type === 'faixas' && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">📊 Faixas de Entrega</h3>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Até (km)</label>
                <input
                  type="number"
                  step="0.5"
                  value={newRule.max_distance_km}
                  onChange={(e) => setNewRule({ ...newRule, max_distance_km: parseFloat(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Taxa (R$)</label>
                <input
                  type="number"
                  step="0.50"
                  value={newRule.price}
                  onChange={(e) => setNewRule({ ...newRule, price: parseFloat(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={addRule}
                  className="w-full py-2 rounded-lg bg-green-600 text-white font-bold text-sm hover:bg-green-700 flex items-center justify-center gap-1"
                >
                  <Plus size={16} /> Adicionar
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {rules.map((rule, index) => (
              <div key={index} className="flex items-center justify-between p-3 border border-gray-300 rounded-lg bg-gray-50">
                <span className="text-sm font-medium text-gray-900">
                  {rule.min_distance_km.toFixed(1)} até {rule.max_distance_km.toFixed(1)} km = R$ {rule.price.toFixed(2)}
                </span>
                <button
                  onClick={() => removeRule(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          {rules.length > 0 && (
            <button
              onClick={handleSaveRules}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-green-600 text-white font-bold text-sm hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader size={16} className="animate-spin" />}
              💾 Salvar Faixas de Entrega
            </button>
          )}
        </div>
      )}
    </div>
  );
}
