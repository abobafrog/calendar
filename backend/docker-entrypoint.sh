#!/bin/sh
set -eu

secret_directory=/run/timetogether
secret_file="$secret_directory/jwt-secret"

mkdir -p "$secret_directory"
if [ ! -s "$secret_file" ]; then
    umask 077
    python -c 'import secrets; print(secrets.token_urlsafe(64))' > "$secret_file"
fi
chown -R app:app "$secret_directory"

exec gosu app "$@"
