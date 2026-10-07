// Tiny SVG chart helpers for synthetic dashboards.
function svgEl(w, h) { const s = document.createElementNS("http://www.w3.org/2000/svg", "svg"); s.setAttribute("width", w); s.setAttribute("height", h); s.setAttribute("direction", "ltr"); s.style.direction = "ltr"; return s; }
function add(s, tag, attrs, text) { const e = document.createElementNS("http://www.w3.org/2000/svg", tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (text !== undefined) e.textContent = text; s.appendChild(e); return e; }
function bars(id, labels, values, o = {}) {
  const host = document.getElementById(id); const w = host.clientWidth, h = o.h || 200, pad = 28, max = o.max || Math.max(...values) * 1.15;
  const s = svgEl(w, h); const bw = (w - pad) / values.length;
  for (let g = 0; g <= 4; g++) { const y = h - pad - (h - pad - 8) * g / 4; add(s, "line", { x1: pad, x2: w, y1: y, y2: y, stroke: "#eef0f3" }); add(s, "text", { x: 0, y: y + 4 }, o.fmt ? o.fmt(max * g / 4) : Math.round(max * g / 4)); }
  values.forEach((v, i) => {
    const bh = (h - pad - 8) * v / max, x = pad + i * bw + bw * 0.18;
    add(s, "rect", { x, y: h - pad - bh, width: bw * 0.64, height: bh, fill: (o.colors && o.colors[i]) || o.color || "#3b6fe0", rx: 2 });
    if (o.labelValues) add(s, "text", { x: x + bw * 0.32, y: h - pad - bh - 4, "text-anchor": "middle", style: "fill:#18202b;font-size:11px" }, o.fmt ? o.fmt(v) : v);
    add(s, "text", { x: x + bw * 0.32, y: h - 10, "text-anchor": "middle" }, labels[i]);
  });
  host.appendChild(s);
}
function lines(id, labels, series, o = {}) {
  const host = document.getElementById(id); const w = host.clientWidth, h = o.h || 200, pad = 34;
  const all = series.flatMap((x) => x.values); const max = o.max || Math.max(...all) * 1.1, min = o.min ?? 0;
  const s = svgEl(w, h); const sx = (i) => pad + (w - pad - 8) * i / (labels.length - 1), sy = (v) => h - 22 - (h - 30) * (v - min) / (max - min);
  for (let g = 0; g <= 4; g++) { const v = min + (max - min) * g / 4; add(s, "line", { x1: pad, x2: w, y1: sy(v), y2: sy(v), stroke: "#eef0f3" }); add(s, "text", { x: 0, y: sy(v) + 4 }, o.fmt ? o.fmt(v) : Math.round(v)); }
  labels.forEach((l, i) => { if (i % (o.every || 1) === 0) add(s, "text", { x: sx(i), y: h - 6, "text-anchor": "middle" }, l); });
  series.forEach((ser) => {
    add(s, "polyline", { points: ser.values.map((v, i) => `${sx(i)},${sy(v)}`).join(" "), fill: "none", stroke: ser.color, "stroke-width": 2.5, "stroke-dasharray": ser.dash || "" });
    if (ser.label) add(s, "text", { x: sx(ser.values.length - 1) - 4, y: sy(ser.values[ser.values.length - 1]) - 8, "text-anchor": "end", style: `fill:${ser.color};font-size:12px` }, ser.label);
  });
  host.appendChild(s);
}
