-- =============================================================================
-- Water Log V1.6 - Fix water_sessions RLS
-- Add SELECT policy so getWaterAdminSession can read sessions with anon key
-- =============================================================================

DROP POLICY IF EXISTS "Sessions readable by all" ON public.water_sessions;
CREATE POLICY "Sessions readable by all" ON public.water_sessions FOR SELECT TO anon USING (true);

NOTIFY pgrst, 'reload schema';