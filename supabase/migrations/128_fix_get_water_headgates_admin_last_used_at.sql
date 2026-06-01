-- Fix get_water_headgates_admin: removed last_used_at column that doesn't exist in water_headgates table
CREATE OR REPLACE FUNCTION public.get_water_headgates_admin(p_brand_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ DECLARE v_result JSONB; BEGIN
SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name, 'active', active, 'unit', unit, 'created_at', created_at, 'headgate_token', headgate_token, 'high_threshold', high_threshold, 'low_threshold', low_threshold) ORDER BY created_at DESC) INTO v_result
FROM water_headgates
WHERE brand_id = p_brand_id AND deleted_at IS NULL;
RETURN jsonb_build_object('headgates', COALESCE(v_result, '[]'::jsonb));
END; $function$