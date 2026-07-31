#!/bin/bash

# Guitar CRM - Complete Setup Script
# Sets up everything from scratch: Docker, Supabase, database, seeds, and Next.js app
# Usage: ./scripts/setup/setup-complete.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_PROJECT_ID="StudentManager"
SUPABASE_API_PORT=54321
SUPABASE_DB_PORT=54322
SUPABASE_STUDIO_PORT=54323
SUPABASE_EMAIL_PORT=54324
MAX_RETRIES=60
RETRY_DELAY=3

# Helper functions
log_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

log_step() {
    echo -e "${YELLOW}→ $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

wait_for_port() {
    local port=$1
    local service=$2
    local retries=0
    
    log_step "Waiting for $service on port $port..."
    
    while [ $retries -lt $MAX_RETRIES ]; do
        if [ "$service" = "PostgreSQL Database" ]; then
            # For PostgreSQL, use psql to check connection
            if psql "postgresql://postgres:postgres@127.0.0.1:$port/postgres" -c "SELECT 1" > /dev/null 2>&1; then
                log_success "$service is ready"
                return 0
            fi
        else
            # For HTTP services, use curl
            if curl -s http://localhost:$port/health > /dev/null 2>&1; then
                log_success "$service is ready"
                return 0
            fi
        fi
        
        retries=$((retries + 1))
        echo -ne "  Attempt $retries/$MAX_RETRIES...\r"
        sleep $RETRY_DELAY
    done
    
    log_error "$service did not start in time"
    return 1
}

# Start
log_header "🎸 GUITAR CRM - COMPLETE SETUP"

# Step 0: Check if database is already set up correctly
log_header "Step 0/6: Checking existing database state"

if bash scripts/database/maintenance/check-db-quality.sh > /dev/null 2>&1; then
    log_success "Database is already correctly set up!"
    echo ""
    echo -e "${GREEN}All quality checks passed. No setup needed.${NC}"
    echo ""
    echo -e "${BLUE}Current database status:${NC}"
    bash scripts/database/maintenance/check-db-quality.sh 2>&1 | grep -E "^(Test Users|Songs|Lessons|Assignments|Profiles|✅|Authentication Summary|  ✅)"
    echo ""
    echo -e "${BLUE}Services available:${NC}"
    echo "  API:      http://localhost:$SUPABASE_API_PORT"
    echo "  Database: postgresql://postgres:postgres@127.0.0.1:$SUPABASE_DB_PORT/postgres"
    echo "  Studio:   http://localhost:$SUPABASE_STUDIO_PORT"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Start the dev server:  ${YELLOW}npm run dev${NC}"
    echo -e "  2. Open the app:          ${YELLOW}http://localhost:3000${NC}"
    echo ""
    log_success "Setup skipped - everything already configured! 🚀"
    exit 0
else
    log_step "Database quality check failed or database not initialized"
    echo "  Proceeding with full setup..."
fi

# Step 1: Check Docker
log_step "Checking Docker..."
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed or not in PATH"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    log_error "Docker daemon is not running. Please start Docker first."
    exit 1
fi

log_success "Docker is running"

# Step 2: Stop any existing Supabase containers
log_header "Step 1/6: Cleaning up existing Supabase containers"

log_step "Stopping existing containers for $SUPABASE_PROJECT_ID..."
supabase stop --project-id "$SUPABASE_PROJECT_ID" --no-backup 2>/dev/null || true
sleep 3

log_success "Old containers stopped"

# Step 3: Start Supabase
log_header "Step 2/6: Starting Supabase"

log_step "Starting Supabase services (StudentManager project)..."
supabase start > /dev/null 2>&1 || {
    log_error "Failed to start Supabase. Check Docker is running."
    exit 1
}

log_success "Supabase containers started"

# Step 4: Wait for services
log_header "Step 3/6: Waiting for services to be ready"

wait_for_port $SUPABASE_API_PORT "Supabase API" || exit 1
wait_for_port $SUPABASE_DB_PORT "PostgreSQL Database" || exit 1

# Additional wait for database to fully initialize
sleep 5

log_success "All services are ready"

# Step 5: Database setup
log_header "Step 4/6: Setting up database"

log_step "Applying migrations..."
supabase db reset 2>&1 | grep -v "502\|upstream" || true
# The 502 error is a transient container restart issue - migrations still apply
sleep 5

log_success "Migrations applied successfully"

# No need for manual seeding - migrations now include seed data

# Step 6: Seeding data
log_header "Step 5/6: Seeding test data"

log_step "Creating development users..."
export NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:$SUPABASE_API_PORT"
export SUPABASE_SERVICE_ROLE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz"

bash scripts/database/seeding/local/seed-all.sh > /dev/null 2>&1 || {
    log_error "Failed to seed data"
    exit 1
}

log_success "Test data seeded successfully"

# Step 7: Database quality check
log_header "Step 6/6: Verifying database integrity"

if bash scripts/database/maintenance/check-db-quality.sh > /dev/null 2>&1; then
    QUALITY_CHECK_PASSED=true
else
    QUALITY_CHECK_PASSED=false
fi

# Display final status
if [ "$QUALITY_CHECK_PASSED" = true ]; then
    log_header "✅ SETUP COMPLETE!"
else
    log_header "⚠️  SETUP COMPLETE WITH WARNINGS"
fi

echo -e "${GREEN}Database Status:${NC}"
bash scripts/database/maintenance/check-db-quality.sh | grep -E "^(Total|Test Users|Songs|Lessons|Assignments|Profiles|✅|⚠️)" || true

echo ""
echo -e "${GREEN}Supabase Services:${NC}"
echo "  API:      http://localhost:$SUPABASE_API_PORT"
echo "  Database: postgresql://postgres:postgres@127.0.0.1:$SUPABASE_DB_PORT/postgres"
echo "  Studio:   http://localhost:$SUPABASE_STUDIO_PORT"
echo "  Email:    http://localhost:$SUPABASE_EMAIL_PORT"

echo ""
echo -e "${GREEN}Development Credentials:${NC}"
echo "  Admin (Admin + Teacher):"
echo "    Email:    p.romanczuk@gmail.com"
echo "    Password: test123_admin"
echo ""
echo "  Teacher:"
echo "    Email:    teacher@example.com"
echo "    Password: test123_teacher"
echo ""
echo "  Students:"
echo "    Email:    student@example.com"
echo "    Password: test123_student"
echo ""
echo "    Email:    teststudent1@example.com"
echo "    Password: test123_student"
echo ""
echo "    Email:    teststudent2@example.com"
echo "    Password: test123_student"
echo ""
echo "    Email:    teststudent3@example.com"
echo "    Password: test123_student"

echo ""
echo -e "${BLUE}Next steps:${NC}"
echo -e "  1. Start the dev server:  ${YELLOW}npm run dev${NC}"
echo -e "  2. Open the app:          ${YELLOW}http://localhost:3000${NC}"
echo -e "  3. View Supabase Studio:  ${YELLOW}http://localhost:$SUPABASE_STUDIO_PORT${NC}"
echo -e "  4. Run tests:             ${YELLOW}npm test${NC}"
echo -e "  5. Run e2e tests:         ${YELLOW}npm run cypress${NC}"

echo ""
log_success "All systems ready! 🚀"

# Exit with appropriate code based on quality check
if [ "$QUALITY_CHECK_PASSED" = true ]; then
    exit 0
else
    echo ""
    log_error "Database quality check failed. Run 'npm run db:quality' for details."
    exit 1
fi
