// Emergency lookup by phone number + date of birth (public page: shows the emergency summary only).
import { $, cardHTML, today } from "../ui.js";
import { t } from "../i18n.js";
import { redrawers } from "../state.js";
import * as api from "../services/api.js";

let result = null;

// Lock after 5 wrong tries. This runs in the browser, so it only slows honest mistakes;
// real protection against guessing needs server-side limits (noted in the report).
const lockedOut = () => { try { const f = JSON.parse(localStorage.getItem("ep_fail") || "{}"); return !!f.until && Date.now() < f.until; } catch (e) { return false; } };
function noteFail() { try { const f = JSON.parse(localStorage.getItem("ep_fail") || "{}"); f.n = (f.n || 0) + 1; if (f.n >= 5) { f.until = Date.now() + 300000; f.n = 0; } localStorage.setItem("ep_fail", JSON.stringify(f)); } catch (e) {} }
const clearFails = () => { try { localStorage.removeItem("ep_fail"); } catch (e) {} };

const render = () => { $("lookupResult").innerHTML = result ? cardHTML(result, false) : ""; };

export function initLookup() {
  $("ldob").max = today();
  $("lookupForm").addEventListener("submit", async e => {
    e.preventDefault();
    const phone = $("lphone").value.trim(), dob = $("ldob").value, err = $("lookupErr");
    err.textContent = ""; result = null; render();
    if (!/^\d{10}$/.test(phone) || !dob) { err.textContent = t("err_look"); return; }
    if (lockedOut()) { err.textContent = t("err_locked"); return; }
    try { result = await api.lookup(phone, dob); }
    catch (e2) { console.error(e2); err.textContent = t("err_net"); return; }
    if (result) clearFails(); else { noteFail(); err.textContent = t("not_found"); }
    render();
  });
  redrawers.push(render);
}
