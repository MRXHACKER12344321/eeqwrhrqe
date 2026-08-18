import { useState } from 'react';
import { Loader, MapPin, Check, AlertCircle } from 'lucide-react';
import { geocodeAddress, calculateDelivery } from '../lib/deliveryService';
import type { Store } from '../types';

interface DeliveryCheckoutProps {
  store: Store;
  onDeliveryCalculated: (distance: number, fee: number) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

export default function DeliveryCheckout({ store, onDeliveryCalculated, showToast }: DeliveryCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [calculated, setCalculated] = useState(false);
  const [distance, setDistance] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const [address, setAddress] = useState({
    cep: '',
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
  });

  const isAddressComplete = address.rua && address.numero && address.bairro && address.cidade;

  async function handleCalculateDelivery() {
    if (!isAddressComplete) {
      showToast('Preencha todos os campos do endereço', 'error');
      return;
    }

    if (!store.latitude || !store.longitude) {
      showToast('Restaurante sem coordenadas cadastradas', 'error');
      return;
    }

    if (!store.delivery_enabled) {
      showToast('Entrega não disponível para este restaurante', 'error');
      return;
    }

    setLoading(true);
    try {
      // Geocodificar endereço do cliente
      const geoResult = await geocodeAddress({
        rua: address.rua,
        numero: address.numero,
        complemento: address.complemento,
        bairro: address.bairro,
        cidade: address.cidade,
        estado: store.estado,
        cep: address.cep,
      });

      // Calcular entrega
      const deliveryResult = await calculateDelivery({
        restaurant_id: store.id,
        client_latitude: geoResult.latitude,
        client_longitude: geoResult.longitude,
      });

      if (deliveryResult.status === 'success') {
        setDistance(deliveryResult.distance_km);
        setDeliveryFee(deliveryResult.delivery_fee);
        setCalculated(true);
        onDeliveryCalculated(deliveryResult.distance_km, deliveryResult.delivery_fee);
        showToast('✅ Entrega calculada com sucesso!', 'success');
      } else if (deliveryResult.status === 'out_of_area') {
        showToast(deliveryResult.message || 'Endereço fora da área de entrega', 'error');
        setCalculated(false);
      } else {
        throw new Error(deliveryResult.message || 'Erro ao calcular entrega');
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : 'Erro ao calcular entrega. Tente novamente.',
        'error'
      );
      setCalculated(false);
    } finally {
      setLoading(false);
    }
  }

  const handleClearCalculation = () => {
    setCalculated(false);
    setDistance(0);
    setDeliveryFee(0);
    onDeliveryCalculated(0, 0);
  };

  return (
    <div className="w-full bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
        <MapPin className="text-blue-600" size={20} />
        Endereço de Entrega
      </h3>

      {/* Campos de Endereço */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="CEP (opcional)"
          value={address.cep}
          onChange={(e) => setAddress({ ...address, cep: e.target.value })}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <input
          type="text"
          placeholder="Rua *"
          value={address.rua}
          onChange={(e) => setAddress({ ...address, rua: e.target.value })}
          required
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Número *"
          value={address.numero}
          onChange={(e) => setAddress({ ...address, numero: e.target.value })}
          required
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <input
          type="text"
          placeholder="Complemento (apto, sala, etc)"
          value={address.complemento}
          onChange={(e) => setAddress({ ...address, complemento: e.target.value })}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Bairro *"
          value={address.bairro}
          onChange={(e) => setAddress({ ...address, bairro: e.target.value })}
          required
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
        <input
          type="text"
          placeholder="Cidade *"
          value={address.cidade}
          onChange={(e) => setAddress({ ...address, cidade: e.target.value })}
          required
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Botão Calcular */}
      <button
        onClick={handleCalculateDelivery}
        disabled={loading || !isAddressComplete}
        className="w-full py-3 rounded-lg bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
      >
        {loading ? (
          <>
            <Loader size={16} className="animate-spin" />
            Calculando entrega...
          </>
        ) : (
          <>
            📍 Calcular Entrega
          </>
        )}
      </button>

      {/* Resultado */}
      {calculated && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2 text-green-700 font-bold">
            <Check size={20} />
            Entrega Calculada!
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Distância</p>
              <p className="text-xl font-bold text-gray-900">{distance.toFixed(1)} km</p>
            </div>
            <div>
              <p className="text-gray-600">Taxa de Entrega</p>
              <p className="text-xl font-bold text-green-600">R$ {deliveryFee.toFixed(2)}</p>
            </div>
          </div>
          <button
            onClick={handleClearCalculation}
            className="w-full py-2 text-sm text-green-700 hover:bg-green-100 rounded-lg font-semibold"
          >
            Alterar Endereço
          </button>
        </div>
      )}

      {/* Erro */}
      {!calculated && distance === 0 && deliveryFee === 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2 text-sm text-blue-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>Preencha o endereço e clique em "Calcular Entrega"</span>
        </div>
      )}
    </div>
  );
}
