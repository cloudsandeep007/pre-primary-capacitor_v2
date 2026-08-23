UPDATE auth.identities SET identity_data = identity_data || jsonb_build_object('email_verified', true) WHERE provider = 'email' AND NOT (identity_data ? 'email_verified');
