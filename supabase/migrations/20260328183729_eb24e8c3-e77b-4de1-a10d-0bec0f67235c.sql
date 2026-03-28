-- Migrate 'allocated' values to 'assigned'
UPDATE trees SET planting_status = 'assigned' WHERE planting_status = 'allocated';