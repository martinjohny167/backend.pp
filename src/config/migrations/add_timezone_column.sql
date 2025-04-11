-- Add timezone column to USERS table
ALTER TABLE USERS ADD COLUMN timezone VARCHAR(50) DEFAULT 'America/Toronto';

-- Update existing users to have the default timezone
UPDATE USERS SET timezone = 'America/Toronto' WHERE timezone IS NULL; 