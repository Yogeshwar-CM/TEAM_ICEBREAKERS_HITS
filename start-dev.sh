#!/bin/bash

# Kill any existing node processes on ports 3000 (server) and 3001 (likely client)
echo "🧹 Cleaning up ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo "🚀 Starting CodeCollab IDE..."

# Start Server
cd TEAM_ICEBREAKERS_HITS/Code/server
echo "📦 Starting Server..."
npm start &
SERVER_PID=$!

# Wait a moment for server to initialize
sleep 2

# Start Client
cd ../client
echo "💻 Starting Client..."
npm start &
CLIENT_PID=$!

# Handle exit
trap "kill $SERVER_PID $CLIENT_PID; exit" SIGINT

wait
