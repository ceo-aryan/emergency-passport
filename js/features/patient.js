// Patient side: login, create/update passport, QR, share code, own history and access log.
import { $, esc, cardHTML, historyHTML, fmtTime, today } from "../ui.js";
import { t } from "../i18n.js";
import { redrawers } from "../state.js";
import * as api from "../services/api.js";
import { drawQR } from "../qr.js";

const FIELDS = ["name", "phone", "dob", "gender", "blood", "allergy", "cond", "meds", "cname", "cphone", "crel"];
let mine = null, justSaved = false, hist = [], log = [], code = null;

function logHTML() {
  if (!log.length) return `<p class="muted">${t("log_empty")}</p>`;
  return `<ul class="plain">${log.map(l => `<li>${esc(l.docName)}${l.hospital ? " (" + esc(l.hospital) + ")" : ""} · ${esc(fmtTime(l.at))}${l.mode === "emergency" ? `<br><span class="tag em">${t("log_em")}</span> ${esc(l.reason)}` : ""}</li>`).join("")}</ul>`;
}

function show() {   // draws everything that depends on the loaded data
  $("createDone").innerHTML = mine
    ? (justSaved ? `<p class="ok" style="margin-top:20px">${t("done")}</p>` : "") + cardHTML(mine, true)
      + `<p class="note">${t("saved")}</p><p class="note">${t("host_note")}</p>`
    : "";
  if (mine) drawQR(mine);
  $("myRecords").hidden = !mine;
  $("myHistory").innerHTML = historyHTML(hist);
  $("myLog").innerHTML = logHTML();
  $("codeOut").innerHTML = code ? `<div class="codebox">${code}</div><p class="muted">${t("code_valid")}</p>` : "";
}

export async function refreshPatient(u) {   // called whenever the login state changes
  mine = null; hist = []; log = []; code = null; justSaved = false;
  $("authBox").hidden = !!u; $("whoami").hidden = !u; $("createForm").hidden = !u;
  if (!u) { $("createForm").reset(); show(); return; }
  $("whoMail").textContent = u.email;
  try {
    mine = await api.myPassport();
    if (mine) {
      FIELDS.forEach(f => { $(f).value = mine[f] || ""; });
      $("allowEm").checked = mine.allowEmergency !== false;
      [hist, log] = await Promise.all([api.historyOf(u.uid), api.myAccessLog()]);
    }
  } catch (e) { console.error(e); }
  show();
}

function authMsg(e) {
  const c = (e && e.code) || "";
  if (c.includes("email-already")) return t("err_exists");
  if (c.includes("weak-password")) return t("err_weak");
  if (c.includes("invalid-email")) return t("err_email");
  if (c.includes("network")) return t("err_net");
  return t("err_auth");
}

export async function doAuth(kind, email, pass, errEl) {   // kind: "login" | "signup" (also used by the staff login)
  errEl.textContent = "";
  if (!/^\S+@\S+\.\S+$/.test(email)) { errEl.textContent = t("err_email"); return; }
  try { await api[kind](email, pass); } catch (e) { console.error(e); errEl.textContent = authMsg(e); }
}

export function initPatient() {
  $("dob").max = today();
  $("loginBtn").addEventListener("click", () => doAuth("login", $("aemail").value.trim(), $("apass").value, $("authErr")));
  $("signupBtn").addEventListener("click", () => doAuth("signup", $("aemail").value.trim(), $("apass").value, $("authErr")));
  $("logout").addEventListener("click", () => api.logout());

  $("genCode").addEventListener("click", async () => {
    try { code = await api.createShareCode(); show(); }
    catch (e) { console.error(e); $("codeOut").textContent = t("err_net"); }
  });

  $("createForm").addEventListener("submit", async e => {
    e.preventDefault();
    const val = id => $(id).value.trim(), err = $("createErr");
    const p = { name: val("name"), phone: val("phone"), dob: val("dob"), gender: val("gender"), blood: val("blood"),
                allergy: val("allergy"), cond: val("cond"), meds: val("meds"),
                cname: val("cname"), cphone: val("cphone"), crel: val("crel"), allowEmergency: $("allowEm").checked };
    let problem = "";
    if (!p.name) problem = t("err_name");
    else if (!/^\d{10}$/.test(p.phone)) problem = t("err_phone");
    else if (!p.dob) problem = t("err_dob");
    else if (!p.blood) problem = t("err_blood");
    else if (p.cphone && !/^\d{10}$/.test(p.cphone)) problem = t("err_cphone");
    else if (!$("consent").checked) problem = t("err_consent");
    err.textContent = problem;
    if (problem) return;
    try { p.pid = await api.savePassport(p); }
    catch (e2) { console.error(e2); err.textContent = t("err_save"); return; }
    mine = p; justSaved = true; show();
    $("createDone").scrollIntoView({ behavior: "smooth" });
  });

  redrawers.push(show);
}
