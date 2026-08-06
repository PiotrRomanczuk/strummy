#!/usr/bin/env bash
# Apply missing migrations to the StudentProduction Supabase stack on uwh.
# Usage:
#   ./scripts/ops/apply-prod-migrations.sh [migrations-dir]

set -euo pipefail

CONTAINER="supabase_db_StudentProduction"
MIGRATIONS_DIR="${1:-supabase/migrations}"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  echo "Error: migrations directory '$MIGRATIONS_DIR' not found." >&2
  exit 1
fi

echo "🔍 Fetching applied migrations from $CONTAINER..."
APPLIED=$(docker exec -i "$CONTAINER" psql -U postgres -d postgres -t -A -c "select version from supabase_migrations.schema_migrations;")

# Loop over migration files sorted by name
for filepath in $(ls "$MIGRATIONS_DIR"/*.sql | sort); do
  filename=$(basename "$filepath")
  
  # Skip baseline (usually 00000000000000_baseline.sql)
  if [[ "$filename" == *"baseline"* ]]; then
    continue
  fi

  # Extract version and name
  # Example: 20260719190000_restore_song_status_history.sql
  # version: 20260719190000
  # name: restore_song_status_history
  version=$(echo "$filename" | cut -d'_' -f1)
  name=$(echo "$filename" | cut -d'_' -f2- | sed 's/\.sql$//')

  # Check if version is in APPLIED
  if echo "$APPLIED" | grep -q "^$version$"; then
    echo "⏭️  Migration $version ($name) is already applied."
  else
    echo "🚀 Applying migration $version ($name)..."
    if docker exec -i "$CONTAINER" psql -U postgres -d postgres < "$filepath"; then
      # Register the migration in schema_migrations
      docker exec -i "$CONTAINER" psql -U postgres -d postgres -c "
        insert into supabase_migrations.schema_migrations (version, name) 
        values ('$version', '$name') 
        on conflict (version) do nothing;
      "
      echo "✅ Migration $version ($name) applied successfully."
    else
      echo "❌ Error applying migration $version ($name). Aborting." >&2
      exit 1
    fi
  fi
done

echo "🎉 All migrations applied successfully to StudentProduction!"
