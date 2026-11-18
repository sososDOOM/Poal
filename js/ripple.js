// Click ripple for every <button> (delegated, so buttons added later work automatically).
// Styling lives in css/style.css (.ripple).
export function wireRipple() {
  document.addEventListener("pointerdown", e => {
    const b = e.target.closest && e.target.closest("button");
    if (!b || b.disabled) return;
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
}
