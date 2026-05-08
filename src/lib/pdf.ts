const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzGXN6cbyjP_x3ImY1PhG6EKnxYm0FUU0b48lrh_YEALzCu0ShsXALdBZ6DlxOV4Rzz/exec";

export type PdfKind = "cliente" | "interno";

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
  let firstPage = true;

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
        windowWidth: 794
      });

      if (!firstPage) pdf.addPage();
      firstPage = false;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, pdfW, (canvas.height * pdfW) / canvas.width);
      drawFooter(pdf, kind, num, pdfW, pdfH);
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
