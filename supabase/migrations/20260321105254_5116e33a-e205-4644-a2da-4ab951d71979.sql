INSERT INTO public.partner_types (name, category, description, is_active, requires_api, transaction_enabled)
VALUES ('Institutional Partner', 'stakeholder', 'Institutional oversight and regulatory partner', true, false, true);

INSERT INTO public.modules (name, display_name, category, description, route, is_active, sort_order)
VALUES ('travel_agents', 'Travel Agents', 'operations', 'Manage travel agent offsets and tickets', '/travel-agents', true, 50);