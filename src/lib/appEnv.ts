import { apiBase } from "@/lib/api";

export type AppEnv = "local" | "staging" | "production";

let cached: Promise<AppEnv> | null = null;

function parseEnv(value: unknown): AppEnv {
  if (value === "local" || value === "staging" || value === "production") return value;
  return "production";
}

export function loadAppEnv(): Promise<AppEnv> {
  if (!cached) {
    cached = fetch(`${apiBase()}/health`)
      .then(async (res) => {
        const data: unknown = await res.json().catch(() => ({}));
        const env = data && typeof data === "object" && "env" in data ? (data as { env: unknown }).env : undefined;
        return parseEnv(env);
      })
      .catch(() => "production" as AppEnv);
  }
  return cached;
}

export function simulationAllowed(env: AppEnv): boolean {
  return env === "local" || env === "staging";
}
