// Click ripple for every <button> (delegated, so buttons added later work automatically).
// Also cancels the hover "pop" once a button is clicked, until the mouse leaves it (class .clicked).
// Styling lives in css/style.css (.ripple, button.clicked).
let last = null; // where the last click happened, so a button re-created under the cursor stays "clicked"
const near = (e, p) => p && Math.hypot(e.clientX - p.x, e.clientY - p.y) < 4;

export function wireRipple() {
  document.addEventListener("pointerdown", e => {
    const b = e.target.closest && e.target.closest("button");
    if (!b || b.disabled) return;
    last = { x: e.clientX, y: e.clientY };
    b.classList.add("clicked");
    const r = b.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const dot = document.createElement("span");
    dot.className = "ripple";
    dot.style.width = dot.style.height = size + "px";
    dot.style.left = (e.clientX - r.left - size / 2) + "px";
    dot.style.top = (e.clientY - r.top - size / 2) + "px";
    b.appendChild(dot);
    dot.addEventListener("animationend", () => dot.remove());
  });
  document.addEventListener("pointermove", e => { if (last && !near(e, last)) last = null; });
  document.addEventListener("pointerover", e => { // a button was rebuilt under the cursor right after a click
    const b = e.target.closest && e.target.closest("button");
    if (b && near(e, last)) b.classList.add("clicked");
  });
  document.addEventListener("pointerout", e => {
    const b = e.target.closest && e.target.closest("button");
    if (b && !b.contains(e.relatedTarget)) b.classList.remove("clicked");
  });
}
