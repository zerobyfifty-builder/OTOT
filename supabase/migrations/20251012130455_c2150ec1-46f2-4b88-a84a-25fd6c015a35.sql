-- Allow institutional partners to view data from their organization

-- Update trees RLS policy to allow organization members to view organization trees
DROP POLICY IF EXISTS "Users can view organization trees" ON trees;
CREATE POLICY "Users can view organization trees"
ON trees FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  (
    auth.uid() IN (
      SELECT user_id FROM users 
      WHERE organization_id = (
        SELECT organization_id FROM users WHERE user_id = auth.uid()
      )
      AND organization_id IS NOT NULL
    )
  )
);

-- Update trips RLS policy to allow organization members to view organization trips
DROP POLICY IF EXISTS "Users can view organization trips" ON trips;
CREATE POLICY "Users can view organization trips"
ON trips FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  (
    auth.uid() IN (
      SELECT user_id FROM users 
      WHERE organization_id = (
        SELECT organization_id FROM users WHERE user_id = auth.uid()
      )
      AND organization_id IS NOT NULL
    )
  )
);

-- Update users RLS policy to allow organization members to view organization users
DROP POLICY IF EXISTS "Users can view organization users" ON users;
CREATE POLICY "Users can view organization users"
ON users FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  (
    auth.uid() IN (
      SELECT user_id FROM users u2
      WHERE u2.organization_id = users.organization_id
      AND users.organization_id IS NOT NULL
    )
  )
);