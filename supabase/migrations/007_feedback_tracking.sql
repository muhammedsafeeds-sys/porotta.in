-- Add feedback tracking to chat_rooms
ALTER TABLE chat_rooms
ADD COLUMN feedback_a TEXT,
ADD COLUMN feedback_b TEXT;
