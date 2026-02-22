import { jsPDF } from "jspdf";

const LETTER_WIDTH_IN = 8.5;
const LETTER_HEIGHT_IN = 11;
const EXPORT_WIDTH_PX = 816;

const svgToDataUri = (svg: SVGElement) => {
  const serialized = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
};

const replaceInlineSvgWithImages = async (root: HTMLElement) => {
  const svgNodes = Array.from(root.querySelectorAll("svg"));

  for (const svg of svgNodes) {
    const img = root.ownerDocument.createElement("img");
    img.src = svgToDataUri(svg);

    const computed = window.getComputedStyle(svg);
    img.style.width = computed.width;
    img.style.height = computed.height;
    img.style.display = computed.display === "inline" ? "inline-block" : computed.display;
    img.style.verticalAlign = computed.verticalAlign;

    if (svg.className.baseVal) {
      img.className = svg.className.baseVal;
    }

    img.setAttribute("alt", "");
    svg.replaceWith(img);
  }

  await Promise.all(
    Array.from(root.querySelectorAll("img")).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );
};

const createExportContainer = (sourceElement: HTMLElement) => {
  const container = document.createElement("div");
  container.setAttribute("data-resume-pdf-export", "true");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = `${EXPORT_WIDTH_PX}px`;
  container.style.opacity = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "-1";
  container.style.background = "#fff";

  const clone = sourceElement.cloneNode(true) as HTMLElement;
  clone.style.width = `${EXPORT_WIDTH_PX}px`;
  clone.style.maxWidth = "none";
  clone.style.minHeight = "1122px";
  clone.style.margin = "0";
  clone.style.boxShadow = "none";

  container.appendChild(clone);
  document.body.appendChild(container);

  return { container, clone };
};

export const exportResumeToPdf = async ({
  sourceElement,
  fileName,
}: {
  sourceElement: HTMLElement;
  fileName: string;
}) => {
  const html2canvas = (await import("html2canvas")).default;

  if ("fonts" in document) {
    await document.fonts.ready;
  }

  const { container, clone } = createExportContainer(sourceElement);

  try {
    await replaceInlineSvgWithImages(clone);

    const canvas = await html2canvas(clone, {
      scale: Math.min(window.devicePixelRatio || 2, 2),
      useCORS: true,
      backgroundColor: "#ffffff",
      foreignObjectRendering: false,
      logging: false,
      width: EXPORT_WIDTH_PX,
      windowWidth: EXPORT_WIDTH_PX,
      scrollX: 0,
      scrollY: 0,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "in",
      format: "letter",
      compress: true,
    });

    const pageHeightInCanvasPixels = Math.floor((LETTER_HEIGHT_IN / LETTER_WIDTH_IN) * canvas.width);
    let yOffset = 0;
    let pageIndex = 0;

    while (yOffset < canvas.height) {
      if (pageIndex > 0) {
        pdf.addPage();
      }

      const pageCanvas = document.createElement("canvas");
      const sliceHeight = Math.min(pageHeightInCanvasPixels, canvas.height - yOffset);
      pageCanvas.width = canvas.width;
      pageCanvas.height = sliceHeight;

      const ctx = pageCanvas.getContext("2d");
      if (!ctx) {
        throw new Error("Failed to create canvas context during PDF export.");
      }

      ctx.drawImage(canvas, 0, yOffset, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

      const imgData = pageCanvas.toDataURL("image/png");
      const renderHeight = (sliceHeight / canvas.width) * LETTER_WIDTH_IN;
      pdf.addImage(imgData, "PNG", 0, 0, LETTER_WIDTH_IN, renderHeight, undefined, "FAST");

      yOffset += pageHeightInCanvasPixels;
      pageIndex += 1;
    }

    pdf.save(fileName);
  } finally {
    container.remove();
  }
};
