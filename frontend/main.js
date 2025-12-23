// =========================
// BASIC DOM HOOKUP
// =========================
console.log("main.js loaded");

const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

const restoreBtn = document.getElementById("restoreBtn");
const statusEl = document.getElementById("status");
const progressWrap = document.getElementById("progressWrap");
const progressText = document.getElementById("progressText");

const imgBefore = document.getElementById("imgBefore");
const imgAfter = document.getElementById("imgAfter");

const fileNameEl = document.getElementById("fileName");
const imageSizeEl = document.getElementById("imageSize");

const downloadBtn = document.getElementById("downloadBtn");
const openBtn = document.getElementById("openBtn");

const presets = Array.from(document.querySelectorAll(".preset"));

const opSelect = document.getElementById("opSelect");
const paramsArea = document.getElementById("paramsArea");
const applyBtn = document.getElementById("applyBtn");
const undoBtn = document.getElementById("undoBtn");
const resetBtn = document.getElementById("resetBtn");
const showIntermediatesCheckbox = document.getElementById("showIntermediates");
const intermediateGrid = document.getElementById("intermediateGrid");

const compareWrap = document.getElementById("compareWrap");
const slider = document.getElementById("slider");
const originalStandalone = document.getElementById("originalStandalone");



let originalFile = null;
let originalURL = null;

let history = []; 
let currentIndex = -1;
let currentResultURL = null;


function setStatus(msg) {
  console.log("STATUS:", msg);
  if (statusEl) statusEl.textContent = msg;
}

function showProgress(msg) {
  if (!progressWrap) return;
  progressWrap.hidden = false;
  if (progressText) progressText.textContent = msg || "Processing…";
}

function hideProgress() {
  if (!progressWrap) return;
  progressWrap.hidden = true;
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function updateMetaInfo(file) {
  if (!file) {
    fileNameEl.textContent = "";
    imageSizeEl.textContent = "";
    return;
  }
  fileNameEl.textContent = file.name;
  imageSizeEl.textContent = formatBytes(file.size);
}

function pushHistory(blob, label) {
  const url = URL.createObjectURL(blob);
  history.push({ url, blob, label });
  currentIndex = history.length - 1;
  currentResultURL = url;
  updateUndoResetButtons();
  updateIntermediates();
  return url;
}

function updateUndoResetButtons() {
  undoBtn.disabled = currentIndex <= 0;
  resetBtn.disabled = history.length <= 1;
}

function updateIntermediates() {
  if (!intermediateGrid) return;

  if (!showIntermediatesCheckbox.checked || history.length <= 1) {
    intermediateGrid.hidden = true;
    intermediateGrid.innerHTML = "";
    return;
  }

  intermediateGrid.hidden = false;
  intermediateGrid.innerHTML = "";

  history.forEach((entry, idx) => {
    const wrap = document.createElement("div");
    wrap.className = "intermediate-item";

    const img = document.createElement("img");
    img.src = entry.url;
    img.alt = entry.label || `Step ${idx}`;
    img.className = "intermediate-thumb";

    const caption = document.createElement("div");
    caption.className = "intermediate-caption";
    caption.textContent = entry.label || `Step ${idx}`;

    wrap.addEventListener("click", () => {
      currentIndex = idx;
      imgAfter.src = entry.url;
      currentResultURL = entry.url;
      updateUndoResetButtons();
      setStatus(`Jumped to ${entry.label || "step " + idx}`);
    });

    wrap.appendChild(img);
    wrap.appendChild(caption);
    intermediateGrid.appendChild(wrap);
  });
}

function getActivePresetValues() {
  const active = document.querySelector(".preset.active");
  return {
    h: active?.dataset.h || "10",
    clahe: active?.dataset.clahe || "2.0",
    sharp: active?.dataset.sharp || "1.0",
  };
}


function handleFileSelected(file) {
  if (!file) {
    setStatus("No file selected");
    return;
  }

  console.log("Selected file:", file.name, file.type, file.size);

  originalFile = file;

  if (originalURL) {
    URL.revokeObjectURL(originalURL);
  }
  originalURL = URL.createObjectURL(file);

  if (originalStandalone) {
    originalStandalone.src = originalURL;
    originalStandalone.classList.add("loaded");
    originalStandalone.style.display = "block";
  }

  imgBefore.src = originalURL;
  imgBefore.style.display = "block";

  imgAfter.src = originalURL;
  imgAfter.style.display = "block";

  resetSlider();

  updateMetaInfo(file);
  setStatus("Ready to restore");

  restoreBtn.disabled = false;
  downloadBtn.disabled = true;
  openBtn.disabled = true;

  history = [];
  currentIndex = -1;
  currentResultURL = null;
  updateUndoResetButtons();
  updateIntermediates();
}

function resetSlider() {
  if (!imgAfter || !slider) return;
  slider.style.left = "50%";
  imgAfter.style.clipPath = "inset(0 50% 0 0)";
}


dropZone.addEventListener("click", () => {
  console.log("dropZone clicked → opening file input");
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  console.log("fileInput change event:", file);
  handleFileSelected(file);
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer.files[0];
  console.log("File dropped:", file);
  handleFileSelected(file);
});

// =========================
// PRESETS
// =========================

presets.forEach((btn) => {
  btn.addEventListener("click", () => {
    presets.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const { h, clahe, sharp } = getActivePresetValues();
    setStatus(`Preset selected: h=${h}, CLAHE=${clahe}, sharp=${sharp}`);
  });
});

// =========================
// BACKEND CALL
// =========================

async function callRestoreAPI(inputBlobOrFile, options = {}) {
  const formData = new FormData();

  const fileToSend =
    inputBlobOrFile instanceof File
      ? inputBlobOrFile
      : new File([inputBlobOrFile], "input.png", { type: "image/png" });

  console.log("Sending file to backend:", fileToSend.name, fileToSend.size);

  formData.append("file", fileToSend); // MUST match app.py

  const preset = getActivePresetValues();
  formData.append("h", options.h || preset.h);
  formData.append("clahe", options.clahe || preset.clahe);
  formData.append("sharp", options.sharp || preset.sharp);

  if (options.op) formData.append("op", options.op);
  if (options.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value != null) formData.append(key, value);
    });
  }

  const res = await fetch("/api/restore", {
    method: "POST",
    body: formData,
  });

  console.log("Response from /api/restore:", res.status);

  if (!res.ok) {
    const text = await res.text();
    console.error("Server error body:", text);
    throw new Error(text || "Server error");
  }

  return await res.blob();
}


restoreBtn.addEventListener("click", async () => {
  if (!originalFile) {
    alert("Please select an image first.");
    setStatus("No image loaded");
    return;
  }

  console.log("Restore clicked, using file:", originalFile.name, originalFile.size);

  showProgress("Restoring…");
  setStatus("Uploading image to server…");

  try {
    const blob = await callRestoreAPI(originalFile, {});
    console.log("Received blob from /api/restore:", blob);

    const url = pushHistory(blob, "Restored");
    imgAfter.src = url;
    imgAfter.style.display = "block";
    currentResultURL = url;

    downloadBtn.disabled = false;
    openBtn.disabled = false;

    downloadBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = currentResultURL;
      a.download = "restored.png";
      a.click();
    };
    openBtn.onclick = () => {
      window.open(currentResultURL, "_blank");
    };

    setStatus("Restoration complete");
  } catch (err) {
    console.error("Restore error:", err);
    setStatus("Restore error: " + err.message);
  } finally {
    hideProgress();
  }
});

// =========================
// OPERATIONS PANEL (UI + calling backend with op)
// =========================

function renderOpParams() {
  paramsArea.innerHTML = "";
  const op = opSelect.value;

  const addSlider = (id, label, min, max, step, value) => {
    const wrap = document.createElement("div");
    wrap.className = "param-row";

    const lab = document.createElement("label");
    lab.textContent = label;

    const input = document.createElement("input");
    input.type = "range";
    input.id = id;
    input.min = min;
    input.max = max;
    input.step = step;
    input.value = value;

    const span = document.createElement("span");
    span.className = "param-value";
    span.textContent = value;

    input.addEventListener("input", () => {
      span.textContent = input.value;
    });

    wrap.appendChild(lab);
    wrap.appendChild(input);
    wrap.appendChild(span);
    paramsArea.appendChild(wrap);
  };

  if (op === "denoise") {
    addSlider("param-h", "NLMeans strength (h)", 1, 20, 1, 10);
  } else if (op === "bilateral") {
    addSlider("param-sigmaColor", "Sigma Color", 10, 200, 5, 75);
    addSlider("param-sigmaSpace", "Sigma Space", 5, 50, 1, 25);
  } else if (op === "clahe") {
    addSlider("param-clip", "CLAHE clipLimit", 1, 5, 0.1, 2.0);
  } else if (op === "unsharp") {
    addSlider("param-amount", "Unsharp amount", 0.5, 3.0, 0.1, 1.5);
    addSlider("param-radius", "Unsharp radius", 0.5, 5.0, 0.1, 1.5);
  } else if (op === "sharpen") {
    addSlider("param-strength", "Sharpen strength", 0.5, 3.0, 0.1, 1.0);
  } else if (op === "brightness") {
    addSlider("param-bright", "Brightness", -50, 50, 1, 0);
    addSlider("param-contrast", "Contrast", 0.5, 2.0, 0.1, 1.0);
  }
}

opSelect.addEventListener("change", renderOpParams);
renderOpParams();

applyBtn.addEventListener("click", async () => {
  if (!originalFile && history.length === 0) {
    alert("Upload and restore an image first.");
    return;
  }

  let baseBlobOrFile = originalFile;
  if (history.length > 0 && currentIndex >= 0) {
    baseBlobOrFile = history[currentIndex].blob;
  }

  const op = opSelect.value;
  const params = {};
  const val = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : null;
  };

  if (op === "denoise") params.h = val("param-h");
  if (op === "clahe") params.clahe = val("param-clip");
  if (op === "unsharp" || op === "sharpen") {
    params.sharp = val("param-strength") || val("param-amount");
  }
  if (op === "brightness") {
    params.brightness = val("param-bright");
    params.contrast = val("param-contrast");
  }
  if (op === "bilateral") {
    params.sigmaColor = val("param-sigmaColor");
    params.sigmaSpace = val("param-sigmaSpace");
  }

  showProgress("Applying operation…");
  setStatus(`Applying operation: ${op}…`);

  try {
    const blob = await callRestoreAPI(baseBlobOrFile, { op, params });
    const url = pushHistory(blob, `Op: ${op}`);
    imgAfter.src = url;
    imgAfter.style.display = "block";
    currentResultURL = url;
    downloadBtn.disabled = false;
    openBtn.disabled = false;
    setStatus(`Applied ${op}`);
  } catch (err) {
    console.error("Operation error:", err);
    setStatus("Operation error: " + err.message);
  } finally {
    hideProgress();
  }
});

undoBtn.addEventListener("click", () => {
  if (currentIndex <= 0) return;
  currentIndex -= 1;
  const entry = history[currentIndex];
  imgAfter.src = entry.url;
  currentResultURL = entry.url;
  updateUndoResetButtons();
  setStatus("Undo last operation");
});

resetBtn.addEventListener("click", () => {
  if (history.length === 0) {
    if (originalURL) {
      imgAfter.src = originalURL;
      currentResultURL = originalURL;
      setStatus("Reset to original");
    }
    return;
  }
  currentIndex = 0;
  const entry = history[0];
  imgAfter.src = entry.url;
  currentResultURL = entry.url;
  updateUndoResetButtons();
  setStatus("Reset to first restored");
});

showIntermediatesCheckbox.addEventListener("change", () => {
  updateIntermediates();
});


(function initSlider() {
  if (!compareWrap || !slider || !imgAfter) {
    console.warn("Slider elements missing");
    return;
  }

  let isDragging = false;
  let currentPercent = 50;

  function applyPercent(percent) {
    if (percent < 0) percent = 0;
    if (percent > 100) percent = 100;
    currentPercent = percent;
    slider.style.left = percent + "%";
    // Show "after" only to the right of slider
    imgAfter.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
  }

  function updateFromClientX(clientX) {
    const rect = compareWrap.getBoundingClientRect();
    if (rect.width === 0) return;
    let x = clientX - rect.left;
    if (x < 0) x = 0;
    if (x > rect.width) x = rect.width;
    const percent = (x / rect.width) * 100;
    applyPercent(percent);
  }

  // Mouse events
  slider.addEventListener("mousedown", (e) => {
    isDragging = true;
    updateFromClientX(e.clientX);
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    updateFromClientX(e.clientX);
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // Click anywhere on compare area to jump slider
  compareWrap.addEventListener("click", (e) => {
    updateFromClientX(e.clientX);
  });

  // Touch events
  slider.addEventListener("touchstart", (e) => {
    isDragging = true;
    updateFromClientX(e.touches[0].clientX);
  });

  window.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    updateFromClientX(e.touches[0].clientX);
  });

  window.addEventListener("touchend", () => {
    isDragging = false;
  });

  // Initial position after layout
  window.addEventListener("load", () => {
    applyPercent(50);
  });
})();
