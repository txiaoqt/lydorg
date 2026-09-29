-- Migration: 20260929230000_standardize_seeded_budget_request_amounts.sql
-- Description: Standardize seeded sample Budget Requests to PHP 50,000 to match the actual
--              PCYDO YPOP source document ("[COPY] PUP CCIS_Pasig City YPOP 2025.pdf").
--              Preserves existing status distribution (28 awaiting, 28 released, 28 completed).
--              Does NOT create universal business rules or alter real organizations/allocations.

-- 1. Targeted update on existing seeded sample budget requests
UPDATE public.budget_requests
SET requested_amount = 50000,
    approved_amount = 50000,
    released_amount = CASE
      WHEN status IN ('budget_released', 'completed') THEN 50000
      ELSE 0
    END,
    updated_at = clock_timestamp()
WHERE is_seeded_sample_data = true
  AND seed_batch = 'PCYDO-YORP-2024-2026';

-- 2. Update admin_seed_yorp_sample_dataset RPC so future reseeds standardize b_amt to 50000
CREATE OR REPLACE FUNCTION public.admin_seed_yorp_sample_dataset(
  _session_token text,
  _batch_name text DEFAULT 'PCYDO-YORP-2024-2026'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  _admin_id uuid;
  _created_count integer := 0;
  _updated_count integer := 0;
  _skipped_count integer := 0;
  _count_2024 integer := 0;
  _count_2025 integer := 0;
  _count_2026 integer := 0;
  _now timestamptz := clock_timestamp();
  _user_id uuid;
  _org_id uuid;
  _acc_id uuid;
  _budget_id uuid;
  _urn text;
  _rec record;
BEGIN
  -- 1. Validate Admin Session
  SELECT vat.admin_id
  INTO _admin_id
  FROM public.validate_admin_session_token(_session_token) vat
  LIMIT 1;

  IF _admin_id IS NULL THEN
    RAISE EXCEPTION 'Admin account is not authorized.';
  END IF;

  -- 2. Strict Production Guard
  IF NOT public.is_development_or_test_environment() THEN
    RAISE EXCEPTION 'Seed operation refused: This operation is strictly prohibited in production and requires an explicit test/development environment.';
  END IF;

  IF _batch_name IS NULL OR trim(_batch_name) = '' THEN
    RAISE EXCEPTION 'Invalid seed batch name.';
  END IF;

  -- Create temporary table containing the authoritative 84 sample records
  CREATE TEMP TABLE temp_yorp_seed_dataset (
    record_num int,
    src_year int,
    org_name text,
    brgy text,
    dist text,
    major_class text,
    sub_class text,
    cyp text[],
    email text,
    phone text,
    add_emails text[],
    add_phones text[],
    rep_first text,
    rep_mid text,
    rep_last text,
    rep_full text,
    adv_first text,
    adv_mid text,
    adv_last text,
    adv_full text,
    unit_bldg text,
    street text,
    full_addr text,
    b_year int,
    b_amt numeric,
    b_purpose text,
    b_title text,
    b_status text,
    b_liquidated boolean,
    v_date timestamptz,
    acc_end date
  ) ON COMMIT DROP;

  INSERT INTO temp_yorp_seed_dataset VALUES
    (1, 2024, 'SANTA CRUZ VOLLEYBALL CLUB', 'Sta. Cruz', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'santacruzvolleyballclub.test@pasigyouth.org.ph', '09172400001', ARRAY['santacruzvolleyballclub.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182400001']::text[], 'Juan', 'Alcantara', 'Santos', 'Juan Alcantara Santos', 'Patricia', 'Hermosa', 'Flores', 'Patricia Hermosa Flores', 'Unit 101', 'M.H. del Pilar St., Alcalde Jose St.', 'Unit 101, M.H. del Pilar St., Alcalde Jose St., Sta. Cruz, Pasig City, Metro Manila, 1600', 2024, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (2, 2024, 'SIMPLE GROUP', 'Sta. Cruz', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'simplegroup.test@pasigyouth.org.ph', '09172400002', '{}'::text[], '{}'::text[], 'Mark', 'Balagtas', 'Reyes', 'Mark Balagtas Reyes', 'Nicole', 'Ilagan', 'Villanueva', 'Nicole Ilagan Villanueva', 'Unit 102', 'M.H. del Pilar St., Alcalde Jose St.', 'Unit 102, M.H. del Pilar St., Alcalde Jose St., Sta. Cruz, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (3, 2024, 'V-HOOD', 'Pineda', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'vhood.test@pasigyouth.org.ph', '09172400003', '{}'::text[], '{}'::text[], 'Joshua', 'Cordero', 'Cruz', 'Joshua Cordero Cruz', 'Clarisse', 'Jacinto', 'Ramos', 'Clarisse Jacinto Ramos', 'Unit 103', 'P. Burgos St., San Jose St.', 'Unit 103, P. Burgos St., San Jose St., Pineda, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (4, 2024, 'KABATAANG KALYE ARTISTA', 'Pineda', 'District I', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'kabataangkalyeartista.test@pasigyouth.org.ph', '09172400004', '{}'::text[], '{}'::text[], 'Angelo', 'Dalisay', 'Bautista', 'Angelo Dalisay Bautista', 'Danielle', 'Katigbak', 'Castro', 'Danielle Katigbak Castro', 'Unit 104', 'P. Burgos St., San Jose St.', 'Unit 104, P. Burgos St., San Jose St., Pineda, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (5, 2024, 'TEAM YEY', 'Pineda', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'teamyey.test@pasigyouth.org.ph', '09172400005', '{}'::text[], '{}'::text[], 'Christian', 'Espiritu', 'Ocampo', 'Christian Espiritu Ocampo', 'Kathryn', 'Lagman', 'Rivera', 'Kathryn Lagman Rivera', 'Unit 105', 'P. Burgos St., San Jose St.', 'Unit 105, P. Burgos St., San Jose St., Pineda, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (6, 2024, 'PURE KWATRO', 'Pineda', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'purekwatro.test@pasigyouth.org.ph', '09172400006', '{}'::text[], '{}'::text[], 'Daniel', 'Fajardo', 'Garcia', 'Daniel Fajardo Garcia', 'Trisha', 'Magat', 'Aquino', 'Trisha Magat Aquino', 'Unit 106', 'P. Burgos St., San Jose St.', 'Unit 106, P. Burgos St., San Jose St., Pineda, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (7, 2024, 'SANTOLAN HIGH SCHOOL SUPREME STUDENT GOVERNMENT', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'santolanhighschoolsupremestu.test@pasigyouth.org.ph', '09172400007', ARRAY['santolanhighschoolsupremestu.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182400007']::text[], 'Gabriel', 'Galang', 'Mendoza', 'Gabriel Galang Mendoza', 'Hannah', 'Noble', 'Navarro', 'Hannah Noble Navarro', 'Unit 107', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 107, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (8, 2024, 'SANTOLAN BRASS BAND', 'Santolan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'santolanbrassband.test@pasigyouth.org.ph', '09172400008', '{}'::text[], '{}'::text[], 'John Paul', 'Hermosa', 'Torres', 'John Paul Hermosa Torres', 'Janine', 'Ortega', 'Salazar', 'Janine Ortega Salazar', 'Unit 108', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 108, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (9, 2024, 'OUR LADY OF PERPETUAL HELP SCHOOL, INC. SUPREME STUDENT COUNCIL', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'ourladyofperpetualhelpschool.test@pasigyouth.org.ph', '09172400009', '{}'::text[], '{}'::text[], 'Jian', 'Ilagan', 'Tomas', 'Jian Ilagan Tomas', 'Stephanie', 'Panganiban', 'Mercado', 'Stephanie Panganiban Mercado', 'Unit 109', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 109, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (10, 2024, 'SANTOLAN HIGH SCHOOL RED CROSS YOUTH', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'santolanhighschoolredcrossyo.test@pasigyouth.org.ph', '09172400010', '{}'::text[], '{}'::text[], 'Alden', 'Jacinto', 'Andrada', 'Alden Jacinto Andrada', 'Kirsten', 'Quinto', 'del Rosario', 'Kirsten Quinto del Rosario', 'Unit 110', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 110, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (11, 2024, 'ALLIANCE OF BAGKAT COMMUNITY', 'Bagong Katipunan', 'District I', 'Youth Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'allianceofbagkatcommunity.test@pasigyouth.org.ph', '09172400011', '{}'::text[], '{}'::text[], 'Kenneth', 'Katigbak', 'Castillo', 'Kenneth Katigbak Castillo', 'Andrea', 'Resurreccion', 'de Leon', 'Andrea Resurreccion de Leon', 'Unit 111', 'A. Flores St., Dr. Pilapil St.', 'Unit 111, A. Flores St., Dr. Pilapil St., Bagong Katipunan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (12, 2024, 'MALINAO VOLLEYBALL CLUB', 'Malinao', 'District I', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'malinaovolleyballclub.test@pasigyouth.org.ph', '09172400012', '{}'::text[], '{}'::text[], 'Rafael', 'Lagman', 'Flores', 'Rafael Lagman Flores', 'Roxanne', 'Samonte', 'Soriano', 'Roxanne Samonte Soriano', 'Unit 112', 'V. Baltazar St., Victorino Cruz St.', 'Unit 112, V. Baltazar St., Victorino Cruz St., Malinao, Pasig City, Metro Manila, 1600', 2024, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (13, 2024, 'DAMAYAN YOUTH ORGANIZATION', 'Maybunga', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'damayanyouthorganization.test@pasigyouth.org.ph', '09172400013', '{}'::text[], '{}'::text[], 'Vincent', 'Magat', 'Villanueva', 'Vincent Magat Villanueva', 'Samantha', 'Tinio', 'Manalo', 'Samantha Tinio Manalo', 'Unit 113', 'C. Raymundo Ave., Stella Maris St.', 'Unit 113, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (14, 2024, 'KABATAAN NG DAMAYAN PH 2', 'Maybunga', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'kabataanngdamayanph2.test@pasigyouth.org.ph', '09172400014', '{}'::text[], '{}'::text[], 'Carlos', 'Noble', 'Ramos', 'Carlos Noble Ramos', 'Bianca', 'Umali', 'Pascual', 'Bianca Umali Pascual', 'Unit 114', 'C. Raymundo Ave., Stella Maris St.', 'Unit 114, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (15, 2024, 'NEW GEN OF SAMAHANG BATANG CONCHA (SBC)', 'Maybunga', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'newgenofsamahangbatangconcha.test@pasigyouth.org.ph', '09172400015', ARRAY['newgenofsamahangbatangconcha.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182400015']::text[], 'Matthew', 'Ortega', 'Castro', 'Matthew Ortega Castro', 'Gwen', 'Valenzuela', 'Aguilar', 'Gwen Valenzuela Aguilar', 'Unit 115', 'C. Raymundo Ave., Stella Maris St.', 'Unit 115, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (16, 2024, 'ALLIANCE OF COMPETENT YOUNG MOVERS', 'Pinagbuhatan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'allianceofcompetentyoungmove.test@pasigyouth.org.ph', '09172400016', '{}'::text[], '{}'::text[], 'Jerome', 'Panganiban', 'Rivera', 'Jerome Panganiban Rivera', 'Chloe', 'Yambao', 'Medina', 'Chloe Yambao Medina', 'Unit 116', 'Kenneth Road, M. Eusebio Ave.', 'Unit 116, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (17, 2024, 'KATROPA YOUTH ORGANIZATION', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'katropayouthorganization.test@pasigyouth.org.ph', '09172400017', '{}'::text[], '{}'::text[], 'Francis', 'Quinto', 'Aquino', 'Francis Quinto Aquino', 'Sofia', 'Zamora', 'Guevarra', 'Sofia Zamora Guevarra', 'Unit 117', 'Kenneth Road, M. Eusebio Ave.', 'Unit 117, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (18, 2024, 'PINALAD YOUTH COUNCIL', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'pinaladyouthcouncil.test@pasigyouth.org.ph', '09172400018', '{}'::text[], '{}'::text[], 'Elijah', 'Resurreccion', 'Navarro', 'Elijah Resurreccion Navarro', 'Regine', 'Alcantara', 'Valdez', 'Regine Alcantara Valdez', 'Unit 118', 'Kenneth Road, M. Eusebio Ave.', 'Unit 118, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (19, 2024, 'PASIG HABITAT II YOUTH COUNCIL', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'pasighabitatiiyouthcouncil.test@pasigyouth.org.ph', '09172400019', '{}'::text[], '{}'::text[], 'Paolo', 'Samonte', 'Salazar', 'Paolo Samonte Salazar', 'Kimberly', 'Balagtas', 'Perez', 'Kimberly Balagtas Perez', 'Unit 119', 'Kenneth Road, M. Eusebio Ave.', 'Unit 119, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (20, 2024, 'SINAG KABATAAN NG PINAGBUHATAN', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'sinagkabataanngpinagbuhatan.test@pasigyouth.org.ph', '09172400020', '{}'::text[], '{}'::text[], 'Lorenzo', 'Tinio', 'Mercado', 'Lorenzo Tinio Mercado', 'Bernadette', 'Cordero', 'Santiago', 'Bernadette Cordero Santiago', 'Unit 120', 'Kenneth Road, M. Eusebio Ave.', 'Unit 120, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (21, 2024, 'PASIG ESPORTS YOUTH ORGANIZATION', 'Kapasigan', 'District I', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'pasigesportsyouthorganizatio.test@pasigyouth.org.ph', '09172400021', ARRAY['pasigesportsyouthorganizatio.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182400021']::text[], 'Nathaniel', 'Umali', 'del Rosario', 'Nathaniel Umali del Rosario', 'Lorraine', 'Dalisay', 'Cortez', 'Lorraine Dalisay Cortez', 'Unit 121', 'A. Mabini St., Plaza Rizal', 'Unit 121, A. Mabini St., Plaza Rizal, Kapasigan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (22, 2024, 'KABATAANG TAMBULI NG PASIG', 'Palatiw', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'kabataangtambulingpasig.test@pasigyouth.org.ph', '09172400022', '{}'::text[], '{}'::text[], 'Dominic', 'Valenzuela', 'de Leon', 'Dominic Valenzuela de Leon', 'Eunice', 'Espiritu', 'Tolentino', 'Eunice Espiritu Tolentino', 'Unit 122', 'Market Ave., M.H. del Pilar St.', 'Unit 122, Market Ave., M.H. del Pilar St., Palatiw, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (23, 2024, 'PASIGLABAN KABATAAN', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'pasiglabankabataan.test@pasigyouth.org.ph', '09172400023', '{}'::text[], '{}'::text[], 'Anthony', 'Yambao', 'Soriano', 'Anthony Yambao Soriano', 'Carla', 'Fajardo', 'Morales', 'Carla Fajardo Morales', 'Unit 123', 'Kenneth Road, M. Eusebio Ave.', 'Unit 123, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (24, 2024, 'ROTARACT CLUB OF ORTIGAS CENTER', 'San Antonio', 'District I', 'Youth Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'rotaractclubofortigascenter.test@pasigyouth.org.ph', '09172400024', '{}'::text[], '{}'::text[], 'Miguel', 'Zamora', 'Manalo', 'Miguel Zamora Manalo', 'Shiela', 'Galang', 'Ferrer', 'Shiela Galang Ferrer', 'Unit 124', 'Emerald Ave., San Antonio Ave.', 'Unit 124, Emerald Ave., San Antonio Ave., San Antonio, Pasig City, Metro Manila, 1600', 2024, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (25, 2024, 'PANTHERS VOLLEYBALL CLUB', 'Manggahan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'panthersvolleyballclub.test@pasigyouth.org.ph', '09172400025', '{}'::text[], '{}'::text[], 'Arvin', 'Alcantara', 'Pascual', 'Arvin Alcantara Pascual', 'Maricar', 'Hermosa', 'Domingo', 'Maricar Hermosa Domingo', 'Unit 125', 'Amang Rodriguez Ave., East Bank Road', 'Unit 125, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (26, 2024, 'HILLTOP YOUTH ORGANIZATION', 'Bagong Ilog', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'hilltopyouthorganization.test@pasigyouth.org.ph', '09172400026', '{}'::text[], '{}'::text[], 'Edgar', 'Balagtas', 'Aguilar', 'Edgar Balagtas Aguilar', 'Faith', 'Ilagan', 'Vergara', 'Faith Ilagan Vergara', 'Unit 126', 'Kawilihan Village, C. Santos St.', 'Unit 126, Kawilihan Village, C. Santos St., Bagong Ilog, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (27, 2024, 'POSITIBONG PASIGUEÑO', 'Manggahan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'positibongpasigueo.test@pasigyouth.org.ph', '09172400027', '{}'::text[], '{}'::text[], 'Raymart', 'Cordero', 'Medina', 'Raymart Cordero Medina', 'Rochelle', 'Jacinto', 'Mariano', 'Rochelle Jacinto Mariano', 'Unit 127', 'Amang Rodriguez Ave., East Bank Road', 'Unit 127, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (28, 2024, 'PASIG CITY SCIENCE HIGH SCHOOL COORDINATING COUNCIL', 'Maybunga', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'health']::text[], 'pasigcitysciencehighschoolco.test@pasigyouth.org.ph', '09172400028', ARRAY['pasigcitysciencehighschoolco.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182400028']::text[], 'Jayson', 'Dalisay', 'Guevarra', 'Jayson Dalisay Guevarra', 'Maria', 'Katigbak', 'Padilla', 'Maria Katigbak Padilla', 'Unit 128', 'C. Raymundo Ave., Stella Maris St.', 'Unit 128, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (29, 2024, 'PASIG CITY SCIENCE HIGH SCHOOL SUPREME SECONDARY LEARNER GOVERNMENT', 'Maybunga', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'health']::text[], 'pasigcitysciencehighschoolsu.test@pasigyouth.org.ph', '09172400029', '{}'::text[], '{}'::text[], 'Leo', 'Espiritu', 'Valdez', 'Leo Espiritu Valdez', 'Angelica', 'Lagman', 'Bernardo', 'Angelica Lagman Bernardo', 'Unit 129', 'C. Raymundo Ave., Stella Maris St.', 'Unit 129, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (30, 2024, 'YOUTH EMPOWERMENT COMMUNITY (YECO)', 'Maybunga', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'youthempowermentcommunity.test@pasigyouth.org.ph', '09172400030', '{}'::text[], '{}'::text[], 'Bryan', 'Fajardo', 'Perez', 'Bryan Fajardo Perez', 'Alyssa', 'Magat', 'Santos', 'Alyssa Magat Santos', 'Unit 130', 'C. Raymundo Ave., Stella Maris St.', 'Unit 130, C. Raymundo Ave., Stella Maris St., Maybunga, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (31, 2024, 'ZODIACVILLE YOUTH DEVELOPMENT ORGANIZATION (ZYDO)', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'zodiacvilleyouthdevelopmento.test@pasigyouth.org.ph', '09172400031', '{}'::text[], '{}'::text[], 'Rommel', 'Galang', 'Santiago', 'Rommel Galang Santiago', 'Beatriz', 'Noble', 'Reyes', 'Beatriz Noble Reyes', 'Unit 131', 'Kenneth Road, M. Eusebio Ave.', 'Unit 131, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2024, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2024-03-15 09:00:00+08'::timestamptz, '2027-03-15'::date),
    (32, 2025, 'FAVOR YOUTH PASIG', 'San Antonio', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'favoryouthpasig.test@pasigyouth.org.ph', '09172500032', '{}'::text[], '{}'::text[], 'Dennis', 'Hermosa', 'Cortez', 'Dennis Hermosa Cortez', 'Camille', 'Ortega', 'Cruz', 'Camille Ortega Cruz', 'Unit 132', 'Emerald Ave., San Antonio Ave.', 'Unit 132, Emerald Ave., San Antonio Ave., San Antonio, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (33, 2025, 'YOUTH ON THE ROCK ORGANIZATION INC. PASIG CHAPTER', 'San Nicolas', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'youthontherockorganizationin.test@pasigyouth.org.ph', '09172500033', '{}'::text[], '{}'::text[], 'Juan', 'Ilagan', 'Tolentino', 'Juan Ilagan Tolentino', 'Patricia', 'Panganiban', 'Bautista', 'Patricia Panganiban Bautista', 'Unit 133', 'E. Angeles St., M.H. del Pilar St.', 'Unit 133, E. Angeles St., M.H. del Pilar St., San Nicolas, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (34, 2025, 'NAGPAYONG HIGH SCHOOL SUPREME SECONDARY LEARNER GOVERNMENT', 'Pinagbuhatan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'nagpayonghighschoolsupremese.test@pasigyouth.org.ph', '09172500034', '{}'::text[], '{}'::text[], 'Mark', 'Jacinto', 'Morales', 'Mark Jacinto Morales', 'Nicole', 'Quinto', 'Ocampo', 'Nicole Quinto Ocampo', 'Unit 134', 'Kenneth Road, M. Eusebio Ave.', 'Unit 134, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (35, 2025, 'SUPREME SECONDARY LEARNER GOVERNMENT OF KAPITOLYO HIGH SCHOOL', 'Kapitolyo', 'District I', 'Youth-Serving Organization', 'school-based', ARRAY['education', 'governance']::text[], 'supremesecondarylearnergover.test@pasigyouth.org.ph', '09172500035', ARRAY['supremesecondarylearnergover.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182500035']::text[], 'Joshua', 'Katigbak', 'Ferrer', 'Joshua Katigbak Ferrer', 'Clarisse', 'Resurreccion', 'Garcia', 'Clarisse Resurreccion Garcia', 'Unit 135', 'West Capitol Drive, East Capitol Drive', 'Unit 135, West Capitol Drive, East Capitol Drive, Kapitolyo, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (36, 2025, 'BUTING SENIOR HIGH SCHOOL SUPREME SECONDARY LEARNER GOVERNMENT', 'Buting', 'District I', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'butingseniorhighschoolsuprem.test@pasigyouth.org.ph', '09172500036', '{}'::text[], '{}'::text[], 'Angelo', 'Lagman', 'Domingo', 'Angelo Lagman Domingo', 'Danielle', 'Samonte', 'Mendoza', 'Danielle Samonte Mendoza', 'Unit 136', 'San Guillermo St., M. Almeda St.', 'Unit 136, San Guillermo St., M. Almeda St., Buting, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (37, 2025, 'EUSEBIO HIGH SCHOOL SUPREME SECONDARY LEARNERS GOVERNMENT', 'Rosario', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'eusebiohighschoolsupremeseco.test@pasigyouth.org.ph', '09172500037', '{}'::text[], '{}'::text[], 'Christian', 'Magat', 'Vergara', 'Christian Magat Vergara', 'Kathryn', 'Tinio', 'Torres', 'Kathryn Tinio Torres', 'Unit 137', 'Ortigas Ave. Ext., Bernal St.', 'Unit 137, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (38, 2025, 'UGONG CONVERT FIRE & RESCUE VOLUNTAS BRIGADE INC.', 'Ugong', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], 'ugongconvertfirerescuevolunt.test@pasigyouth.org.ph', '09172500038', '{}'::text[], '{}'::text[], 'Daniel', 'Noble', 'Mariano', 'Daniel Noble Mariano', 'Trisha', 'Umali', 'Tomas', 'Trisha Umali Tomas', 'Unit 138', 'Lanuza Ave., C-5 Road', 'Unit 138, Lanuza Ave., C-5 Road, Ugong, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (39, 2025, 'SAN LORENZO RUIZ SENIOR HIGH SCHOOL SUPREME SECONDARY LEARNER GOVERNMENT', 'Manggahan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'sanlorenzoruizseniorhighscho.test@pasigyouth.org.ph', '09172500039', '{}'::text[], '{}'::text[], 'Gabriel', 'Ortega', 'Padilla', 'Gabriel Ortega Padilla', 'Hannah', 'Valenzuela', 'Andrada', 'Hannah Valenzuela Andrada', 'Unit 139', 'Amang Rodriguez Ave., East Bank Road', 'Unit 139, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (40, 2025, 'PINAGBUHATAN EMERGEN-Z RESPONSE TEAM', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], 'pinagbuhatanemergenzresponse.test@pasigyouth.org.ph', '09172500040', '{}'::text[], '{}'::text[], 'John Paul', 'Panganiban', 'Bernardo', 'John Paul Panganiban Bernardo', 'Janine', 'Yambao', 'Castillo', 'Janine Yambao Castillo', 'Unit 140', 'Kenneth Road, M. Eusebio Ave.', 'Unit 140, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (41, 2025, '1609 ORGANIZATION', 'Rosario', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], '1609organization.test@pasigyouth.org.ph', '09172500041', ARRAY['1609organization.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182500041']::text[], 'Jian', 'Quinto', 'Santos', 'Jian Quinto Santos', 'Stephanie', 'Zamora', 'Flores', 'Stephanie Zamora Flores', 'Unit 141', 'Ortigas Ave. Ext., Bernal St.', 'Unit 141, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (42, 2025, 'CFC YOUTH FOR CHRIST - ROSARIO CHAPTER', 'Rosario', 'District II', 'Youth Organization', 'faith-based', ARRAY['social inclusion and equity', 'active citizenship']::text[], 'cfcyouthforchristrosariochap.test@pasigyouth.org.ph', '09172500042', '{}'::text[], '{}'::text[], 'Alden', 'Resurreccion', 'Reyes', 'Alden Resurreccion Reyes', 'Kirsten', 'Alcantara', 'Villanueva', 'Kirsten Alcantara Villanueva', 'Unit 142', 'Ortigas Ave. Ext., Bernal St.', 'Unit 142, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Arts, Culture & Heritage', 'Youth Cultural Heritage Celebration & Arts Workshop', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (43, 2025, 'MASSIVE IMPACT', 'Rosario', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'massiveimpact.test@pasigyouth.org.ph', '09172500043', '{}'::text[], '{}'::text[], 'Kenneth', 'Samonte', 'Cruz', 'Kenneth Samonte Cruz', 'Andrea', 'Balagtas', 'Ramos', 'Andrea Balagtas Ramos', 'Unit 143', 'Ortigas Ave. Ext., Bernal St.', 'Unit 143, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (44, 2025, 'EUSEBIO HIGH SCHOOL - SHS SCIENCE CLUB', 'Rosario', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'health']::text[], 'eusebiohighschoolshssciencec.test@pasigyouth.org.ph', '09172500044', '{}'::text[], '{}'::text[], 'Rafael', 'Tinio', 'Bautista', 'Rafael Tinio Bautista', 'Roxanne', 'Cordero', 'Castro', 'Roxanne Cordero Castro', 'Unit 144', 'Ortigas Ave. Ext., Bernal St.', 'Unit 144, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (45, 2025, 'SAGAD YOUTH VOLUNTEER ALLIANCE (SYVA)', 'Sagad', 'District I', 'Youth Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'sagadyouthvolunteeralliance.test@pasigyouth.org.ph', '09172500045', '{}'::text[], '{}'::text[], 'Vincent', 'Umali', 'Ocampo', 'Vincent Umali Ocampo', 'Samantha', 'Dalisay', 'Rivera', 'Samantha Dalisay Rivera', 'Unit 145', 'Dr. Sixto Antonio Ave., E. Angeles St.', 'Unit 145, Dr. Sixto Antonio Ave., E. Angeles St., Sagad, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (46, 2025, 'ROSARIO - BAYANIHUB', 'Rosario', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'rosariobayanihub.test@pasigyouth.org.ph', '09172500046', '{}'::text[], '{}'::text[], 'Carlos', 'Valenzuela', 'Garcia', 'Carlos Valenzuela Garcia', 'Bianca', 'Espiritu', 'Aquino', 'Bianca Espiritu Aquino', 'Unit 146', 'Ortigas Ave. Ext., Bernal St.', 'Unit 146, Ortigas Ave. Ext., Bernal St., Rosario, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (47, 2025, 'ANONAS DARTERS', 'Kalawaan', 'District I', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'anonasdarters.test@pasigyouth.org.ph', '09172500047', '{}'::text[], '{}'::text[], 'Matthew', 'Yambao', 'Mendoza', 'Matthew Yambao Mendoza', 'Gwen', 'Fajardo', 'Navarro', 'Gwen Fajardo Navarro', 'Unit 147', 'F. Antonio St., San Agustin St.', 'Unit 147, F. Antonio St., San Agustin St., Kalawaan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (48, 2025, 'ROVER SCOUTS OF THE PHILIPPINES - CIRCLE 34', 'Kalawaan', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'roverscoutsofthephilippinesc.test@pasigyouth.org.ph', '09172500048', '{}'::text[], '{}'::text[], 'Jerome', 'Zamora', 'Torres', 'Jerome Zamora Torres', 'Chloe', 'Galang', 'Salazar', 'Chloe Galang Salazar', 'Unit 148', 'F. Antonio St., San Agustin St.', 'Unit 148, F. Antonio St., San Agustin St., Kalawaan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (49, 2025, 'NEAR APRIL', 'Kalawaan', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'nearapril.test@pasigyouth.org.ph', '09172500049', '{}'::text[], '{}'::text[], 'Francis', 'Alcantara', 'Tomas', 'Francis Alcantara Tomas', 'Sofia', 'Hermosa', 'Mercado', 'Sofia Hermosa Mercado', 'Unit 149', 'F. Antonio St., San Agustin St.', 'Unit 149, F. Antonio St., San Agustin St., Kalawaan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (50, 2025, 'TEAM PHOENIX', 'Kalawaan', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'teamphoenix.test@pasigyouth.org.ph', '09172500050', '{}'::text[], '{}'::text[], 'Elijah', 'Balagtas', 'Andrada', 'Elijah Balagtas Andrada', 'Regine', 'Ilagan', 'del Rosario', 'Regine Ilagan del Rosario', 'Unit 100', 'F. Antonio St., San Agustin St.', 'Unit 100, F. Antonio St., San Agustin St., Kalawaan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (51, 2025, '45 PASIG FIRE & RESCUE VOLUNTEER INC.', 'Kalawaan', 'District I', 'Youth Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], '45pasigfirerescuevolunteerin.test@pasigyouth.org.ph', '09172500051', ARRAY['45pasigfirerescuevolunteerin.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182500051']::text[], 'Paolo', 'Cordero', 'Castillo', 'Paolo Cordero Castillo', 'Kimberly', 'Jacinto', 'de Leon', 'Kimberly Jacinto de Leon', 'Unit 101', 'F. Antonio St., San Agustin St.', 'Unit 101, F. Antonio St., San Agustin St., Kalawaan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (52, 2025, 'MUSLIM YOUTH SOLIDARITY ORGANIZATION', 'Pinagbuhatan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'muslimyouthsolidarityorganiz.test@pasigyouth.org.ph', '09172500052', '{}'::text[], '{}'::text[], 'Lorenzo', 'Dalisay', 'Flores', 'Lorenzo Dalisay Flores', 'Bernadette', 'Katigbak', 'Soriano', 'Bernadette Katigbak Soriano', 'Unit 102', 'Kenneth Road, M. Eusebio Ave.', 'Unit 102, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (53, 2025, 'GALANT ''88 UGONG DRUM AND LYRE CORPS', 'Ugong', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'galant88ugongdrumandlyrecorp.test@pasigyouth.org.ph', '09172500053', '{}'::text[], '{}'::text[], 'Nathaniel', 'Espiritu', 'Villanueva', 'Nathaniel Espiritu Villanueva', 'Lorraine', 'Lagman', 'Manalo', 'Lorraine Lagman Manalo', 'Unit 103', 'Lanuza Ave., C-5 Road', 'Unit 103, Lanuza Ave., C-5 Road, Ugong, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (54, 2025, 'SK UGONG VOLUNTEER GROUP (SKUVG)', 'Ugong', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'skugongvolunteergroup.test@pasigyouth.org.ph', '09172500054', '{}'::text[], '{}'::text[], 'Dominic', 'Fajardo', 'Ramos', 'Dominic Fajardo Ramos', 'Eunice', 'Magat', 'Pascual', 'Eunice Magat Pascual', 'Unit 104', 'Lanuza Ave., C-5 Road', 'Unit 104, Lanuza Ave., C-5 Road, Ugong, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (55, 2025, 'WASH IN SCHOOL (WINS) CLUB', 'Sagad', 'District I', 'Youth Organization', 'community-based', ARRAY['environment', 'active citizenship']::text[], 'washinschoolclub.test@pasigyouth.org.ph', '09172500055', '{}'::text[], '{}'::text[], 'Anthony', 'Galang', 'Castro', 'Anthony Galang Castro', 'Carla', 'Noble', 'Aguilar', 'Carla Noble Aguilar', 'Unit 105', 'Dr. Sixto Antonio Ave., E. Angeles St.', 'Unit 105, Dr. Sixto Antonio Ave., E. Angeles St., Sagad, Pasig City, Metro Manila, 1600', 2025, 50000, 'Environmental Protection & Climate Action', 'Barangay Tree-Planting & Urban Greening Initiative', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (56, 2025, 'MANGGAHAN YOUTH MOVEMENT', 'Manggahan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'manggahanyouthmovement.test@pasigyouth.org.ph', '09172500056', '{}'::text[], '{}'::text[], 'Miguel', 'Hermosa', 'Rivera', 'Miguel Hermosa Rivera', 'Shiela', 'Ortega', 'Medina', 'Shiela Ortega Medina', 'Unit 106', 'Amang Rodriguez Ave., East Bank Road', 'Unit 106, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (57, 2025, 'SINTAYAW DANCE TROUPE', 'Dela Paz', 'District II', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'sintayawdancetroupe.test@pasigyouth.org.ph', '09172500057', '{}'::text[], '{}'::text[], 'Arvin', 'Ilagan', 'Aquino', 'Arvin Ilagan Aquino', 'Maricar', 'Panganiban', 'Guevarra', 'Maricar Panganiban Guevarra', 'Unit 107', 'F. Mariano Ave., Marcos Highway', 'Unit 107, F. Mariano Ave., Marcos Highway, Dela Paz, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (58, 2025, 'MINISTRY OF ALTAR SERVERS - NUESTRA SEÑORA DEL ROSARIO', 'Ugong', 'District I', 'Youth Organization', 'faith-based', ARRAY['social inclusion and equity', 'active citizenship']::text[], 'ministryofaltarserversnuestr.test@pasigyouth.org.ph', '09172500058', '{}'::text[], '{}'::text[], 'Edgar', 'Jacinto', 'Navarro', 'Edgar Jacinto Navarro', 'Faith', 'Quinto', 'Valdez', 'Faith Quinto Valdez', 'Unit 108', 'Lanuza Ave., C-5 Road', 'Unit 108, Lanuza Ave., C-5 Road, Ugong, Pasig City, Metro Manila, 1600', 2025, 50000, 'Arts, Culture & Heritage', 'Youth Cultural Heritage Celebration & Arts Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (59, 2025, 'ANGAT MANGGAHAN', 'Manggahan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'angatmanggahan.test@pasigyouth.org.ph', '09172500059', '{}'::text[], '{}'::text[], 'Raymart', 'Katigbak', 'Salazar', 'Raymart Katigbak Salazar', 'Rochelle', 'Resurreccion', 'Perez', 'Rochelle Resurreccion Perez', 'Unit 109', 'Amang Rodriguez Ave., East Bank Road', 'Unit 109, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (60, 2025, 'MANGGAHAN VOLLEYBALL TEAM (MVT)', 'Manggahan', 'District II', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'manggahanvolleyballteam.test@pasigyouth.org.ph', '09172500060', ARRAY['manggahanvolleyballteam.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182500060']::text[], 'Jayson', 'Lagman', 'Mercado', 'Jayson Lagman Mercado', 'Maria', 'Samonte', 'Santiago', 'Maria Samonte Santiago', 'Unit 110', 'Amang Rodriguez Ave., East Bank Road', 'Unit 110, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (61, 2025, 'BOSS A FIRE AND RESCUE BRIGADE', 'Dela Paz', 'District II', 'Youth Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], 'bossafireandrescuebrigade.test@pasigyouth.org.ph', '09172500061', '{}'::text[], '{}'::text[], 'Leo', 'Magat', 'del Rosario', 'Leo Magat del Rosario', 'Angelica', 'Tinio', 'Cortez', 'Angelica Tinio Cortez', 'Unit 111', 'F. Mariano Ave., Marcos Highway', 'Unit 111, F. Mariano Ave., Marcos Highway, Dela Paz, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (62, 2025, 'O'' ROYALE SILVERCANE DRUM AND LYRE CORPS', 'Oranbo', 'District I', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'oroyalesilvercanedrumandlyre.test@pasigyouth.org.ph', '09172500062', '{}'::text[], '{}'::text[], 'Bryan', 'Noble', 'de Leon', 'Bryan Noble de Leon', 'Alyssa', 'Umali', 'Tolentino', 'Alyssa Umali Tolentino', 'Unit 112', 'St. Martin St., Shaw Blvd.', 'Unit 112, St. Martin St., Shaw Blvd., Oranbo, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (63, 2025, 'SANTOLAN YOUTH EMERGENCY RESPONSE AND RESILIENCY TEAM', 'Santolan', 'District II', 'Youth Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], 'santolanyouthemergencyrespon.test@pasigyouth.org.ph', '09172500063', '{}'::text[], '{}'::text[], 'Rommel', 'Ortega', 'Soriano', 'Rommel Ortega Soriano', 'Beatriz', 'Valenzuela', 'Morales', 'Beatriz Valenzuela Morales', 'Unit 113', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 113, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (64, 2025, 'SANTOLAN GAY ASSOCIATION', 'Santolan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'santolangayassociation.test@pasigyouth.org.ph', '09172500064', '{}'::text[], '{}'::text[], 'Dennis', 'Panganiban', 'Manalo', 'Dennis Panganiban Manalo', 'Camille', 'Yambao', 'Ferrer', 'Camille Yambao Ferrer', 'Unit 114', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 114, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (65, 2025, 'SANTOLAN HIGH SCHOOL PASIG CITY COUNCIL BSP', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'governance']::text[], 'santolanhighschoolpasigcityc.test@pasigyouth.org.ph', '09172500065', '{}'::text[], '{}'::text[], 'Juan', 'Quinto', 'Pascual', 'Juan Quinto Pascual', 'Patricia', 'Zamora', 'Domingo', 'Patricia Zamora Domingo', 'Unit 115', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 115, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (66, 2025, 'THE SANTOLANIAN', 'Santolan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'thesantolanian.test@pasigyouth.org.ph', '09172500066', '{}'::text[], '{}'::text[], 'Mark', 'Resurreccion', 'Aguilar', 'Mark Resurreccion Aguilar', 'Nicole', 'Alcantara', 'Vergara', 'Nicole Alcantara Vergara', 'Unit 116', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 116, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (67, 2025, 'SCIENCE INVESTIGATORY PROJECT - SHS', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['education', 'health']::text[], 'scienceinvestigatoryprojects.test@pasigyouth.org.ph', '09172500067', '{}'::text[], '{}'::text[], 'Joshua', 'Samonte', 'Medina', 'Joshua Samonte Medina', 'Clarisse', 'Balagtas', 'Mariano', 'Clarisse Balagtas Mariano', 'Unit 117', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 117, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (68, 2025, 'ANG SANTOLEÑO', 'Santolan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'angsantoleo.test@pasigyouth.org.ph', '09172500068', '{}'::text[], '{}'::text[], 'Angelo', 'Tinio', 'Guevarra', 'Angelo Tinio Guevarra', 'Danielle', 'Cordero', 'Padilla', 'Danielle Cordero Padilla', 'Unit 118', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 118, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (69, 2025, 'BAGONG ILOG VOLLEYBALL CLUB', 'Bagong Ilog', 'District I', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'bagongilogvolleyballclub.test@pasigyouth.org.ph', '09172500069', ARRAY['bagongilogvolleyballclub.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182500069']::text[], 'Christian', 'Umali', 'Valdez', 'Christian Umali Valdez', 'Kathryn', 'Dalisay', 'Bernardo', 'Kathryn Dalisay Bernardo', 'Unit 119', 'Kawilihan Village, C. Santos St.', 'Unit 119, Kawilihan Village, C. Santos St., Bagong Ilog, Pasig City, Metro Manila, 1600', 2025, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (70, 2025, 'YB ORGANIZATION', 'Bagong Ilog', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'yborganization.test@pasigyouth.org.ph', '09172500070', '{}'::text[], '{}'::text[], 'Daniel', 'Valenzuela', 'Perez', 'Daniel Valenzuela Perez', 'Trisha', 'Espiritu', 'Santos', 'Trisha Espiritu Santos', 'Unit 120', 'Kawilihan Village, C. Santos St.', 'Unit 120, Kawilihan Village, C. Santos St., Bagong Ilog, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (71, 2025, 'SIKAT KABATAAN MANGGAHAN', 'Manggahan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'sikatkabataanmanggahan.test@pasigyouth.org.ph', '09172500071', '{}'::text[], '{}'::text[], 'Gabriel', 'Yambao', 'Santiago', 'Gabriel Yambao Santiago', 'Hannah', 'Fajardo', 'Reyes', 'Hannah Fajardo Reyes', 'Unit 121', 'Amang Rodriguez Ave., East Bank Road', 'Unit 121, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (72, 2025, 'UGONG TEATRO ARAL SA KABATAAN (UTAK)', 'Ugong', 'District I', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'ugongteatroaralsakabataan.test@pasigyouth.org.ph', '09172500072', '{}'::text[], '{}'::text[], 'John Paul', 'Zamora', 'Cortez', 'John Paul Zamora Cortez', 'Janine', 'Galang', 'Cruz', 'Janine Galang Cruz', 'Unit 122', 'Lanuza Ave., C-5 Road', 'Unit 122, Lanuza Ave., C-5 Road, Ugong, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (73, 2025, 'SAMAHANG DALAGA''T BINATA', 'Sumilang', 'District I', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'samahangdalagatbinata.test@pasigyouth.org.ph', '09172500073', '{}'::text[], '{}'::text[], 'Jian', 'Alcantara', 'Tolentino', 'Jian Alcantara Tolentino', 'Stephanie', 'Hermosa', 'Bautista', 'Stephanie Hermosa Bautista', 'Unit 123', 'Lopez Jaena St., Dr. Sixto Antonio Ave.', 'Unit 123, Lopez Jaena St., Dr. Sixto Antonio Ave., Sumilang, Pasig City, Metro Manila, 1600', 2025, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (74, 2025, 'MAHARLIKA DANCE ENSEMBLE', 'Sto. Tomas', 'District I', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'maharlikadanceensemble.test@pasigyouth.org.ph', '09172500074', '{}'::text[], '{}'::text[], 'Alden', 'Balagtas', 'Morales', 'Alden Balagtas Morales', 'Kirsten', 'Ilagan', 'Ocampo', 'Kirsten Ilagan Ocampo', 'Unit 124', 'Caruncho Ave., F. Antonio St.', 'Unit 124, Caruncho Ave., F. Antonio St., Sto. Tomas, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (75, 2025, 'MAHARLIKA CULTURE AND ARTS', 'Sto. Tomas', 'District I', 'Youth Organization', 'community-based', ARRAY['education', 'social inclusion and equity']::text[], 'maharlikacultureandarts.test@pasigyouth.org.ph', '09172500075', '{}'::text[], '{}'::text[], 'Kenneth', 'Cordero', 'Ferrer', 'Kenneth Cordero Ferrer', 'Andrea', 'Jacinto', 'Garcia', 'Andrea Jacinto Garcia', 'Unit 125', 'Caruncho Ave., F. Antonio St.', 'Unit 125, Caruncho Ave., F. Antonio St., Sto. Tomas, Pasig City, Metro Manila, 1600', 2025, 50000, 'Education, Digital Literacy & Technology', 'Youth Leadership and Academic Excellence Seminar', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (76, 2025, 'SANTOLAN HIGH SCHOOL BADMINTON TEAM', 'Santolan', 'District II', 'Youth Organization', 'school-based', ARRAY['health', 'active citizenship']::text[], 'santolanhighschoolbadmintont.test@pasigyouth.org.ph', '09172500076', '{}'::text[], '{}'::text[], 'Rafael', 'Dalisay', 'Domingo', 'Rafael Dalisay Domingo', 'Roxanne', 'Katigbak', 'Mendoza', 'Roxanne Katigbak Mendoza', 'Unit 126', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 126, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'awaiting_release', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (77, 2025, 'PUROK 7 BASKETBALL - YOUTH SPORTS', 'Sto. Tomas', 'District I', 'Youth Organization', 'community-based', ARRAY['health', 'active citizenship']::text[], 'purok7basketballyouthsports.test@pasigyouth.org.ph', '09172500077', '{}'::text[], '{}'::text[], 'Vincent', 'Espiritu', 'Vergara', 'Vincent Espiritu Vergara', 'Samantha', 'Lagman', 'Torres', 'Samantha Lagman Torres', 'Unit 127', 'Caruncho Ave., F. Antonio St.', 'Unit 127, Caruncho Ave., F. Antonio St., Sto. Tomas, Pasig City, Metro Manila, 1600', 2025, 50000, 'Sports, Fitness & Recreation', 'Inter-Barangay Grassroots Youth Sports & Wellness Cup', 'budget_released', false, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (78, 2025, 'YOUTH FOR ENVIRONMENT IN SCHOOLS ORGANIZATIONS', 'Santolan', 'District II', 'Youth Organization', 'community-based', ARRAY['environment', 'active citizenship']::text[], 'youthforenvironmentinschools.test@pasigyouth.org.ph', '09172500078', '{}'::text[], '{}'::text[], 'Carlos', 'Fajardo', 'Mariano', 'Carlos Fajardo Mariano', 'Bianca', 'Magat', 'Tomas', 'Bianca Magat Tomas', 'Unit 128', 'Evangelista St., Amang Rodriguez Ave.', 'Unit 128, Evangelista St., Amang Rodriguez Ave., Santolan, Pasig City, Metro Manila, 1600', 2025, 50000, 'Environmental Protection & Climate Action', 'Barangay Tree-Planting & Urban Greening Initiative', 'completed', true, '2025-03-15 09:00:00+08'::timestamptz, '2028-03-15'::date),
    (79, 2026, 'PRIMARY AND SECONDARY ROAD YOUTH ORGANIZATION (PSRYO)', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'primaryandsecondaryroadyouth.test@pasigyouth.org.ph', '09172600079', ARRAY['primaryandsecondaryroadyouth.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182600079']::text[], 'Matthew', 'Galang', 'Padilla', 'Matthew Galang Padilla', 'Gwen', 'Noble', 'Andrada', 'Gwen Noble Andrada', 'Unit 129', 'Kenneth Road, M. Eusebio Ave.', 'Unit 129, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2026, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date),
    (80, 2026, 'VERACITY PHILIPPINES', 'Pinagbuhatan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'veracityphilippines.test@pasigyouth.org.ph', '09172600080', '{}'::text[], '{}'::text[], 'Jerome', 'Hermosa', 'Bernardo', 'Jerome Hermosa Bernardo', 'Chloe', 'Ortega', 'Castillo', 'Chloe Ortega Castillo', 'Unit 130', 'Kenneth Road, M. Eusebio Ave.', 'Unit 130, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2026, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'budget_released', false, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date),
    (81, 2026, 'ARBOLEDA''S RECREATIONAL MOVEMENT FOR THE YOUTH ORGANIZATION', 'San Miguel', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'arboledasrecreationalmovemen.test@pasigyouth.org.ph', '09172600081', '{}'::text[], '{}'::text[], 'Francis', 'Ilagan', 'Santos', 'Francis Ilagan Santos', 'Sofia', 'Panganiban', 'Flores', 'Sofia Panganiban Flores', 'Unit 131', 'Dr. Pilapil St., Market Ave.', 'Unit 131, Dr. Pilapil St., Market Ave., San Miguel, Pasig City, Metro Manila, 1600', 2026, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'completed', true, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date),
    (82, 2026, 'PINAGBUHATAN YOUTH MOVEMENT', 'Pinagbuhatan', 'District II', 'Youth Organization', 'community-based', ARRAY['governance', 'active citizenship']::text[], 'pinagbuhatanyouthmovement.test@pasigyouth.org.ph', '09172600082', '{}'::text[], '{}'::text[], 'Elijah', 'Jacinto', 'Reyes', 'Elijah Jacinto Reyes', 'Regine', 'Quinto', 'Villanueva', 'Regine Quinto Villanueva', 'Unit 132', 'Kenneth Road, M. Eusebio Ave.', 'Unit 132, Kenneth Road, M. Eusebio Ave., Pinagbuhatan, Pasig City, Metro Manila, 1600', 2026, 50000, 'Leadership & Governance', 'Youth Organization Governance & Planning Workshop', 'awaiting_release', false, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date),
    (83, 2026, 'ROTARACT CLUB OF PASIG SUNRISE', 'Bagong Ilog', 'District I', 'Youth-Serving Organization', 'community-based', ARRAY['active citizenship', 'economic empowerment']::text[], 'rotaractclubofpasigsunrise.test@pasigyouth.org.ph', '09172600083', '{}'::text[], '{}'::text[], 'Paolo', 'Katigbak', 'Cruz', 'Paolo Katigbak Cruz', 'Kimberly', 'Resurreccion', 'Ramos', 'Kimberly Resurreccion Ramos', 'Unit 133', 'Kawilihan Village, C. Santos St.', 'Unit 133, Kawilihan Village, C. Santos St., Bagong Ilog, Pasig City, Metro Manila, 1600', 2026, 50000, 'Community Outreach & Social Inclusion', 'Civic Engagement and Community Clean-up Drive', 'budget_released', false, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date),
    (84, 2026, 'CENTRAL MANGGAHAN FIRE AND RESCUE VOLUNTEER', 'Manggahan', 'District II', 'Youth-Serving Organization', 'community-based', ARRAY['peace building and security', 'health', 'active citizenship']::text[], 'centralmanggahanfireandrescu.test@pasigyouth.org.ph', '09172600084', ARRAY['centralmanggahanfireandrescu.sec.test@pasigyouth.org.ph']::text[], ARRAY['09182600084']::text[], 'Lorenzo', 'Lagman', 'Bautista', 'Lorenzo Lagman Bautista', 'Bernadette', 'Samonte', 'Castro', 'Bernadette Samonte Castro', 'Unit 134', 'Amang Rodriguez Ave., East Bank Road', 'Unit 134, Amang Rodriguez Ave., East Bank Road, Manggahan, Pasig City, Metro Manila, 1600', 2026, 50000, 'Community Outreach & Social Inclusion', 'Community Disaster Preparedness & Basic First Aid Training', 'completed', true, '2026-03-15 09:00:00+08'::timestamptz, '2029-03-15'::date);

  -- Iterate through temp dataset and seed canonically
  FOR _rec IN SELECT * FROM temp_yorp_seed_dataset ORDER BY record_num ASC LOOP
    -- Track counts by year
    IF _rec.src_year = 2024 THEN _count_2024 := _count_2024 + 1;
    ELSIF _rec.src_year = 2025 THEN _count_2025 := _count_2025 + 1;
    ELSIF _rec.src_year = 2026 THEN _count_2026 := _count_2026 + 1;
    END IF;

    -- Check if already exists in this seed batch
    SELECT id, user_id
    INTO _org_id, _user_id
    FROM public.organization_profiles
    WHERE seed_batch = _batch_name
      AND seed_source_record_number = _rec.record_num
    LIMIT 1;

    IF _org_id IS NOT NULL THEN
      -- Already seeded, update essential fields idempotently
      UPDATE public.organization_profiles
      SET
        organization_name = _rec.org_name,
        barangay = _rec.brgy,
        district = _rec.dist,
        major_classification = _rec.major_class,
        sub_classification = _rec.sub_class,
        advocacies = _rec.cyp,
        additional_emails = _rec.add_emails,
        additional_contact_numbers = _rec.add_phones,
        representative_first_name = _rec.rep_first,
        representative_middle_name = _rec.rep_mid,
        representative_last_name = _rec.rep_last,
        representative_name = _rec.rep_full,
        adviser_first_name = _rec.adv_first,
        adviser_middle_name = _rec.adv_mid,
        adviser_last_name = _rec.adv_last,
        adviser_name = _rec.adv_full,
        address_unit_building = _rec.unit_bldg,
        address_street = _rec.street,
        address_barangay = _rec.brgy,
        address_city = 'Pasig City',
        address_province = 'Metro Manila',
        address_zip_code = '1600',
        address = _rec.full_addr
      WHERE id = _org_id;

      _updated_count := _updated_count + 1;
    ELSE
      -- Create test auth user
      _user_id := gen_random_uuid();
      _org_id := gen_random_uuid();

      -- 1. Create auth.users record with deterministic test credential
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      ) VALUES (
        _user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        _rec.email,
        extensions.crypt('YtraceSeed2026!', extensions.gen_salt('bf')),
        _rec.v_date,
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('organization_name', _rec.org_name, 'is_test_account', true, 'seed_batch', _batch_name),
        _rec.v_date,
        _rec.v_date
      );

      -- 2. Create auth.identities
      INSERT INTO auth.identities (
        id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
      ) VALUES (
        _user_id,
        _user_id,
        jsonb_build_object('sub', _user_id::text, 'email', _rec.email),
        'email',
        _user_id::text,
        _rec.v_date,
        _rec.v_date,
        _rec.v_date
      ) ON CONFLICT (provider, provider_id) DO NOTHING;

      -- 3. Create public.user_profiles
      INSERT INTO public.user_profiles (
        user_id, email, display_name, full_name, contact_number
      ) VALUES (
        _user_id,
        _rec.email,
        _rec.org_name,
        _rec.rep_full,
        _rec.phone
      ) ON CONFLICT (user_id) DO UPDATE
      SET email = _rec.email, display_name = _rec.org_name;

      -- 4. Generate Authoritative Deterministic URN
      _urn := public.generate_unique_urn(_rec.brgy, _rec.v_date);

      -- 5. Insert canonical verified organization_profiles record
      INSERT INTO public.organization_profiles (
        id,
        user_id,
        organization_name,
        organization_email,
        contact_number,
        additional_emails,
        additional_contact_numbers,
        district,
        barangay,
        is_existing_organization,
        is_renewal_test_account,
        is_seeded_sample_data,
        seed_batch,
        seed_source_year,
        seed_source_record_number,
        profile_status,
        urn,
        urn_normalized,
        organization_identifier_number,
        urn_review_status,
        registration_type,
        verified_at,
        accreditation_start_date,
        accreditation_expires_at,
        representative_first_name,
        representative_middle_name,
        representative_last_name,
        representative_suffix,
        representative_name,
        adviser_first_name,
        adviser_middle_name,
        adviser_last_name,
        adviser_suffix,
        adviser_name,
        address_unit_building,
        address_street,
        address_barangay,
        address_city,
        address_province,
        address_zip_code,
        address,
        major_classification,
        sub_classification,
        advocacies,
        created_at,
        updated_at
      ) VALUES (
        _org_id,
        _user_id,
        _rec.org_name,
        _rec.email,
        _rec.phone,
        _rec.add_emails,
        _rec.add_phones,
        _rec.dist,
        _rec.brgy,
        false,
        false,
        true,
        _batch_name,
        _rec.src_year,
        _rec.record_num,
        'verified',
        _urn,
        public.normalize_urn(_urn),
        _urn,
        'verified',
        'new_organization',
        _rec.v_date,
        _rec.v_date::date,
        _rec.acc_end,
        _rec.rep_first,
        _rec.rep_mid,
        _rec.rep_last,
        NULL,
        _rec.rep_full,
        _rec.adv_first,
        _rec.adv_mid,
        _rec.adv_last,
        NULL,
        _rec.adv_full,
        _rec.unit_bldg,
        _rec.street,
        _rec.brgy,
        'Pasig City',
        'Metro Manila',
        '1600',
        _rec.full_addr,
        _rec.major_class,
        _rec.sub_class,
        _rec.cyp,
        _rec.v_date,
        _rec.v_date
      );

      -- 6. Insert Term 1 Accreditation record
      _acc_id := gen_random_uuid();
      INSERT INTO public.organization_accreditations (
        id,
        organization_id,
        term_number,
        start_date,
        end_date,
        certificate_urn,
        status,
        approved_by,
        approved_at,
        created_at
      ) VALUES (
        _acc_id,
        _org_id,
        1,
        _rec.v_date::date,
        _rec.acc_end,
        _urn,
        'active',
        _admin_id,
        _rec.v_date,
        _rec.v_date
      );

      -- Link current_accreditation_id
      UPDATE public.organization_profiles
      SET current_accreditation_id = _acc_id
      WHERE id = _org_id;

      -- 7. Insert Budget Request
      _budget_id := gen_random_uuid();
      INSERT INTO public.budget_requests (
        id,
        organization_id,
        submitted_by,
        activity_title,
        activity_description,
        activity_date,
        venue,
        requested_amount,
        approved_amount,
        released_amount,
        release_date,
        purpose_category,
        fiscal_year,
        status,
        is_seeded_sample_data,
        seed_batch,
        admin_remarks,
        user_note,
        created_at,
        updated_at
      ) VALUES (
        _budget_id,
        _org_id,
        _user_id,
        _rec.b_title,
        format('Official %s activity conducted by %s in Barangay %s.', _rec.b_title, _rec.org_name, _rec.brgy),
        _rec.v_date::date + interval '60 days',
        format('Barangay %s Multi-Purpose Hall, Pasig City', _rec.brgy),
        _rec.b_amt,
        _rec.b_amt,
        CASE
          WHEN _rec.b_status IN ('budget_released', 'completed') THEN _rec.b_amt
          ELSE 0
        END,
        CASE
          WHEN _rec.b_status IN ('budget_released', 'completed') THEN (_rec.v_date::date + interval '45 days')::timestamptz
          ELSE NULL
        END,
        _rec.b_purpose,
        _rec.b_year,
        _rec.b_status::public.budget_request_status,
        true,
        _batch_name,
        format('Official sample budget request for %s seeded in CY %s.', _rec.org_name, _rec.src_year),
        'Administrative test-seeded budget request.',
        _rec.v_date + interval '30 days',
        _rec.v_date + interval '30 days'
      );

      -- 8. Liquidation Report Handling
      IF _rec.b_liquidated THEN
        INSERT INTO public.liquidation_reports (
          id,
          budget_request_id,
          organization_id,
          submitted_by,
          status,
          remarks,
          go_signal_at,
          deadline_at,
          hard_copy_submitted_at,
          completed_at,
          is_seeded_sample_data,
          seed_batch,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          _budget_id,
          _org_id,
          _user_id,
          'completed_liquidated',
          'Administrative test-seeded verified liquidation report.',
          _rec.v_date + interval '45 days',
          _rec.v_date + interval '90 days',
          _rec.v_date + interval '75 days',
          _rec.v_date + interval '80 days',
          true,
          _batch_name,
          _rec.v_date + interval '75 days',
          _rec.v_date + interval '80 days'
        )
        ON CONFLICT (budget_request_id) DO UPDATE SET
          status = 'completed_liquidated',
          remarks = 'Administrative test-seeded verified liquidation report.',
          go_signal_at = EXCLUDED.go_signal_at,
          deadline_at = EXCLUDED.deadline_at,
          hard_copy_submitted_at = EXCLUDED.hard_copy_submitted_at,
          completed_at = EXCLUDED.completed_at,
          is_seeded_sample_data = true,
          seed_batch = _batch_name,
          updated_at = EXCLUDED.updated_at;
      ELSE
        -- Remove any non-completed liquidation report row auto-created by triggers
        DELETE FROM public.liquidation_reports
        WHERE budget_request_id = _budget_id;
      END IF;

      _created_count := _created_count + 1;
    END IF;
  END LOOP;

  -- 8. Log administrative audit log
  INSERT INTO public.activity_logs (
    actor_user_id,
    action,
    related_type,
    description,
    created_at
  ) VALUES (
    _admin_id,
    'seeded_yorp_sample_dataset',
    'system_batch',
    format('Administrator successfully seeded PCYDO YORP sample dataset: %s created, %s updated (84 total).', _created_count, _updated_count),
    _now
  );

  RETURN jsonb_build_object(
    'success', true,
    'batch_name', _batch_name,
    'total_records', 84,
    'created_count', _created_count,
    'updated_count', _updated_count,
    'year_breakdown', jsonb_build_object(
      '2024', _count_2024,
      '2025', _count_2025,
      '2026', _count_2026
    ),
    'timestamp', _now
  );
END;
$$;


GRANT EXECUTE ON FUNCTION public.admin_seed_yorp_sample_dataset(text, text) TO anon, authenticated, service_role;
