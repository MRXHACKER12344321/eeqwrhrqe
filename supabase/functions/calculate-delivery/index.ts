// supabase/functions/calculate-delivery/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HEIGIT_API_KEY = Deno.env.get("HEIGIT_API_KEY");
const HEIGIT_DIRECTIONS_URL = "https://api.heigit.org/openrouteservice/v2/directions/driving-car";

interface DeliveryRequest {
  restaurant_id: string;
  client_latitude: number;
  client_longitude: number;
}

interface DeliveryResponse {
  distance_km: number;
  delivery_fee: number;
  status: "success" | "out_of_area" | "error";
  message?: string;
}

async function calculateRouteDistance(
  restaurantLat: number,
  restaurantLng: number,
  clientLat: number,
  clientLng: number
): Promise<number> {
  // HeiGIT requer formato [longitude, latitude]
  const body = {
    coordinates: [
      [restaurantLng, restaurantLat],
      [clientLng, clientLat],
    ],
  };

  const response = await fetch(HEIGIT_DIRECTIONS_URL, {
    method: 'POST',
    headers: {
      Authorization: HEIGIT_API_KEY || '',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`HeiGIT Directions failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.routes || data.routes.length === 0) {
    throw new Error("Rota não encontrada");
  }

  // Distância em metros, converter para KM
  const distanceMeters = data.routes[0].summary.distance;
  return distanceMeters / 1000;
}

async function calculateDeliveryFee(
  distanceKm: number,
  supabase: any,
  restaurantId: string
): Promise<{ fee: number; rule?: any }> {
  // Buscar configuração de entrega
  const { data: restaurant } = await supabase
    .from("lojas")
    .select("delivery_type, delivery_base_price, delivery_price_per_km, delivery_max_distance_km")
    .eq("id", restaurantId)
    .single();

  if (!restaurant) {
    throw new Error("Restaurante não encontrado");
  }

  // Validar se está dentro da área de entrega
  if (distanceKm > restaurant.delivery_max_distance_km) {
    throw new Error(`Endereço fora da área de entrega (máximo ${restaurant.delivery_max_distance_km}km)`);
  }

  let fee = 0;

  if (restaurant.delivery_type === "distancia") {
    // Taxa por distância
    fee = restaurant.delivery_base_price + (distanceKm * restaurant.delivery_price_per_km);
  } else {
    // Taxa por faixa de distância
    const { data: rules } = await supabase
      .from("delivery_rules")
      .select("*")
      .eq("loja_id", restaurantId)
      .lte("min_distance_km", distanceKm) // min <= distance
      .gte("max_distance_km", distanceKm) // max >= distance
      .single();

    if (rules) {
      fee = rules.price;
      return { fee, rule: rules };
    } else {
      throw new Error("Nenhuma faixa de entrega configurada para esta distância");
    }
  }

  return { fee };
}

export const serve = async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { restaurant_id, client_latitude, client_longitude } = await req.json() as DeliveryRequest;

    if (!restaurant_id || !client_latitude || !client_longitude) {
      return new Response(
        JSON.stringify({ 
          error: "Parâmetros inválidos",
          status: "error"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Buscar coordenadas do restaurante
    const { data: restaurant } = await supabase
      .from("lojas")
      .select("latitude, longitude, delivery_enabled")
      .eq("id", restaurant_id)
      .single();

    if (!restaurant) {
      return new Response(
        JSON.stringify({
          error: "Restaurante não encontrado",
          status: "error"
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!restaurant.delivery_enabled) {
      return new Response(
        JSON.stringify({
          error: "Entrega desabilitada para este restaurante",
          status: "error"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!restaurant.latitude || !restaurant.longitude) {
      return new Response(
        JSON.stringify({
          error: "Restaurante sem coordenadas cadastradas",
          status: "error"
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Calcular distância
    const distanceKm = await calculateRouteDistance(
      restaurant.latitude,
      restaurant.longitude,
      client_latitude,
      client_longitude
    );

    // Calcular taxa
    const { fee } = await calculateDeliveryFee(distanceKm, supabase, restaurant_id);

    return new Response(
      JSON.stringify({
        distance_km: parseFloat(distanceKm.toFixed(2)),
        delivery_fee: parseFloat(fee.toFixed(2)),
        status: "success",
      } as DeliveryResponse),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    
    let message = "Não foi possível calcular a entrega";
    if (error instanceof Error) {
      if (error.message.includes("fora da área")) {
        return new Response(
          JSON.stringify({
            status: "out_of_area",
            message: error.message,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
      message = error.message;
    }

    return new Response(
      JSON.stringify({
        error: message,
        status: "error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
