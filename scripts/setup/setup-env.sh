#!/bin/bash

# Environment Setup Script
# Sets up the development environment with all necessary dependencies

set -e

echo "🌟 GUITAR CRM - DEVELOPMENT SETUP"
echo "================================="

# Check Node.js version
NODE_VERSION=$(node --version)
echo "📦 Node.js version: $NODE_VERSION"

# Check if we have a supported Node version (18+)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | cut -d'v' -f2)
if [ "$NODE_MAJOR" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current version: $NODE_VERSION"
    echo "Please upgrade Node.js and run this script again."
    exit 1
fi

echo "✅ Node.js version is compatible"

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Copy environment template if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "⚙️  Creating .env.local template..."
    cat > .env.local << EOL
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
# Service role key (server-side only - never use NEXT_PUBLIC_ prefix for secrets)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App Configuration
NEXT_PUBLIC_APP_NAME="Guitar CRM"
NEXT_PUBLIC_APP_VERSION="1.0.0"

# Development
NODE_ENV=development
EOL
    echo "✅ Created .env.local template"
    echo "⚠️  Please update the Supabase keys after running setup-db.sh"
else
    echo "✅ .env.local already exists"
fi

# Create necessary directories
echo "📁 Creating project directories..."
mkdir -p logs
mkdir -p temp
mkdir -p uploads

# Set up pre-commit hooks directory
mkdir -p .husky

echo ""
echo "🎉 SETUP COMPLETE!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Run './scripts/setup/setup-db.sh' to set up the database"
echo "2. Update .env.local with your Supabase keys"
echo "3. Run 'npm run dev' to start development"
echo "4. Run 'npm run tdd' to start test-driven development"
echo ""
echo "Useful commands:"
echo "• npm run dev          - Start development server"
echo "• npm run tdd          - Start TDD mode with tests"
echo "• npm run lint         - Check code quality"
echo "• npm test             - Run tests"
echo "• ./scripts/development/new-feature.sh <name> - Create new feature branch"