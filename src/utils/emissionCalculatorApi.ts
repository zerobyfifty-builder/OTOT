import { airports, calculateDistance } from "@/data/airports";

// Emission Calculator service config (build-time env, matches other VITE_ vars).
// When VITE_EMISSION_API_URL is unset, or a call fails, we transparently fall
// back to the local Haversine + emission-factor formula (see getFlightEmissions).
const EMISSION_API_URL = import.meta.env.VITE_EMISSION_API_URL as string | undefined;
const EMISSION_API_KEY = import.meta.env.VITE_EMISSION_API_KEY as string | undefined;

export type CabinClass = "economy" | "premium_economy" | "business" | "first";
export type AccommodationType =
  | "none"
  | "hotel"
  | "rental"
  | "cruise"
  | "service_apartment";

// Single source of truth for the local-fallback emission factors. These were
// previously duplicated in CarbonCalculator.tsx and AgentCalculateOffset.tsx.
export const EMISSION_FACTORS = {
  flight: {
    // kg CO2 per km per passenger (London–Nairobi 6818 km reference)
    economy: 0.117,
    premium_economy: 0.187,
    business: 0.339,
    first: 0.468,
  },
  accommodation: {
    // kg CO2 per night per traveler
    none: 0,
    hotel: 16.7,
    rental: 10,
    cruise: 50,
    service_apartment: 12,
  },
} as const;

// Fallback tree-offset capacity (kg CO2 per tree). The tourist flow overrides
// this with DB-driven sequestration rates via useCarbonCalculation.
export const KG_CO2_PER_TREE = 160;

export interface FlightLeg {
  origin: string; // IATA code
  destination: string; // IATA code
}

export interface FlightEmissionParams {
  cabinClass: CabinClass;
  numTravelers: number;
  isReturn: boolean;
  // Airports mode: one or more legs (multi-city sums the legs).
  legs?: FlightLeg[];
  // Flight-time mode: one-way distance derived from hours (no airports, so the
  // service cannot price it — always computed locally).
  distanceKm?: number;
}

export interface FlightEmissionResult {
  distance: number; // km, including the return multiplier
  flightCO2: number; // kg CO2, all travelers, including the return multiplier
  source: "service" | "local";
}

/**
 * Local Haversine + emission-factor computation. Mirrors the exact math the two
 * calculators used before this integration, so it is a faithful fallback.
 */
export function computeFlightEmissionsLocal(
  params: FlightEmissionParams
): FlightEmissionResult {
  const { cabinClass, numTravelers, isReturn, legs, distanceKm } = params;

  let oneWayDistance = 0;
  if (typeof distanceKm === "number") {
    oneWayDistance = distanceKm;
  } else if (legs) {
    for (const leg of legs) {
      const origin = airports.find((a) => a.code === leg.origin);
      const destination = airports.find((a) => a.code === leg.destination);
      if (origin && destination) {
        oneWayDistance += calculateDistance(origin, destination);
      }
    }
  }

  const multiplier = isReturn ? 2 : 1;
  const totalDistance = oneWayDistance * multiplier;
  const factor = EMISSION_FACTORS.flight[cabinClass];
  const flightCO2 = totalDistance * factor * numTravelers;

  return { distance: totalDistance, flightCO2, source: "local" };
}

async function fetchLegFromService(
  leg: FlightLeg,
  cabinClass: CabinClass
): Promise<{ co2PerPax: number; distance: number }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (EMISSION_API_KEY) {
    headers["X-API-Key"] = EMISSION_API_KEY;
  }

  const response = await fetch(
    `${EMISSION_API_URL}/api/v1/carbon-calculator/calculate`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        origin: leg.origin,
        destination: leg.destination,
        cabin_class: cabinClass,
        passenger_count: 1,
        round_trip: false,
      }),
    }
  );

  if (!response.ok) {
    // 404 = airport outside the service's known set; anything else = server/error.
    throw new Error(`Emission service returned ${response.status}`);
  }

  const data = await response.json();
  const co2PerPax = Number(data.co2_kg_per_passenger);
  const distance = Number(data.distance_km);

  if (!Number.isFinite(co2PerPax)) {
    throw new Error("Emission service returned an invalid CO2 value");
  }

  return {
    co2PerPax,
    distance: Number.isFinite(distance) ? distance : 0,
  };
}

/**
 * Primary flight-emission entry point. Uses the Emission Calculator service when
 * possible and transparently falls back to the local formula on any failure
 * (unsupported airport, non-200, network/CORS error, service down, or when the
 * service URL is not configured). Flight-time mode is always local.
 *
 * Traveler count and the return multiplier are applied client-side so the
 * service and local paths stay symmetric and match the pre-integration behavior.
 */
export async function getFlightEmissions(
  params: FlightEmissionParams
): Promise<FlightEmissionResult> {
  const { cabinClass, numTravelers, isReturn, legs } = params;

  // Flight-time mode (no airports) or unconfigured service → local.
  if (!legs || legs.length === 0 || !EMISSION_API_URL) {
    return computeFlightEmissionsLocal(params);
  }

  try {
    let sumCo2PerPax = 0;
    let sumDistance = 0;

    for (const leg of legs) {
      if (!leg.origin || !leg.destination) {
        throw new Error("Incomplete flight leg");
      }
      const { co2PerPax, distance } = await fetchLegFromService(leg, cabinClass);
      sumCo2PerPax += co2PerPax;
      sumDistance += distance;
    }

    const multiplier = isReturn ? 2 : 1;
    return {
      distance: sumDistance * multiplier,
      flightCO2: sumCo2PerPax * numTravelers * multiplier,
      source: "service",
    };
  } catch (error) {
    // Silent fallback — the calculator must always return a number.
    console.warn(
      "Emission service unavailable; using local fallback.",
      error
    );
    return computeFlightEmissionsLocal(params);
  }
}
