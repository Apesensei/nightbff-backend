-- Restore 175 Performance Test Users
-- This restores the user seeding that was lost during environment rebuild

DO $$
DECLARE
    i INTEGER;
    user_email TEXT;
    user_username TEXT;
    user_display_name TEXT;
    password_hash TEXT := '$2b$10$Bl3XIpaA9mxbWbklPTgRO.hGKKkzEn3orNdhXXLJfvzqitsgkp1q2';
    user_id UUID;
BEGIN
    -- Create 175 test users
    FOR i IN 0..174 LOOP
        user_email := 'loadtest' || i || '@nightbff.dev';
        user_username := 'loadtest' || i;
        user_display_name := 'Load Test User ' || i;
        
        -- Check if user already exists
        SELECT id INTO user_id FROM users WHERE email = user_email;
        
        IF user_id IS NULL THEN
            -- Insert new user
            INSERT INTO users (
                id, email, username, display_name, password_hash, 
                roles, status, is_verified, is_age_verified, 
                location_latitude, location_longitude, 
                created_at, updated_at
            ) VALUES (
                gen_random_uuid(), 
                user_email,
                user_username,
                user_display_name,
                password_hash,
                '{USER}',
                'active',
                true,
                true,
                37.7749 + (random() - 0.5) * 0.5,  -- Random SF area latitude
                -122.4194 + (random() - 0.5) * 0.5, -- Random SF area longitude
                NOW(),
                NOW()
            );
            
            IF i % 25 = 0 THEN
                RAISE NOTICE 'Created user %', i;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'User seeding completed. Total users in database: %', (SELECT COUNT(*) FROM users);
END $$; 