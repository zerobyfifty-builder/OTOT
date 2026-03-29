
-- Delete beat under Naivasha's test block
DELETE FROM public.mdm_location_beats WHERE id = 'ccbe92b3-7842-46ed-bb93-8e0b769e058c';

-- Delete station under Naivasha's test block
DELETE FROM public.mdm_location_stations WHERE id = 'adc64661-c761-4834-ad18-8c8eab61df6c';

-- Delete blocks under both sub-counties
DELETE FROM public.mdm_location_blocks WHERE id IN ('978ca951-f8c0-45a9-9e45-ab247c6add79', '6f162670-f0ca-4fa0-b8f7-c419c9751222');

-- Delete the two test sub-counties (Naivasha NKRSC01, Njori NKRSC02)
DELETE FROM public.mdm_location_subcounties WHERE id IN ('92149aa0-3682-48c2-af35-2966a928f1d2', '411e38c7-9b72-4e1e-9b3f-64e64e62bd8f');
