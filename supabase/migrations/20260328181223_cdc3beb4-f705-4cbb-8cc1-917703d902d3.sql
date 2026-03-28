ALTER TYPE planting_progress_type ADD VALUE IF NOT EXISTS 'waiting_to_be_assigned';
ALTER TYPE planting_progress_type ADD VALUE IF NOT EXISTS 'site_prepared';
ALTER TYPE planting_progress_type ADD VALUE IF NOT EXISTS 'saplings_ready';
ALTER TYPE planting_progress_type ADD VALUE IF NOT EXISTS 'planting_scheduled';
ALTER TYPE planting_progress_type ADD VALUE IF NOT EXISTS 'sapling_planted';
ALTER TYPE planting_progress_type ADD VALUE IF NOT EXISTS 'being_mapped';
ALTER TYPE planting_progress_type ADD VALUE IF NOT EXISTS 'verified';
ALTER TYPE planting_progress_type ADD VALUE IF NOT EXISTS 'dead';