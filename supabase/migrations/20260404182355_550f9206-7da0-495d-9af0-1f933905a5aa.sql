-- Delete notifications linked to the superseded submission
DELETE FROM planting_cost_notifications WHERE submission_id = 'ad912937-db91-485a-a279-430fc9d7b31d';

-- Delete config linked to the superseded submission
DELETE FROM planting_cost_configs WHERE submission_id = 'ad912937-db91-485a-a279-430fc9d7b31d';

-- Delete the superseded submission itself
DELETE FROM planting_cost_submissions WHERE id = 'ad912937-db91-485a-a279-430fc9d7b31d';
