# Guitar CRM Setup Complete Script

## Overview

`setup-complete.sh` is a comprehensive one-command setup script that initializes the entire Guitar CRM project from scratch, including Docker, Supabase, PostgreSQL, database migrations, test data seeding, and verification.

## What It Does

The script performs these 6 steps automatically:

1. **Docker Validation** - Verifies Docker is installed and running
2. **Supabase Cleanup** - Stops any existing Supabase containers (StudentManager project)
3. **Supabase Start** - Launches all Supabase services with Docker
4. **Database Setup** - Applies all 23 database migrations to PostgreSQL
5. **Data Seeding** - Creates test users, songs, lessons, assignments, and profiles
6. **Quality Check** - Verifies database integrity and test data

## Prerequisites

- **Docker Desktop** - Must be running before executing the script
- **Supabase CLI** - Install via `npm install -g supabase`
- **Bash** - Scripts are written for bash shell (Linux/macOS/WSL2)

## Usage

### Quick Start (Single Command)

```bash
# Using npm script (recommended)
npm run setup:all

# Or using the script directly
./scripts/setup/setup-complete.sh

# Or from any directory in the project
bash scripts/setup/setup-complete.sh
```

### What Gets Set Up

#### Services Running After Completion

```
✅ Supabase API:    http://localhost:54321
✅ PostgreSQL:      localhost:54322 (postgres/postgres)
✅ Supabase Studio: http://localhost:54323
✅ Mailpit Email:   http://localhost:54324
```

#### Database Schema Created

- **Tables**: profiles, songs, lessons, lesson_songs, assignments
- **Enums**: difficulty_level, music_key, lesson_song_status
- **Functions**: update_updated_at_column, set_lesson_numbers, handle_new_user
- **Triggers**: Auto-update timestamps, lesson numbering
- **RLS Policies**: Row-level security on all tables
- **Views**: user_overview, reporting views

#### Test Data Seeded

| Entity | Count | Details |
|--------|-------|---------|
| Profiles | 13 | 2 admins, 5 teachers, 8 students |
| Test Users | 6 | With verified credentials |
| Songs | 10 | 3 beginner, 5 intermediate, 2 advanced |
| Lessons | 5 | Pre-configured with teacher-student pairs |
| Assignments | 6 | Various statuses (open, in progress, etc.) |

## Test Credentials

After setup completes, use these credentials to log in:

### Admin Account
```
Email:    p.romanczuk@gmail.com
Password: test123_admin
Roles:    Admin + Teacher
```

### Teacher Account
```
Email:    teacher@example.com
Password: test123_teacher
Roles:    Teacher
```

### Student Accounts
```
Email:    student@example.com
Password: test123_student
Roles:    Student

Email:    teststudent1@example.com
Password: test123_student
Roles:    Student

Email:    teststudent2@example.com
Password: test123_student
Roles:    Student

Email:    teststudent3@example.com
Password: test123_student
Roles:    Student
```

## After Setup

Once the script completes successfully:

### 1. Start the Development Server
```bash
npm run dev
# App opens at http://localhost:3000
```

### 2. Run Tests
```bash
# Unit tests
npm test

# Watch mode
npm test:watch

# E2E tests
npm run cypress:open
```

### 3. Access Supabase Studio
```
Open: http://localhost:54323
- View/edit database tables
- Check auth users
- View real-time logs
```

### 4. Optional: Explore Data
```bash
# Connect to PostgreSQL directly
psql postgresql://postgres:postgres@localhost:54322/postgres

# View songs
SELECT * FROM songs;

# View profiles with roles
SELECT email, is_admin, is_teacher, is_student FROM profiles;
```

## Troubleshooting

### "Docker daemon is not running"
**Solution**: Start Docker Desktop and wait 30 seconds before running the script again

### "Supabase failed to start"
**Solution**: Check Docker disk space with `docker system df`. If needed, run `docker system prune`

### "Failed to apply migrations"
**Solution**: Verify Supabase fully started with:
```bash
supabase status
```

### "Test users not created"
**Solution**: Verify environment variables are set:
```bash
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

### "Quality check shows missing data"
**Solution**: The setup is complete but data may still be seeding. Run:
```bash
npm run db:quality
```

## Performance

- **Total Setup Time**: ~90 seconds (depending on Docker/network speed)
- **Breakdown**:
  - Docker startup: ~30 seconds
  - Database migrations: ~20 seconds
  - User/data seeding: ~15 seconds
  - Verification: ~10 seconds
  - Network/disk I/O: ~15 seconds

## Advanced Usage

### Rerun Just Database Reset
```bash
supabase db reset --no-seed
```

### Rerun Just Seeding (Keep Database)
```bash
export NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_SERVICE_ROLE_KEY=sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz
bash scripts/database/seeding/local/seed-all.sh
```

### Stop All Services
```bash
supabase stop --no-backup
```

### View Supabase Logs
```bash
supabase status --verbose
```

## Related Scripts

- `npm run dev` - Start Next.js development server
- `npm run quality` - Run all quality checks (lint, types, tests)
- `npm run db:quality` - Check database integrity
- `npm test` - Run Jest unit tests
- `npm run cypress:open` - Open Cypress test runner
- `npm run backup` - Create database backup (anonymized)

## File Location

```
scripts/
├── setup-complete.sh           ← This script
├── setup-env.sh                ← Environment setup
├── setup-db.sh                 ← Database setup
├── database/
│   ├── seeding/
│   │   └── seed-all.sh         ← Seeding orchestration
│   └── maintenance/
│       └── check-db-quality.sh ← Quality verification
└── ... other scripts
```

## Contributing

If you update this script:
1. Test locally with a fresh Docker environment
2. Document any new steps in this README
3. Update setup time estimate if significant changes made
4. Ensure script is idempotent (safe to run multiple times)

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Review project documentation in `/docs`
3. Check Supabase status: `supabase status`
4. View Docker logs: `docker logs supabase_[container_id]`
