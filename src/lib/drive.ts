import { buildDocx, type EditableDocumentData } from "@/lib/docx";
import { buildPdf, type PdfKind } from "@/lib/pdf";

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwaOyne_F1q3DoDFtSZiqWuHBRaj4C8V18-0VbfcrKnLefvMeAeweZG09CZ5iJgc44/exec";

export type UploadFormat = "pdf" | "docx";

function safeFilenamePart(value: string, fallback: string) {
  return (value || fallback)
    .replace(/[^\wáéíóúÁÉÍÓÚñÑ\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40) || fallback;
}

function makeFilename(kind: PdfKind, format: UploadFormat, num: string, cliente: string) {
  const safeNum = safeFilenamePart(num, "presupuesto");
  const safeClient = safeFilenamePart(cliente, "cliente");
  const kindSuffix = kind === "interno" ? "_interno" : "";
  return `${safeNum}${kindSuffix}_${safeClient}.${format}`;
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo preparar el documento Word"));
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.readAsDataURL(blob);
  });
}

export async function uploadDocumentToDrive(
  kind: PdfKind,
  format: UploadFormat,
  data: EditableDocumentData
) {
  const filename = makeFilename(kind, format, data.meta.num, data.cliente.nombre);
  const mimeType = format === "pdf"
    ? "application/pdf"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  let content: string;
  if (format === "pdf") {
    const pdf = await buildPdf(kind, data.meta.num);
    content = pdf.output("datauristring").split(",")[1];
  } else {
    content = await blobToBase64(await buildDocx(kind, data));
  }

  const payload = format === "pdf"
    ? { tipo: kind, formato: format, filename, mimeType, pdf: content }
    : { tipo: kind, formato: format, filename, mimeType, docx: content };

  await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify(payload)
  });

  return filename;
}
