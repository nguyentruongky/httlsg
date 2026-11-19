#!/usr/bin/env bash
set -e

# Configuration variables
DB_NAME="${DB_NAME:-app_local_db}"
DB_USER="${DB_USER:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_HOST="${DB_HOST:-localhost}"

echo "=================================================="
echo "🚀 Initializing Local PostgreSQL Database: $DB_NAME"
echo "=================================================="

# 1. Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: 'psql' command not found."
    echo "Please ensure PostgreSQL is installed and added to your PATH."
    echo "(On macOS, you can use Postgres.app or 'brew install postgresql')"
    exit 1
fi

# 2. Test database connection
echo "🔍 Testing connection to PostgreSQL on port $DB_PORT..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Error: Cannot connect to PostgreSQL server at $DB_HOST:$DB_PORT as user '$DB_USER'."
    echo "Please start your PostgreSQL service or Postgres.app and try again."
    exit 1
fi
echo "✅ PostgreSQL connection successful."

# 3. Create Database if it doesn't exist
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    echo "ℹ️  Database '$DB_NAME' already exists."
else
    echo "📦 Creating database '$DB_NAME'..."
    createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
    echo "✅ Database '$DB_NAME' created successfully."
fi

# 4. Enable useful extensions (e.g., uuid-ossp for UUID generation)
echo "🔌 Enabling PostgreSQL extensions (uuid-ossp)..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"

# 5. Generate .env file template if missing
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
    echo "📝 Generating local .env file template..."
    cat << EOF > "$ENV_FILE"
# Local Development Database Connection
DATABASE_URL="postgresql://$DB_USER:@$DB_HOST:$DB_PORT/$DB_NAME"
DIRECT_URL="postgresql://$DB_USER:@$DB_HOST:$DB_PORT/$DB_NAME"
EOF
    echo "✅ Created .env with DATABASE_URL."
else
    echo "ℹ️  .env file already exists. Skipping template generation."
fi

echo "=================================================="
echo "🎉 Local PostgreSQL setup completed successfully!"
echo "Database URL: postgresql://$DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
echo "=================================================="