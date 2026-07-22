// Minimal Google Play Developer API client — no npm deps, RS256 JWT via node:crypto.
import crypto from "node:crypto";
import fs from "node:fs";

const SA = JSON.parse(fs.readFileSync("/Users/mohamedbhidy/.expo/google-play/service-account.json", "utf8"));
const PKG = "com.mubasher.smartsignals";
const BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3";

const b64 = (o) => Buffer.from(typeof o === "string" ? o : JSON.stringify(o)).toString("base64url");

export async function token() {
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: SA.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64(claim)}`;
  const sig = crypto.createSign("RSA-SHA256").update(unsigned).sign(SA.private_key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${sig}`,
    }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error("token failed: " + JSON.stringify(j).slice(0, 300));
  return j.access_token;
}

export async function api(tok, path, { method = "GET", body, raw, contentType } = {}) {
  const res = await fetch(`${BASE}/applications/${PKG}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${tok}`,
      ...(raw ? { "content-type": contentType } : body ? { "content-type": "application/json" } : {}),
    },
    body: raw ?? (body ? JSON.stringify(body) : undefined),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, ok: res.ok, data };
}

export { PKG };

if (process.argv[2] === "probe") {
  const t = await token();
  console.log("✓ auth OK");
  const e = await api(t, "/edits", { method: "POST" });
  console.log("edits.insert →", e.status, JSON.stringify(e.data).slice(0, 200));
}
