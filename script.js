const filesEl = document.getElementById("files");
const layoutEl = document.getElementById("layout");
const gapEl = document.getElementById("gap");
const bgEl = document.getElementById("bg");
const mergeBtn = document.getElementById("mergeBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const thumbsEl = document.getElementById("thumbs");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let images = []; // {img, w, h, name}
let lastMergedDataUrl = null;

filesEl.addEventListener("change", async (e) => {
  const files = [...e.target.files];
  if (!files.length) return;

  // load images
  const loaded = await Promise.all(files.map(loadImageFromFile));
  images = images.concat(loaded);

  renderThumbs();
  downloadBtn.disabled = true;
  lastMergedDataUrl = null;
});

mergeBtn.addEventListener("click", () => {
  if (images.length < 2) {
    alert("Please upload at least 2 images.");
    return;
  }
  mergeImages();
});

downloadBtn.addEventListener("click", () => {
  if (!lastMergedDataUrl) return;

  const a = document.createElement("a");
  a.href = lastMergedDataUrl;
  a.download = "merged.png";
  a.click();
});

clearBtn.addEventListener("click", () => {
  images = [];
  thumbsEl.innerHTML = "";
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 0;
  canvas.height = 0;
  filesEl.value = "";
  downloadBtn.disabled = true;
  lastMergedDataUrl = null;
});

function renderThumbs(){
  thumbsEl.innerHTML = "";
  images.forEach((it) => {
    const div = document.createElement("div");
    div.className = "thumb";
    const img = document.createElement("img");
    img.src = it.img.src;
    img.alt = it.name;
    div.appendChild(img);
    thumbsEl.appendChild(div);
  });
}

function loadImageFromFile(file){
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({ img, w: img.naturalWidth, h: img.naturalHeight, name: file.name });
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function mergeImages(){
  const layout = layoutEl.value;
  const gap = clamp(parseInt(gapEl.value || "0", 10), 0, 100);
  const bg = bgEl.value;

  // Simple approach: keep original sizes, just place them.
  // You can improve later by resizing to common width/height.

  let outW = 0, outH = 0;

  if (layout === "horizontal") {
    outW = images.reduce((sum, it) => sum + it.w, 0) + gap * (images.length - 1);
    outH = Math.max(...images.map(it => it.h));
  } else if (layout === "vertical") {
    outW = Math.max(...images.map(it => it.w));
    outH = images.reduce((sum, it) => sum + it.h, 0) + gap * (images.length - 1);
  } else if (layout === "grid2") {
    const cols = 2;
    const rows = Math.ceil(images.length / cols);

    // per-row max height and per-col max width (simple)
    const colW = [0, 0];
    const rowH = new Array(rows).fill(0);

    images.forEach((it, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      colW[c] = Math.max(colW[c], it.w);
      rowH[r] = Math.max(rowH[r], it.h);
    });

    outW = colW.reduce((a,b)=>a+b,0) + gap * (cols - 1);
    outH = rowH.reduce((a,b)=>a+b,0) + gap * (rows - 1);
  }

  // Set canvas size
  canvas.width = outW;
  canvas.height = outH;

  // background
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, outW, outH);

  // draw images
  if (layout === "horizontal") {
    let x = 0;
    images.forEach((it) => {
      const y = 0; // top aligned
      ctx.drawImage(it.img, x, y);
      x += it.w + gap;
    });
  } else if (layout === "vertical") {
    let y = 0;
    images.forEach((it) => {
      const x = 0; // left aligned
      ctx.drawImage(it.img, x, y);
      y += it.h + gap;
    });
  } else if (layout === "grid2") {
    const cols = 2;
    const rows = Math.ceil(images.length / cols);

    const colW = [0, 0];
    const rowH = new Array(rows).fill(0);

    images.forEach((it, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      colW[c] = Math.max(colW[c], it.w);
      rowH[r] = Math.max(rowH[r], it.h);
    });

    let y = 0;
    for (let r = 0; r < rows; r++) {
      let x = 0;
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        if (i >= images.length) break;
        const it = images[i];
        ctx.drawImage(it.img, x, y);
        x += colW[c] + gap;
      }
      y += rowH[r] + gap;
    }
  }

  lastMergedDataUrl = canvas.toDataURL("image/png");
  downloadBtn.disabled = false;
}

function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }


// --- Drag & drop upload (UI upgrade) ---
const dropZone = document.getElementById("dropZone");

if (dropZone) {
  ["dragenter","dragover"].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "rgba(255,255,255,0.45)";
    });
  });

  ["dragleave","drop"].forEach(evt => {
    dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.style.borderColor = "rgba(255,255,255,0.22)";
    });
  });

  dropZone.addEventListener("drop", (e) => {
    const dtFiles = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith("image/"));
    if (!dtFiles.length) return;

    // Put dropped files into the file input to reuse your existing logic
    const dataTransfer = new DataTransfer();
    dtFiles.forEach(f => dataTransfer.items.add(f));
    filesEl.files = dataTransfer.files;

    // Trigger your existing change handler
    filesEl.dispatchEvent(new Event("change"));
  });
}
