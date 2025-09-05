-- Update move_type enum to include multiple_capture
ALTER TABLE moves MODIFY COLUMN move_type ENUM('move', 'capture', 'multiple_capture', 'king_promotion') NOT NULL;

