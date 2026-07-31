#!/bin/bash

# Security Tests Runner
# Runs Playwright security tests with proper environment setup

set -e

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}  Security Tests - Teacher Isolation${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}Error: .env.local file not found${NC}"
    echo "Please create .env.local with required Supabase credentials"
    exit 1
fi

# Load environment variables
export $(cat .env.local | grep -v '^#' | xargs)

# Check required environment variables
REQUIRED_VARS=(
    "NEXT_PUBLIC_SUPABASE_LOCAL_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
)

MISSING_VARS=0
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        echo -e "${RED}Error: Missing required environment variable: $var${NC}"
        MISSING_VARS=1
    fi
done

if [ $MISSING_VARS -eq 1 ]; then
    echo ""
    echo "Required environment variables:"
    echo "  NEXT_PUBLIC_SUPABASE_LOCAL_URL=http://127.0.0.1:54321"
    echo "  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ..."
    echo "  SUPABASE_SERVICE_ROLE_KEY=eyJ..."
    exit 1
fi

# Check if Supabase is running
echo -e "${YELLOW}Checking if Supabase is running...${NC}"
if ! curl -s "${NEXT_PUBLIC_SUPABASE_LOCAL_URL}/rest/v1/" > /dev/null 2>&1; then
    echo -e "${RED}Error: Supabase is not running on ${NEXT_PUBLIC_SUPABASE_LOCAL_URL}${NC}"
    echo "Start Supabase with: npm run db:start"
    exit 1
fi
echo -e "${GREEN}✓ Supabase is running${NC}"
echo ""

# Check if Next.js dev server is running
echo -e "${YELLOW}Checking if Next.js dev server is running...${NC}"
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Next.js dev server is not running${NC}"
    echo "Playwright will start it automatically"
    echo ""
else
    echo -e "${GREEN}✓ Next.js dev server is running${NC}"
    echo ""
fi

# Parse command line arguments
UI_MODE=0
DEBUG_MODE=0
SPECIFIC_TEST=""
PROJECT="Desktop Chrome"

while [[ $# -gt 0 ]]; do
    case $1 in
        --ui)
            UI_MODE=1
            shift
            ;;
        --debug)
            DEBUG_MODE=1
            shift
            ;;
        --headed)
            HEADED=1
            shift
            ;;
        --test)
            SPECIFIC_TEST="$2"
            shift 2
            ;;
        --project)
            PROJECT="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: $0 [--ui] [--debug] [--headed] [--test TEST_NAME] [--project PROJECT_NAME]"
            exit 1
            ;;
    esac
done

# Build Playwright command
CMD="npx playwright test tests/e2e/security/teacher-isolation.spec.ts"

if [ $UI_MODE -eq 1 ]; then
    CMD="$CMD --ui"
elif [ $DEBUG_MODE -eq 1 ]; then
    CMD="$CMD --debug"
elif [ ! -z "$HEADED" ]; then
    CMD="$CMD --headed"
fi

if [ ! -z "$SPECIFIC_TEST" ]; then
    CMD="$CMD -g \"$SPECIFIC_TEST\""
fi

CMD="$CMD --project=\"$PROJECT\""

# Run tests
echo -e "${YELLOW}Running security tests...${NC}"
echo "Command: $CMD"
echo ""

eval $CMD

EXIT_CODE=$?

echo ""
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}======================================${NC}"
    echo -e "${GREEN}  ✓ Security tests completed${NC}"
    echo -e "${GREEN}======================================${NC}"
else
    echo -e "${RED}======================================${NC}"
    echo -e "${RED}  ✗ Security tests failed${NC}"
    echo -e "${RED}======================================${NC}"
    echo ""
    echo -e "${YELLOW}Known issues:${NC}"
    echo "  - Student list API vulnerability (documented in test)"
    echo "  - See tests/e2e/security/README.md for details"
fi

exit $EXIT_CODE
