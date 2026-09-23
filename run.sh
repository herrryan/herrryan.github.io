#!/usr/bin/env bash
# ==============================================================================
# herrryan.github.io — Dynamic Port Startup Runner
# ==============================================================================
set -e

BOLD="\033[1m"
CYAN="\033[38;5;75m"
GREEN="\033[38;5;120m"
SLATE="\033[38;5;244m"
RESET="\033[0m"

# Dynamic port configuration (honors $PORT from environment)
export PORT="${PORT:-5173}"
export VITE_PORT="${PORT}"
export NEXT_PUBLIC_PORT="${PORT}"

echo -e "${CYAN}✦${RESET} ${BOLD}Starting herrryan.github.io on port ${PORT}...${RESET}"
cd "$(dirname "$0")"

# Ensure node dependencies are installed
if [ ! -d "node_modules" ] && [ -f "package.json" ]; then
    echo -e "  ${SLATE}↳ Installing dependencies...${RESET}"
    if command -v pnpm >/dev/null 2>&1; then
        pnpm install
    else
        npm install
    fi
fi

if command -v pnpm >/dev/null 2>&1; then
    echo -e "${GREEN}✔${RESET} ${BOLD}Executing:${RESET} pnpm run dev -- --port \"${PORT:-5173}\""
    eval exec pnpm run dev -- --port "\"${PORT:-5173}\""
else
    echo -e "${GREEN}✔${RESET} ${BOLD}Executing:${RESET} npm run dev -- --port \"${PORT:-5173}\""
    eval exec npm run dev -- --port "\"${PORT:-5173}\""
fi
