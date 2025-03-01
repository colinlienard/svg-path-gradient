document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const canvas = document.getElementById("canvas");
  const emptyState = document.getElementById("empty-state");
  const strokeWidth = document.getElementById("stroke-width");
  const widthValue = document.getElementById("width-value");
  const numSegments = document.getElementById("num-segments");
  const segmentsValue = document.getElementById("segments-value");
  const exportButton = document.getElementById("export-button");
  const colorStopsContainer = document.getElementById("color-stops");
  const addColorBtn = document.getElementById("add-color");
  const scaleFactorSelect = document.getElementById("scale-factor");
  const paddingSelect = document.getElementById("padding");
  const paddingValue = document.getElementById("padding-value");

  let currentSvgPath = null;
  let svgViewBox = null;
  let pathElement = null;

  // Event listeners for drag and drop
  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", handleFileSelect);

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("active");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("active");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("active");

    if (e.dataTransfer.files.length) {
      handleFile(e.dataTransfer.files[0]);
    }
  });

  // Control event listeners
  strokeWidth.addEventListener("input", (e) => {
    widthValue.textContent = `${e.target.value}px`;
    updateGradient();
  });

  numSegments.addEventListener("input", (e) => {
    segmentsValue.textContent = e.target.value;
    updateGradient();
  });

  paddingSelect.addEventListener("input", (e) => {
    paddingValue.textContent = e.target.value;
    updateGradient();
  });

  // Add color stop button
  addColorBtn.addEventListener("click", addColorStop);

  // Handle color stop changes
  colorStopsContainer.addEventListener("change", (e) => {
    if (
      e.target.classList.contains("color-picker") ||
      e.target.classList.contains("color-position")
    ) {
      updateGradient();
    }
  });

  // Handle remove color stop
  colorStopsContainer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-color")) {
      const colorStop = e.target.closest(".color-stop");
      if (colorStopsContainer.children.length > 2) {
        colorStop.remove();
        updateGradient();
      }
    }
  });

  exportButton.addEventListener("click", exportAsPng);

  function handleFileSelect(e) {
    if (e.target.files.length) {
      handleFile(e.target.files[0]);
    }
  }

  function handleFile(file) {
    if (file.type !== "image/svg+xml") {
      alert("Please select an SVG file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const svgContent = e.target.result;
      processSvgFile(svgContent);
    };
    reader.readAsText(file);
  }

  function processSvgFile(svgContent) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");

    // Extract SVG path
    const paths = svgDoc.querySelectorAll("path");

    if (paths.length === 0) {
      alert("No path found in the SVG file.");
      return;
    }

    if (paths.length > 1) {
      alert("Multiple paths found. Using the first path only.");
    }

    currentSvgPath = paths[0].getAttribute("d");
    pathElement = paths[0];

    // Get SVG viewBox
    const svgElement = svgDoc.querySelector("svg");
    svgViewBox = svgElement.getAttribute("viewBox") || "0 0 100 100";

    // Hide empty state and render SVG
    emptyState.style.display = "none";
    renderSvg();
  }

  function renderSvg() {
    if (!currentSvgPath) return;
    updateGradient();
  }

  function updateGradient() {
    if (!currentSvgPath) return;

    const width = strokeWidth.value;
    const segments = numSegments.value;

    // Get all color stops
    const colorStops = [];
    document.querySelectorAll(".color-stop").forEach((stop) => {
      const color = stop.querySelector(".color-picker").value;
      const position =
        parseFloat(stop.querySelector(".color-position").value) / 100;
      colorStops.push({ color, position });
    });

    // Sort color stops by position
    colorStops.sort((a, b) => a.position - b.position);

    // Create SVG for preview
    const svgNS = "http://www.w3.org/2000/svg";
    const svgElement = document.createElementNS(svgNS, "svg");
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    const padding = parseInt(paddingSelect.value);

    // Adjust viewBox to include padding
    const [x, y, viewBoxWidth, viewBoxHeight] = svgViewBox
      .split(" ")
      .map(Number);
    const paddedViewBox = `${x - padding} ${y - padding} ${viewBoxWidth + 2 * padding} ${viewBoxHeight + 2 * padding}`;
    svgElement.setAttribute("viewBox", paddedViewBox);

    svgElement.setAttribute("width", "100%");
    svgElement.setAttribute("height", "100%");

    // Create path for length calculation
    const tempPath = document.createElementNS(svgNS, "path");
    tempPath.setAttribute("d", currentSvgPath);
    tempPath.setAttribute("fill", "none");
    svgElement.appendChild(tempPath);
    canvas.innerHTML = "";
    canvas.appendChild(svgElement);

    // Calculate total length
    const pathLength = tempPath.getTotalLength();

    // Remove temp path
    svgElement.removeChild(tempPath);

    // Create gradient segments along the path
    for (let i = 0; i < segments; i++) {
      const percent = i / segments;
      const nextPercent = (i + 1) / segments;

      // Get positions along the path
      const point = tempPath.getPointAtLength(percent * pathLength);
      const nextPoint = tempPath.getPointAtLength(nextPercent * pathLength);

      // Create line segment
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", point.x);
      line.setAttribute("y1", point.y);
      line.setAttribute("x2", nextPoint.x);
      line.setAttribute("y2", nextPoint.y);
      line.setAttribute("stroke", getColorAtPosition(percent, colorStops));
      line.setAttribute("stroke-width", width);
      line.setAttribute("stroke-linecap", "round");
      svgElement.appendChild(line);
    }
  }

  function getColorAtPosition(position, colorStops) {
    // Find the two color stops that surround this position
    let start = colorStops[0];
    let end = colorStops[colorStops.length - 1];

    for (let i = 0; i < colorStops.length - 1; i++) {
      if (
        position >= colorStops[i].position &&
        position <= colorStops[i + 1].position
      ) {
        start = colorStops[i];
        end = colorStops[i + 1];
        break;
      }
    }

    // If position is outside our stops, use the closest stop
    if (position <= start.position) return start.color;
    if (position >= end.position) return end.color;

    // Interpolate between the two colors
    const relativePosition =
      (position - start.position) / (end.position - start.position);
    return interpolateColor(start.color, end.color, relativePosition);
  }

  function interpolateColor(color1, color2, factor) {
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + factor * (r2 - r1));
    const g = Math.round(g1 + factor * (g2 - g1));
    const b = Math.round(b1 + factor * (b2 - b1));

    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
  }

  function addColorStop() {
    const colorStops = document.querySelectorAll(".color-stop");
    const lastStop = colorStops[colorStops.length - 1];
    const secondLastStop = colorStops[colorStops.length - 2];

    // Calculate a position between the last two stops
    const lastPos = parseInt(lastStop.querySelector(".color-position").value);
    const secondLastPos = parseInt(
      secondLastStop.querySelector(".color-position").value,
    );
    const newPos = Math.floor((lastPos + secondLastPos) / 2);

    // Create new color stop
    const newStop = document.createElement("div");
    newStop.className = "color-stop";
    newStop.dataset.position = newPos;

    // Random color
    const randomColor = `#${Math.floor(Math.random() * 16777215)
      .toString(16)
      .padStart(6, "0")}`;

    newStop.innerHTML = `
          <div class="color-input-container">
            <input type="color" class="color-picker" value="${randomColor}">
            <span class="remove-color">×</span>
          </div>
          <input type="number" class="color-position" min="0" max="100" value="${newPos}">
          <label>Stop</label>
        `;

    // Insert before last stop
    colorStopsContainer.insertBefore(newStop, lastStop);
    updateGradient();
  }

  function exportAsPng() {
    if (!currentSvgPath) {
      alert("Please load an SVG first");
      return;
    }

    const svgElement = canvas.querySelector("svg");
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svgElement);

    // Create a blob URL for the SVG
    const svgBlob = new Blob([svgStr], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    // Get the selected scale factor
    const scaleFactor = parseInt(scaleFactorSelect.value, 10);

    // Create an Image to load the SVG
    const img = new Image();
    img.onload = function () {
      // Create a canvas to render the PNG
      const canvas = document.createElement("canvas");
      const { width, height } = getViewBoxDimensions();
      const ratio = height / width;

      canvas.width = 800 * scaleFactor; // Scaled width export
      canvas.height = 800 * ratio * scaleFactor; // Scaled height export

      const ctx = canvas.getContext("2d");
      // Remove the background color setting to keep it transparent
      // ctx.fillStyle = "white"; // Set background color
      // ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Create download link
      const dataUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = dataUrl;
      downloadLink.download = `path-gradient-${scaleFactor}x.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // Clean up
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }

  function getViewBoxDimensions() {
    const vb = svgViewBox.split(" ").map(Number);
    return {
      x: vb[0] || 0,
      y: vb[1] || 0,
      width: vb[2] || 100,
      height: vb[3] || 100,
    };
  }
});
