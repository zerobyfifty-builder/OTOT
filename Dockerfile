# Multi-stage build: compile the Vite SPA, then serve the static output with Caddy
# (SPA fallback + compression + cache headers). Deployed on Railway.

# ---- Build stage ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# VITE_-prefixed vars are inlined at build time, so they must be present here.
# Railway passes matching service variables as Docker build args.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_PUBLIC_APP_URL
ARG VITE_API_URL
ARG VITE_EMISSION_API_URL
ARG VITE_EMISSION_API_KEY
ARG VITE_FORCE_PORTAL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_PUBLIC_APP_URL=$VITE_PUBLIC_APP_URL \
    VITE_API_URL=$VITE_API_URL \
    VITE_EMISSION_API_URL=$VITE_EMISSION_API_URL \
    VITE_EMISSION_API_KEY=$VITE_EMISSION_API_KEY \
    VITE_FORCE_PORTAL=$VITE_FORCE_PORTAL

RUN npm run build

# ---- Runtime stage ----
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
