-- Venue Performance Testing Data Seeder
-- This script populates venue_types and venues tables with realistic test data

-- ============================================================================
-- STEP 1: INSERT VENUE TYPES
-- ============================================================================

INSERT INTO venue_types (id, name, description, icon_url, created_at, updated_at) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Bar', 'Traditional bars and pubs', '/icons/bar.svg', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440002', 'Nightclub', 'Dance clubs and nightlife venues', '/icons/nightclub.svg', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440003', 'Restaurant', 'Dining establishments', '/icons/restaurant.svg', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440004', 'Café', 'Coffee shops and casual dining', '/icons/cafe.svg', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440005', 'Lounge', 'Upscale lounges and cocktail bars', '/icons/lounge.svg', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440006', 'Rooftop Bar', 'Rooftop venues with city views', '/icons/rooftop.svg', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440007', 'Wine Bar', 'Wine-focused establishments', '/icons/wine.svg', NOW(), NOW()),
('550e8400-e29b-41d4-a716-446655440008', 'Sports Bar', 'Sports-themed bars and venues', '/icons/sports.svg', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: INSERT VENUES (NEW YORK CITY)
-- ============================================================================

INSERT INTO venues (
    id, name, description, address, location, city_id, google_place_id, rating, review_count, 
    popularity, price_level, is_featured, status, website, phone, is_open_now, is_active, 
    view_count, follower_count, associated_plan_count, trending_score, metadata, created_at, updated_at
) VALUES
-- Manhattan Venues
('venue-001', 'The Roof NYC', 'Upscale rooftop bar with stunning skyline views', '1 E 53rd St, New York, NY 10022', ST_GeomFromText('POINT(-73.9739 40.7589)', 4326), NULL, 'place_001', 4.2, 150, 850, 3, true, 'active', 'https://theroofnyc.com', '+1-212-555-0101', true, true, 1250, 89, 15, 0.85, '{"atmosphere": "upscale", "dress_code": "smart_casual"}', NOW(), NOW()),

('venue-002', 'Blue Note NYC', 'Legendary jazz club in Greenwich Village', '131 W 3rd St, New York, NY 10012', ST_GeomFromText('POINT(-74.0014 40.7306)', 4326), NULL, 'place_002', 4.5, 280, 920, 2, true, 'active', 'https://bluenotenyc.com', '+1-212-555-0102', true, true, 1890, 156, 22, 0.92, '{"music_genre": "jazz", "capacity": 200}', NOW(), NOW()),

('venue-003', 'Stone Street Tavern', 'Historic pub in Financial District', '52 Stone St, New York, NY 10004', ST_GeomFromText('POINT(-74.0123 40.7040)', 4326), NULL, 'place_003', 4.0, 95, 720, 2, false, 'active', 'https://stonestnyc.com', '+1-212-555-0103', true, true, 890, 67, 12, 0.71, '{"outdoor_seating": true, "historic": true}', NOW(), NOW()),

('venue-004', 'Marquee NYC', 'Premier nightclub in Chelsea', '289 10th Ave, New York, NY 10001', ST_GeomFromText('POINT(-74.0051 40.7505)', 4326), NULL, 'place_004', 4.3, 320, 1150, 4, true, 'active', 'https://marqueenyc.com', '+1-212-555-0104', true, true, 2150, 234, 31, 0.94, '{"capacity": 800, "vip_tables": true}', NOW(), NOW()),

('venue-005', 'Dead Rabbit NYC', 'Award-winning cocktail bar', '30 Water St, New York, NY 10004', ST_GeomFromText('POINT(-74.0111 40.7033)', 4326), NULL, 'place_005', 4.6, 450, 1050, 3, true, 'active', 'https://deadrabbitnyc.com', '+1-212-555-0105', true, true, 1750, 189, 27, 0.89, '{"cocktails": "craft", "awards": "worlds_best"}', NOW(), NOW()),

-- Brooklyn Venues
('venue-006', 'House of Yes', 'Immersive performance venue in Bushwick', '2 Wyckoff Ave, Brooklyn, NY 11237', ST_GeomFromText('POINT(-73.9239 40.7056)', 4326), NULL, 'place_006', 4.4, 210, 880, 3, true, 'active', 'https://houseofyes.org', '+1-718-555-0106', true, true, 1340, 145, 19, 0.82, '{"performances": true, "art_installations": true}', NOW(), NOW()),

('venue-007', 'Brooklyn Brewery', 'Craft brewery with tasting room', '79 N 11th St, Brooklyn, NY 11249', ST_GeomFromText('POINT(-73.9608 40.7218)', 4326), NULL, 'place_007', 4.1, 180, 760, 2, false, 'active', 'https://brooklynbrewery.com', '+1-718-555-0107', true, true, 980, 123, 16, 0.76, '{"brewery_tours": true, "craft_beer": true}', NOW(), NOW()),

-- Queens Venues  
('venue-008', 'Bohemian Hall', 'Historic beer garden in Astoria', '29-19 24th Ave, Astoria, NY 11102', ST_GeomFromText('POINT(-73.9123 40.7701)', 4326), NULL, 'place_008', 4.2, 165, 690, 2, false, 'active', 'https://bohemianhall.com', '+1-718-555-0108', true, true, 845, 98, 14, 0.73, '{"beer_garden": true, "outdoor": true}', NOW(), NOW()),

-- Additional Manhattan Venues
('venue-009', 'Please Dont Tell', 'Hidden speakeasy behind hot dog shop', '113 St Marks Pl, New York, NY 10009', ST_GeomFromText('POINT(-73.9857 40.7281)', 4326), NULL, 'place_009', 4.7, 380, 950, 3, true, 'active', NULL, '+1-212-555-0109', true, true, 1680, 201, 25, 0.91, '{"speakeasy": true, "reservation_required": true}', NOW(), NOW()),

('venue-010', 'Beauty Bar', 'Retro beauty salon turned cocktail bar', '231 E 14th St, New York, NY 10003', ST_GeomFromText('POINT(-73.9847 40.7338)', 4326), NULL, 'place_010', 3.9, 125, 580, 2, false, 'active', 'https://beautybar.com', '+1-212-555-0110', true, true, 720, 87, 11, 0.68, '{"retro_theme": true, "karaoke": true}', NOW(), NOW()),

-- Wine Bars
('venue-011', 'Terroir Tribeca', 'Natural wine bar with small plates', '24 Harrison St, New York, NY 10013', ST_GeomFromText('POINT(-74.0089 40.7188)', 4326), NULL, 'place_011', 4.3, 190, 780, 3, false, 'active', 'https://terroirwine.com', '+1-212-555-0111', true, true, 950, 112, 17, 0.79, '{"natural_wine": true, "small_plates": true}', NOW(), NOW()),

-- Sports Bars
('venue-012', 'Standings Sports Bar', 'Multi-level sports bar in East Village', '43 E 7th St, New York, NY 10003', ST_GeomFromText('POINT(-73.9889 40.7282)', 4326), NULL, 'place_012', 4.0, 220, 680, 2, false, 'active', 'https://standingsnyc.com', '+1-212-555-0112', true, true, 890, 134, 18, 0.71, '{"multiple_screens": true, "game_day_specials": true}', NOW(), NOW()),

-- Restaurants with Bar Scene
('venue-013', 'The Smith NYC', 'American brasserie with late night bar', '956 2nd Ave, New York, NY 10022', ST_GeomFromText('POINT(-73.9598 40.7622)', 4326), NULL, 'place_013', 4.1, 340, 820, 3, false, 'active', 'https://thesmithrestaurant.com', '+1-212-555-0113', true, true, 1120, 145, 20, 0.81, '{"full_menu": true, "late_night": true}', NOW(), NOW()),

-- Lounges
('venue-014', 'The Campbell', 'Grand Central cocktail lounge', '15 Vanderbilt Ave, New York, NY 10017', ST_GeomFromText('POINT(-73.9776 40.7527)', 4326), NULL, 'place_014', 4.4, 280, 890, 4, true, 'active', 'https://thecampbellnyc.com', '+1-212-555-0114', true, true, 1340, 167, 23, 0.87, '{"grand_central": true, "historic_space": true}', NOW(), NOW()),

-- Additional Nightclubs
('venue-015', 'Output Brooklyn', 'Electronic music club in Williamsburg', '74 Wythe Ave, Brooklyn, NY 11249', ST_GeomFromText('POINT(-73.9589 40.7223)', 4326), NULL, 'place_015', 4.2, 195, 970, 3, true, 'active', 'https://outputclub.com', '+1-718-555-0115', true, true, 1450, 178, 26, 0.88, '{"electronic_music": true, "sound_system": "funktion_one"}', NOW(), NOW());

-- ============================================================================
-- STEP 3: CREATE VENUE-TO-VENUE-TYPE ASSOCIATIONS
-- ============================================================================

INSERT INTO venue_to_venue_type (venue_id, venue_type_id) VALUES
-- The Roof NYC -> Rooftop Bar, Lounge
('venue-001', '550e8400-e29b-41d4-a716-446655440006'),
('venue-001', '550e8400-e29b-41d4-a716-446655440005'),

-- Blue Note NYC -> Bar
('venue-002', '550e8400-e29b-41d4-a716-446655440001'),

-- Stone Street Tavern -> Bar
('venue-003', '550e8400-e29b-41d4-a716-446655440001'),

-- Marquee NYC -> Nightclub
('venue-004', '550e8400-e29b-41d4-a716-446655440002'),

-- Dead Rabbit NYC -> Bar, Lounge
('venue-005', '550e8400-e29b-41d4-a716-446655440001'),
('venue-005', '550e8400-e29b-41d4-a716-446655440005'),

-- House of Yes -> Nightclub, Bar
('venue-006', '550e8400-e29b-41d4-a716-446655440002'),
('venue-006', '550e8400-e29b-41d4-a716-446655440001'),

-- Brooklyn Brewery -> Bar
('venue-007', '550e8400-e29b-41d4-a716-446655440001'),

-- Bohemian Hall -> Bar
('venue-008', '550e8400-e29b-41d4-a716-446655440001'),

-- Please Dont Tell -> Bar, Lounge
('venue-009', '550e8400-e29b-41d4-a716-446655440001'),
('venue-009', '550e8400-e29b-41d4-a716-446655440005'),

-- Beauty Bar -> Bar
('venue-010', '550e8400-e29b-41d4-a716-446655440001'),

-- Terroir Tribeca -> Wine Bar
('venue-011', '550e8400-e29b-41d4-a716-446655440007'),

-- Standings Sports Bar -> Sports Bar
('venue-012', '550e8400-e29b-41d4-a716-446655440008'),

-- The Smith NYC -> Restaurant, Bar
('venue-013', '550e8400-e29b-41d4-a716-446655440003'),
('venue-013', '550e8400-e29b-41d4-a716-446655440001'),

-- The Campbell -> Lounge
('venue-014', '550e8400-e29b-41d4-a716-446655440005'),

-- Output Brooklyn -> Nightclub
('venue-015', '550e8400-e29b-41d4-a716-446655440002')

ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check venue types count
SELECT COUNT(*) as venue_types_count FROM venue_types;

-- Check venues count and active venues
SELECT 
    COUNT(*) as total_venues, 
    COUNT(*) FILTER (WHERE is_active = true) as active_venues,
    COUNT(*) FILTER (WHERE status = 'active') as status_active_venues
FROM venues;

-- Check venue-type associations
SELECT COUNT(*) as venue_type_associations FROM venue_to_venue_type;

-- Show sample venues with their types
SELECT 
    v.name,
    v.rating,
    v.popularity,
    vt.name as venue_type,
    v.is_active,
    v.status
FROM venues v
JOIN venue_to_venue_type vvt ON v.id = vvt.venue_id
JOIN venue_types vt ON vvt.venue_type_id = vt.id
LIMIT 10;

COMMIT; 