# app/Dockerfile

# Build argument for future microservice support
ARG SERVICE=monolith

# ---- Base Stage ----
FROM node:20-bookworm-slim AS base
WORKDIR /usr/src/app

# ---- Dependencies Stage ----
FROM base AS dependencies
# Install build toolchain for native modules (bcrypt, sharp)
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
# Copy package.json and package-lock.json from the build context (app/)
COPY package.json ./
COPY package-lock.json ./
RUN npm install --omit=dev --legacy-peer-deps --ignore-scripts \
  && npm rebuild bcrypt --build-from-source \
  && node -e "require('bcrypt'); console.log('bcrypt ok')"

# ---- Build Stage ----
FROM base AS build
WORKDIR /usr/src/app

# Install build toolchain needed for devDependencies with native bindings
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./
COPY package-lock.json ./
RUN npm install --legacy-peer-deps --ignore-scripts # Installs all deps, including dev

# Copy backend source into container
COPY . .

# Build the application AND scripts. Output goes to ./dist
RUN npm run build

# Ensure compiled scripts exist (Optional: Check if build includes them, else copy manually)
# RUN cp -R src/scripts dist/scripts # Uncomment if 'npm run build' doesn't handle scripts

RUN npm prune --omit=dev --legacy-peer-deps

# ---- Production Stage ----
FROM base AS production

# Install utilities for wait script
RUN apt-get update \
  && apt-get install -y --no-install-recommends netcat-openbsd postgresql-client \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app

# Add app user and group
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

# Copy production dependencies
COPY --from=dependencies --chown=appuser:appgroup /usr/src/app/node_modules ./node_modules

# Copy compiled application code AND compiled scripts
COPY --from=build --chown=appuser:appgroup /usr/src/app/dist ./dist

# Copy the source code needed for ts-node scripts
COPY --from=build --chown=appuser:appgroup /usr/src/app/src ./src

# Copy package.json for potential runtime use (e.g., reading version)
COPY --chown=appuser:appgroup package.json ./

# Copy utility scripts
COPY --from=build --chown=appuser:appgroup /usr/src/app/scripts ./scripts

# Create uploads directory and set ownership
RUN mkdir -p /usr/src/app/uploads && chown -R appuser:appgroup /usr/src/app/uploads

USER appuser

# Expose port
EXPOSE 3000

# Replace legacy wait with canonical vars and finite timeout
CMD sh -c "\
  DB_WAIT_MAX_ATTEMPTS=${DB_WAIT_MAX_ATTEMPTS:-120}; \
  if [ \"${SKIP_DB_WAIT:-}\" = \"1\" ]; then \
    echo 'Skipping DB wait'; \
  else \
    echo \"Waiting for ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}...\"; \
    attempts=0; \
    while ! nc -z ${POSTGRES_HOST:-db} ${POSTGRES_PORT:-5432}; do \
      attempts=$((attempts + 1)); \
      if [ \"$attempts\" -ge \"$DB_WAIT_MAX_ATTEMPTS\" ]; then \
        echo 'DB wait timeout'; \
        exit 1; \
      fi; \
      sleep 1; \
    done; \
    echo 'PostgreSQL reachable. Starting app...'; \
  fi; \
  node dist/src/main.js"