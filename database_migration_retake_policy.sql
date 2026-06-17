-- Add can_retake column to user_progress table
-- This column controls whether a student can retake a quiz for a specific topic

ALTER TABLE user_progress 
ADD COLUMN IF NOT EXISTS can_retake BOOLEAN DEFAULT FALSE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_progress_can_retake 
ON user_progress(user_id, topic_id, can_retake);

-- Optional: Add comment to document the column
COMMENT ON COLUMN user_progress.can_retake IS 'When true, student can retake the quiz for this topic. Admin must explicitly enable this.';
