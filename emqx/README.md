# EMQX configuration

File-based ACL + authz config that enforces the bootstrap-cert vs operational-cert scope split documented in `docs/device-onboarding.md`.

## How EMQX maps certs to usernames

EMQX's `ssl` authn extracts the certificate's Common Name and uses it as the authenticated username for ACL evaluation. In this setup:

- **Bootstrap cert** — one shared cert, CN = `bootstrap`. Matches the `{user, "bootstrap"}` ACL rules.
- **Operational cert** — one per device, CN = `koi-<hardware-id>`. Matches the regex rule `{re, "^koi-"}` and substitutes `${username}` into the allowed topic filters.

## Dev mode

The broker in `docker-compose.yml` runs with `EMQX_ALLOW_ANONYMOUS=true`, which means these ACL files are **not enforced** locally. This is deliberate — it lets the NestJS ingest service and ad-hoc `mosquitto_pub` test commands work without certs. When you start testing real devices end-to-end:

1. Comment out `EMQX_ALLOW_ANONYMOUS=true` in `docker-compose.yml`.
2. Mount `./emqx/acl.conf` and `./emqx/authz.conf` into `/opt/emqx/etc/` in the EMQX container.
3. Configure TLS listener + peer cert authn in `emqx.conf` (not yet in this repo — add when you have real CA material).
4. Issue a `koi-server` service-account password for the NestJS ingest service and put it in `MQTT_USERNAME` / `MQTT_PASSWORD`.

## Production

- Replace the file-based authz source with a Postgres source that queries the `DeviceCertificate` table directly, so a revoked cert stops authorizing immediately without an EMQX reload.
- Use the EMQX OCSP stapling feature against a real CA revocation endpoint.
- Lock the dashboard (`18083`) behind a VPN or delete the container port mapping.
