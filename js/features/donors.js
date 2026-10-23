
// Blood donor finder: logged-in users can register as donors and search by blood group + city.
import { $, esc, today } from "../ui.js";
import { t } from "../i18n.js";
import { redrawers } from "../state.js";
import * as api from "../services/api.js";

// Recipient group -> donor groups that can safely give to them
const CAN_RECEIVE = {
  "O-": ["O-"], "O+": ["O+", "O-"], "A-": ["A-", "O-"], "A+": ["A+", "A-", "O+", "O-"],
  "B-": ["B-", "O-"], "B+": ["B+", "B-", "O+", "O-"], "AB-": ["AB-", "A-", "B-", "O-"],
  "AB+": ["AB+", "AB-", "A+", "A-", "B+", "B-", "O+", "O-"]
};
const COOLDOWN_DAYS = 90;   // general guideline: hide people who donated very recently
const daysSince = d => (Date.now() - new Date(d)) / 86400000;
let passport = null, donor = null, results = null, statusKey = "";

function renderResults() {
  $("donorResults").innerHTML = !results ? "" : results.length ? results.map(d => `
    <article class="entry">
      <div class="entry-top"><strong>${esc(d.name)}</strong><span class="tag">${esc(d.bloodGroup)}</span></div>
      <div class="muted">${esc(d.area)} ${esc(d.city)}${d.lastDonation ? " · " + t("d_last") + ": " + esc(d.lastDonation) : ""}</div>
      <div class="actions" style="margin-top:10px"><a class="btn" href="tel:${esc(d.phone)}">${t("call")}</a></div>
    </article>`).join("") : `<p class="muted">${t("d_none")}</p>`;
}
function renderStatus() {
  $("donorStatus").textContent = statusKey ? t(statusKey) : "";
  $("donorRemove").hidden = !donor;
}

export async function refreshDonors(u) {
  passport = null; donor = null; results = null; statusKey = "";
  $("donorLoginMsg").hidden = !!u; $("donorApp").hidden = !u;
  if (u) {
    try { [passport, donor] = await Promise.all([api.myPassport(), api.myDonor()]); } catch (e) { console.error(e); }
    if (donor) {
      $("dcity").value = donor.city || ""; $("darea").value = donor.area || ""; $("dlast").value = donor.lastDonation || "";
      $("davail").checked = donor.available !== false; $("dconsent").checked = true; statusKey = "d_active";
    }
  }
  renderResults(); renderStatus();
}

export function initDonors() {
  $("dlast").max = today();

  $("findDonorForm").addEventListener("submit", async e => {
    e.preventDefault();
    const blood = $("nblood").value, city = $("ncity").value.trim(), err = $("findDErr");
    err.textContent = ""; results = null; renderResults();
    if (!blood || !city) { err.textContent = t("err_need"); return; }
    try {
      const all = await api.findDonors(city.toLowerCase());
      results = all
        .filter(d => CAN_RECEIVE[blood].includes(d.bloodGroup) && (!d.lastDonation || daysSince(d.lastDonation) >= COOLDOWN_DAYS))
        .sort((a, b) => (a.bloodGroup === blood ? 0 : 1) - (b.bloodGroup === blood ? 0 : 1));   // exact match first
    } catch (e2) { console.error(e2); err.textContent = t("err_net"); return; }
    renderResults();
  });

  $("donorForm").addEventListener("submit", async e => {
    e.preventDefault();
    const city = $("dcity").value.trim(), err = $("donorErr");
    err.textContent = "";
    if (!passport) { err.textContent = t("err_nopass"); return; }
    if (!city) { err.textContent = t("err_city"); return; }
    if (!$("dconsent").checked) { err.textContent = t("err_dconsent"); return; }
    const d = { name: passport.name, phone: passport.phone, bloodGroup: passport.blood, city, cityKey: city.toLowerCase(),
                area: $("darea").value.trim(), available: $("davail").checked, lastDonation: $("dlast").value };
    try { await api.saveDonor(d); donor = d; statusKey = "d_active"; }
    catch (e2) { console.error(e2); err.textContent = t("err_save"); return; }
    renderStatus();
  });

  $("donorRemove").addEventListener("click", async () => {
    try { await api.removeDonor(); donor = null; statusKey = ""; $("donorForm").reset(); renderStatus(); }
    catch (e) { console.error(e); $("donorErr").textContent = t("err_save"); }
  });

  redrawers.push(() => { renderResults(); renderStatus(); });
}
