import { supabase } from '@/integrations/supabase/client';
import type { CategoryKey } from './types';

const cache = new Map<CategoryKey, { value: boolean; at: number }>();
const TTL_MS = 60_000;

/**
 * Per-category kill switch. Defaults to false (template engine OFF), so existing
 * hard-coded generators continue to run unchanged. Any read error returns false
 * to keep behavior safe.
 */
export async function isTemplateEngineEnabled(category: CategoryKey): Promise<boolean> {
  const cached = cache.get(category);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  try {
    const { data, error } = await supabase
      .from('template_engine_flags')
      .select('is_enabled')
      .eq('category_key', category)
      .maybeSingle();
    if (error) throw error;
    const value = data?.is_enabled === true;
    cache.set(category, { value, at: Date.now() });
    return value;
  } catch (e) {
    console.warn('[templates] flag read failed, defaulting OFF', category, e);
    cache.set(category, { value: false, at: Date.now() });
    return false;
  }
}

export function clearTemplateFlagCache() {
  cache.clear();
}
