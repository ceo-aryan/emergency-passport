// Entry point: connects the features together. Each feature lives in js/features/.
import { initLang } from "./i18n.js";
import { go } from "./ui.js";
import { initQrActions } from "./qr.js";
import * as api from "./services/api.js";
import { initPatient, refreshPatient } from "./features/patient.js";
import { initLookup } from "./features/lookup.js";
import { openFromHash } from "./features/scan.js";
import { initStaff, refreshStaff } from "./features/staff.js";
import { initAdmin, refreshAdmin } from "./features/admin.js";
import { initDonors, refreshDonors } from "./features/donors.js";

document.querySelectorAll("[data-go]").forEach(b => b.addEventListener("click", () => go(b.dataset.go)));
initQrActions();
initPatient(); initLookup(); initStaff(); initAdmin(); initDonors();
initLang();                      // applies the saved language and draws all text
go("home");
openFromHash();                  // if the page was opened from a scanned QR link
window.addEventListener("hashchange", openFromHash);

api.onAuth(u => { refreshPatient(u); refreshStaff(u); refreshAdmin(u); refreshDonors(u); });   // runs at start and on every login/logout
