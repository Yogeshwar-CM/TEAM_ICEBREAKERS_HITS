#!/bin/bash

# Kill any existing node processes on ports 3000 (old server/new client) and 5000 (new server)
echo "🧹 Cleaning up ports..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:5000 | xargs kill -9 2>/dev/null

echo "🚀 Starting CodeCollab IDE..."

# Start Server (Port 5000)
cd TEAM_ICEBREAKERS_HITS/Code/server
echo "📦 Starting Server on Port 5000..."
npm start &
SERVER_PID=$!

# Wait for server to initialize
sleep 2

# Start Client (Port 3000)
cd ../client
echo "💻 Starting Client on Port 3000..."
# Explicitly set PORT to 3000 to be sure
PORT=3000 npm start &
CLIENT_PID=$!

# Handle exit
trap "kill $SERVER_PID $CLIENT_PID; exit" SIGINT

wait
