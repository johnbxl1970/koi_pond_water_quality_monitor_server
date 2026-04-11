# Device Onboarding Design

Status: **draft** — contract for the device, server, and mobile repos to build against.

## Goals

1. **Frictionless.** A user — whether they unboxed a preflashed device or flashed it themselves — should complete onboarding in well under a minute: open app → scan QR → enter WiFi → done.
2. **Very secure.** Per-device hardware-bound keys. No shared secrets. No broker URLs typed by users. No lifetime bearer tokens. Physical presence required for ownership transfer.

These are co-equal constraints. A design that only hits one is rejected.

## Target UX

### Flow A — Preflashed from store

1. User unboxes device. Plugs it in. LED breathes blue ("awaiting provisioning").
2. User opens the Koi mobile app → **Add device** → scans the QR sticker on the device.
3. App connects directly to the device via BLE (ESP32) or SoftAP (RP2040-W) and asks for home WiFi SSID + password.
4. Device joins WiFi, completes the claim handshake with the server, binds to the user's account. ~20–30 s total.
5. LED turns green. Mobile app shows the device attached to a pond (user picks which one if they have more than one).

### Flow B — DIY flasher

Same flow, with a preamble:

1. User runs `koi flash --port /dev/ttyUSB0` on a laptop with the device in bootloader mode.
2. Tool builds firmware, generates a unique P-256 keypair inside the device's secure element, computes a hardware ID from the pubkey, pre-registers the claim with the Koi server, and prints a QR code to the terminal (also saves it to `~/.koi/claims/<hardwareId>.png`).
3. User scans that QR with the mobile app. Rest of the flow matches A step 3 onward.

Both flows converge after the QR scan. The mobile app is the only provisioning surface end users touch.

## Trust model

Four credentials live on each device. Each has minimal scope.

| Credential | Location | Lifetime | Scope |
|---|---|---|---|
| **Device root key** (ECC P-256) | Secure element (ATECC608A) on RP2040; eFuse-sealed flash + secure boot v2 on ESP32 | Hardware lifetime. Never leaves chip. | Signs CSRs and any future attestations. |
| **Attestation certificate** | Non-secret flash | Hardware lifetime | Signed by the Koi CA at flash/manufacture time. Binds `hardwareId → device pubkey`. Proves the device is real. |
| **Bootstrap certificate** | Shipped in firmware image, **shared across all unprovisioned devices** | Rotated per firmware release | MQTT ACL: may ONLY publish to `provisioning/{hardwareId}/request` and subscribe to `provisioning/{hardwareId}/response`. Cannot publish telemetry. |
| **Operational certificate** | Non-secret flash (key stays in secure element) | 1 year, auto-renews at 75% lifetime | MQTT ACL: publish `koi/{hardwareId}/telemetry`, subscribe `koi/{hardwareId}/cmd/+`. Tied to a claimed user/pond. |

**Private keys never leave the device.** The server never has a copy. Compromising one device's flash does not compromise any other device.

## Claim token

The QR code carries a JSON payload:

```json
{
  "v": 1,
  "hw": "koi-a1b2c3d4e5f6",
  "tok": "base32-128bit-secret",
  "fp": "sha256-pubkey-fingerprint"
}
```

- `hw` — hardware ID (derived from device pubkey)
- `tok` — one-time claim token, 128 bits, hashed at rest on the server (Argon2id)
- `fp` — SHA-256 fingerprint of the device pubkey, used by the mobile app to verify it's talking to the right device during BLE/SoftAP provisioning

The token is consumed on first successful claim. Re-reading the same QR after success is a no-op (already claimed).

## MQTT topics

| Topic | Direction | Cert required | Purpose |
|---|---|---|---|
| `provisioning/{hardwareId}/request` | device → server | bootstrap | CSR payload + nonce |
| `provisioning/{hardwareId}/response` | server → device | bootstrap | Issued operational cert + chain |
| `koi/{hardwareId}/telemetry` | device → server | operational | Sensor data |
| `koi/{hardwareId}/cmd/ota` | server → device | operational | OTA firmware pointer |
| `koi/{hardwareId}/cmd/config` | server → device | operational | Configuration updates |
| `koi/{hardwareId}/cmd/cert-renew` | server → device | operational | Triggers renewal of operational cert |
| `koi/{hardwareId}/status` | device → server | operational | Health/liveness + firmware version |

EMQX ACLs enforce the cert-type requirement on each topic. A device with only a bootstrap cert cannot publish telemetry even if it knows the topic.

## Claim flow (happy path)

```
┌──────────┐                      ┌───────────┐                      ┌──────────┐
│  Device  │                      │  EMQX     │                      │  Server  │
└────┬─────┘                      └─────┬─────┘                      └────┬─────┘
     │ WiFi connected                   │                                  │
     │ Connect with bootstrap cert      │                                  │
     ├─────────────────────────────────►│                                  │
     │                                  │                                  │
     │ PUB provisioning/HWID/request    │                                  │
     │   { csr, nonce, attestationCert }│                                  │
     ├─────────────────────────────────►├────── rule engine ──────────────►│
     │                                  │                                  │ ProvisioningService:
     │                                  │                                  │  - verify attestation sig
     │                                  │                                  │  - store pending CSR in Redis
     │                                  │                                  │    (key: pending_csr:HWID, TTL 10 min)
     │                                  │                                  │
     │ SUB provisioning/HWID/response   │                                  │
     │                                  │                                  │
     ▼                                  ▼                                  ▼

    [User scans QR sticker, app POSTs /api/devices/claim { claimToken, pondId }]

     │                                  │                                  │
     │                                  │                                  │ ProvisioningService:
     │                                  │                                  │  - find DeviceClaim by tok hash
     │                                  │                                  │  - verify not consumed
     │                                  │                                  │  - look up pending CSR (Redis)
     │                                  │                                  │  - verify CSR pubkey == claim fingerprint
     │                                  │                                  │  - CA.issueOperationalCert(CSR)
     │                                  │                                  │  - create Device row (pondId)
     │                                  │                                  │  - mark DeviceClaim CONSUMED
     │                                  │                                  │
     │                                  │◄─ PUB provisioning/HWID/response │
     │                                  │    { cert, chain, expiresAt }    │
     │◄─────────────────────────────────┤                                  │
     │                                  │                                  │
     │ Store operational cert           │                                  │
     │ Drop bootstrap cert from session │                                  │
     │ Reconnect with operational cert  │                                  │
     ├─────────────────────────────────►│                                  │
     │                                  │                                  │
     │ PUB koi/HWID/telemetry           │                                  │
     ├─────────────────────────────────►│──────► Timescale hypertable ─────►
     │                                  │                                  │
```

## Failure & recovery

| Failure | Recovery |
|---|---|
| CSR arrives before user scans QR | Server buffers pending CSR in Redis with 10-min TTL. Device retries every 60 s. |
| User scans QR but device hasn't connected yet | Server creates a pending claim; when the CSR arrives, it's auto-matched and the cert is issued immediately. No second user action. |
| Claim token expired (> 30 days since pre-registration) | Claim is rejected. For DIY: user re-runs `koi flash --reclaim`. For preflashed: user contacts support (rare — factory-burned claims have long expiry). |
| Operational cert expired while device offline | On reconnect, device sees TLS handshake fail → falls back to bootstrap cert → publishes a `cert-renew` request. Server issues a fresh cert without a user-visible step. |
| Device stolen / resold | New owner must perform **physical reset** (10-second button hold). Device erases operational cert + stored WiFi creds, regenerates a fresh claim token, re-enters bootstrap mode. There is no remote unclaim. |
| CA root key compromised | Catastrophic. Mitigated by keeping root offline (air-gapped or HSM) and signing only an intermediate CA for day-to-day operations. The intermediate can be rotated. |

## Server responsibilities

Everything on the server side lives in **`src/provisioning/`**:

- `CaService` — wraps `node-forge` (or later, a `step-ca` HTTP client) to sign CSRs with the operational intermediate CA. The CA key material is loaded from env at startup and never logged.
- `ProvisioningService` — business logic: claim token verification, CSR matching, cert issuance, DeviceClaim lifecycle.
- `ProvisioningController` — REST endpoints:
  - `POST /api/admin/device-claims` — pre-register a claim (used by the flashing tool and the factory pipeline). Body: `{ hardwareId, attestationCertPem, claimTokenPlaintext }`. Returns the QR payload.
  - `POST /api/devices/claim` — consume a claim. Body: `{ claimToken, pondId }`. Returns success once the cert has been published to the device (with a timeout/polling fallback).
- MQTT subscription: extend `IngestService` to also subscribe to `provisioning/+/request`, dispatching to `ProvisioningService.handleCsr`.

## Hardware requirements this imposes

- **ESP32:** no extra chip. Use secure boot v2 + flash encryption + NVS encrypted partition. ESP-IDF provides `esp_wifi_prov_mgr` for BLE provisioning.
- **RP2040-W:** needs an **ATECC608A** (~$1 BOM) for the device root key. Without it, RP2040 has no hardware key storage and the security story collapses to "someone with the flash dumper gets the key."

The device repo must make the chip choice explicitly. This server design assumes at least one of those two storage paths.

## Explicit non-goals for v1

- **Remote unclaim.** Ownership transfer always requires physical presence. This is a feature, not a limitation.
- **Social account linking at claim time.** The claim binds to a pond, not directly to a user account. Users can share ponds with other users via `PondMember` after claiming.
- **Enterprise fleet enrollment.** No bulk CSV import, no SCIM, no org hierarchy. Single-user and family-of-users scale only.

## Open questions

1. **Which CA toolchain** — `node-forge` for MVP (zero deps, pure JS) vs `step-ca` (proper PKI service, revocation, CRL/OCSP). Recommend starting with `node-forge` and migrating once we have > ~100 devices or any real revocation need.
2. **QR payload signing** — should the QR itself be signed by the Koi CA so a tampered sticker is detectable offline? Adds ~100 bytes. Probably worth it.
3. **Manufacturing path for attestation certs** — who holds the attestation CA key, and how does a contract manufacturer burn certs without exfiltrating it? Needs a separate hardware-security doc before we talk to a CM.
