// supabase/functions/geocode-address/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const HEIGIT_API_KEY = Deno.env.get("HEIGIT_API_KEY");
const HEIGIT_GEOCODE_URL = "https://api.heigit.org/pelias/v1/search";

interface AddressInput {
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep?: string;
}

async function generateAddressHash(address: AddressInput): Promise<string> {
  const normalized = `${address.rua}|${address.numero}|${address.bairro}|${address.cidade}|${address.estado}|${address.cep || ''}`.toLowerCase().trim();
  const enc = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function geocodeWithHeigit(address: AddressInput): Promise<{ latitude: number; longitude: number }> {
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
    throw new Error("Endereço não encontrado");
  }

  const [longitude, latitude] = data.features[0].geometry.coordinates;
  return { latitude, longitude };
}

export const serve = async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const { address } = await req.json() as { address: AddressInput };

    if (!address || !address.rua || !address.numero || !address.cidade || !address.estado) {
      return new Response(
        JSON.stringify({ error: "Endereço incompleto" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SERVICE_ROLE_KEY")!
    );

    const addressHash = await generateAddressHash(address);

    // Verificar cache
    const { data: cached } = await supabase
      .from("address_cache")
      .select("latitude, longitude")
      .eq("address_hash", addressHash)
      .single();

    if (cached) {
      await supabase
        .from("address_cache")
        .update({ last_used_at: new Date().toISOString() })
        .eq("address_hash", addressHash);

      return new Response(
        JSON.stringify({
          latitude: cached.latitude,
          longitude: cached.longitude,
          cached: true,
        }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    // Geocodificar
    const { latitude, longitude } = await geocodeWithHeigit(address);

    // Salvar no cache
    const fullAddress = `${address.rua}, ${address.numero}, ${address.complemento ? address.complemento + ', ' : ''}${address.bairro}, ${address.cidade}, ${address.estado}${address.cep ? ` - ${address.cep}` : ''}`;
    
    await supabase.from("address_cache").insert({
      address_hash: addressHash,
      full_address: fullAddress,
      latitude,
      longitude,
      source: "heigit",
    });

    return new Response(
      JSON.stringify({
        latitude,
        longitude,
        cached: false,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Erro ao geocodificar endereço",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
