import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  type ITableCellOptions
} from "docx";
import { fmt, fmtFecha, toNumber } from "@/lib/format";
import type { Cliente, Gastos, Partida, PresupuestoMeta } from "@/types";
import type { PdfKind } from "@/lib/pdf";

export type EditableDocumentData = {
  meta: PresupuestoMeta;
  cliente: Cliente;
  partidas: Partida[];
  gastos: Gastos;
};

// Bakana document system: A4, compact Arial typography and the same palette as the PDF.
const ACCENT = "FF593F";
const DARK = "1A1A1A";
const MUTED = "777777";
const SOFT_MUTED = "AAAAAA";
const LIGHT = "F7F7F7";
const BORDER = "E7E7E7";
const POSITIVE_FILL = "E8F7ED";
const POSITIVE_TEXT = "176D36";
const NEGATIVE_FILL = "FFF0F0";
const NEGATIVE_TEXT = "B00020";
const WHITE = "FFFFFF";

const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const CONTENT_WIDTH = 10466;
const HALF_WIDTH = 5024;
const CELL_MARGINS = { top: 105, bottom: 105, left: 150, right: 150 };
const COMPACT_MARGINS = { top: 70, bottom: 70, left: 120, right: 120 };
const NONE = { style: BorderStyle.NONE, size: 0, color: WHITE };
const THIN = { style: BorderStyle.SINGLE, size: 2, color: BORDER };
const NO_BORDERS = {
  top: NONE,
  bottom: NONE,
  left: NONE,
  right: NONE,
  insideHorizontal: NONE,
  insideVertical: NONE
};
const ROW_DIVIDERS = {
  top: NONE,
  bottom: NONE,
  left: NONE,
  right: NONE,
  insideHorizontal: THIN,
  insideVertical: NONE
};

const gastoLabels: Array<[keyof Gastos, string]> = [
  ["materiales", "Suministros y materiales"],
  ["peones", "Peones"],
  ["carpintero", "Carpintero"],
  ["solador", "Solador"],
  ["azulejero", "Azulejero"],
  ["pintor", "Pintor"],
  ["gasolina", "Gasolina / Transportes"],
  ["portes", "Portes de material"],
  ["contenedor", "Contenedor / Cuba"],
  ["andamio", "Andamio"],
  ["comision", "10% Comisión"],
  ["otros", "Otros gastos"]
];

type CellOptions = Omit<ITableCellOptions, "children"> & {
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  bold?: boolean;
  color?: string;
  fill?: string;
  fontSize?: number;
  italic?: boolean;
  margins?: typeof CELL_MARGINS;
  paragraphAfter?: number;
};

function textCell(text: string, options: CellOptions = {}) {
  const {
    align,
    bold,
    color,
    fill,
    fontSize,
    italic,
    margins,
    paragraphAfter,
    ...cellOptions
  } = options;

  return new TableCell({
    margins: margins || CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    ...cellOptions,
    children: [
      new Paragraph({
        alignment: align,
        spacing: { after: paragraphAfter || 0, line: 255 },
        children: text.split("\n").map((line, index) => new TextRun({
          text: line,
          bold,
          color,
          size: fontSize,
          italics: italic,
          break: index > 0 ? 1 : undefined
        }))
      })
    ]
  });
}

function brandCell(width: number) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 90, left: 0, right: 120 },
    children: [
      new Paragraph({
        spacing: { after: 10 },
        children: [new TextRun({ text: "BAKANA", bold: true, color: ACCENT, size: 30, characterSpacing: 35 })]
      }),
      new Paragraph({
        children: [new TextRun({ text: "REFORMAS Y PINTURA", bold: true, color: MUTED, size: 12, characterSpacing: 25 })]
      })
    ]
  });
}

function documentHeader(kind: PdfKind) {
  const title = kind === "cliente" ? "PRESUPUESTO" : "USO INTERNO · RENTABILIDAD";
  return new Header({
    children: [
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        indent: { size: 0, type: WidthType.DXA },
        columnWidths: [5233, 5233],
        layout: TableLayoutType.FIXED,
        borders: { ...NO_BORDERS, bottom: THIN },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              brandCell(5233),
              textCell(title, {
                bold: true,
                align: AlignmentType.RIGHT,
                color: DARK,
                fontSize: kind === "cliente" ? 30 : 19,
                margins: { top: 80, bottom: 90, left: 120, right: 0 },
                width: { size: 5233, type: WidthType.DXA }
              })
            ]
          })
        ]
      })
    ]
  });
}

function documentFooter(kind: PdfKind, num: string) {
  const left = kind === "cliente"
    ? "Bakana Reformas y Pintura · Carlos G. Calunga Vera · hola@bakanareformas.com"
    : "Bakana Reformas y Pintura · Documento de uso interno - no entregar al cliente";
  const right = kind === "cliente" ? "ES29 2100 6341 1701 0017 9604" : num;

  return new Footer({
    children: [
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        indent: { size: 0, type: WidthType.DXA },
        columnWidths: [7350, 3116],
        layout: TableLayoutType.FIXED,
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              textCell(left, {
                color: "CCCCCC",
                fill: DARK,
                fontSize: 14,
                margins: { top: 120, bottom: 120, left: 160, right: 80 },
                width: { size: 7350, type: WidthType.DXA }
              }),
              textCell(right, {
                bold: true,
                color: WHITE,
                fill: DARK,
                fontSize: 14,
                align: AlignmentType.RIGHT,
                margins: { top: 120, bottom: 120, left: 80, right: 160 },
                width: { size: 3116, type: WidthType.DXA }
              })
            ]
          })
        ]
      })
    ]
  });
}

function infoCell(label: string, lines: string[], width: number) {
  const visibleLines = lines.filter(Boolean);
  return new TableCell({
    margins: { top: 100, bottom: 120, left: 0, right: 190 },
    verticalAlign: VerticalAlign.TOP,
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        spacing: { after: 55 },
        children: [new TextRun({ text: label.toUpperCase(), bold: true, color: SOFT_MUTED, size: 14, characterSpacing: 20 })]
      }),
      ...visibleLines.map((line, index) => new Paragraph({
        spacing: { after: index === visibleLines.length - 1 ? 0 : 30, line: 250 },
        children: [new TextRun({ text: line || "—", bold: index === 0, color: index === 0 ? DARK : MUTED, size: index === 0 ? 19 : 16 })]
      }))
    ]
  });
}

function metadataTable(data: EditableDocumentData, kind: PdfKind) {
  const { meta, cliente } = data;
  const cells = kind === "cliente"
    ? [
        infoCell("Para", [cliente.nombre || "—", cliente.direccion, cliente.cif ? `CIF/NIF: ${cliente.cif}` : "", cliente.contacto ? `Tel: ${cliente.contacto}` : "", cliente.email ? `Email: ${cliente.email}` : ""], 4900),
        infoCell("Presupuesto", [meta.num || "—"], 2300),
        infoCell("Fecha", [`${meta.ciudad}, ${fmtFecha(meta.fecha)}`], 3266)
      ]
    : [
        infoCell("Presupuesto", [meta.num || "—"], 2600),
        infoCell("Cliente", [cliente.nombre || "—", cliente.cif ? `CIF/NIF: ${cliente.cif}` : "", cliente.contacto ? `Tel: ${cliente.contacto}` : "", cliente.email ? `Email: ${cliente.email}` : ""], 4600),
        infoCell("Fecha", [`${meta.ciudad}, ${fmtFecha(meta.fecha)}`], 3266)
      ];

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: kind === "cliente" ? [4900, 2300, 3266] : [2600, 4600, 3266],
    layout: TableLayoutType.FIXED,
    borders: { ...NO_BORDERS, bottom: THIN },
    rows: [new TableRow({ cantSplit: true, children: cells })]
  });
}

function sectionTitle(text: string, pageBreakBefore = false) {
  return new Paragraph({
    pageBreakBefore,
    spacing: { before: pageBreakBefore ? 80 : 260, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: DARK } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 16, color: DARK, characterSpacing: 22 })]
  });
}

function categoryCell(title: string, columnSpan: number) {
  return textCell(title, {
    bold: true,
    color: MUTED,
    fill: LIGHT,
    fontSize: 14,
    margins: { top: 85, bottom: 85, left: 180, right: 180 },
    columnSpan,
    width: { size: CONTENT_WIDTH, type: WidthType.DXA }
  });
}

function clientDescriptionCell(partida: Partida) {
  return new TableCell({
    width: { size: 7970, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 125, bottom: 125, left: 180, right: 180 },
    children: [
      new Paragraph({
        spacing: { after: partida.tiempo ? 45 : 0, line: 255 },
        children: [new TextRun({ text: partida.desc || "Sin descripción", bold: true, color: DARK, size: 18 })]
      }),
      ...(partida.tiempo ? [new Paragraph({
        children: [
          new TextRun({ text: "Tiempo estimado: ", bold: true, color: MUTED, size: 14 }),
          new TextRun({ text: partida.tiempo, color: MUTED, size: 14 })
        ]
      })] : [])
    ]
  });
}

function internalDescriptionCell(partida: Partida) {
  return new TableCell({
    width: { size: 5500, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: CELL_MARGINS,
    children: [
      ...(partida.cat ? [new Paragraph({
        spacing: { after: 35 },
        children: [new TextRun({ text: partida.cat.toUpperCase(), bold: true, color: SOFT_MUTED, size: 12, characterSpacing: 18 })]
      })] : []),
      new Paragraph({
        spacing: { after: partida.tiempo ? 40 : 0, line: 250 },
        children: [new TextRun({ text: partida.desc || "—", bold: true, color: DARK, size: 17 })]
      }),
      ...(partida.tiempo ? [new Paragraph({
        children: [
          new TextRun({ text: "Tiempo estimado: ", bold: true, color: MUTED, size: 13 }),
          new TextRun({ text: partida.tiempo, color: MUTED, size: 13 })
        ]
      })] : [])
    ]
  });
}

function materialsNote() {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH],
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        cantSplit: true,
        children: [textCell("Materiales incluidos en los precios indicados", {
          bold: true,
          color: "555555",
          fill: LIGHT,
          fontSize: 16,
          margins: { top: 105, bottom: 105, left: 160, right: 160 },
          width: { size: CONTENT_WIDTH, type: WidthType.DXA }
        })]
      })
    ]
  });
}

function clientItemsTable(partidas: Partida[]) {
  const rows = partidas.map(partida => {
    if (partida.tipo === "description") {
      return new TableRow({ cantSplit: true, children: [categoryCell(partida.desc || partida.cat || "Nuevo título", 2)] });
    }

    const lineTotal = toNumber(partida.cant) * toNumber(partida.precio);
    return new TableRow({
      cantSplit: true,
      children: [
        clientDescriptionCell(partida),
        textCell(lineTotal > 0 ? fmt(lineTotal) : "—", {
          align: AlignmentType.RIGHT,
          color: DARK,
          fontSize: 18,
          width: { size: 2496, type: WidthType.DXA }
        })
      ]
    });
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [7970, 2496],
    layout: TableLayoutType.FIXED,
    borders: ROW_DIVIDERS,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("DESCRIPCIÓN", { bold: true, color: WHITE, fill: DARK, fontSize: 13, width: { size: 7970, type: WidthType.DXA } }),
          textCell("TOTAL", { bold: true, color: WHITE, fill: DARK, fontSize: 13, align: AlignmentType.RIGHT, width: { size: 2496, type: WidthType.DXA } })
        ]
      }),
      ...(rows.length ? rows : [new TableRow({ children: [textCell("Añade partidas al presupuesto", { italic: true, color: SOFT_MUTED, columnSpan: 2, width: { size: CONTENT_WIDTH, type: WidthType.DXA } })] })])
    ]
  });
}

function totalsTable(subtotal: number, iva: number, total: number, ivaPct: number) {
  const label = (text: string, bold = false) => textCell(text.toUpperCase(), {
    bold,
    color: bold ? DARK : SOFT_MUTED,
    fontSize: 13,
    margins: COMPACT_MARGINS,
    width: { size: 2512, type: WidthType.DXA }
  });
  const value = (text: string, large = false) => textCell(text, {
    bold: true,
    align: AlignmentType.RIGHT,
    color: DARK,
    fontSize: large ? 28 : 18,
    margins: COMPACT_MARGINS,
    width: { size: 2512, type: WidthType.DXA }
  });

  return new Table({
    width: { size: HALF_WIDTH, type: WidthType.DXA },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [2512, 2512],
    alignment: AlignmentType.RIGHT,
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [
      new TableRow({ cantSplit: true, children: [label("Base imponible"), value(fmt(subtotal))] }),
      new TableRow({ cantSplit: true, children: [label(`IVA (${ivaPct}%)`), value(fmt(iva))] }),
      new TableRow({ cantSplit: true, children: [label("Total con IVA", true), value(fmt(total), true)] })
    ]
  });
}

function clientChildren(data: EditableDocumentData) {
  const { meta, partidas } = data;
  const subtotal = partidas.reduce((sum, partida) => sum + toNumber(partida.cant) * toNumber(partida.precio), 0);
  const iva = subtotal * (meta.ivaPct / 100);
  const total = subtotal + iva;

  return [
    metadataTable(data, "cliente"),
    new Paragraph({ spacing: { after: 80 } }),
    materialsNote(),
    new Paragraph({ spacing: { after: 110 } }),
    clientItemsTable(partidas),
    new Paragraph({ spacing: { after: 80 } }),
    totalsTable(subtotal, iva, total, meta.ivaPct),
    sectionTitle("Condiciones", true),
    ...meta.condiciones.split(/\n\s*\n/).filter(Boolean).map(text => new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 140, line: 290 },
      children: [new TextRun({ text, color: "666666", size: 17 })]
    }))
  ];
}

function internalItemsTable(partidas: Partida[]) {
  const rows = partidas.map(partida => {
    if (partida.tipo === "description") {
      return new TableRow({ cantSplit: true, children: [categoryCell(partida.desc || partida.cat || "Nuevo título", 4)] });
    }

    const lineTotal = toNumber(partida.cant) * toNumber(partida.precio);
    return new TableRow({
      cantSplit: true,
      children: [
        internalDescriptionCell(partida),
        textCell(`${toNumber(partida.cant)} ${partida.unid || ""}`, { align: AlignmentType.RIGHT, fontSize: 16, width: { size: 1300, type: WidthType.DXA } }),
        textCell(fmt(toNumber(partida.precio)), { align: AlignmentType.RIGHT, fontSize: 16, width: { size: 1833, type: WidthType.DXA } }),
        textCell(fmt(lineTotal), { align: AlignmentType.RIGHT, bold: true, fontSize: 16, width: { size: 1833, type: WidthType.DXA } })
      ]
    });
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [5500, 1300, 1833, 1833],
    layout: TableLayoutType.FIXED,
    borders: ROW_DIVIDERS,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("DESCRIPCIÓN", { bold: true, color: WHITE, fill: DARK, fontSize: 13, width: { size: 5500, type: WidthType.DXA } }),
          textCell("CANT.", { bold: true, color: WHITE, fill: DARK, fontSize: 13, align: AlignmentType.RIGHT, width: { size: 1300, type: WidthType.DXA } }),
          textCell("P. UNIT.", { bold: true, color: WHITE, fill: DARK, fontSize: 13, align: AlignmentType.RIGHT, width: { size: 1833, type: WidthType.DXA } }),
          textCell("TOTAL", { bold: true, color: WHITE, fill: DARK, fontSize: 13, align: AlignmentType.RIGHT, width: { size: 1833, type: WidthType.DXA } })
        ]
      }),
      ...(rows.length ? rows : [new TableRow({ children: [textCell("Sin partidas", { italic: true, color: SOFT_MUTED, columnSpan: 4, width: { size: CONTENT_WIDTH, type: WidthType.DXA } })] })])
    ]
  });
}

function expensesTable(gastos: Gastos) {
  const rows: TableRow[] = [];
  for (let index = 0; index < gastoLabels.length; index += 2) {
    const left = gastoLabels[index];
    const right = gastoLabels[index + 1];
    rows.push(new TableRow({
      cantSplit: true,
      children: [
        textCell(left[1], { fontSize: 16, width: { size: 3400, type: WidthType.DXA } }),
        textCell(fmt(gastos[left[0]]), { align: AlignmentType.RIGHT, bold: true, fontSize: 16, width: { size: 1833, type: WidthType.DXA } }),
        textCell(right?.[1] || "", { fontSize: 16, width: { size: 3400, type: WidthType.DXA } }),
        textCell(right ? fmt(gastos[right[0]]) : "", { align: AlignmentType.RIGHT, bold: true, fontSize: 16, width: { size: 1833, type: WidthType.DXA } })
      ]
    }));
  }

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [3400, 1833, 3400, 1833],
    layout: TableLayoutType.FIXED,
    borders: {
      top: THIN,
      bottom: THIN,
      left: THIN,
      right: THIN,
      insideHorizontal: THIN,
      insideVertical: THIN
    },
    rows
  });
}

function profitCard(label: string, value: string, width: number, fill = LIGHT, color = DARK) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, fill },
    margins: { top: 160, bottom: 160, left: 120, right: 120 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 70 },
        children: [new TextRun({ text: label.toUpperCase(), bold: true, color: MUTED, size: 13, characterSpacing: 15 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: value, bold: true, color, size: 24 })]
      })
    ]
  });
}

function profitTable(subtotal: number, gastosTotal: number, beneficio: number) {
  const benefitFill = beneficio >= 0 ? POSITIVE_FILL : NEGATIVE_FILL;
  const benefitText = beneficio >= 0 ? POSITIVE_TEXT : NEGATIVE_TEXT;
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [3488, 3489, 3489],
    layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 12, color: WHITE },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: WHITE },
      left: { style: BorderStyle.SINGLE, size: 12, color: WHITE },
      right: { style: BorderStyle.SINGLE, size: 12, color: WHITE },
      insideHorizontal: NONE,
      insideVertical: { style: BorderStyle.SINGLE, size: 40, color: WHITE }
    },
    rows: [
      new TableRow({
        cantSplit: true,
        children: [
          profitCard("Cobrado al cliente", fmt(subtotal), 3488),
          profitCard("Total gastos", fmt(gastosTotal), 3489),
          profitCard("Beneficio neto", fmt(beneficio), 3489, benefitFill, benefitText)
        ]
      })
    ]
  });
}

function internalChildren(data: EditableDocumentData) {
  const { partidas, gastos } = data;
  const subtotal = partidas.reduce((sum, partida) => sum + toNumber(partida.cant) * toNumber(partida.precio), 0);
  const gastosTotal = Object.values(gastos).reduce((sum, value) => sum + value, 0);
  const beneficio = subtotal - gastosTotal;
  const margen = subtotal > 0 ? `${((beneficio / subtotal) * 100).toFixed(1)}%` : "—";

  return [
    metadataTable(data, "interno"),
    sectionTitle("Partidas presupuestadas"),
    internalItemsTable(partidas),
    sectionTitle("Gastos"),
    expensesTable(gastos),
    sectionTitle("Resumen de rentabilidad"),
    profitTable(subtotal, gastosTotal, beneficio),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { before: 100 },
      children: [
        new TextRun({ text: "Margen: ", color: MUTED, size: 17 }),
        new TextRun({ text: margen, bold: true, color: DARK, size: 18 })
      ]
    })
  ];
}

export async function buildDocx(kind: PdfKind, data: EditableDocumentData) {
  const document = new Document({
    creator: "Bakana Reformas y Pintura",
    title: `${data.meta.num} · ${kind === "cliente" ? "Presupuesto" : "Uso interno"}`,
    description: "Presupuesto editable generado por Bakana Presupuestos",
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 18, color: DARK },
          paragraph: { spacing: { after: 0, line: 255 } }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: A4_WIDTH, height: A4_HEIGHT, orientation: PageOrientation.PORTRAIT },
            margin: { top: 1120, right: 720, bottom: 940, left: 720, header: 260, footer: 240 }
          }
        },
        headers: { default: documentHeader(kind) },
        footers: { default: documentFooter(kind, data.meta.num) },
        children: kind === "cliente" ? clientChildren(data) : internalChildren(data)
      }
    ]
  });

  return Packer.toBlob(document);
}
