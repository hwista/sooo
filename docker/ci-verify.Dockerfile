# syntax=docker/dockerfile:1

FROM node:20

RUN corepack enable && \
    corepack prepare pnpm@10.28.0 --activate && \
    git config --system --add safe.directory /app

WORKDIR /app
COPY . .

RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
