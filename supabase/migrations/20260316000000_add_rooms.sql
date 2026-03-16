-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_private boolean DEFAULT false,
  password text, -- Plain text for simplicity as requested/implied for a college project
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES profiles(id)
);

-- Add room_id to messages
ALTER TABLE messages ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id) ON DELETE CASCADE;

-- Enable RLS on rooms
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- Policies for rooms
CREATE POLICY "Anyone can view rooms" 
  ON rooms FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "Authenticated users can create rooms" 
  ON rooms FOR INSERT 
  TO authenticated 
  WITH CHECK (auth.uid() = created_by);

-- Enable Realtime for rooms
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
