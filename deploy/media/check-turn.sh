#!/bin/sh
set -eu
# Runs inside the coturn container. Do not enable shell tracing: the local shared
# secret is read privately and converted by coturn's own client into REST credentials.
media_turn_secret=$(sed -n 's/^static-auth-secret=//p' /etc/coturn/turnserver.conf)
test -n "$media_turn_secret"
probe() {
  media_turn_output=$(turnutils_uclient "$@" -y -c -n 5 -W "$media_turn_secret" -p 3478 127.0.0.1 2>&1)
  printf '%s\n' "$media_turn_output"
  printf '%s\n' "$media_turn_output" | grep -q 'tot_send_msgs=10, tot_recv_msgs=10'
  printf '%s\n' "$media_turn_output" | grep -q 'Total lost packets 0 '
}
probe
probe -t
exit 0
