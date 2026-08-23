UPDATE auth.users SET aud = 'authenticated' WHERE aud IS NULL;
