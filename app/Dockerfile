# app/Dockerfile

# Build argument for future microservice support
ARG SERVICE=monolith

# ---- Base Stage ----
FROM node:20-alpine AS base
WORKDIR /usr/src/app

# Install build dependencies for native modules (bcrypt, etc.) and bash for postinstall scripts
RUN apk add --no-cache python3 make g++ bash

# ---- Dependencies Stage ----
FROM base AS dependencies
# Copy package.json and package-lock.json from the build context (backend/)
COPY app/package.json ./
COPY app/package-lock.json ./
# Copy scripts directory for postinstall hook
COPY app/scripts ./scripts
# Remove --ignore-scripts to allow native modules (bcrypt) to build
RUN npm install --omit=dev --legacy-peer-deps

# ---- Build Stage ----
FROM base AS build
WORKDIR /usr/src/app

COPY app/package.json ./
COPY app/package-lock.json ./
# Copy scripts directory for postinstall hook
COPY app/scripts ./scripts
# Remove --ignore-scripts to allow native modules (bcrypt) to build
RUN npm install --legacy-peer-deps # Installs all deps, including dev

COPY app/ .

# Build the application AND scripts. Output goes to ./dist
RUN npm run build

# Ensure compiled scripts exist (Optional: Check if build includes them, else copy manually)
# RUN cp -R src/scripts dist/scripts # Uncomment if 'npm run build' doesn't handle scripts

RUN npm prune --omit=dev --legacy-peer-deps

# ---- Production Stage ----
FROM base AS production

# Install utilities for wait script
RUN apk add --no-cache netcat-openbsd postgresql-client

WORKDIR /usr/src/app

# Add app user and group
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy production dependencies
COPY --from=dependencies --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules

# Copy compiled application code AND compiled scripts
COPY --from=build --chown=appuser:appgroup /usr/src/app/dist ./dist

# Copy the source code needed for ts-node scripts
COPY --from=build --chown=appuser:appgroup /usr/src/app/src ./src

# Copy package.json for potential runtime use (e.g., reading version)
COPY --chown=appuser:appgroup app/package.json ./

# Copy utility scripts
COPY --from=build --chown=appuser:appgroup /usr/src/app/scripts ./scripts

# Copy config directory for environment files (required by app.module.ts and data-source.ts)
# app.module.ts expects: /usr/src/config/env/*.env (resolved from dist/src: ../../../)
# data-source.ts expects: /usr/src/app/config/env/*.env (resolved from dist/src/database/config: ../../../../)
# Solution: Copy to /usr/src/config AND create symlink at /usr/src/app/config
COPY --chown=appuser:appgroup config /usr/src/config
RUN ln -s /usr/src/config /usr/src/app/config

# Create uploads directory and set ownership
RUN mkdir -p /usr/src/app/uploads && chown -R appuser:appgroup /usr/src/app/uploads

# Change ownership # <-- This might be redundant if COPY --chown is used
# RUN chown -R appuser:appgroup /usr/src/app
USER appuser

# Expose port
EXPOSE 3000

# Replace legacy wait with canonical vars
CMD sh -c "echo \"Waiting for ${POSTGRES_HOST:-postgres_perf}:${POSTGRES_PORT:-5432}...\" && while ! nc -z ${POSTGRES_HOST:-postgres_perf} ${POSTGRES_PORT:-5432}; do sleep 1; done && echo 'PostgreSQL started. Starting app...' && node dist/src/main.js" 