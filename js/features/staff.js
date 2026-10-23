// Doctor / hospital portal: register, log in (after admin approval), find a patient,
// unlock their history with the patient's code, read and add records.
import { $, esc, cardHTML, historyHTML, today } from "../ui.js";
import { t } from "../i18n.js";
import { redrawers } from "../state.js";
import * as api from "../services/api.js";
import { doAuth } from "./patient.js";

const TYPES = ["visit", "lab", "rx", "surgery", "vaccine", "other"];
let me = null, msgKey = "";
const S = { p: null, unlocked: false, items: [] };   // the patient currently open

function setMsg(key) {
  msgKey = key;
  $("staffMsg").hidden = !key;
  $("staffMsg").textContent = key ? t(key) : "";
}

export async function refreshStaff(u) {
  me = null; S.p = null; S.unlocked = false; S.items = [];
  $("staffAuth").hidden = !!u; $("staffBar").hidden = !u; $("staffApp").hidden = true;
  $("patientBox").innerHTML = ""; setMsg("");
  if (!u) return;
  $("staffWho").textContent = u.email;
  try { me = await api.myStaff(); } catch (e) { console.error(e); }
  if (!me) setMsg("st_notstaff");
  else if (me.status === "pending") setMsg("st_pending");
  else if (me.status === "rejected") setMsg("st_rejected");
  else $("staffApp").hidden = false;
}

function renderPatient() {
  const box = $("patientBox");
  if (!S.p) { box.innerHTML = ""; return; }
  let html = cardHTML(S.p, false);
  if (!S.unlocked) {
    html += `<form id="unlockForm" class="stack" novalidate>
      <h3 style="margin:0">${t("un_title")}</h3><p class="muted" style="margin:0">${t("un_note")}</p>
      <label><span>${t("un_code")}</span><input id="ucode" inputmode="numeric" maxlength="6" autocomplete="off"></label>
      <p id="unlockErr" class="err" role="alert"></p>
      <button class="btn" type="submit">${t("un_btn")}</button></form>`;
    html += `<details class="emerg"><summary>${t("em_title")}</summary>
      <form id="emForm" class="stack" novalidate><p class="muted" style="margin:0">${t("em_note")}</p>
      <label><span>${t("em_reason")}</span><textarea id="emReason"></textarea></label>
      <label class="check"><input id="emOk" type="checkbox"><span>${t("em_confirm")}</span></label>
      <p id="emErr" class="err" role="alert"></p>
      <button class="btn" type="submit">${t("em_btn")}</button></form></details>`;
  } else {
    html += `<h3>${t("hist_title")}</h3>${historyHTML(S.items)}
      <form id="entryForm" class="stack" novalidate><h3 style="margin:0">${t("en_title")}</h3>
      <div class="two">
        <label><span>${t("en_type")}</span><select id="etype">${TYPES.map(k => `<option value="${k}">${t("ty_" + k)}</option>`).join("")}</select></label>
        <label><span>${t("en_date")}</span><input id="edate" type="date" max="${today()}" value="${today()}"></label>
      </div>
      <label><span>${t("en_name")}</span><input id="etitle"></label>
      <label><span>${t("en_details")}</span><textarea id="edetails"></textarea></label>
      <label><span>${t("en_meds")}</span><textarea id="emeds"></textarea></label>
      <p id="entryErr" class="err" role="alert"></p>
      <button class="btn" type="submit">${t("en_btn")}</button></form>`;
  }
  box.innerHTML = html;
  if ($("unlockForm")) $("unlockForm").addEventListener("submit", onUnlock);
  if ($("emForm")) $("emForm").addEventListener("submit", onEmergency);
  if ($("entryForm")) $("entryForm").addEventListener("submit", onAdd);
}

async function onUnlock(e) {
  e.preventDefault();
  const code = $("ucode").value.trim(), err = $("unlockErr");
  if (!/^\d{6}$/.test(code)) { err.textContent = t("err_code"); return; }
  try {
    await api.unlock(S.p.ownerUid, code, me);
    S.items = await api.historyOf(S.p.ownerUid);
    S.unlocked = true; renderPatient();
  } catch (e2) { console.error(e2); err.textContent = t("err_unlock"); }
}

async function onEmergency(e) {   // break-glass: no code, but a reason is required and the patient sees it in their log
  e.preventDefault();
  const reason = $("emReason").value.trim(), err = $("emErr");
  if (reason.length < 10 || !$("emOk").checked) { err.textContent = t("err_em"); return; }
  try {
    await api.emergencyUnlock(S.p.ownerUid, reason, me);
    S.items = await api.historyOf(S.p.ownerUid);
    S.unlocked = true; renderPatient();
  } catch (e2) { console.error(e2); err.textContent = t("err_em_denied"); }
}

async function onAdd(e) {
  e.preventDefault();
  const v = id => $(id).value.trim(), err = $("entryErr");
  const entry = { type: v("etype"), visitDate: v("edate"), title: v("etitle"), details: v("edetails"), meds: v("emeds") };
  if (!entry.title) { err.textContent = t("err_title"); return; }
  try {
    await api.addEntry(S.p.ownerUid, entry, me);
    S.items = await api.historyOf(S.p.ownerUid); renderPatient();
  } catch (e2) { console.error(e2); err.textContent = t("err_denied"); }
}

export function initStaff() {
  $("fdob").max = today();
  $("sLogin").addEventListener("click", () => doAuth("login", $("semail").value.trim(), $("spass").value, $("sErr")));
  $("sShowReg").addEventListener("click", () => { $("regForm").hidden = !$("regForm").hidden; });
  $("sLogout").addEventListener("click", () => api.logout());

  $("regForm").addEventListener("submit", async e => {
    e.preventDefault();
    const v = id => $(id).value.trim(), err = $("rErr");
    const profile = { role: v("rrole"), name: v("rname"), regNo: v("rreg"), city: v("rcity"), hospital: v("rhosp") };
    if (!profile.name || !profile.regNo || !profile.city) { err.textContent = t("err_reg"); return; }
    if (!/^\S+@\S+\.\S+$/.test(v("remail"))) { err.textContent = t("err_email"); return; }
    err.textContent = "";
    try { await api.registerStaff(v("remail"), $("rpass").value, profile); }
    catch (e2) { console.error(e2); err.textContent = (e2.code || "").includes("email-already") ? t("err_exists") : (e2.code || "").includes("weak") ? t("err_weak") : t("err_save"); }
  });

  $("findForm").addEventListener("submit", async e => {
    e.preventDefault();
    const phone = $("fphone").value.trim(), dob = $("fdob").value, err = $("findErr");
    err.textContent = ""; S.p = null; S.unlocked = false; renderPatient();
    if (!/^\d{10}$/.test(phone) || !dob) { err.textContent = t("err_look"); return; }
    try { S.p = await api.lookup(phone, dob); } catch (e2) { console.error(e2); err.textContent = t("err_net"); return; }
    if (!S.p) err.textContent = t("not_found");
    renderPatient();
  });

  redrawers.push(() => { setMsg(msgKey); renderPatient(); });
}
