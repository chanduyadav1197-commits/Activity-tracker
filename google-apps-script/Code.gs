/**
 * Berger Activity Tracker - shared team storage.
 *
 * Activities are saved to this Google Sheet; photos, videos and files are
 * saved to a Google Drive folder. Setup steps are in SETUP.md in the repo.
 */

// Pick a team code and share it only with your team.
// The tracker asks for it once on each phone / computer.
const TEAM_CODE = "CHANGE-ME";

const MEDIA_FOLDER = "Berger Activity Tracker - Media";
const MAX_UPLOAD_MB = 30;

const ACT = "Activities";
const APP = "Applicators";
const ACT_HEAD = ["ID", "Submitted", "Date", "Activity", "State", "District", "Location", "Area Manager",
  "Conducted By", "Shop / Dealer", "Remarks", "Applicators", "Applicator details",
  "Photos", "Videos", "Files", "Media links", "Data (do not edit)"];
const APP_HEAD = ["Activity ID", "Date", "Activity", "State", "District", "Area Manager", "Name", "Mobile", "Place"];

/** Run once from the editor (select "setup", press Run) to create the tabs and the Drive folder. */
function setup() {
  sheet_(ACT, ACT_HEAD);
  sheet_(APP, APP_HEAD);
  Logger.log("Media folder: " + folder_().getUrl());
}

function doGet(e) {
  return reply_(() => {
    check_(e.parameter.code);
    return { activities: list_() };
  });
}

function doPost(e) {
  return reply_(() => {
    const req = JSON.parse(e.postData.contents);
    check_(req.code);
    switch (req.action) {
      case "upsert": return { activity: upsert_(req.activity) };
      case "delete": remove_(String(req.id)); return {};
      case "upload": return { file: upload_(req) };
    }
    throw new Error("Unknown action");
  });
}

function reply_(fn) {
  let out;
  try { out = Object.assign({ ok: true }, fn()); }
  catch (err) { out = { ok: false, error: String((err && err.message) || err) }; }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function check_(code) {
  if (!TEAM_CODE || TEAM_CODE === "CHANGE-ME") throw new Error("Set TEAM_CODE in Code.gs and deploy a new version");
  if (String(code || "") !== TEAM_CODE) throw new Error("bad_code");
}

/* ---------- activities ---------- */

function list_() {
  const sh = sheet_(ACT, ACT_HEAD), n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, ACT_HEAD.length, n, 1).getValues()
    .map(r => { try { return JSON.parse(r[0]); } catch (e) { return null; } })
    .filter(Boolean);
}

function upsert_(a) {
  if (!a || !/^[\w-]{1,40}$/.test(String(a.id))) throw new Error("Bad activity id");
  a.id = String(a.id);
  a.apps = Array.isArray(a.apps) ? a.apps : [];
  a.media = Array.isArray(a.media) ? a.media : [];
  a.updated = Date.now();
  const json = JSON.stringify(a);
  if (json.length > 49000) throw new Error("Activity too large - split the applicator list into two activities");

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(ACT, ACT_HEAD);
    const count = kind => a.media.filter(m => m.kind === kind).length;
    const row = ["'" + a.id, new Date(a.ts || Date.now())].concat([
      a.date, a.type, a.state, a.dist, a.loc, a.am, a.con, a.shop, a.note,
      a.apps.length,
      a.apps.map(p => [p.name, p.mob, p.place].filter(Boolean).join(" / ")).join("\n"),
      count("image"), count("video"), count("file"),
      a.media.filter(m => m.drive).map(m => "https://drive.google.com/file/d/" + m.drive + "/view").join("\n"),
      json
    ].map(txt_));
    const r = findRow_(sh, a.id) || sh.getLastRow() + 1;
    sh.getRange(r, 1, 1, row.length).setValues([row]);

    const ap = sheet_(APP, APP_HEAD);
    deleteRows_(ap, a.id);
    const rows = a.apps.map(p => ["'" + a.id].concat([a.date, a.type, a.state, a.dist, a.am, p.name, p.mob, p.place].map(txt_)));
    if (rows.length) ap.getRange(ap.getLastRow() + 1, 1, rows.length, APP_HEAD.length).setValues(rows);
    return a;
  } finally {
    lock.releaseLock();
  }
}

function remove_(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = sheet_(ACT, ACT_HEAD), r = findRow_(sh, id);
    if (r) {
      try {
        const a = JSON.parse(sh.getRange(r, ACT_HEAD.length).getValue());
        (a.media || []).forEach(m => { if (m.drive) try { DriveApp.getFileById(m.drive).setTrashed(true); } catch (e) {} });
      } catch (e) {}
      sh.deleteRow(r);
    }
    deleteRows_(sheet_(APP, APP_HEAD), id);
  } finally {
    lock.releaseLock();
  }
}

/* ---------- photos, videos, files ---------- */

function upload_(req) {
  const bytes = Utilities.base64Decode(String(req.data || ""));
  if (!bytes.length) throw new Error("Empty file");
  if (bytes.length > MAX_UPLOAD_MB * 1048576) throw new Error("File is over " + MAX_UPLOAD_MB + " MB");
  const name = String(req.name || "file").replace(/[\\/:*?"<>|]/g, "_").slice(0, 120);
  const blob = Utilities.newBlob(bytes, String(req.mime || "application/octet-stream"), name);
  const file = sub_(String(req.folder || "Unsorted").replace(/[\\/]/g, "-").slice(0, 120)).createFile(blob);
  // Anyone with the link can view, so the tracker can show the photo/video to the team.
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return { id: file.getId(), url: file.getUrl() };
}

function folder_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty("MEDIA_FOLDER_ID");
  if (id) {
    try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {}
  }
  const f = DriveApp.createFolder(MEDIA_FOLDER);
  props.setProperty("MEDIA_FOLDER_ID", f.getId());
  return f;
}

function sub_(name) {
  const parent = folder_(), it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

/* ---------- helpers ---------- */

function sheet_(name, head) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function findRow_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  const ids = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < n; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}

function deleteRows_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return;
  const ids = sh.getRange(2, 1, n, 1).getValues();
  for (let i = n - 1; i >= 0; i--) if (String(ids[i][0]) === id) sh.deleteRow(i + 2);
}

// Keep text as text: stops "=..." being run as a formula and keeps "+91..." numbers intact.
function txt_(v) {
  if (v == null) return "";
  return typeof v === "string" && /^[=+\-@']/.test(v) ? "'" + v : v;
}
