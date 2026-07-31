#!/bin/bash

# Database Seed Script
# Populates the database with sample data for development

set -e

echo "🌱 DATABASE SEEDING"
echo "=================="

# Check if Supabase is running
if ! curl -s http://localhost:54321/health > /dev/null; then
    echo "❌ Supabase is not running. Please start it first:"
    echo "   ./scripts/setup/setup-db.sh"
    exit 1
fi

echo "✅ Supabase is running"

# Run the seed script
echo "🌱 Seeding database with sample data..."
supabase db seed

echo ""
echo "📊 Seeded data summary:"
echo "======================"

# Query and display seeded data counts
psql "postgresql://postgres:postgres@localhost:54322/postgres" << 'EOL'
SELECT 'Users' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'Songs', COUNT(*) FROM songs
UNION ALL
SELECT 'Lessons', COUNT(*) FROM lessons
UNION ALL
SELECT 'Lesson Songs', COUNT(*) FROM lesson_songs
UNION ALL
SELECT 'Tasks', COUNT(*) FROM task_management;
EOL

echo ""
echo "✅ Database seeded successfully!"
echo ""
echo "🎯 You can now:"
echo "• Test the application with sample data"
echo "• Run TDD cycles with realistic data"
echo "• Develop features against populated database"
echo ""
echo "🔗 Access Supabase Studio: http://localhost:54323"