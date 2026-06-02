-- Enable route_trace feature for the default brand
-- This allows access to the Route Trace dashboard

SELECT set_brand_feature('64294306-5f42-463d-a5e8-2ad6c81a96de', 'route_trace', true);
