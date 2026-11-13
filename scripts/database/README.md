# Database Management Scripts

This directory contains scripts for managing the Guitar CRM database, including backup, restore, seeding, and quality checks.

## Directory Structure

```
database/
├── backup/           # Database backup scripts
├── maintenance/      # DB reset, quality checks, maintenance
├── seeding/          # Data seeding scripts
│   ├── local/        # Local database seeding
│   ├── remote/       # Remote database seeding
│   └── test/         # Test data generation
└── utils/            # Import/export utilities
```

## Available Scripts

### Backup (`backup/`)

- `backup-db.sh` - Create secure database backups without sensitive data

### Maintenance (`maintenance/`)

- `check-db-quality.sh` - Validate database structure and constraints
- `db-reset-with-log.sh` - Reset database with logging
- `reset-with-users.sh` - Reset database preserving user accounts

### Local Seeding (`seeding/local/`)

- `seed-all.sh` - Comprehensive seeding orchestration
- `seed-db.sh` - Populate database with development data
- `seed-assignments.ts` - Create sample lesson assignments
- `seed-dev-users.sh` - Create development user accounts
- `seed-dev-users-via-api.js` - Seed users via API endpoints
- `seed-via-sql-editor.sql` - Direct SQL seeding script

### Test Data (`seeding/test/`)

- `seed-test-data.sh` - Orchestrate all test data generation
- `seed-test-user.ts` - Create test user accounts
- `seed-test-assignments.ts` - Generate test assignments
- `seed-test-lessons.ts` - Generate test lessons
- `seed-test-lesson-songs.ts` - Generate test lesson-song relationships

### Utilities (`utils/`)

- `export-seed-data.ts` - Export database to seed files
- `generate-seed-sql.py` - Generate SQL from templates
- `import-json-to-db.js` - Import JSON data into database
- `import_backup.sh` - Import database backups
- `import_backup_fixed.sh` - Enhanced backup import with fixes
- `extract-password-hashes.js` - Extract password hashes for migration
