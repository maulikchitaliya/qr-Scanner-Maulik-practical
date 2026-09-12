const video = document.getElementById("video");
const results = document.getElementById("results");
const count = document.getElementById("count");
const clear = document.getElementById("clear");
const toast = document.getElementById("toast");

let scanner = null;
let history = [];
let scannedValues = new Set();

let candidateCode = "";
let candidateCount = 0;
const CONFIRM_FRAMES = 3; 
let lastAcceptedCode = ""; 

let toastTimer = null;

async function startScanner() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Camera access is not supported in this browser.");
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                advanced: [{ focusMode: "continuous" }]
            },
            audio: false
        });

        video.srcObject = stream;

        await video.play();


        if (!("BarcodeDetector" in window)) {
            alert("This browser does not support BarcodeDetector.\nUse latest Chrome or Edge (desktop or Android) to scan codes.");
            return;
        }

        const supportedFormats = await BarcodeDetector.getSupportedFormats();

        const requiredFormats = [
            "qr_code",
            "code_39",
            "code_128",
            "ean_13",
            "ean_8",
            "upc_a",
            "upc_e",
            "itf",
            "data_matrix",
            "aztec",
            "pdf417"
        ];

        const availableFormats = requiredFormats.filter(function (format) {
            return supportedFormats.indexOf(format) !== -1;
        });

        if (availableFormats.length === 0) {
            console.warn("No supported barcode formats found.");
            alert(
                "No barcode formats available on this device.\n\n" +
                "On desktop Chrome, go to chrome://components, find " +
                "'Barcode Detection Provider' and click 'Check for update', then reload."
            );
            return;
        }

        scanner = new BarcodeDetector({
            formats: availableFormats
        });

        scan();
    } catch (error) {
        console.error("startScanner() failed:", error);
        alert("Unable to access the camera. Please allow camera permission and try again.");
    }
}

async function scan() {
    if (!scanner) {
        requestAnimationFrame(scan);
        return;
    }

    if (video.readyState >= 2) {
        try {
            const codes = await scanner.detect(video);

            if (codes.length > 0) {
                handleDetectedCode(codes[0].rawValue);
            } else {
                candidateCode = "";
                candidateCount = 0;
                lastAcceptedCode = "";
            }
        } catch (error) {
            console.error("detect() failed:", error);
        }
    }

    requestAnimationFrame(scan);
}

function handleDetectedCode(code) {
    if (!code) {
        return;
    }

    if (code === candidateCode) {
        candidateCount++;
    } else {
        candidateCode = code;
        candidateCount = 1;
    }

    if (candidateCount < CONFIRM_FRAMES) {
        return; 
    }

    if (code === lastAcceptedCode) {
        return; 
    }

    lastAcceptedCode = code;

    if (scannedValues.has(code)) {
        showToast("Already scanned: " + code, "error");
        return;
    }

    scannedValues.add(code);
    addResult(code);
    showToast("Scanned successfully", "success");
}

function showToast(message, type) {
    toast.textContent = message;
    toast.className = "toast show " + (type || "");

    if (toastTimer) {
        clearTimeout(toastTimer);
    }

    toastTimer = setTimeout(function () {
        toast.className = "toast";
    }, 1800);
}

function addResult(value) {
    history.unshift({
        value: value,
        time: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        })
    });

    render();
}

function render() {
    count.textContent = history.length;
    results.innerHTML = "";

    history.forEach(function (item) {
        const itemBox = document.createElement("div");
        itemBox.className = "item";

        const itemTop = document.createElement("div");
        itemTop.className = "item-top";

        const type = document.createElement("span");
        type.className = "type";

        const isUrl = /^https?:\/\//i.test(item.value);
        type.textContent = isUrl ? "URL" : "TEXT";

        const time = document.createElement("span");
        time.textContent = item.time;

        itemTop.appendChild(type);
        itemTop.appendChild(time);

        const value = document.createElement("div");
        value.className = "value";
        value.textContent = item.value;

        const actions = document.createElement("div");
        actions.className = "actions";

        const copyButton = document.createElement("button");
        copyButton.textContent = "Copy";

        copyButton.onclick = function () {
            copyCode(item.value);
        };

        actions.appendChild(copyButton);

        if (isUrl) {
            const openButton = document.createElement("button");
            openButton.textContent = "Open";

            openButton.onclick = function () {
                openCode(item.value);
            };

            actions.appendChild(openButton);
        }

        itemBox.appendChild(itemTop);
        itemBox.appendChild(value);
        itemBox.appendChild(actions);

        results.appendChild(itemBox);
    });
}

function copyCode(value) {
    navigator.clipboard.writeText(value).then(function () {
    }).catch(function () {
        alert("Unable to copy the code.");
    });
}

function openCode(value) {
    window.open(value, "_blank");
}

clear.onclick = function () {
    history = [];
    scannedValues.clear();
    lastAcceptedCode = "";
    candidateCode = "";
    candidateCount = 0;
    render();
};

startScanner();