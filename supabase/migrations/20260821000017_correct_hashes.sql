UPDATE auth.users SET encrypted_password = '$2b$10$kfK.BIF6h6SXtaivI5eXe.rPMalqWkv.TwK83De5ij6iaCCX7/QpS' WHERE email = 'teacher@school.com';
UPDATE auth.users SET encrypted_password = '$2b$10$ZlHkm1E/IgwFCQvXdnI7X.robT1gPkbPz7ud7SrislpPTQ2w.Xh4G' WHERE email = 'demoteacher@school.com';
UPDATE auth.users SET encrypted_password = '$2b$10$GvdL6Jee/EEhilwHkHjOB.ugy0Ko2zqzMYI7YvWtKMX3buOegE6vu' WHERE email = 'admin@school.com';
UPDATE auth.users SET encrypted_password = '$2b$10$UA8lL26XvHIAAyhbrIc/OeTRaUV6OMHLzqCicuHWypRh8rYFuga7m' WHERE email = 'gate@school.com';
UPDATE auth.users SET encrypted_password = '$2b$10$3cn0iuzxLVMTeUWpntjVz.o/v3HbnbrGORLVv1IEocGdfuZ3KHbRO' WHERE email NOT IN ('superadmin@school.com', 'teacher@school.com', 'demoteacher@school.com', 'admin@school.com', 'gate@school.com');
