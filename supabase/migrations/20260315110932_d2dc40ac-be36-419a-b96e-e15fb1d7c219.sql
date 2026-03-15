-- Clear all travel agent related data for fresh testing
-- Order matters due to foreign key constraints

-- 1. Delete agent tickets (references travel_agents)
DELETE FROM agent_tickets;

-- 2. Delete agent sessions (references travel_agents)
DELETE FROM travel_agent_sessions;

-- 3. Delete travel agents
DELETE FROM travel_agents;

-- 4. Delete any user profiles with travel_agent role
DELETE FROM users WHERE role_id IN (SELECT id FROM roles WHERE name = 'travel_agent');