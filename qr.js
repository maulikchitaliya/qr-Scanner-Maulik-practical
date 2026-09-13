const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const clearBtn = document.getElementById("clear");
const results = document.getElementById("results");
const count = document.getElementById("count");
const toast = document.getElementById("toast");
const statusText = document.getElementById("statusText");

let stream = null;
let cameraTrack = null;
let detector = null;
let scanning = true;
let fallbackTimer = null;
let fallbackBusy = false;
let nativeBusy = false;
let zoomTimer = null;

const scannedValues = new Set();
const duplicateNoticeAt = new Map();

const FALLBACK_INTERVAL = 220;
const MAX_WIDTH = 2200;
const DUPLICATE_NOTICE_COOLDOWN = 1400;

const CODE39 = {
    "0":"101001101101","1":"110100101011","2":"101100101011","3":"110110010101",
    "4":"101001101011","5":"110100110101","6":"101100110101","7":"101001011011",
    "8":"110100101101","9":"101100101101","A":"110101001011","B":"101101001011",
    "C":"110110100101","D":"101011001011","E":"110101100101","F":"101101100101",
    "G":"101010011011","H":"110101001101","I":"101101001101","J":"101011001101",
    "K":"110101010011","L":"101101010011","M":"110110101001","N":"101011010011",
    "O":"110101101001","P":"101101101001","Q":"101010110011","R":"110101011001",
    "S":"101101011001","T":"101011011001","U":"110010101011","V":"100110101011",
    "W":"110011010101","X":"100101101011","Y":"110010110101","Z":"100110110101",
    "-":"100101011011",".":"110010101101"," ":"100110101101","$":"100100100101",
    "/":"100100101001","+":"100101001001","%":"101001001001","*":"100101101101"
};

const CODE39_ITEMS = Object.entries(CODE39).map(([char, bits]) => ({
    char,
    bits,
    widths: bitsToWidths(bits)
}));

function bitsToWidths(bits) {
    const widths = [];
    let current = bits[0];
    let width = 1;

    for (let i = 1; i < bits.length; i++) {
        if (bits[i] === current) {
            width++;
        } else {
            widths.push(width);
            current = bits[i];
            width = 1;
        }
    }

    widths.push(width);
    return widths;
}

function setStatus(text, active = true) {
    if (statusText) {
        statusText.textContent = text;
    }

    const dot = document.querySelector(".status i");

    if (dot) {
        dot.style.opacity = active ? "1" : "0.35";
    }
}

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("error");
    toast.classList.add("show");

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 1600);
}

function showErrorToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.remove("show");
    toast.classList.add("error", "show");

    clearTimeout(showErrorToast.timer);

    showErrorToast.timer = setTimeout(() => {
        toast.classList.remove("show", "error");
    }, 2000);
}

async function copyValue(value, button) {
    try {
        await navigator.clipboard.writeText(value);

        button.textContent = "Copied";
        showToast("Copied: " + value);

        setTimeout(() => {
            button.textContent = "Copy";
        }, 1200);

    } catch (error) {
        const temp = document.createElement("textarea");

        temp.value = value;
        temp.style.position = "fixed";
        temp.style.opacity = "0";

        document.body.appendChild(temp);

        temp.focus();
        temp.select();

        try {
            document.execCommand("copy");

            button.textContent = "Copied";
            showToast("Copied: " + value);

            setTimeout(() => {
                button.textContent = "Copy";
            }, 1200);

        } catch (_) {
            showErrorToast("Copy failed");
        }

        document.body.removeChild(temp);
    }
}

function addResult(value) {
    if (!value) return false;

    value = String(value).trim();

    if (!value) return false;

    if (scannedValues.has(value)) {
        const now = Date.now();
        const lastNotice = duplicateNoticeAt.get(value) || 0;

        if (now - lastNotice >= DUPLICATE_NOTICE_COOLDOWN) {
            duplicateNoticeAt.set(value, now);
            showErrorToast("Already scanned: " + value);
            setStatus("Already scanned: " + value, false);
        }

        return false;
    }

    scannedValues.add(value);

    if (results) {
        const item = document.createElement("div");
        item.className = "result";

        const index = document.createElement("span");
        index.className = "result-index";
        index.textContent = scannedValues.size + ".";

        const text = document.createElement("span");
        text.className = "result-value";
        text.textContent = value;

        const copyButton = document.createElement("button");
        copyButton.type = "button";
        copyButton.className = "copy-btn";
        copyButton.textContent = "Copy";

        copyButton.addEventListener("click", () => {
            copyValue(value, copyButton);
        });

        item.appendChild(index);
        item.appendChild(text);
        item.appendChild(copyButton);

        results.appendChild(item);
    }

    if (count) {
        count.textContent = String(scannedValues.size);
    }

    showToast("Barcode scanned: " + value);
    setStatus("Scanning Code 39...", true);

    return true;
}

async function initCamera() {
    try {
        setStatus("Starting camera...");

        if (!navigator.mediaDevices?.getUserMedia) {
            setStatus("Camera not supported", false);
            return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {
                    ideal: "environment"
                },
                width: {
                    ideal: 2560
                },
                height: {
                    ideal: 1440
                },
                focusMode: {
                    ideal: "continuous"
                }
            },
            audio: false
        });

        cameraTrack = stream.getVideoTracks()[0] || null;

        try {
            const capabilities = cameraTrack?.getCapabilities?.() || {};

            if (capabilities.focusMode?.includes("continuous")) {
                await cameraTrack.applyConstraints({
                    advanced: [{
                        focusMode: "continuous"
                    }]
                });
            }
        } catch (_) {}

        try {
            const capabilities = cameraTrack?.getCapabilities?.() || {};
            const advanced = {};

            if (capabilities.exposureMode?.includes("continuous")) {
                advanced.exposureMode = "continuous";
            }

            if (capabilities.whiteBalanceMode?.includes("continuous")) {
                advanced.whiteBalanceMode = "continuous";
            }

            if (Object.keys(advanced).length) {
                await cameraTrack.applyConstraints({
                    advanced: [advanced]
                });
            }
        } catch (_) {}

        video.srcObject = stream;
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;

        await new Promise(resolve => {
            if (video.readyState >= 1) {
                resolve();
            } else {
                video.addEventListener("loadedmetadata", resolve, {
                    once: true
                });
            }
        });

        try {
            await video.play();
        } catch (_) {}

        optimizeCameraReach();

        clearTimeout(zoomTimer);

        zoomTimer = setTimeout(() => {
            optimizeCameraReach();
        }, 1200);

        setStatus("Scanning Code 39...");
        await initScanner();

    } catch (error) {
        console.error("Camera error:", error);

        if (error.name === "NotAllowedError") {
            setStatus("Camera permission denied", false);
        } else if (error.name === "NotFoundError") {
            setStatus("No camera found", false);
        } else if (error.name === "NotReadableError") {
            setStatus("Camera is busy", false);
        } else {
            setStatus("Unable to open camera", false);
        }
    }
}

async function optimizeCameraReach() {
    if (!cameraTrack) return;

    try {
        const capabilities = cameraTrack.getCapabilities?.() || {};

        if (
            typeof capabilities.zoom?.min === "number" &&
            typeof capabilities.zoom?.max === "number"
        ) {
            const min = capabilities.zoom.min;
            const max = capabilities.zoom.max;

            let zoom = Math.min(max, Math.max(min, min + 1.2));

            if (max <= min) {
                zoom = min;
            }

            await cameraTrack.applyConstraints({
                advanced: [{
                    zoom
                }]
            });
        }
    } catch (_) {}
}

async function getSupportedFormats() {
    if (!("BarcodeDetector" in window)) {
        return [];
    }

    if (typeof BarcodeDetector.getSupportedFormats !== "function") {
        return [];
    }

    try {
        return await BarcodeDetector.getSupportedFormats();
    } catch (_) {
        return [];
    }
}

async function initScanner() {
    const formats = await getSupportedFormats();

    if (formats.includes("code_39")) {
        try {
            detector = new BarcodeDetector({
                formats: ["code_39"]
            });

            setStatus("Scanning Code 39...");
            requestNativeScan();

        } catch (error) {
            console.warn("Native Code 39 failed:", error);
            detector = null;
        }
    } else {
        setStatus("Scanning Code 39 (fallback)...");
    }

    startFallbackScanner();
}

function requestNativeScan() {
    if (!scanning || !detector || nativeBusy) {
        return;
    }

    nativeBusy = true;

    detector.detect(video)
        .then(barcodes => {
            for (const barcode of barcodes || []) {
                if (barcode.rawValue) {
                    addResult(barcode.rawValue);
                }
            }
        })
        .catch(() => {})
        .finally(() => {
            nativeBusy = false;

            if (scanning) {
                requestAnimationFrame(requestNativeScan);
            }
        });
}

function startFallbackScanner() {
    stopFallbackScanner();

    fallbackTimer = setInterval(
        scanFallback,
        FALLBACK_INTERVAL
    );
}

function stopFallbackScanner() {
    if (fallbackTimer) {
        clearInterval(fallbackTimer);
        fallbackTimer = null;
    }
}

function scanFallback() {
    if (!scanning || fallbackBusy) {
        return;
    }

    if (!video.videoWidth || !video.videoHeight) {
        return;
    }

    fallbackBusy = true;

    try {
        const value = decodeImage();

        if (value) {
            addResult(value);
        }
    } catch (error) {
        console.debug("Fallback decoder:", error);
    } finally {
        fallbackBusy = false;
    }
}

function getGrayRow(ctx, width, y) {
    const data = ctx.getImageData(
        0,
        y,
        width,
        1
    ).data;

    const gray = new Uint8Array(width);

    for (let x = 0; x < width; x++) {
        const i = x * 4;

        gray[x] = Math.round(
            data[i] * 0.299 +
            data[i + 1] * 0.587 +
            data[i + 2] * 0.114
        );
    }

    return gray;
}

function makeBinaryRow(gray, offset = 0) {
    let min = 255;
    let max = 0;

    for (let i = 0; i < gray.length; i++) {
        if (gray[i] < min) {
            min = gray[i];
        }

        if (gray[i] > max) {
            max = gray[i];
        }
    }

    if (max - min < 25) {
        return null;
    }

    let threshold =
        min +
        (max - min) * 0.48 +
        offset;

    threshold = Math.max(
        min + 5,
        Math.min(max - 5, threshold)
    );

    const row = new Uint8Array(gray.length);

    for (let i = 0; i < gray.length; i++) {
        row[i] = gray[i] < threshold ? 1 : 0;
    }

    return row;
}

function getRuns(row) {
    if (!row?.length) {
        return [];
    }

    const runs = [];
    let color = row[0];
    let width = 1;

    for (let i = 1; i < row.length; i++) {
        if (row[i] === color) {
            width++;
        } else {
            runs.push({
                color,
                width
            });

            color = row[i];
            width = 1;
        }
    }

    runs.push({
        color,
        width
    });

    return runs;
}

function trimWhiteRuns(runs) {
    let start = 0;
    let end = runs.length - 1;

    while (
        start <= end &&
        runs[start].color === 0
    ) {
        start++;
    }

    while (
        end >= start &&
        runs[end].color === 0
    ) {
        end--;
    }

    return runs.slice(start, end + 1);
}

function code39CharError(runs, expected) {
    if (runs.length !== 9) {
        return Infinity;
    }

    if (runs[0].color !== 1) {
        return Infinity;
    }

    const widths = runs.map(r => r.width);

    const sorted = widths
        .map((width, index) => ({
            width,
            index
        }))
        .sort((a, b) => b.width - a.width);

    const wideSet = new Set(
        sorted
            .slice(0, 3)
            .map(x => x.index)
    );

    const narrow = widths.filter(
        (_, index) => !wideSet.has(index)
    );

    const wide = widths.filter(
        (_, index) => wideSet.has(index)
    );

    if (!narrow.length || !wide.length) {
        return Infinity;
    }

    const narrowAvg =
        narrow.reduce((a, b) => a + b, 0) /
        narrow.length;

    const wideAvg =
        wide.reduce((a, b) => a + b, 0) /
        wide.length;

    if (!narrowAvg) {
        return Infinity;
    }

    const ratio = wideAvg / narrowAvg;

    if (ratio < 1.45) {
        return Infinity;
    }

    let positionError = 0;

    for (let i = 0; i < 9; i++) {
        const expectedWide = expected[i] === 2;
        const actualWide = wideSet.has(i);

        if (expectedWide !== actualWide) {
            positionError++;
        }
    }

    const ratioError =
        Math.abs(ratio - 2.5) / 2.5;

    return (
        positionError * 0.35 +
        ratioError * 0.65
    );
}

function decodeCode39(runs) {
    runs = trimWhiteRuns(runs);

    if (runs.length < 19) {
        return null;
    }

    const chars = [];
    let position = 0;

    while (position + 9 <= runs.length) {
        const part = runs.slice(
            position,
            position + 9
        );

        if (part[0].color !== 1) {
            return null;
        }

        let best = null;
        let bestError = Infinity;

        for (const item of CODE39_ITEMS) {
            const error = code39CharError(
                part,
                item.widths
            );

            if (error < bestError) {
                bestError = error;
                best = item;
            }
        }

        if (!best || bestError > 0.55) {
            return null;
        }

        chars.push(best.char);
        position += 9;

        if (position >= runs.length) {
            break;
        }

        if (runs[position].color !== 0) {
            return null;
        }

        const narrowWidth = Math.min(
            ...part.map(r => r.width)
        );

        if (
            runs[position].width >
            narrowWidth * 2.5
        ) {
            return null;
        }

        position++;
    }

    if (position !== runs.length) {
        return null;
    }

    if (chars.length < 3) {
        return null;
    }

    if (
        chars[0] !== "*" ||
        chars[chars.length - 1] !== "*"
    ) {
        return null;
    }

    return chars.slice(1, -1).join("") || null;
}

function tryDecodeRow(gray) {
    const thresholdOffsets = [0, -10, 10];

    for (const offset of thresholdOffsets) {
        const binary = makeBinaryRow(
            gray,
            offset
        );

        if (!binary) {
            continue;
        }

        let value = decodeCode39(
            getRuns(binary)
        );

        if (value) {
            return value;
        }

        value = decodeCode39(
            getRuns(
                binary.slice().reverse()
            )
        );

        if (value) {
            return value;
        }
    }

    return null;
}

function decodeImage() {
    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
        return null;
    }

    const scale = Math.min(
        1,
        MAX_WIDTH / width
    );

    const scanWidth = Math.max(
        1,
        Math.round(width * scale)
    );

    const scanHeight = Math.max(
        1,
        Math.round(height * scale)
    );

    canvas.width = scanWidth;
    canvas.height = scanHeight;

    const ctx = canvas.getContext(
        "2d",
        {
            willReadFrequently: true
        }
    );

    if (!ctx) {
        return null;
    }

    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
        video,
        0,
        0,
        scanWidth,
        scanHeight
    );

    const positions = [
        0.10, 0.15, 0.20, 0.25, 0.30,
        0.35, 0.40, 0.44, 0.47, 0.50,
        0.53, 0.56, 0.60, 0.65, 0.70,
        0.75, 0.80, 0.85, 0.90
    ];

    for (const ratio of positions) {
        const y = Math.min(
            scanHeight - 1,
            Math.max(
                0,
                Math.round(
                    scanHeight * ratio
                )
            )
        );

        const gray = getGrayRow(
            ctx,
            scanWidth,
            y
        );

        const value = tryDecodeRow(gray);

        if (value) {
            return value;
        }
    }

    const cropRatios = [
        0.95,
        0.85,
        0.75,
        0.65,
        0.55
    ];

    const cropPositions = [
        0.15, 0.22, 0.30, 0.38, 0.45,
        0.50, 0.55, 0.62, 0.70, 0.78,
        0.85
    ];

    for (const cropRatio of cropRatios) {
        const cropWidth = Math.max(
            240,
            Math.round(
                scanWidth * cropRatio
            )
        );

        const cropX = Math.max(
            0,
            Math.round(
                (scanWidth - cropWidth) / 2
            )
        );

        const zoomWidth = Math.min(
            MAX_WIDTH,
            cropWidth * 2
        );

        const zoomHeight = Math.max(
            1,
            Math.round(scanHeight * 2)
        );

        const cropCanvas =
            document.createElement("canvas");

        cropCanvas.width = zoomWidth;
        cropCanvas.height = zoomHeight;

        const cropCtx =
            cropCanvas.getContext(
                "2d",
                {
                    willReadFrequently: true
                }
            );

        if (!cropCtx) {
            continue;
        }

        cropCtx.imageSmoothingEnabled = false;

        cropCtx.drawImage(
            canvas,
            cropX,
            0,
            cropWidth,
            scanHeight,
            0,
            0,
            zoomWidth,
            zoomHeight
        );

        for (const ratio of cropPositions) {
            const y = Math.min(
                zoomHeight - 1,
                Math.max(
                    0,
                    Math.round(
                        zoomHeight * ratio
                    )
                )
            );

            const gray = getGrayRow(
                cropCtx,
                zoomWidth,
                y
            );

            const value = tryDecodeRow(gray);

            if (value) {
                return value;
            }
        }
    }

    return null;
}

if (clearBtn) {
    clearBtn.addEventListener("click", () => {
        scannedValues.clear();
        duplicateNoticeAt.clear();

        if (results) {
            results.innerHTML = "";
        }

        if (count) {
            count.textContent = "0";
        }

        setStatus(
            "Scanning Code 39...",
            true
        );

        showToast("Results cleared");
    });
}

window.addEventListener("beforeunload", () => {
    scanning = false;

    stopFallbackScanner();

    clearTimeout(zoomTimer);

    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });

        stream = null;
        cameraTrack = null;
    }
});

initCamera();