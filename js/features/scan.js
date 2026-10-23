// Page opened by scanning a QR: shows the emergency summary for the ID at the end of the link.
import { $, go, cardHTML } from "../ui.js";
import { t } from "../i18n.js";
import { redrawers } from "../state.js";
import * as api from "../services/api.js";

let shown = null;
const render = () => { if (shown) $("scanResult").innerHTML = cardHTML(shown, false); };
redrawers.push(render);

export async function openFromHash() {
  const m = location.hash.match(/^#id=([0-9a-f]{8,64})$/);
  if (!m) return;
  go("scan");
  $("scanResult").innerHTML = `<p class="muted">${t("loading")}</p>`;
  shown = null;
  try { shown = await api.getEmergency(m[1]); } catch (e) { console.error(e); }
  if (shown) render(); else $("scanResult").innerHTML = `<p class="err">${t("scan_bad")}</p>`;
}
