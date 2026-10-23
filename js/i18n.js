import en from "./lang/en.js";
import hi from "./lang/hi.js";
import { state, redrawers } from "./state.js";

export const T = { en, hi };
export const t = key => (T[state.lang] && T[state.lang][key]) ?? key;

export function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  document.querySelectorAll("[data-lang]").forEach(b => b.setAttribute("aria-pressed", b.dataset.lang === state.lang));
  redrawers.forEach(fn => fn());
}

export function initLang() {
  document.querySelectorAll("[data-lang]").forEach(b => b.addEventListener("click", () => {
    state.lang = b.dataset.lang;
    try { localStorage.setItem("ep_lang", state.lang); } catch (e) {}
    applyLang();
  }));
  applyLang();
}
