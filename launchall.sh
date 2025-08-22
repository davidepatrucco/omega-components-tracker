#!/bin/bash

echo "🔄 Stopping existing processes..."

# Kill any existing server.js processes on port 4000
echo "Killing server.js processes on port 4000..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true

# Kill any existing vite processes on ports 5173 and 5174
echo "Killing vite processes on ports 5173 and 5174..."
lsof -ti:5173 | xargs kill -9 2>/dev/null || true
lsof -ti:5174 | xargs kill -9 2>/dev/null || true

sleep 2

echo "🚀 Starting backend..."
cd /Users/davide.patrucco/Desktop/Personal/omega/omega-app/backend
node server.js &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

sleep 3

echo "🚀 Starting frontend..."
cd /Users/davide.patrucco/Desktop/Personal/omega/omega-app/frontend
npm run dev &
FRONTEND_PID=$!
echo "Frontend started with PID: $FRONTEND_PID"

echo "✅ All services started!"
echo "Backend: http://localhost:4000"
echo "Frontend: http://localhost:5173"
echo ""
echo "To stop everything, run: kill $BACKEND_PID $FRONTEND_PID"
echo "Or use Ctrl+C to stop this script and all child processes"

# Wait for background processes
wait
