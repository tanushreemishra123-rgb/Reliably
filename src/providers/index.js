import { mockProvider } from "./mockProvider.js";
import { createAnthropicProvider } from "./anthropicProvider.js";

// Resolve the active provider from UI config. Defaults to the offline mock so
// the app always runs with zero setup.
export function getProvider(cfg) {
  if (cfg?.mode === "anthropic" && cfg.apiKey) {
    return createAnthropicProvider({ apiKey: cfg.apiKey, model: cfg.model });
  }
  return mockProvider;
}

export { mockProvider };
