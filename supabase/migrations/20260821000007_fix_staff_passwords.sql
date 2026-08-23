-- Fix all staff passwords to correct bcrypt prefix
UPDATE auth.users 
SET encrypted_password = '$2b$10$cITvu2f.ewMpUAKJFjVJ7.ftz1l1ngE3dBhV2YPnD0IssGOzc6DhC'
WHERE email != 'superadmin@school.com';
