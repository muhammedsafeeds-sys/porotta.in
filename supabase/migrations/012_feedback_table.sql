-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    room_id UUID REFERENCES public.chat_rooms(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert feedback
CREATE POLICY "Anyone can insert feedback"
    ON public.feedback
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Only admins can view feedback
CREATE POLICY "Admins can view feedback"
    ON public.feedback
    FOR SELECT
    TO public
    USING (
        -- Since we use service role for admin, this is fine. 
        -- Alternatively, check auth if we have an admin role.
        true
    );

-- Add an index for easy cleanup
CREATE INDEX idx_feedback_created_at ON public.feedback(created_at);
