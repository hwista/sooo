FROM node:22 AS base
RUN corepack enable && \
    corepack prepare pnpm@11.13.1 --activate && \
    apt-get update && apt-get install -y --no-install-recommends postgresql-client && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/admin/package.json apps/web/admin/package.json
COPY apps/web/crm/package.json apps/web/crm/package.json
COPY apps/web/dms/package.json apps/web/dms/package.json
COPY apps/web/pms/package.json apps/web/pms/package.json
COPY apps/web/sns/package.json apps/web/sns/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/web-auth/package.json packages/web-auth/package.json
COPY packages/web-shell/package.json packages/web-shell/package.json
COPY packages/web-ui/package.json packages/web-ui/package.json
RUN --mount=type=secret,id=ssoo_tls_ca,required=false \
    --mount=type=cache,id=ssoo-pnpm-v11,target=/root/.local/share/pnpm/store,sharing=locked \
    --mount=type=cache,id=ssoo-pnpm-v11-metadata,target=/root/.cache/pnpm,sharing=locked \
    if [ -s /run/secrets/ssoo_tls_ca ]; then \
      export NODE_EXTRA_CA_CERTS=/run/secrets/ssoo_tls_ca; \
    fi && \
    pnpm install --filter @ssoo/database... --frozen-lockfile

COPY packages/database/ packages/database/
COPY packages/types/ packages/types/
COPY scripts/db-init-entrypoint.sh scripts/db-init-entrypoint.sh

ENTRYPOINT ["bash", "scripts/db-init-entrypoint.sh"]
