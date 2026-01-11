-- Migration: Add admin rejection proof field to loans table
-- Date: 2026-01-11
-- Description: Add adminRejectionProof column to store admin uploaded proof when rejecting user return

ALTER TABLE loans ADD COLUMN IF NOT EXISTS adminRejectionProof VARCHAR(500) DEFAULT NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_loans_admin_rejection_proof ON loans(adminRejectionProof) WHERE adminRejectionProof IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN loans.adminRejectionProof IS 'URL to admin uploaded proof/photo when rejecting user return proof';