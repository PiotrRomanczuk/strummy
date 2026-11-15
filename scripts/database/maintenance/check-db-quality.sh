#!/usr/bin/env bash

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
BLUE='\033[0;34m'

ISSUES_FOUND=0

echo -e "${BLUE}🔍 DATABASE QUALITY CHECK${NC}"

# Default to local Supabase if env vars not set
DB_HOST=${PGHOST:-127.0.0.1}
DB_PORT=${PGPORT:-54322}
DB_USER=${PGUSER:-postgres}
DB_PASS=${PGPASSWORD:-postgres}
DB_NAME=${PGDATABASE:-postgres}

echo -e "\n${BLUE}📡 Checking Supabase status...${NC}"
if ! PGPASSWORD="$DB_PASS" timeout 2 psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c 'SELECT 1' >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️ Supabase is not running or not accessible at $DB_HOST:$DB_PORT. Skipping DB checks.${NC}"
  exit 0
fi
echo -e "${GREEN}✅ Supabase is running${NC}"

run_query() {
  PGPASSWORD="$DB_PASS" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1"
}

table_exists() {
  local input="$1"
  local schema="public"
  local table="$input"

  if [[ "$input" == *"."* ]]; then
    schema="${input%%.*}"
    table="${input#*.}"
  fi

  local res
  res=$(run_query "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$schema' AND table_name='$table';") || res=0
  res=$(echo "$res" | xargs)
  [ "$res" -gt 0 ]
}

column_exists() {
  local t="$1"; local c="$2"
  local res
  res=$(run_query "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='$t' AND column_name='$c';") || res=0
  res=$(echo "$res" | xargs)
  [ "$res" -gt 0 ]
}

echo -e "\n${BLUE}🔍 Checking test data integrity...${NC}"

# test users
TEST_USERS=0
if table_exists auth.users; then
  TEST_USERS=$(run_query "SELECT COUNT(*) FROM auth.users WHERE email LIKE '%@example.com';") || TEST_USERS=0
  TEST_USERS=$(echo "$TEST_USERS" | xargs)
fi
TEST_USERS=${TEST_USERS:-0}
if ! [[ "$TEST_USERS" =~ ^[0-9]+$ ]]; then TEST_USERS=0; fi
echo -e "\n${YELLOW}Checking test users:${NC}"
echo "Test users count: $TEST_USERS"

# real emails
REAL_EMAILS=0
if table_exists auth.users; then
  REAL_EMAILS=$(run_query "SELECT COUNT(*) FROM auth.users WHERE email NOT LIKE '%@example.com' AND email != 'p.romanczuk@gmail.com';") || REAL_EMAILS=0
  REAL_EMAILS=$(echo "$REAL_EMAILS" | xargs)
fi
REAL_EMAILS=${REAL_EMAILS:-0}
if ! [[ "$REAL_EMAILS" =~ ^[0-9]+$ ]]; then REAL_EMAILS=0; fi
if [ "$REAL_EMAILS" -gt 0 ]; then
  echo -e "${RED}⚠️  Found $REAL_EMAILS real email(s) in database${NC}"
  run_query "SELECT email FROM auth.users WHERE email NOT LIKE '%@example.com' AND email != 'p.romanczuk@gmail.com';"
  ISSUES_FOUND=1
else
  echo -e "${GREEN}✅ No real emails found${NC}"
fi

# songs
SONGS_COUNT=0
if table_exists songs; then
  SONGS_COUNT=$(run_query "SELECT COUNT(*) FROM public.songs;") || SONGS_COUNT=0
  SONGS_COUNT=$(echo "$SONGS_COUNT" | xargs)
fi
SONGS_COUNT=${SONGS_COUNT:-0}
if ! [[ "$SONGS_COUNT" =~ ^[0-9]+$ ]]; then SONGS_COUNT=0; fi
echo -e "\n${YELLOW}Checking songs:${NC}"
echo "Total songs: $SONGS_COUNT"
if table_exists songs; then
  echo "Difficulty distribution:"
  run_query "SELECT level, COUNT(*) FROM public.songs GROUP BY level ORDER BY level;"
fi

# lessons
LESSONS_COUNT=0
if table_exists lessons; then
  LESSONS_COUNT=$(run_query "SELECT COUNT(*) FROM public.lessons;") || LESSONS_COUNT=0
  LESSONS_COUNT=$(echo "$LESSONS_COUNT" | xargs)
fi
LESSONS_COUNT=${LESSONS_COUNT:-0}
if ! [[ "$LESSONS_COUNT" =~ ^[0-9]+$ ]]; then LESSONS_COUNT=0; fi
echo -e "\n${YELLOW}Checking lessons:${NC}"
echo "Total lessons: $LESSONS_COUNT"

# lesson_songs
LESSON_SONGS_COUNT=0
if table_exists lesson_songs; then
  LESSON_SONGS_COUNT=$(run_query "SELECT COUNT(*) FROM public.lesson_songs;") || LESSON_SONGS_COUNT=0
  LESSON_SONGS_COUNT=$(echo "$LESSON_SONGS_COUNT" | xargs)
fi
LESSON_SONGS_COUNT=${LESSON_SONGS_COUNT:-0}
if ! [[ "$LESSON_SONGS_COUNT" =~ ^[0-9]+$ ]]; then LESSON_SONGS_COUNT=0; fi
echo -e "\n${YELLOW}Checking lesson-songs:${NC}"
echo "Total lesson-song associations: $LESSON_SONGS_COUNT"

if [ "$LESSON_SONGS_COUNT" -lt 3 ]; then
  echo -e "${RED}❌ CRITICAL: Too few lesson-song associations ($LESSON_SONGS_COUNT < 3)${NC}"
  ISSUES_FOUND=1
else
  echo -e "${GREEN}✅ Lesson-song associations count is healthy${NC}"
fi

# assignments
ASSIGNMENTS_COUNT=0
if table_exists assignments; then
  ASSIGNMENTS_COUNT=$(run_query "SELECT COUNT(*) FROM public.assignments;") || ASSIGNMENTS_COUNT=0
  ASSIGNMENTS_COUNT=$(echo "$ASSIGNMENTS_COUNT" | xargs)
  ASSIGNMENTS_COUNT=${ASSIGNMENTS_COUNT:-0}
  echo -e "\n${YELLOW}Checking assignments:${NC}"
  echo "Total assignments: $ASSIGNMENTS_COUNT"
  echo "Assignment status distribution:"
  run_query "SELECT status, COUNT(*) FROM public.assignments GROUP BY status ORDER BY status;" || true
  if column_exists assignments priority; then
    echo "Assignment priority distribution:"
    run_query "SELECT priority, COUNT(*) FROM public.assignments GROUP BY priority ORDER BY 
      CASE 
        WHEN lower(priority::text) = 'low' THEN 1
        WHEN lower(priority::text) = 'medium' THEN 2
        WHEN lower(priority::text) = 'high' THEN 3
        WHEN lower(priority::text) = 'urgent' THEN 4
        ELSE 5
      END;" || true
  else
    echo "(priority column not present in assignments table)"
  fi
  OVERDUE_ASSIGNMENTS=$(run_query "SELECT COUNT(*) FROM public.assignments WHERE lower(status::text) NOT IN ('completed','cancelled') AND due_date IS NOT NULL AND due_date < CURRENT_DATE;") || OVERDUE_ASSIGNMENTS=0
  OVERDUE_ASSIGNMENTS=$(echo "$OVERDUE_ASSIGNMENTS" | xargs)
  OVERDUE_ASSIGNMENTS=${OVERDUE_ASSIGNMENTS:-0}
  if [[ "$OVERDUE_ASSIGNMENTS" =~ ^[0-9]+$ ]] && [ "$OVERDUE_ASSIGNMENTS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $OVERDUE_ASSIGNMENTS overdue assignments${NC}"
  fi
fi

# orphaned records
ORPHANED_LESSON_SONGS=0
if table_exists lesson_songs; then
  ORPHANED_LESSON_SONGS=$(run_query "SELECT COUNT(*) FROM public.lesson_songs ls WHERE NOT EXISTS (SELECT 1 FROM public.lessons l WHERE l.id = ls.lesson_id) OR NOT EXISTS (SELECT 1 FROM public.songs s WHERE s.id = ls.song_id);") || ORPHANED_LESSON_SONGS=0
  ORPHANED_LESSON_SONGS=$(echo "$ORPHANED_LESSON_SONGS" | xargs)
fi
ORPHANED_LESSON_SONGS=${ORPHANED_LESSON_SONGS:-0}
if [[ "$ORPHANED_LESSON_SONGS" =~ ^[0-9]+$ ]] && [ "$ORPHANED_LESSON_SONGS" -gt 0 ]; then
  echo -e "${RED}⚠️  Found $ORPHANED_LESSON_SONGS orphaned lesson-song record(s)${NC}"
  ISSUES_FOUND=1
else
  echo -e "${GREEN}✅ No orphaned lesson-song records${NC}"
fi

# profiles + role distribution
PROFILES_COUNT=0
if table_exists profiles; then
  PROFILES_COUNT=$(run_query "SELECT COUNT(*) FROM public.profiles;") || PROFILES_COUNT=0
  PROFILES_COUNT=$(echo "$PROFILES_COUNT" | xargs)
fi
PROFILES_COUNT=${PROFILES_COUNT:-0}
echo -e "\n${YELLOW}Checking profiles:${NC}"
echo "Total profiles: $PROFILES_COUNT"

ROLE_DISTRIBUTION="0|0|0"
if table_exists user_roles; then
  ROLE_DISTRIBUTION=$(run_query "SELECT COALESCE(SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END),0) || '|' || COALESCE(SUM(CASE WHEN role = 'teacher' THEN 1 ELSE 0 END),0) || '|' || COALESCE(SUM(CASE WHEN role = 'student' THEN 1 ELSE 0 END),0) FROM public.user_roles;") || ROLE_DISTRIBUTION="0|0|0"
elif table_exists profiles; then
  ROLE_DISTRIBUTION=$(run_query "SELECT COALESCE(SUM(CASE WHEN is_admin THEN 1 ELSE 0 END),0) || '|' || COALESCE(SUM(CASE WHEN is_teacher THEN 1 ELSE 0 END),0) || '|' || COALESCE(SUM(CASE WHEN is_student THEN 1 ELSE 0 END),0) FROM public.profiles;") || ROLE_DISTRIBUTION="0|0|0"
fi
ROLE_DISTRIBUTION=$(echo "$ROLE_DISTRIBUTION" | xargs)
echo "Role distribution: $ROLE_DISTRIBUTION"

ADMIN_COUNT=$(echo "$ROLE_DISTRIBUTION" | awk -F'|' '{print $1}' | xargs)
TEACHER_COUNT=$(echo "$ROLE_DISTRIBUTION" | awk -F'|' '{print $2}' | xargs)
STUDENT_COUNT=$(echo "$ROLE_DISTRIBUTION" | awk -F'|' '{print $3}' | xargs)

ADMIN_COUNT=${ADMIN_COUNT:-0}
TEACHER_COUNT=${TEACHER_COUNT:-0}
STUDENT_COUNT=${STUDENT_COUNT:-0}

# Ensure they are numbers
[[ "$ADMIN_COUNT" =~ ^[0-9]+$ ]] || ADMIN_COUNT=0
[[ "$TEACHER_COUNT" =~ ^[0-9]+$ ]] || TEACHER_COUNT=0
[[ "$STUDENT_COUNT" =~ ^[0-9]+$ ]] || STUDENT_COUNT=0

if [ "$ADMIN_COUNT" -eq 0 ] && [ "$TEACHER_COUNT" -eq 0 ] && [ "$STUDENT_COUNT" -eq 0 ]; then
  echo -e "${RED}❌ CRITICAL: All profiles have no role flags set (all false)${NC}"
  echo "   Profiles exist but no users have admin, teacher, or student roles"
  echo "   This will block lesson creation and other role-dependent features"
  ISSUES_FOUND=1
fi

echo -e "\n${BLUE}📊 DATABASE SUMMARY${NC}"
echo "======================"
echo "Test Users: $TEST_USERS"
echo "Songs: $SONGS_COUNT"
echo "Lessons: $LESSONS_COUNT"
echo "Lesson-Song Associations: $LESSON_SONGS_COUNT"
echo "Assignments: $ASSIGNMENTS_COUNT"
echo "Profiles: $PROFILES_COUNT"

if [ "$REAL_EMAILS" -gt 0 ]; then
  echo -e "\n${RED}❌ CRITICAL: Real email addresses found in database${NC}"
  ISSUES_FOUND=1
fi

if [ "$ORPHANED_LESSON_SONGS" -gt 0 ]; then
  echo -e "\n${RED}❌ CRITICAL: Orphaned lesson-song records found${NC}"
  ISSUES_FOUND=1
fi

if [ "$SONGS_COUNT" -lt 15 ]; then
  echo -e "\n${YELLOW}⚠️  WARNING: Insufficient test data - only $SONGS_COUNT songs (minimum 15 recommended)${NC}"
  echo "   Run: npm run seed"
  ISSUES_FOUND=1
fi

if [ "$LESSONS_COUNT" -lt 5 ]; then
  echo -e "\n${YELLOW}⚠️  WARNING: Insufficient lessons - only $LESSONS_COUNT (minimum 5 recommended)${NC}"
  ISSUES_FOUND=1
fi

if [ "$ASSIGNMENTS_COUNT" -lt 3 ]; then
  echo -e "\n${YELLOW}⚠️  WARNING: Insufficient assignments - only $ASSIGNMENTS_COUNT (minimum 3 recommended)${NC}"
  ISSUES_FOUND=1
fi

if [ "$TEST_USERS" -lt 3 ]; then
  echo -e "\n${YELLOW}⚠️  WARNING: Insufficient test users - only $TEST_USERS (minimum 3 recommended)${NC}"
  echo "   Need at least: 1 admin, 1 teacher, 1 student"
  ISSUES_FOUND=1
fi

if [ "$TEACHER_COUNT" -lt 1 ]; then
  echo -e "\n${RED}❌ CRITICAL: No teachers found - lessons cannot be created${NC}"
  echo "   At least one profile must have is_teacher=true"
  ISSUES_FOUND=1
fi

if [ "$STUDENT_COUNT" -lt 1 ]; then
  echo -e "\n${YELLOW}⚠️  WARNING: No students found - lesson workflows cannot be tested${NC}"
  echo "   At least one profile should have is_student=true"
fi

# Validate authentication credentials (optional: will warn if not present)
echo -e "\n${BLUE}🔐 Testing authentication with development credentials...${NC}"
SUPABASE_URL="http://127.0.0.1:54321"
AUTH_CHECKS_PASSED=0
AUTH_CHECKS_TOTAL=0
declare -A TEST_CREDS=(
  ["p.romanczuk@gmail.com"]="test123_admin"
  ["teacher@example.com"]="test123_teacher"
  ["student@example.com"]="test123_student"
  ["teststudent1@example.com"]="test123_student"
)

for email in "${!TEST_CREDS[@]}"; do
  password="${TEST_CREDS[$email]}"
  AUTH_CHECKS_TOTAL=$((AUTH_CHECKS_TOTAL + 1))
  RESPONSE=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" -H "apikey: eyJhb..._I0" -H "Content-Type: application/json" -d "{\"email\":\"$email\",\"password\":\"$password\"}") || RESPONSE=""
  if echo "$RESPONSE" | grep -q '"access_token"'; then
    echo -e "${GREEN}  ✅ $email - Authentication successful${NC}"
    AUTH_CHECKS_PASSED=$((AUTH_CHECKS_PASSED + 1))
  else
    echo -e "${RED}  ❌ $email - Authentication failed${NC}"
    ISSUES_FOUND=1
  fi
done

echo -e "\n${BLUE}Authentication Summary: $AUTH_CHECKS_PASSED/$AUTH_CHECKS_TOTAL credentials validated${NC}"
if [ "$AUTH_CHECKS_PASSED" -lt "$AUTH_CHECKS_TOTAL" ]; then
  echo -e "${RED}⚠️  Some authentication checks failed${NC}"
fi

if [ "$PROFILES_COUNT" -lt "$TEST_USERS" ]; then
  echo -e "\n${RED}❌ CRITICAL: Profiles count ($PROFILES_COUNT) less than users count ($TEST_USERS)${NC}"
  ISSUES_FOUND=1
fi

echo ""
if [ "$ISSUES_FOUND" -eq 1 ]; then
  echo -e "${RED}❌ DATABASE QUALITY CHECK FAILED${NC}"
  echo "Please review the issues above before committing"
  exit 1
else
  echo -e "${GREEN}✅ DATABASE QUALITY CHECK PASSED${NC}"
fi
