const $ = id => document.getElementById(id), video = $("video"), canvas = $("canvas"), clearBtn = $("clear"), results = $("results"), count = $("count"), toast = $("toast"), statusText = $("statusText");
let stream = null, track = null, detector = null, fallbackTimer = null, zoomTimer = null, scanning = true, nativeBusy = false, fallbackBusy = false;
const scanned = new Set(), duplicateAt = new Map(), INTERVAL = 220, MAX_WIDTH = 2200, DUP_COOLDOWN = 1400;

// ---------- Code 39 ----------
const CODE39 = { "0": "101001101101", "1": "110100101011", "2": "101100101011", "3": "110110010101", "4": "101001101011", "5": "110100110101", "6": "101100110101", "7": "101001011011", "8": "110100101101", "9": "101100101101", "A": "110101001011", "B": "101101001011", "C": "110110100101", "D": "101011001011", "E": "110101100101", "F": "101101100101", "G": "101010011011", "H": "110101001101", "I": "101101001101", "J": "101011001101", "K": "110101010011", "L": "101101010011", "M": "110110101001", "N": "101011010011", "O": "110101101001", "P": "101101101001", "Q": "101010110011", "R": "110101011001", "S": "101101011001", "T": "101011011001", "U": "110010101011", "V": "100110101011", "W": "110011010101", "X": "100101101011", "Y": "110010110101", "Z": "100110110101", "-": "100101011011", ".": "110010101101", " ": "100110101101", "$": "100100100101", "/": "100100101001", "+": "100101001001", "%": "101001001001", "*": "100101101101" };
const CODE39_ITEMS = Object.entries(CODE39).map(([char, bits]) => ({ char, widths: bits.match(/(.)\1*/g).map(x => x.length) }));

// ---------- UI ----------
function setStatus(text, active = true) { if (statusText) statusText.textContent = text; const dot = document.querySelector(".status i"); if (dot) dot.style.opacity = active ? "1" : ".35" }
function toastMsg(msg, error = false) { if (!toast) return; toast.textContent = msg; toast.classList.remove("show", "error"); toast.classList.add("show", ...(error ? ["error"] : [])); clearTimeout(toast._t); toast._t = setTimeout(() => toast.classList.remove("show", "error"), error ? 2000 : 1600) }
const showToast = msg => toastMsg(msg), showError = msg => toastMsg(msg, true);

async function copyValue(value, btn) {
    try { await navigator.clipboard.writeText(value) }
    catch { const t = document.createElement("textarea"); t.value = value; t.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove() }
    btn.textContent = "Copied"; showToast("Copied: " + value); setTimeout(() => btn.textContent = "Copy", 1200)
}

function addResult(value) {
    value = String(value || "").trim(); if (!value) return false;
    if (scanned.has(value)) { const now = Date.now(), last = duplicateAt.get(value) || 0; if (now - last >= DUP_COOLDOWN) { duplicateAt.set(value, now); showError("Already scanned: " + value); setStatus("Already scanned: " + value, false) } return false }
    scanned.add(value);
    if (results) { const item = document.createElement("div"), idx = document.createElement("span"), text = document.createElement("span"), btn = document.createElement("button"); item.className = "result"; idx.className = "result-index"; text.className = "result-value"; btn.className = "copy-btn"; btn.type = "button"; idx.textContent = scanned.size + "."; text.textContent = value; btn.textContent = "Copy"; btn.onclick = () => copyValue(value, btn); item.append(idx, text, btn); results.append(item) }
    if (count) count.textContent = scanned.size; showToast("Barcode scanned: " + value); setStatus("Scanning Code 39..."); return true
}

// ---------- Camera ----------
async function initCamera() {
    try {
        setStatus("Starting camera..."); if (!navigator.mediaDevices?.getUserMedia) return setStatus("Camera not supported", false);
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 2560 }, height: { ideal: 1440 }, focusMode: { ideal: "continuous" } }, audio: false });
        track = stream.getVideoTracks()[0] || null; const caps = track?.getCapabilities?.() || {}, advanced = {};["focusMode", "exposureMode", "whiteBalanceMode"].forEach(k => caps[k]?.includes("continuous") && (advanced[k] = "continuous"));
        if (Object.keys(advanced).length) await track.applyConstraints({ advanced: [advanced] }).catch(() => { });
        video.srcObject = stream; video.autoplay = video.muted = video.playsInline = true; await new Promise(r => video.readyState >= 1 ? r() : video.addEventListener("loadedmetadata", r, { once: true })); await video.play().catch(() => { });
        optimizeCameraReach(); zoomTimer = setTimeout(optimizeCameraReach, 1200); await initScanner();
    } catch (e) { setStatus(({ NotAllowedError: "Camera permission denied", NotFoundError: "No camera found", NotReadableError: "Camera is busy" })[e.name] || "Unable to open camera", false) }
}
async function optimizeCameraReach() { if (!track) return; const { min, max } = track.getCapabilities?.().zoom || {}; if (typeof min != "number" || typeof max != "number") return; await track.applyConstraints({ advanced: [{ zoom: max <= min ? min : Math.min(max, min + 1.2) }] }).catch(() => { }) }

// ---------- Scanner ----------
async function getSupportedFormats() { return "BarcodeDetector" in window && BarcodeDetector.getSupportedFormats ? BarcodeDetector.getSupportedFormats().catch(() => []) : [] }
async function initScanner() { if ((await getSupportedFormats()).includes("code_39")) try { detector = new BarcodeDetector({ formats: ["code_39"] }); requestNativeScan() } catch { } else setStatus("Scanning Code 39..."); startFallbackScanner() }
function requestNativeScan() { if (!scanning || !detector || nativeBusy) return; nativeBusy = true; detector.detect(video).then(c => c?.forEach(x => x.rawValue && addResult(x.rawValue))).catch(() => { }).finally(() => { nativeBusy = false; if (scanning) requestAnimationFrame(requestNativeScan) }) }
const startFallbackScanner = () => { stopFallbackScanner(); fallbackTimer = setInterval(scanFallback, INTERVAL) }, stopFallbackScanner = () => { if (fallbackTimer) clearInterval(fallbackTimer), fallbackTimer = null };
function scanFallback() { if (!scanning || fallbackBusy || !video.videoWidth || !video.videoHeight) return; fallbackBusy = true; try { const value = decodeImage(); if (value) addResult(value) } finally { fallbackBusy = false } }

// ---------- Code 39 Decoder ----------
function getGrayRow(ctx, w, y) { const d = ctx.getImageData(0, y, w, 1).data, g = new Uint8Array(w); for (let x = 0; x < w; x++)g[x] = (d[x * 4] * .299 + d[x * 4 + 1] * .587 + d[x * 4 + 2] * .114) | 0; return g }
function makeBinaryRow(gray, offset = 0) { let min = 255, max = 0; for (const v of gray) { if (v < min) min = v; if (v > max) max = v } if (max - min < 25) return null; const t = Math.max(min + 5, Math.min(max - 5, min + (max - min) * .48 + offset)); return Uint8Array.from(gray, v => v < t ? 1 : 0) }
function getRuns(row) { if (!row?.length) return []; const runs = []; let color = row[0], width = 1; for (let i = 1; i < row.length; i++)row[i] === color ? width++ : (runs.push({ color, width }), color = row[i], width = 1); runs.push({ color, width }); return runs }
function trimWhiteRuns(r) { let a = 0, b = r.length - 1; while (a <= b && !r[a].color) a++; while (b >= a && !r[b].color) b--; return r.slice(a, b + 1) }
function code39CharError(r, expected) { if (r.length !== 9 || r[0].color !== 1) return Infinity; const w = r.map(x => x.width), wide = new Set(w.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(x => x[1])), n = w.filter((_, i) => !wide.has(i)), z = w.filter((_, i) => wide.has(i)); if (!n.length || !z.length) return Infinity; const na = n.reduce((a, b) => a + b) / n.length, za = z.reduce((a, b) => a + b) / z.length, ratio = za / (na || 1); if (!na || ratio < 1.45) return Infinity; let e = 0; for (let i = 0; i < 9; i++)if ((expected[i] === 2) !== wide.has(i)) e++; return e * .35 + Math.abs(ratio - 2.5) / 2.5 * .65 }
function decodeCode39(runs) {
    runs = trimWhiteRuns(runs); if (runs.length < 19) return null; const chars = []; let pos = 0;
    while (pos + 9 <= runs.length) { const part = runs.slice(pos, pos + 9); if (part[0].color !== 1) return null; let best = null, error = Infinity; for (const item of CODE39_ITEMS) { const e = code39CharError(part, item.widths); if (e < error) error = e, best = item } if (!best || error > .55) return null; chars.push(best.char); pos += 9; if (pos >= runs.length) break; if (runs[pos].color !== 0 || runs[pos].width > Math.min(...part.map(x => x.width)) * 2.5) return null; pos++ }
    return pos === runs.length && chars.length >= 3 && chars[0] === "*" && chars.at(-1) === "*" ? (chars.slice(1, -1).join("") || null) : null
}
function tryDecodeRow(gray) { for (const o of [0, -10, 10]) { const b = makeBinaryRow(gray, o); if (!b) continue; let v = decodeCode39(getRuns(b)); if (v) return v; v = decodeCode39(getRuns(b.slice().reverse())); if (v) return v } return null }
function scanRows(ctx, w, h, ratios) { for (const r of ratios) { const v = tryDecodeRow(getGrayRow(ctx, w, Math.min(h - 1, Math.max(0, Math.round(h * r))))); if (v) return v } return null }

// ---------- Image Scan ----------
function decodeImage() {
    const w = video.videoWidth, h = video.videoHeight; if (!w || !h) return null; const scale = Math.min(1, MAX_WIDTH / w), sw = Math.max(1, Math.round(w * scale)), sh = Math.max(1, Math.round(h * scale)); canvas.width = sw; canvas.height = sh;
    const ctx = canvas.getContext("2d", { willReadFrequently: true }); if (!ctx) return null; ctx.imageSmoothingEnabled = false; ctx.drawImage(video, 0, 0, sw, sh);
    const rows = [.1, .15, .2, .25, .3, .35, .4, .44, .47, .5, .53, .56, .6, .65, .7, .75, .8, .85, .9], value = scanRows(ctx, sw, sh, rows); if (value) return value;
    for (const ratio of [.95, .85, .75, .65, .55]) { const cw = Math.max(240, Math.round(sw * ratio)), cx = Math.max(0, Math.round((sw - cw) / 2)), zw = Math.min(MAX_WIDTH, cw * 2), zh = Math.max(1, Math.round(sh * 2)), crop = document.createElement("canvas"); crop.width = zw; crop.height = zh; const c = crop.getContext("2d", { willReadFrequently: true }); if (!c) continue; c.imageSmoothingEnabled = false; c.drawImage(canvas, cx, 0, cw, sh, 0, 0, zw, zh); const v = scanRows(c, zw, zh, [.15, .22, .3, .38, .45, .5, .55, .62, .7, .78, .85]); if (v) return v }
    return null
}

clearBtn?.addEventListener("click", () => { scanned.clear(); duplicateAt.clear(); if (results) results.innerHTML = ""; if (count) count.textContent = "0"; setStatus("Scanning Code 39..."); showToast("Results cleared") });
window.addEventListener("beforeunload", () => { scanning = false; stopFallbackScanner(); clearTimeout(zoomTimer); stream?.getTracks().forEach(t => t.stop()); stream = null; track = null });
initCamera();