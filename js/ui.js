// Small helpers shared by every feature: DOM shortcut, escaping, page switching, and the HTML for cards/lists.
import { t } from "./i18n.js";
import { state } from "./state.js";

export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const today = () => new Date().toISOString().split("T")[0];
export const fmtTime = ts => (ts && ts.toDate ? ts.toDate().toLocaleString(state.lang === "hi" ? "hi-IN" : "en-IN") : "");

export function go(id) {
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("on", v.id === id));
  document.querySelectorAll("nav button").forEach(b => {
    if (b.dataset.go === id) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  window.scrollTo(0, 0);
}

export function ageOf(p) {
  const d = p.dob || (p.yob + "-07-01");
  return Math.floor((Date.now() - new Date(d)) / 31557600000);
}

export function cardHTML(p, withQr) {
  const v = x => esc(x || t("none"));
  return `
  <div class="pass">
    <div class="pass-top"><span aria-hidden="true">+</span><span>${t("card_head")}</span></div>
    <div class="pass-body">
      <div class="id-row">
        <div><strong style="font-size:1.2rem">${esc(p.name)}</strong><br>
          <span class="muted">${ageOf(p)} ${t("age")}</span></div>
        <div class="blood"><small>${t("r_blood")}</small>${esc(p.blood)}</div>
      </div>
      <dl class="rows">
        <div><dt>${t("r_allergy")}</dt><dd>${v(p.allergy)}</dd></div>
        <div><dt>${t("r_cond")}</dt><dd>${v(p.cond)}</dd></div>
        <div><dt>${t("r_meds")}</dt><dd>${v(p.meds)}</dd></div>
        ${p.cname ? `<div><dt>${t("r_contact")}</dt><dd class="call">
          <span>${esc(p.cname)}${p.crel ? " (" + esc(p.crel) + ")" : ""}</span>
          ${p.cphone ? `<a class="btn" href="tel:${esc(p.cphone)}">${t("call")}</a>` : ""}</dd></div>` : ""}
      </dl>
      ${withQr ? `<div class="qrbox"><div id="qrcode"></div><div>
        <p class="muted" style="margin:0 0 10px">${t("qr_help")}</p>
        <div class="actions no-print">
          <button class="btn" type="button" data-act="dl">${t("btn_dl")}</button>
          <button class="btn alt" type="button" data-act="print">${t("btn_print")}</button>
          <a class="btn alt" id="testScan" target="_blank" rel="noopener">${t("btn_test")}</a>
        </div></div></div>` : ""}
    </div>
  </div>`;
}

export function historyHTML(items) {
  if (!items.length) return `<p class="muted">${t("h_empty")}</p>`;
  return items.map(e => `
    <article class="entry">
      <div class="entry-top"><strong>${esc(e.title)}</strong><span class="tag">${t("ty_" + e.type)}</span></div>
      <div class="muted">${esc(e.visitDate)} · ${esc(e.doctorName)}${e.hospital ? ", " + esc(e.hospital) : ""}</div>
      ${e.details ? `<p>${esc(e.details)}</p>` : ""}
      ${e.meds ? `<p><strong>${t("h_meds")}:</strong> ${esc(e.meds)}</p>` : ""}
    </article>`).join("");
}
