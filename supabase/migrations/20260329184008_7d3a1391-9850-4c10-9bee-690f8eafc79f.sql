
CREATE POLICY "sh_insert_tree_carers"
ON public.tree_carers
FOR INSERT TO authenticated
WITH CHECK (
  is_stakeholder(auth.uid()) AND (
    associated_partner_id IS NULL OR associated_partner_id = get_user_organization(auth.uid())
  )
);

CREATE POLICY "sh_update_tree_carers"
ON public.tree_carers
FOR UPDATE TO authenticated
USING (
  is_stakeholder(auth.uid()) AND (
    associated_partner_id IS NULL OR associated_partner_id = get_user_organization(auth.uid())
  )
);

CREATE POLICY "sh_select_tree_carers"
ON public.tree_carers
FOR SELECT TO authenticated
USING (
  is_stakeholder(auth.uid()) AND (
    associated_partner_id IS NULL OR associated_partner_id = get_user_organization(auth.uid())
  )
);

CREATE POLICY "sa_tree_carers"
ON public.tree_carers
FOR ALL TO authenticated
USING (is_super_admin(auth.uid()))
WITH CHECK (is_super_admin(auth.uid()));
