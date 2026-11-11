#!/bin/sh
# Servidor de teste: porta 3100, banco do .env.test, pasta de build separada.
set -a
. ./.env.test
set +a
NEXT_DIST_DIR=.next-test exec node_modules/.bin/next dev -p 3100
