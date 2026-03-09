/*
  # Chat Application Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `display_name` (text)
      - `created_at` (timestamptz)
    
    - `messages`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Profiles: Users can read all profiles, insert/update their own
    - Messages: Authenticated users can read all messages, insert their own
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete messages older than 1 minute"
  ON messages FOR DELETE
  TO authenticated
  USING (now() - created_at > interval '1 minute');

CREATE INDEX IF NOT EXISTS messages_created_at_idx ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON messages(user_id);
