#!/bin/sh
# Render (and similar platforms) mount persistent disks with root ownership.
# Start as root, make /data writable by the app user, then drop privileges.
set -e

echo "[entrypoint] starting as $(id -un):$(id -u)"

if [ "$(id -u)" = "0" ]; then
  mkdir -p /data
  chown -R scholaris:scholaris /data
  exec gosu scholaris "$@"
fi

exec "$@"
