#!/usr/bin/env node
/**
 * Generate dev key material for device provisioning:
 *   - An operational intermediate CA (RSA 2048, self-signed)
 *   - A dev "attestation root" (same key as operational in dev; real
 *     production separates these — the attestation root private key lives
 *     at the factory)
 *   - An Ed25519 keypair for signing QR payloads
 *
 * Writes everything to ./dev-ca/ and prints the env lines to paste into .env.
 *
 * DO NOT use any of this output in production.
 */
const forge = require('node-forge');
const { generateKeyPairSync } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const outDir = path.resolve(__dirname, '..', 'dev-ca');
fs.mkdirSync(outDir, { recursive: true });

// --- Operational CA ---------------------------------------------------------

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

const attrs = [
  { name: 'commonName', value: 'Koi Dev Operational CA' },
  { name: 'organizationName', value: 'Koi Pond Monitor (dev)' },
];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.setExtensions([
  { name: 'basicConstraints', cA: true },
  { name: 'keyUsage', keyCertSign: true, cRLSign: true, digitalSignature: true },
]);
cert.sign(keys.privateKey, forge.md.sha256.create());

const opCertPem = forge.pki.certificateToPem(cert);
const opKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

fs.writeFileSync(path.join(outDir, 'operational-ca.crt'), opCertPem);
fs.writeFileSync(path.join(outDir, 'operational-ca.key'), opKeyPem, { mode: 0o600 });

// --- Attestation root (dev: separate self-signed CA) -----------------------

const attKeys = forge.pki.rsa.generateKeyPair(2048);
const attCert = forge.pki.createCertificate();
attCert.publicKey = attKeys.publicKey;
attCert.serialNumber = '01';
attCert.validity.notBefore = new Date();
attCert.validity.notAfter = new Date();
attCert.validity.notAfter.setFullYear(attCert.validity.notBefore.getFullYear() + 20);
const attAttrs = [
  { name: 'commonName', value: 'Koi Dev Attestation Root' },
  { name: 'organizationName', value: 'Koi Pond Monitor (dev)' },
];
attCert.setSubject(attAttrs);
attCert.setIssuer(attAttrs);
attCert.setExtensions([
  { name: 'basicConstraints', cA: true },
  { name: 'keyUsage', keyCertSign: true, cRLSign: true },
]);
attCert.sign(attKeys.privateKey, forge.md.sha256.create());

const attCertPem = forge.pki.certificateToPem(attCert);
const attKeyPem = forge.pki.privateKeyToPem(attKeys.privateKey);

fs.writeFileSync(path.join(outDir, 'attestation-root.crt'), attCertPem);
// The private key is written ONLY for the dev flashing tool to use; in prod
// this key lives at the factory and never touches this repo.
fs.writeFileSync(path.join(outDir, 'attestation-root.key'), attKeyPem, { mode: 0o600 });

// --- Ed25519 QR signing keypair --------------------------------------------

const { publicKey: qrPub, privateKey: qrPriv } = generateKeyPairSync('ed25519');
const qrPubPem = qrPub.export({ type: 'spki', format: 'pem' });
const qrPrivPem = qrPriv.export({ type: 'pkcs8', format: 'pem' });

fs.writeFileSync(path.join(outDir, 'qr-signing.pub'), qrPubPem);
fs.writeFileSync(path.join(outDir, 'qr-signing.key'), qrPrivPem, { mode: 0o600 });

// --- Emit env lines ---------------------------------------------------------

const esc = (s) => s.replace(/\n/g, '\\n');

console.log(`
Wrote:
  dev-ca/operational-ca.crt
  dev-ca/operational-ca.key
  dev-ca/attestation-root.crt
  dev-ca/attestation-root.key     (ships to the flashing tool, never committed)
  dev-ca/qr-signing.pub
  dev-ca/qr-signing.key

Add to .env:

CA_OPERATIONAL_CERT_PEM="${esc(opCertPem)}"
CA_OPERATIONAL_KEY_PEM="${esc(opKeyPem)}"
CA_ATTESTATION_CERT_PEM="${esc(attCertPem)}"
QR_SIGNING_PUBLIC_KEY_PEM="${esc(qrPubPem)}"
QR_SIGNING_PRIVATE_KEY_PEM="${esc(qrPrivPem)}"
`);
