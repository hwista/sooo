# syntax=docker/dockerfile:1

FROM node:22

RUN corepack enable && \
    corepack prepare pnpm@11.13.1 --activate && \
    git config --system --add safe.directory /app

WORKDIR /app
COPY . .

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm --filter @ssoo/database db:generate
