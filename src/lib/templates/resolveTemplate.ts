import { supabase } from '@/integrations/supabase/client';
import type { CategoryKey, ResolveContext, TemplateDesign } from './types';

export interface ResolvedTemplate {
  templateId: string;
  name: string;
  design: TemplateDesign;
}

/**
 * Resolve the most specific active, approved template for a category.
 * Order: partner override > portal override > global default.
 * Returns null on any error or when nothing matches — callers MUST fall back
 * to the existing hard-coded generator.
 */
export async function resolveTemplate(
  category: CategoryKey,
  ctx: ResolveContext = {}
): Promise<ResolvedTemplate | null> {
  try {
    const { data: assignments, error } = await supabase
      .from('template_assignments')
      .select('id, template_id, scope, scope_ref_id, priority, is_active')
      .eq('category_key', category)
      .eq('is_active', true);
    if (error) throw error;
    if (!assignments || assignments.length === 0) return null;

    const scored = assignments
      .map((a) => {
        let score = 0;
        if (a.scope === 'partner' && ctx.partnerOrgId && a.scope_ref_id === ctx.partnerOrgId) score = 300;
        else if (a.scope === 'portal' && ctx.portal && a.scope_ref_id && a.scope_ref_id.toString() === ctx.portal) score = 200;
        else if (a.scope === 'global') score = 100;
        return { ...a, score };
      })
      .filter((a) => a.score > 0)
      .sort((a, b) => b.score - a.score || a.priority - b.priority);

    if (scored.length === 0) return null;

    for (const pick of scored) {
      const { data: tpl } = await supabase
        .from('document_templates')
        .select('id, name, status, current_design_id')
        .eq('id', pick.template_id)
        .maybeSingle();
      if (!tpl || tpl.status !== 'approved' || !tpl.current_design_id) continue;
      const { data: design } = await supabase
        .from('template_designs')
        .select('design_json')
        .eq('id', tpl.current_design_id)
        .maybeSingle();
      if (!design?.design_json) continue;
      return {
        templateId: tpl.id,
        name: tpl.name,
        design: design.design_json as TemplateDesign,
      };
    }
    return null;
  } catch (e) {
    console.warn('[templates] resolveTemplate failed', category, e);
    return null;
  }
}
