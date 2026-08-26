#!/usr/bin/env sh
set -eu

if [ -s /run/secrets/ssoo_tls_ca ]; then
  export NODE_EXTRA_CA_CERTS=/run/secrets/ssoo_tls_ca
fi

if [ -s /run/secrets/dms_git_http_credentials ]; then
  case "${DMS_GIT_HTTP_AUTH_SCOPE:-}" in
    http://* | https://*) ;;
    *)
      echo "[server-entrypoint] DMS_GIT_HTTP_AUTH_SCOPE must be an http(s) origin when the DMS Git credential secret is present" >&2
      exit 1
      ;;
  esac

  if [ -n "${GIT_CONFIG_COUNT:-}" ]; then
    echo "[server-entrypoint] refusing to overwrite an existing GIT_CONFIG_COUNT" >&2
    exit 1
  fi

  export GIT_CONFIG_COUNT=2
  export GIT_CONFIG_KEY_0="credential.${DMS_GIT_HTTP_AUTH_SCOPE}.helper"
  export GIT_CONFIG_VALUE_0='!f() { cat /run/secrets/dms_git_http_credentials; }; f'
  export GIT_CONFIG_KEY_1="credential.${DMS_GIT_HTTP_AUTH_SCOPE}.useHttpPath"
  export GIT_CONFIG_VALUE_1=false
fi

exec "$@"
