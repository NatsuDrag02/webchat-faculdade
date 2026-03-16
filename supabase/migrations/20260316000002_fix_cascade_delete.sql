-- Relax policy on messages to allow deletion if you are the room creator
-- This ensures the ON DELETE CASCADE from the rooms table works correctly.
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
