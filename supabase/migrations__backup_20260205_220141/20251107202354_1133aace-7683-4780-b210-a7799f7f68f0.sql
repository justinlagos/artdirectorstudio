-- Auto-approve all existing featured or staff-picked items that aren't already approved
UPDATE public.shared_assets
SET is_inspire_approved = true
WHERE (featured = true OR staff_pick = true)
AND is_inspire_approved = false
AND is_deleted = false;