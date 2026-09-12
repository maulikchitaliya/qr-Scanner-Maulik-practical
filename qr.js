



// const video = document.getElementById("video");
// const results = document.getElementById("results");
// const count = document.getElementById("count");
// const clear = document.getElementById("clear");

// let scanner = null;
// let history = [];
// let lastCode = "";

// async function startScanner() {
//     try {
//         if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//             alert("Camera access is not supported in this browser.");
//             return;
//         }

//         const stream = await navigator.mediaDevices.getUserMedia({
//             video: {
//                 facingMode: {
//                     ideal: "environment"
//                 },
//                 width: {
//                     ideal: 720
//                 },
//                 height: {
//                     ideal: 720
//                 }
//             },
//             audio: false
//         });

//         video.srcObject = stream;

//         await video.play();

//         if (!("BarcodeDetector" in window)) {
//             return;
//         }

//         const supportedFormats = await BarcodeDetector.getSupportedFormats();

//         const formats = [
//             "qr_code",
//             "code_39",
//             "code_128",
//             "ean_13",
//             "ean_8",
//             "upc_a",
//             "upc_e",
//             "itf",
//             "data_matrix",
//             "aztec",
//             "pdf417"
//         ];

//         const availableFormats = formats.filter(function (format) {
//             return supportedFormats.includes(format);
//         });

//         if (!availableFormats.length) {
//             return;
//         }

//         scanner = new BarcodeDetector({
//             formats: availableFormats
//         });

//         scan();
//     } catch (error) {
//         alert("Unable to access the camera. Please allow camera permission and try again.");
//         console.error(error);
//     }
// }

// async function scan() {
//     if (!scanner) {
//         return;
//     }

//     if (video.readyState >= 2) {
//         try {
//             const codes = await scanner.detect(video);

//             if (codes.length > 0) {
//                 const code = codes[0].rawValue;

//                 if (code && code !== lastCode) {
//                     lastCode = code;
//                     addResult(code);
//                 }
//             }
//         } catch (error) {
//             console.error(error);
//         }
//     }

//     requestAnimationFrame(scan);
// }

// function addResult(value) {
//     history.unshift({
//         value: value,
//         time: new Date().toLocaleTimeString([], {
//             hour: "2-digit",
//             minute: "2-digit",
//             second: "2-digit"
//         })
//     });

//     render();
// }

// function render() {
//     count.textContent = history.length;

//     results.innerHTML = history.map(function (item) {
//         const isUrl = /^https?:\/\//i.test(item.value);
//         const openButton = isUrl
//             ? '<button onclick="openCode(\'' + encodeURIComponent(item.value) + '\')">Open</button>'
//             : '';

//         return '<div class="item">' +
//             '<div class="item-top">' +
//                 '<span class="type">' + (isUrl ? 'URL' : 'TEXT') + '</span>' +
//                 '<span>' + item.time + '</span>' +
//             '</div>' +
//             '<div class="value">' + item.value + '</div>' +
//             '<div class="actions">' +
//                 '<button onclick="copyCode(\'' + encodeURIComponent(item.value) + '\')">Copy</button>' +
//                 openButton +
//             '</div>' +
//         '</div>';
//     }).join('');
// }



// function copyCode(value) {
//     navigator.clipboard.writeText(
//         decodeURIComponent(value)
//     );
// }

// function openCode(value) {
//     window.open(
//         decodeURIComponent(value),
//         "_blank"
//     );
// }

// clear.onclick = function () {
//     history = [];
//     lastCode = "";
//     render();
// };

// startScanner();




// const video = document.getElementById("video");
// const results = document.getElementById("results");
// const count = document.getElementById("count");
// const clear = document.getElementById("clear");

// let scanner = null;
// let history = [];
// let lastCode = "";

// async function startScanner() {
//     try {
//         if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//             alert("Camera access is not supported in this browser.");
//             return;
//         }

//         const stream = await navigator.mediaDevices.getUserMedia({
//             video: {
//                 facingMode: { ideal: "environment" },
//                 width: { ideal: 720 },
//                 height: { ideal: 720 }
//             },
//             audio: false
//         });

//         video.srcObject = stream;

//         await video.play();

//         if (!("BarcodeDetector" in window)) {
//             return;
//         }

//         const supportedFormats = await BarcodeDetector.getSupportedFormats();

//         const requiredFormats = [
//             "qr_code",
//             "code_39",
//             "code_128",
//             "ean_13",
//             "ean_8",
//             "upc_a",
//             "upc_e",
//             "itf",
//             "data_matrix",
//             "aztec",
//             "pdf417"
//         ];

//         const availableFormats = requiredFormats.filter(function (format) {
//             return supportedFormats.indexOf(format) !== -1;
//         });

//         if (availableFormats.length === 0) {
//             return;
//         }

//         scanner = new BarcodeDetector({
//             formats: availableFormats
//         });

//         scan();
//     } catch (error) {
//         console.error(error);
//         alert("Unable to access the camera. Please allow camera permission and try again.");
//     }
// }

// async function scan() {
//     if (!scanner) {
//         return;
//     }

//     if (video.readyState >= 2) {
//         try {
//             const codes = await scanner.detect(video);

//             if (codes.length > 0) {
//                 const code = codes[0].rawValue;

//                 if (code && code !== lastCode) {
//                     lastCode = code;
//                     addResult(code);
//                 }
//             }
//         } catch (error) {
//             console.error(error);
//         }
//     }

//     requestAnimationFrame(scan);
// }

// function addResult(value) {
//     history.unshift({
//         value: value,
//         time: new Date().toLocaleTimeString([], {
//             hour: "2-digit",
//             minute: "2-digit",
//             second: "2-digit"
//         })
//     });

//     render();
// }

// function render() {
//     count.textContent = history.length;
//     results.innerHTML = "";

//     history.forEach(function (item) {
//         const itemBox = document.createElement("div");
//         itemBox.className = "item";

//         const itemTop = document.createElement("div");
//         itemTop.className = "item-top";

//         const type = document.createElement("span");
//         type.className = "type";

//         const isUrl = /^https?:\/\//i.test(item.value);
//         type.textContent = isUrl ? "URL" : "TEXT";

//         const time = document.createElement("span");
//         time.textContent = item.time;

//         itemTop.appendChild(type);
//         itemTop.appendChild(time);

//         const value = document.createElement("div");
//         value.className = "value";
//         value.textContent = item.value;

//         const actions = document.createElement("div");
//         actions.className = "actions";

//         const copyButton = document.createElement("button");
//         copyButton.textContent = "Copy";

//         copyButton.onclick = function () {
//             copyCode(item.value);
//         };

//         actions.appendChild(copyButton);

//         if (isUrl) {
//             const openButton = document.createElement("button");
//             openButton.textContent = "Open";

//             openButton.onclick = function () {
//                 openCode(item.value);
//             };

//             actions.appendChild(openButton);
//         }

//         itemBox.appendChild(itemTop);
//         itemBox.appendChild(value);
//         itemBox.appendChild(actions);

//         results.appendChild(itemBox);
//     });
// }

// function copyCode(value) {
//     navigator.clipboard.writeText(value).then(function () {
//         console.log("Code copied successfully.");
//     }).catch(function () {
//         alert("Unable to copy the code.");
//     });
// }

// function openCode(value) {
//     window.open(value, "_blank");
// }

// clear.onclick = function () {
//     history = [];
//     lastCode = "";
//     render();
// };

// startScanner();

const video = document.getElementById("video");
const results = document.getElementById("results");
const count = document.getElementById("count");
const clear = document.getElementById("clear");

let scanner = null;
let history = [];
let lastCode = "";

async function startScanner() {
    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Camera access is not supported in this browser.");
            return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 720 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = stream;

        await video.play();

        console.log("Camera started. Checking BarcodeDetector support...");

        if (!("BarcodeDetector" in window)) {
            console.warn("BarcodeDetector is NOT supported in this browser.");
            alert("This browser does not support BarcodeDetector.\nUse latest Chrome or Edge (desktop or Android) to scan QR codes.");
            return;
        }

        console.log("BarcodeDetector exists in window. Fetching supported formats...");

        const supportedFormats = await BarcodeDetector.getSupportedFormats();
        console.log("Supported formats from this browser/device:", supportedFormats);

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

        console.log("Formats we will actually use:", availableFormats);

        if (availableFormats.length === 0) {
            console.warn("No supported barcode formats found. On desktop Chrome, this usually means the barcode detection component hasn't downloaded yet.");
            alert(
                "No barcode formats available on this device.\n\n" +
                "If you're on desktop Chrome, go to chrome://components, find " +
                "'Barcode Detection Provider' and click 'Check for update'. " +
                "Then reload this page.\n\n" +
                "On Android Chrome this usually works immediately."
            );
            return;
        }

        scanner = new BarcodeDetector({
            formats: availableFormats
        });

        console.log("Scanner initialized. Starting scan loop...");

        scan();
    } catch (error) {
        console.error("startScanner() failed:", error);
        alert("Unable to access the camera. Please allow camera permission and try again.");
    }
}

async function scan() {
    if (!scanner) {
        return;
    }

    if (video.readyState >= 2) {
        try {
            const codes = await scanner.detect(video);

            if (codes.length > 0) {
                console.log("Detected codes:", codes);

                const code = codes[0].rawValue;

                if (code && code !== lastCode) {
                    lastCode = code;
                    addResult(code);
                }
            }
        } catch (error) {
            console.error("detect() failed:", error);
        }
    }

    requestAnimationFrame(scan);
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
        console.log("Code copied successfully.");
    }).catch(function () {
        alert("Unable to copy the code.");
    });
}

function openCode(value) {
    window.open(value, "_blank");
}

clear.onclick = function () {
    history = [];
    lastCode = "";
    render();
};

startScanner();

