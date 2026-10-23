// Admin: approve or reject doctor/hospital registrations. The Admin menu button shows only for admins.
import { $, esc } from "../ui.js";
import { t } from "../i18n.js";
import { redrawers } from "../state.js";
import * as api from "../services/api.js";

let list = [];

function render() {
  $("adminList").innerHTML = list.length ? list.map(s => `
    <article class="entry">
      <div class="entry-top"><strong>${esc(s.name)}</strong><span class="tag">${t(s.role === "hospital" ? "role_hospital" : "role_doctor")}</span></div>
      <div class="muted">${esc(s.hospital)} ${esc(s.city)} · ${t("reg_no")}: ${esc(s.regNo)} · ${esc(s.email)}</div>
      <div class="actions" style="margin-top:10px">
        <button class="btn" type="button" data-uid="${esc(s.id)}" data-st="approved">${t("ad_approve")}</button>
        <button class="btn alt" type="button" data-uid="${esc(s.id)}" data-st="rejected">${t("ad_reject")}</button>
      </div>
    </article>`).join("") : `<p class="muted">${t("ad_none")}</p>`;
}

async function load() {
  try { list = await api.pendingStaff(); } catch (e) { console.error(e); list = []; }
  render();
}

export async function refreshAdmin(u) {
  let admin = false;
  try { admin = !!u && await api.isAdmin(); } catch (e) { console.error(e); }
  $("navAdmin").hidden = !admin;
  if (admin) await load(); else { list = []; render(); }
}

export function initAdmin() {
  $("adminList").addEventListener("click", async e => {
    const b = e.target.closest("button[data-uid]");
    if (!b) return;
    try { await api.setStaffStatus(b.dataset.uid, b.dataset.st); await load(); } catch (e2) { console.error(e2); }
  });
  redrawers.push(render);
}
