import { useEffect, useState } from "react";
import { loadAppEnv, simulationAllowed } from "@/lib/appEnv";

export function useSimulationAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let alive = true;
    void loadAppEnv().then((env) => {
      if (alive) setAllowed(simulationAllowed(env));
    });
    return () => {
      alive = false;
    };
  }, []);

  return allowed;
}
