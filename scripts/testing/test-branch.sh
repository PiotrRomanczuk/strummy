#!/bin/bash

# Script to run tests based on current branch or specified category
# Usage: ./scripts/testing/test-branch.sh [category] [--watch] [--coverage]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get current branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
CONFIG_FILE="jest.config.branches.json"

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}❌ Error: $CONFIG_FILE not found${NC}"
    exit 1
fi

# Function to get test categories for a branch
get_categories_for_branch() {
    local branch=$1
    node -e "
        const config = require('./jest.config.branches.json');
        const categories = config.branchMapping['$branch'] || config.branchMapping['main'] || ['core'];
        console.log(categories.join(' '));
    "
}

# Function to get test patterns for categories
get_test_patterns() {
    local categories=($1)
    node -e "
        const config = require('./jest.config.branches.json');
        const categories = '$1'.split(' ');
        const allPatterns = [];
        const processedCategories = new Set();
        
        function addCategoryPatterns(category) {
            if (processedCategories.has(category)) return;
            processedCategories.add(category);
            
            const categoryConfig = config.testCategories[category];
            if (!categoryConfig) {
                console.error('Unknown category:', category);
                return;
            }
            
            // Add dependencies first
            if (categoryConfig.dependencies) {
                categoryConfig.dependencies.forEach(dep => addCategoryPatterns(dep));
            }
            
            // Add current category patterns
            allPatterns.push(...categoryConfig.patterns);
        }
        
        categories.forEach(category => addCategoryPatterns(category));
        
        // Remove duplicates and print
        const uniquePatterns = [...new Set(allPatterns)];
        console.log(uniquePatterns.join(' '));
    "
}

# Function to display available categories
show_categories() {
    echo -e "${BLUE}📋 Available Test Categories:${NC}"
    echo ""
    node -e "
        const config = require('./jest.config.branches.json');
        Object.entries(config.testCategories).forEach(([name, info]) => {
            console.log(\`  \${name.padEnd(12)} - \${info.description}\`);
            if (info.dependencies && info.dependencies.length > 0) {
                console.log(\`\${' '.repeat(17)}Dependencies: \${info.dependencies.join(', ')}\`);
            }
        });
    "
    echo ""
    echo -e "${BLUE}🌿 Branch Mappings:${NC}"
    echo ""
    node -e "
        const config = require('./jest.config.branches.json');
        Object.entries(config.branchMapping).forEach(([branch, categories]) => {
            console.log(\`  \${branch.padEnd(25)} -> \${categories.join(', ')}\`);
        });
    "
}

# Parse arguments
CATEGORY=""
WATCH_MODE=false
COVERAGE_MODE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --watch|-w)
            WATCH_MODE=true
            shift
            ;;
        --coverage|-c)
            COVERAGE_MODE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [category] [options]"
            echo ""
            echo "Options:"
            echo "  --watch, -w     Run tests in watch mode"
            echo "  --coverage, -c  Run tests with coverage"
            echo "  --verbose, -v   Verbose output"
            echo "  --help, -h      Show this help"
            echo ""
            show_categories
            exit 0
            ;;
        --list)
            show_categories
            exit 0
            ;;
        *)
            CATEGORY="$1"
            shift
            ;;
    esac
done

# Determine categories to test
if [ -n "$CATEGORY" ]; then
    # Use specified category
    CATEGORIES="$CATEGORY"
    echo -e "${BLUE}🧪 Running tests for category: ${YELLOW}$CATEGORY${NC}"
else
    # Use current branch mapping
    CATEGORIES=$(get_categories_for_branch "$CURRENT_BRANCH")
    echo -e "${BLUE}🌿 Current branch: ${YELLOW}$CURRENT_BRANCH${NC}"
    echo -e "${BLUE}🧪 Running tests for categories: ${YELLOW}$CATEGORIES${NC}"
fi

# Get test patterns
TEST_PATTERNS=$(get_test_patterns "$CATEGORIES")

if [ -z "$TEST_PATTERNS" ]; then
    echo -e "${RED}❌ No test patterns found for categories: $CATEGORIES${NC}"
    exit 1
fi

echo -e "${BLUE}📁 Test patterns: ${NC}$TEST_PATTERNS"
echo ""

# Build Jest command
JEST_CMD="npx jest"

# Convert patterns to Jest testPathPattern
PATTERN_STRING=""
for pattern in $TEST_PATTERNS; do
    if [ -z "$PATTERN_STRING" ]; then
        PATTERN_STRING="$pattern"
    else
        PATTERN_STRING="$PATTERN_STRING|$pattern"
    fi
done

# Add testPathPattern if we have patterns
if [ -n "$PATTERN_STRING" ]; then
    JEST_CMD="$JEST_CMD --testPathPattern=\"$PATTERN_STRING\""
fi

# Add options
if [ "$WATCH_MODE" = true ]; then
    JEST_CMD="$JEST_CMD --watch"
fi

if [ "$COVERAGE_MODE" = true ]; then
    JEST_CMD="$JEST_CMD --coverage"
fi

if [ "$VERBOSE" = true ]; then
    JEST_CMD="$JEST_CMD --verbose"
fi

# Show command being run
echo -e "${BLUE}🚀 Running: ${NC}$JEST_CMD"
echo ""

# Execute Jest
eval $JEST_CMD

# Show summary
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}✅ Tests passed for categories: $CATEGORIES${NC}"
else
    echo -e "${RED}❌ Tests failed for categories: $CATEGORIES${NC}"
fi

exit $EXIT_CODE