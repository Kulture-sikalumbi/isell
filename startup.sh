#!/bin/bash
set -e
cd /home/site/wwwroot

if [ -f "server.js" ]; then
  echo "Starting Next.js standalone server..."
  node server.js
elif [ -f ".next/standalone/server.js" ]; then
  echo "Starting Next.js from .next/standalone..."
  node .next/standalone/server.js
else
  echo "Starting via npm start..."
  npm start
fi
