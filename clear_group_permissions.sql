-- Clear permissions data from groups table before schema migration
UPDATE groups SET permissions = NULL WHERE permissions IS NOT NULL;