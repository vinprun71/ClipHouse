#!/bin/sh
set -eu

node scripts/setup-token.mjs
npx prisma migrate deploy
exec npm run start -- --hostname 0.0.0.0 --port "${PORT:-3000}"
