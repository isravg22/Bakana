const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwalPPUGB-gtO_CEyTi2rw2QGGVmZySskGt6Q0aXEek2YLoJi8MqYEVffjzRRlvTFAw/exec";

export type PdfKind = "cliente" | "interno";

type AvoidRange = {
  start: number;
  end: number;
};

function getAvoidRanges(pageEl: HTMLElement, canvasH: number): AvoidRange[] {
  const pageRect = pageEl.getBoundingClientRect();
  if (pageRect.height <= 0) return [];

  const scaleY = canvasH / pageRect.height;

  return Array.from(pageEl.querySelectorAll<HTMLElement>("[data-pdf-keep]"))
    .map(el => {
      const rect = el.getBoundingClientRect();
      return {
        start: Math.max(0, (rect.top - pageRect.top) * scaleY),
        end: Math.min(canvasH, (rect.bottom - pageRect.top) * scaleY)
      };
    })
    .filter(range => range.end > range.start)
    .sort((a, b) => a.start - b.start);
}

function fitSliceToAvoidBreaks(y: number, targetSliceH: number, canvasH: number, avoidRanges: AvoidRange[]) {
  const remainingH = canvasH - y;
  const sliceH = Math.min(targetSliceH, remainingH);
  const cutY = y + sliceH;
  const minUsefulSliceH = 18;

  if (remainingH <= targetSliceH) return remainingH;

  const crossing = avoidRanges.find(range =>
    range.start > y + minUsefulSliceH &&
    range.start < cutY &&
    range.end > cutY
  );

  if (!crossing) return sliceH;

  const adjustedH = Math.floor(crossing.start - y);
  return adjustedH >= minUsefulSliceH ? adjustedH : sliceH;
}

function drawHeader(pdf: import("jspdf").jsPDF, kind: PdfKind, pdfW: number) {
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, pdfW, 24, "F");
  pdf.setDrawColor(231, 231, 231);
  pdf.setLineWidth(0.25);
  pdf.line(12, 22, pdfW - 12, 22);

  pdf.setTextColor(255, 89, 63);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text("BAKANA", 12, 11);

  if (kind === "cliente") {
    pdf.setTextColor(119, 119, 119);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(6.5);
    pdf.text("REFORMAS Y PINTURA", 12, 16);

    pdf.setTextColor(26, 26, 26);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(17);
    pdf.text("PRESUPUESTO", pdfW - 12, 13, { align: "right" });
  } else {
    pdf.setTextColor(26, 26, 26);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text("USO INTERNO - RENTABILIDAD", pdfW - 12, 13, { align: "right" });
  }
}

function drawFooter(pdf: import("jspdf").jsPDF, kind: PdfKind, num: string, pdfW: number, pdfH: number) {
  const footerH = kind === "cliente" ? 11 : 9;
  const y = pdfH - footerH;

  pdf.setFillColor(26, 26, 26);
  pdf.rect(0, y, pdfW, footerH, "F");
  pdf.setTextColor(204, 204, 204);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);

  if (kind === "cliente") {
    pdf.text("Bakana Reformas y Pintura · Carlos G. Calunga Vera · hola@bakanareformas.com", 12, y + 6.8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text("ES29 2100 6341 1701 0017 9604", pdfW - 12, y + 6.8, { align: "right" });
  } else {
    pdf.text("Bakana Reformas y Pintura · Documento de uso interno - no entregar al cliente", 12, y + 5.8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(255, 255, 255);
    pdf.text(num, pdfW - 12, y + 5.8, { align: "right" });
  }
}

export async function buildPdf(kind: PdfKind, num: string) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf")
  ]);

  const pageEls = kind === "cliente"
    ? [document.getElementById("doc"), document.getElementById("doc-condiciones")]
    : [document.getElementById("doc-interno")];

  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  const footerH = kind === "cliente" ? 11 : 9;
  const topMarginContinuation = 28;
  const bottomMargin = footerH + 7;
  let firstPage = true;
  let pageNum = 0;

  document.body.classList.add(kind === "cliente" ? "print-cliente" : "print-interna");
  await new Promise(resolve => window.setTimeout(resolve, 80));

  try {
    for (const pageEl of pageEls) {
      if (!pageEl) continue;
      const canvas = await html2canvas(pageEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
        windowWidth: 794,
        onclone: (clonedDoc: Document) => {
          clonedDoc.querySelectorAll(".doc-footer, .int-footer").forEach(el => {
            (el as HTMLElement).style.visibility = "hidden";
          });
        }
      });

      const ratio = canvas.width / pdfW;
      const avoidRanges = getAvoidRanges(pageEl, canvas.height);
      const fullPageH = Math.floor(pdfH * ratio);
      const tailTolerance = Math.ceil(ratio);
      let y = 0;

      while (y < canvas.height) {
        if (canvas.height - y <= tailTolerance) break;
        if (!firstPage) pdf.addPage();
        firstPage = false;
        pageNum++;

        const isContinuation = pageNum > 1 && y > 0;
        const topMargin = isContinuation ? topMarginContinuation : 0;
        const availableH = canvas.height <= fullPageH + tailTolerance
          ? pdfH
          : pdfH - topMargin - bottomMargin;
        const targetSliceH = Math.floor(availableH * ratio);
        const sliceH = fitSliceToAvoidBreaks(y, targetSliceH, canvas.height, avoidRanges);

        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = Math.min(sliceH, canvas.height - y);
        slice.getContext("2d")!.drawImage(canvas, 0, y, canvas.width, slice.height, 0, 0, canvas.width, slice.height);
        if (isContinuation) drawHeader(pdf, kind, pdfW);
        pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", 0, topMargin, pdfW, slice.height / ratio);
        drawFooter(pdf, kind, num, pdfW, pdfH);
        y += sliceH;
      }
    }
  } finally {
    document.body.classList.remove("print-cliente", "print-interna");
  }

  return pdf;
}

export async function uploadPdfToDrive(kind: PdfKind, num: string, cliente: string) {
  const pdf = await buildPdf(kind, num);
  const safeClient = (cliente || "cliente").replace(/[^\wáéíóúÁÉÍÓÚñÑ\s]/g, "").trim().slice(0, 30);
  const filename = `${num}_${kind === "cliente" ? "CLIENTE" : "INTERNO"}_${safeClient}.pdf`;
  const pdfBase64 = pdf.output("datauristring").split(",")[1];

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ tipo: kind, filename, pdf: pdfBase64 })
  });

  return filename;
}
