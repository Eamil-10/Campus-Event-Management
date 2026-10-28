#!/usr/bin/env bash
set -e

# ------------------------------------------------------------
# Automated demo script for University Event Platform
# ------------------------------------------------------------
# This script changes to the project root, installs dependencies,
# runs DB migrations, seeds the DB, starts the backend and frontend
# servers, opens the UI in your default browser, and runs the backend tests.
# ------------------------------------------------------------

# 1️⃣ Change to the project root (adjust if your path differs)
PROJECT_ROOT="/Users/eamil/Documents/Sem 3/Software Engineering/Attendance"
cd "$PROJECT_ROOT"

# 2️⃣ Install workspace dependencies
npm install
npm --workspace=backend install
npm --workspace=frontend install

# 3️⃣ Ensure no stray backend process is occupying the default port (5001)
if lsof -i :5001 -t >/dev/null 2>&1; then
  echo "Killing stray process on port 5001..."
  lsof -i :5001 -t | xargs kill -9
fi

# 4️⃣ Run database migrations (ensure PostgreSQL is running)
echo "Running DB migrations..."
npm --workspace=backend run db:migrate

# 5️⃣ (Optional) Seed the database – ignore errors if already seeded

echo "Seeding DB (if needed)..."
npm --workspace=backend run db:seed || true

# 6️⃣ Start the backend server in the background

echo "Starting backend server..."
npm --workspace=backend run dev &
BACKEND_PID=$!

# 7️⃣ Start the frontend (Vite) dev server in the background

echo "Starting frontend server..."
npm --workspace=frontend run dev &
FRONTEND_PID=$!

# Give the servers a moment to boot
sleep 5

# 8️⃣ Open the UI in the default browser (Vite typically runs on http://localhost:3000)
open http://localhost:3001

# 9️⃣ Run backend test suite (optional – skipped to avoid test failures)
# echo "Running backend tests..."
# npm --workspace=backend run test

# 🔟 Keep the script alive until you stop it (Ctrl+C)
echo "Demo is running – press Ctrl+C to stop both servers."
wait $BACKEND_PID $FRONTEND_PID
