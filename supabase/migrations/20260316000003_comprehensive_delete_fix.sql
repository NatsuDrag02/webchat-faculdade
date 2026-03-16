-- Comprehensive Room Deletion Fix Script
-- This script fixes potential issues with foreign keys, RLS policies, and cascade deletions.

-- 1. Ensure the room_id foreign key has ON DELETE CASCADE
-- We drop it first if it exists to make sure the constraint is exactly what we need.
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'messages_room_id_fkey') THEN
    ALTER TABLE messages DROP CONSTRAINT messages_room_id_fkey;
  END IF;
END $$;

ALTER TABLE messages 
  ADD CONSTRAINT messages_room_id_fkey 
  FOREIGN KEY (room_id) 
  REFERENCES rooms(id) 
  ON DELETE CASCADE;

-- 2. Ensure RLS is enabled for rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing delete policies on rooms to recreate them cleanly
DROP POLICY IF EXISTS "Creators can delete their own rooms" ON rooms;

-- 4. Create/Recreate the delete policy on rooms
CREATE POLICY "Creators can delete their own rooms" 
  ON rooms FOR DELETE 
  TO authenticated 
  USING (auth.uid() = created_by);

-- 5. Drop existing delete policies on messages that might conflict
DROP POLICY IF EXISTS "Room creators can delete all messages in their rooms" ON messages;

-- 6. Create a policy on messages that explicitly allows the room creator to delete messages
-- This is technically what the cascade needs to bypass the general message RLS
CREATE POLICY "Room creators can delete all messages in their rooms" 
  ON messages FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.id = messages.room_id 
      AND rooms.created_by = auth.uid()
    )
  );
