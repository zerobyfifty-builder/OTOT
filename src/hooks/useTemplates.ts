import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CategoryKey, DocumentTemplate, TemplateCategory, TemplateDesign } from '@/lib/templates/types';

export function useTemplateCategories() {
  return useQuery({
    queryKey: ['template-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as unknown as TemplateCategory[];
    },
  });
}

export function useTemplatesByCategory(categoryKey: CategoryKey | null) {
  return useQuery({
    queryKey: ['document-templates', categoryKey],
    enabled: !!categoryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('category_key', categoryKey!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as DocumentTemplate[];
    },
  });
}

export function useTemplateDesign(designId: string | null) {
  return useQuery({
    queryKey: ['template-design', designId],
    enabled: !!designId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_designs')
        .select('*')
        .eq('id', designId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useEngineFlags() {
  return useQuery({
    queryKey: ['template-engine-flags'],
    queryFn: async () => {
      const { data, error } = await supabase.from('template_engine_flags').select('*');
      if (error) throw error;
      return data || [];
    },
  });
}

export function useToggleEngineFlag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { category_key: string; is_enabled: boolean }) => {
      const { error } = await supabase
        .from('template_engine_flags')
        .update({ is_enabled: args.is_enabled, updated_at: new Date().toISOString() })
        .eq('category_key', args.category_key);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template-engine-flags'] }),
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { category_key: CategoryKey; name: string; design: TemplateDesign }) => {
      const { data: tpl, error } = await supabase
        .from('document_templates')
        .insert({ category_key: args.category_key, name: args.name, status: 'draft', version: 1 })
        .select('*')
        .single();
      if (error) throw error;
      const { data: design, error: dErr } = await supabase
        .from('template_designs')
        .insert({ template_id: tpl.id, version: 1, design_json: args.design as any })
        .select('*')
        .single();
      if (dErr) throw dErr;
      await supabase.from('document_templates').update({ current_design_id: design.id }).eq('id', tpl.id);
      return tpl;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-templates'] }),
  });
}

export function useUpdateDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { templateId: string; design: TemplateDesign; version: number }) => {
      const { data: d, error } = await supabase
        .from('template_designs')
        .insert({ template_id: args.templateId, version: args.version + 1, design_json: args.design as any })
        .select('*')
        .single();
      if (error) throw error;
      const { error: uErr } = await supabase
        .from('document_templates')
        .update({ current_design_id: d.id, version: args.version + 1 })
        .eq('id', args.templateId);
      if (uErr) throw uErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-templates'] });
      qc.invalidateQueries({ queryKey: ['template-design'] });
    },
  });
}

export function useSetTemplateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: string; status: DocumentTemplate['status']; parity?: boolean }) => {
      const patch: Record<string, any> = { status: args.status };
      if (args.status === 'approved') {
        patch.approved_at = new Date().toISOString();
        if (args.parity) patch.parity_confirmed_at = new Date().toISOString();
      }
      if (args.status === 'archived') patch.archived_at = new Date().toISOString();
      const { error } = await supabase.from('document_templates').update(patch).eq('id', args.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-templates'] }),
  });
}

export function useTemplateAssignments(category: CategoryKey | null) {
  return useQuery({
    queryKey: ['template-assignments', category],
    enabled: !!category,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('template_assignments')
        .select('*')
        .eq('category_key', category!);
      if (error) throw error;
      return data || [];
    },
  });
}

export function useCreateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      category_key: CategoryKey;
      template_id: string;
      scope: 'global' | 'partner' | 'portal';
      scope_ref_id?: string | null;
    }) => {
      const { error } = await supabase.from('template_assignments').insert({
        category_key: args.category_key,
        template_id: args.template_id,
        scope: args.scope,
        scope_ref_id: args.scope_ref_id ?? null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template-assignments'] }),
  });
}

export function useDeleteAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('template_assignments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['template-assignments'] }),
  });
}
