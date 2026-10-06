import { useStore } from "@/contexts/StoreContext";

/**
 * The API decides: simulation is off in production and wherever live Afrinet
 * keys are set (unless ALLOW_SIMULATION is on).
 */
export function useSimulationAllowed(): boolean {
  return useStore().state.settings.simulationAllowed;
}
