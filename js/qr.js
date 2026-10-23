// QR code: the QR holds a link ending in #id=<passport id>. The data itself stays in the database.
import { t } from "./i18n.js";

export const linkFor = p => location.href.split("#")[0] + "#id=" + p.pid;

export function drawQR(p) {
  const box = document.getElementById("qrcode");
  if (!box) return;
  box.innerHTML = "";
  const link = linkFor(p), test = document.getElementById("testScan");
  if (test) test.href = link;
  try {
    new window.QRCode(box, { text: link, width: 168, height: 168, correctLevel: window.QRCode.CorrectLevel.L });
  } catch (e) {
    box.style.lineHeight = "1.4"; box.textContent = t("qr_fail");
  }
}

function downloadQR() {
  const src = document.querySelector("#qrcode canvas");
  if (!src) return;
  const pad = 16, c = document.createElement("canvas");   // white border helps scanners
  c.width = src.width + pad * 2; c.height = src.height + pad * 2;
  const x = c.getContext("2d");
  x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, pad, pad);
  const a = document.createElement("a");
  a.href = c.toDataURL("image/png"); a.download = "emergency-passport-qr.png"; a.click();
}

export function initQrActions() {   // buttons are drawn dynamically, so listen on the whole document
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    if (b.dataset.act === "dl") downloadQR();
    if (b.dataset.act === "print") window.print();
  });
}
