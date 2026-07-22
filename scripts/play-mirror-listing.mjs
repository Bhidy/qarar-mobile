import { token } from "./gp.mjs";
const BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3";
const UP = "https://androidpublisher.googleapis.com/upload/androidpublisher/v3";
const OLD = "com.rumble.pro";
const NEW = "com.mubasher.smartsignals";
const t = await token();

const j = async (pkg, p, m = "GET", body) => {
  const r = await fetch(`${BASE}/applications/${pkg}${p}`, {
    method: m,
    headers: { authorization: `Bearer ${t}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const x = await r.text();
  try { return { s: r.status, d: JSON.parse(x) }; } catch { return { s: r.status, d: x }; }
};

// ---- read approved listing ----
const oe = await j(OLD, "/edits", "POST");
const oid = oe.d.id;
const details = (await j(OLD, `/edits/${oid}/details`)).d;
const listing = (await j(OLD, `/edits/${oid}/listings/en-US`)).d;

const KINDS = ["icon", "featureGraphic", "phoneScreenshots"];
const grabbed = {};
for (const k of KINDS) {
  const imgs = (await j(OLD, `/edits/${oid}/listings/en-US/${k}`)).d.images || [];
  grabbed[k] = [];
  for (const im of imgs) {
    const r = await fetch(im.url + "=d", { headers: { authorization: `Bearer ${t}` } });
    if (!r.ok) { console.log(`  !! download failed ${k} ${r.status}`); continue; }
    grabbed[k].push(Buffer.from(await r.arrayBuffer()));
  }
  console.log(`downloaded ${k}: ${grabbed[k].length}`);
}
await j(OLD, `/edits/${oid}`, "DELETE");

// ---- write to new listing ----
const ne = await j(NEW, "/edits", "POST");
const nid = ne.d.id;
console.log("new edit:", nid);

const d1 = await j(NEW, `/edits/${nid}/details`, "PUT", {
  defaultLanguage: details.defaultLanguage,
  contactWebsite: details.contactWebsite,
  contactEmail: details.contactEmail,
});
console.log("details →", d1.s);

const l1 = await j(NEW, `/edits/${nid}/listings/en-US`, "PUT", {
  language: "en-US",
  title: listing.title,
  shortDescription: listing.shortDescription,
  fullDescription: listing.fullDescription,
});
console.log("listing →", l1.s, l1.s !== 200 ? JSON.stringify(l1.d).slice(0, 300) : listing.title);

for (const k of KINDS) {
  await fetch(`${BASE}/applications/${NEW}/edits/${nid}/listings/en-US/${k}`, {
    method: "DELETE", headers: { authorization: `Bearer ${t}` },
  });
  let n = 0;
  for (const buf of grabbed[k]) {
    const r = await fetch(`${UP}/applications/${NEW}/edits/${nid}/listings/en-US/${k}?uploadType=media`, {
      method: "POST",
      headers: { authorization: `Bearer ${t}`, "content-type": "image/png" },
      body: buf,
    });
    if (r.ok) n++; else console.log(`  !! upload ${k} ${r.status}`, (await r.text()).slice(0, 200));
  }
  console.log(`uploaded ${k}: ${n}/${grabbed[k].length}`);
}

const c = await j(NEW, `/edits/${nid}:commit`, "POST");
console.log("COMMIT →", c.s, JSON.stringify(c.d).slice(0, 200));
