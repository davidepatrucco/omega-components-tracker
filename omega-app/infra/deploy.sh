#!/usr/bin/env bash
#set -e
# Simple deploy helper to be executed on the server after receiving bundle.tgz
# Usage: ./deploy.sh [compose-file]

COMPOSE=${1:-docker-compose.lightsail.yml}

if [ -f "$COMPOSE" ]; then
  echo "Using compose file: $COMPOSE"
  docker compose -f "$COMPOSE" build
  docker compose -f "$COMPOSE" up -d
else
  echo "Compose file $COMPOSE not found, falling back to default docker-compose.yml"
  docker compose build
  docker compose up -d
fi

echo "Pruning unused images..."
docker image prune -f

echo "Deploy finished."
