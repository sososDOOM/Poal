// Tiny shared helpers.
export const $ = id => document.getElementById(id);
export const rand = a => a[Math.floor(Math.random() * a.length)];
export const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
