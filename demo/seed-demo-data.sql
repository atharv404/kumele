-- ============================================
-- KUMELE DEMO SEED DATA
-- Run this in Render's PostgreSQL console
-- ============================================
-- Access: Render Dashboard → Your PostgreSQL DB → "PSQL" tab
-- ============================================

-- First, generate password hashes (bcrypt)
-- Password for all users: Demo@1234
-- Hash: $2b$10$kxPQhwAqVlM5Z4VNbvfXGuWQBvVxRn0XeHxhZmVKPUzYc7RhGkXDa

-- ==================== CLEANUP (if re-running) ====================
DELETE FROM escrows WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Demo%');
DELETE FROM payment_intents WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Demo%');
DELETE FROM checkins WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Demo%');
DELETE FROM event_joins WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Demo%');
DELETE FROM event_hobbies WHERE event_id IN (SELECT id FROM events WHERE title LIKE 'Demo%');
DELETE FROM events WHERE title LIKE 'Demo%';
DELETE FROM user_hobbies WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%demo@kumele.com');
DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%demo@kumele.com');
DELETE FROM users WHERE email LIKE '%demo@kumele.com';
DELETE FROM hobbies WHERE name = 'Meditation Demo';
DELETE FROM hobby_categories WHERE name = 'Wellness Demo';

-- ==================== 1. CREATE HOBBY CATEGORY ====================
INSERT INTO hobby_categories (id, name, slug, description, icon, sort_order, is_active, created_at, updated_at)
VALUES (
    'cat-demo-wellness',
    'Wellness Demo',
    'wellness-demo',
    'Health and wellness activities',
    '🧘',
    99,
    true,
    NOW(),
    NOW()
);

-- ==================== 2. CREATE HOBBY ====================
INSERT INTO hobbies (id, category_id, name, slug, description, icon, is_active, created_at, updated_at)
VALUES (
    'hobby-demo-meditation',
    'cat-demo-wellness',
    'Meditation Demo',
    'meditation-demo',
    'Mindfulness and meditation practices',
    '🧘‍♀️',
    true,
    NOW(),
    NOW()
);

-- ==================== 3. CREATE DEMO USER ====================
INSERT INTO users (
    id, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    display_name,
    role, 
    status, 
    email_verified,
    email_verified_at,
    city,
    country,
    latitude,
    longitude,
    current_badge,
    stripe_customer_id,
    created_at, 
    updated_at
)
VALUES (
    'user-demo-001',
    'user-demo@kumele.com',
    '$2b$10$kxPQhwAqVlM5Z4VNbvfXGuWQBvVxRn0XeHxhZmVKPUzYc7RhGkXDa',
    'Demo',
    'User',
    'Demo User',
    'USER',
    'ACTIVE',
    true,
    NOW(),
    'Mumbai',
    'India',
    19.0760,
    72.8777,
    'BRONZE',
    'cus_demo_user', -- Placeholder Stripe customer
    NOW(),
    NOW()
);

-- ==================== 4. CREATE DEMO HOST ====================
INSERT INTO users (
    id, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    display_name,
    role, 
    status, 
    email_verified,
    email_verified_at,
    city,
    country,
    latitude,
    longitude,
    current_badge,
    stripe_customer_id,
    stripe_connected_account_id,
    created_at, 
    updated_at
)
VALUES (
    'user-demo-host',
    'host-demo@kumele.com',
    '$2b$10$kxPQhwAqVlM5Z4VNbvfXGuWQBvVxRn0XeHxhZmVKPUzYc7RhGkXDa',
    'Demo',
    'Host',
    'Demo Host',
    'USER', -- Hosts are also USER role
    'ACTIVE',
    true,
    NOW(),
    'Mumbai',
    'India',
    19.0822,
    72.8810,
    'GOLD',
    'cus_demo_host',
    'acct_demo_host', -- Placeholder connected account
    NOW(),
    NOW()
);

-- ==================== 5. CREATE DEMO ADMIN ====================
INSERT INTO users (
    id, 
    email, 
    password_hash, 
    first_name, 
    last_name, 
    display_name,
    role, 
    status, 
    email_verified,
    email_verified_at,
    city,
    country,
    current_badge,
    created_at, 
    updated_at
)
VALUES (
    'user-demo-admin',
    'admin-demo@kumele.com',
    '$2b$10$kxPQhwAqVlM5Z4VNbvfXGuWQBvVxRn0XeHxhZmVKPUzYc7RhGkXDa',
    'Demo',
    'Admin',
    'Demo Admin',
    'ADMIN',
    'ACTIVE',
    true,
    NOW(),
    'Mumbai',
    'India',
    'GOLD',
    NOW(),
    NOW()
);

-- ==================== 6. CREATE DEMO EVENT ====================
INSERT INTO events (
    id,
    host_id,
    title,
    description,
    cover_image,
    address,
    display_address,
    city,
    country,
    latitude,
    longitude,
    venue_name,
    starts_at,
    ends_at,
    timezone,
    capacity,
    min_capacity,
    current_count,
    is_paid,
    base_price_eur,
    price,
    currency,
    currency_base,
    status,
    is_cancelled,
    is_public,
    requires_approval,
    created_at,
    updated_at
)
VALUES (
    'event-demo-001',
    'user-demo-host',
    'Demo Meditation Workshop',
    'A peaceful 2-hour meditation session for beginners. Learn breathing techniques and mindfulness practices. All materials provided.',
    'https://images.unsplash.com/photo-1545389336-cf090694435e?w=800',
    'Bandra Kurla Complex, Mumbai',
    'BKC, Mumbai',
    'Mumbai',
    'India',
    19.0596,  -- Venue location
    72.8656,
    'Zen Garden Studio',
    NOW() + INTERVAL '2 hours',  -- Event starts in 2 hours
    NOW() + INTERVAL '4 hours',  -- Event ends in 4 hours
    'Asia/Kolkata',
    20,
    5,
    0,
    true,
    5.50, -- ~₹500 in EUR
    500.00,  -- ₹500
    'INR',
    'EUR',
    'ACTIVE',
    false,
    true,
    false,
    NOW(),
    NOW()
);

-- ==================== 7. LINK EVENT TO HOBBY ====================
INSERT INTO event_hobbies (id, event_id, hobby_id)
VALUES (
    'eh-demo-001',
    'event-demo-001',
    'hobby-demo-meditation'
);

-- ==================== 8. LINK USERS TO HOBBY ====================
INSERT INTO user_hobbies (id, user_id, hobby_id, skill_level, is_primary, created_at)
VALUES 
(
    'uh-demo-user',
    'user-demo-001',
    'hobby-demo-meditation',
    3,
    true,
    NOW()
),
(
    'uh-demo-host',
    'user-demo-host',
    'hobby-demo-meditation',
    5,
    true,
    NOW()
);

-- ==================== VERIFY DATA ====================
SELECT '=== DEMO USERS ===' as section;
SELECT id, email, display_name, role FROM users WHERE email LIKE '%demo@kumele.com';

SELECT '=== DEMO EVENT ===' as section;
SELECT id, title, price, currency, status, city FROM events WHERE id = 'event-demo-001';

-- ==================== DONE ====================
SELECT '✅ Demo seed data created successfully!' as result;
SELECT 'Users: user-demo@kumele.com, host-demo@kumele.com, admin-demo@kumele.com' as info;
SELECT 'Password: Demo@1234' as info;
SELECT 'Event: Demo Meditation Workshop (₹500)' as info;
