// Shared app state. Features register a "redrawer" so their dynamic content is redrawn when the language changes.
let saved = "en";
try { saved = localStorage.getItem("ep_lang") || "en"; } catch (e) {}

export const state = { lang: saved };
export const redrawers = [];
