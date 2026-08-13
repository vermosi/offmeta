GRANT INSERT, UPDATE, DELETE ON public.ontology_tags TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ontology_edges TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ontology_tag_approaches TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ontology_approaches TO authenticated;

CREATE POLICY "Admins manage ontology tags" ON public.ontology_tags
  FOR ALL TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

CREATE POLICY "Admins manage ontology edges" ON public.ontology_edges
  FOR ALL TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

CREATE POLICY "Admins manage tag approaches" ON public.ontology_tag_approaches
  FOR ALL TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

CREATE POLICY "Admins manage approaches" ON public.ontology_approaches
  FOR ALL TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));