INSERT INTO roles (name, display_name, role_category, description)
VALUES ('travel_agent', 'Travel Agent', 'business', 'Travel agent with carbon offset portal access')
ON CONFLICT DO NOTHING;