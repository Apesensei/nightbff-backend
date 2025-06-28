#!/bin/bash
set -e # Exit immediately if a command exits with a non-zero status.

# --- Migration Smoke Test ---
# Goal: Prove the migration chain is 100% reliable, reversible, and repeatable.
#
# Usage: ./migration-smoke.sh <database_name>
# Example: ./migration-smoke.sh nightbff_smoke_test

# --- Configuration ---
DB_USER="nightbff_user"
DB_HOST="127.0.0.1"
DB_PORT="5432"
# Use the provided DB name, or a default
DB_NAME=${1:-nightbff_smoke_test} 
# Set a temporary password for the script's execution
export PGPASSWORD='your_strong_password'

# --- Functions ---
log() {
  echo "[SMOKE_TEST] ==> $1"
}

# --- Main Script ---
log "Starting Migration Smoke Test on database: $DB_NAME"

# 1. Drop and Create a fresh, empty database
log "Step 1/5: Dropping existing database (if any)..."
dropdb --if-exists --host=$DB_HOST --port=$DB_PORT --username=$DB_USER $DB_NAME
log "Database '$DB_NAME' dropped."

log "Step 2/5: Creating new empty database..."
createdb --host=$DB_HOST --port=$DB_PORT --username=$DB_USER $DB_NAME
log "Database '$DB_NAME' created."

# Set DATABASE_URL for TypeORM commands
export DATABASE_URL="postgresql://${DB_USER}:${PGPASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
log "Using DATABASE_URL: ${DATABASE_URL}"

# 2. Validate migrations (pre-run check)
log "Step 3/5: Validating migration files..."
npm run migration:validate
log "Migration validation successful."

# 3. Run all migrations
log "Step 4/5: Running all migrations..."
npm run migration:run
log "All migrations applied successfully."
MIGRATION_COUNT=$(psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "SELECT COUNT(*) FROM migrations;")
log "Found $(echo $MIGRATION_COUNT | xargs) applied migrations."

# 4. Revert all migrations
log "Step 5/5: Reverting all migrations one by one..."
for i in $(seq 1 $MIGRATION_COUNT); do
  log "Reverting migration $i of $MIGRATION_COUNT..."
  npm run migration:revert
done
log "All migrations reverted successfully."

# 5. Final check
log "Final check: Verifying migrations table is empty..."
FINAL_COUNT=$(psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -t -c "SELECT COUNT(*) FROM migrations;")
log "Final migration count: $(echo $FINAL_COUNT | xargs)"

if [ "$(echo $FINAL_COUNT | xargs)" -eq "0" ]; then
  log "✅ SUCCESS: Migration smoke test completed successfully."
  exit 0
else
  log "❌ FAILURE: Migrations table is not empty after reverting all."
  exit 1
fi 