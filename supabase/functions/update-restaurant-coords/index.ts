// supabase/functions/update-restaurant-coords/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HEIGIT_API_KEY = Deno.env.get("HEIGIT_API_KEY");
const HEIGIT_GEOCODE_URL = "https://api.heigit.org/pelias/v1/search";

interface UpdateCoordsRequest {
  restaurant_id: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep?: string;
}

async function geocodeAddress(address: UpdateCoordsRequest): Promise<{ latitude: number; longitude: number }> {
  const fullAddress = `${address.rua}, ${address.numero}, ${address.bairro}, ${address.cidade}, ${address.estado}`;
  
  const response = await fetch(
    `${HEIGIT_GEOCODE_URL}?text=${encodeURIComponent(fullAddress)}&size=1`,
    {
      headers: {
        Authorization: HEIGIT_API_KEY || '',
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`HeiGIT Geocoding failed: ${response.statusText}`);
  }

  const data = await response.json();
  
  if (!data.features || data.features.length === 0) {
    throw new Error("Endereço do restaurante não encontrado");
  }

  const [longitude, latitude] = data.features[0].geometry.coordinates;
  return { latitude, longitude };
}

export const serve = async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await req.json() as UpdateCoordsRequest;
    const { restaurant_id, rua, numero, complemento, bairro, cidade, estado, cep } = body;

    if (!restaurant_id || !rua || !numero || !bairro || !cidade || !estado) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Geocodificar
    const { latitude, longitude } = await geocodeAddress({
      rua,
      numero,
      complemento,
      bairro,
      cidade,
      estado,
      cep,
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    // Atualizar restaurante
    const { data, error } = await supabase
      .from("lojas")
      .update({
        latitude,
        longitude,
        latitude_longitude_atualizado_em: new Date().toISOString(),
        rua,
        numero,
        complemento: complemento || null,
        bairro,
        cidade,
        estado,
        cep: cep || null,
      })
      .eq("id", restaurant_id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        latitude,
        longitude,
        restaurant: data,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro ao atualizar coordenadas",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
