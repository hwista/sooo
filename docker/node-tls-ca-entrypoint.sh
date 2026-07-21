#!/usr/bin/env sh
set -eu

if [ -s /run/secrets/ssoo_tls_ca ]; then
  export NODE_EXTRA_CA_CERTS=/run/secrets/ssoo_tls_ca
fi

exec "$@"
