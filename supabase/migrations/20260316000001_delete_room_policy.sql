-- Policy to allow creators to delete their own rooms
CREATE POLICY "Creators can delete their own rooms" 
  ON rooms FOR DELETE 
  TO authenticated 
  USING (auth.uid() = created_by);
