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
const ACCENT = "FF5A3C";
const ACCENT_DEEP = "E2431F";
const ACCENT_SOFT = "FFF1EC";
const DARK = "181614";
const MUTED = "5C564E";
const SOFT_MUTED = "AAA39A";
const CARD_FILL = "F4F2EE";
const BORDER = "E8E3DC";
const BODY_TEXT = "4A453F";
const POSITIVE_FILL = "E8F7ED";
const POSITIVE_TEXT = "176D36";
const NEGATIVE_FILL = "FFF0F0";
const NEGATIVE_TEXT = "B00020";
const WHITE = "FFFFFF";

const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const CONTENT_WIDTH = 10466;
const TOTALS_WIDTH = 4650;
const ROW_MARGINS = { top: 195, bottom: 195, left: 240, right: 240 };
const HEADER_CELL_MARGINS = { top: 165, bottom: 165, left: 240, right: 240 };
const EXPENSE_CELL_MARGINS = { top: 135, bottom: 135, left: 210, right: 210 };
const NONE = { style: BorderStyle.NONE, size: 0, color: WHITE };
const THIN = { style: BorderStyle.SINGLE, size: 6, color: BORDER };
const ACCENT_RULE = { style: BorderStyle.SINGLE, size: 12, color: ACCENT };
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
  margins?: typeof ROW_MARGINS;
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
    margins: margins || ROW_MARGINS,
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

function brandCell(width: number, kind: PdfKind) {
  const isClient = kind === "cliente";
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: isClient
      ? { top: 195, bottom: 330, left: 0, right: 120 }
      : { top: 105, bottom: 360, left: 0, right: 120 },
    children: [
      new Paragraph({
        spacing: { after: isClient ? 75 : 0 },
        children: [new TextRun({
          text: "BAKANA",
          bold: true,
          color: ACCENT,
          size: isClient ? 36 : 41,
          characterSpacing: isClient ? 18 : 20
        })]
      }),
      ...(isClient ? [new Paragraph({
        children: [new TextRun({ text: "REFORMAS Y PINTURA", bold: true, color: MUTED, size: 15, characterSpacing: 15 })]
      })] : [])
    ]
  });
}

function documentHeader(kind: PdfKind) {
  const title = kind === "cliente" ? "PRESUPUESTO" : "USO INTERNO · RENTABILIDAD";
  const isClient = kind === "cliente";
  return new Header({
    children: [
      new Table({
        width: { size: CONTENT_WIDTH, type: WidthType.DXA },
        indent: { size: 0, type: WidthType.DXA },
        columnWidths: [5233, 5233],
        layout: TableLayoutType.FIXED,
        borders: {
          ...NO_BORDERS,
          bottom: isClient
            ? { style: BorderStyle.SINGLE, size: 18, color: ACCENT }
            : { style: BorderStyle.SINGLE, size: 12, color: DARK }
        },
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              brandCell(5233, kind),
              textCell(title, {
                bold: true,
                align: AlignmentType.RIGHT,
                color: DARK,
                fontSize: isClient ? 36 : 24,
                margins: isClient
                  ? { top: 195, bottom: 330, left: 120, right: 0 }
                  : { top: 105, bottom: 360, left: 120, right: 0 },
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
  const isClient = kind === "cliente";
  const columnWidths = isClient ? [8200, 3706] : [8700, 3206];
  const verticalPadding = isClient ? 240 : 170;

  return new Footer({
    children: [
      new Table({
        width: { size: A4_WIDTH, type: WidthType.DXA },
        indent: { size: -720, type: WidthType.DXA },
        columnWidths,
        layout: TableLayoutType.FIXED,
        borders: NO_BORDERS,
        rows: [
          new TableRow({
            cantSplit: true,
            children: [
              textCell(left, {
                color: "CCCCCC",
                fill: DARK,
                fontSize: isClient ? 17 : 14,
                margins: { top: verticalPadding, bottom: verticalPadding, left: 720, right: 80 },
                width: { size: columnWidths[0], type: WidthType.DXA }
              }),
              textCell(right, {
                bold: true,
                color: WHITE,
                fill: DARK,
                fontSize: isClient ? 17 : 14,
                align: AlignmentType.RIGHT,
                margins: { top: verticalPadding, bottom: verticalPadding, left: 80, right: 720 },
                width: { size: columnWidths[1], type: WidthType.DXA }
              })
            ]
          })
        ]
      })
    ]
  });
}

function infoCell(label: string, lines: string[], width: number, isLast = false) {
  const visibleLines = lines.filter(Boolean);
  return new TableCell({
    margins: { top: 360, bottom: 360, left: 0, right: isLast ? 0 : 300 },
    verticalAlign: VerticalAlign.TOP,
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: label.toUpperCase(), bold: true, color: SOFT_MUTED, size: 16, characterSpacing: 10 })]
      }),
      ...visibleLines.map((line, index) => new Paragraph({
        spacing: { after: index === visibleLines.length - 1 ? 0 : 35, line: 270 },
        children: [new TextRun({ text: line || "—", bold: index === 0, color: index === 0 ? DARK : MUTED, size: index === 0 ? 21 : 19 })]
      }))
    ]
  });
}

function metadataTable(data: EditableDocumentData, kind: PdfKind) {
  const { meta, cliente } = data;
  const cells = kind === "cliente"
    ? [
        infoCell("Para", [cliente.nombre || "—", cliente.direccion, cliente.cif ? `CIF/NIF: ${cliente.cif}` : "", cliente.contacto ? `Tel: ${cliente.contacto}` : "", cliente.email ? `Email: ${cliente.email}` : ""], 3488),
        infoCell("Presupuesto", [meta.num || "—"], 3489),
        infoCell("Fecha", [`${meta.ciudad}, ${fmtFecha(meta.fecha)}`], 3489, true)
      ]
    : [
        infoCell("Presupuesto", [meta.num || "—"], 3488),
        infoCell("Cliente", [cliente.nombre || "—", cliente.cif ? `CIF/NIF: ${cliente.cif}` : "", cliente.contacto ? `Tel: ${cliente.contacto}` : "", cliente.email ? `Email: ${cliente.email}` : ""], 3489),
        infoCell("Fecha", [`${meta.ciudad}, ${fmtFecha(meta.fecha)}`], 3489, true)
      ];

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [3488, 3489, 3489],
    layout: TableLayoutType.FIXED,
    borders: { ...NO_BORDERS, bottom: THIN },
    rows: [new TableRow({ cantSplit: true, children: cells })]
  });
}

function sectionTitle(text: string, pageBreakBefore = false) {
  return new Paragraph({
    pageBreakBefore,
    spacing: { before: pageBreakBefore ? 600 : 300, after: 180 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: DARK } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 17, color: DARK, characterSpacing: 24 })]
  });
}

function spacer(after: number) {
  return new Paragraph({ spacing: { after } });
}

function categoryCell(title: string, columnSpan: number) {
  return textCell(title.toUpperCase(), {
    bold: true,
    color: ACCENT_DEEP,
    fill: ACCENT_SOFT,
    fontSize: 16,
    margins: { top: 120, bottom: 120, left: 240, right: 240 },
    columnSpan,
    width: { size: CONTENT_WIDTH, type: WidthType.DXA }
  });
}

function clientDescriptionCell(partida: Partida) {
  return new TableCell({
    width: { size: 7970, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: ROW_MARGINS,
    children: [
      new Paragraph({
        spacing: { after: partida.tiempo ? 60 : 0, line: 270 },
        children: [new TextRun({ text: partida.desc || "Sin descripción", bold: true, color: DARK, size: 21 })]
      }),
      ...(partida.tiempo ? [new Paragraph({
        children: [
          new TextRun({ text: "Tiempo estimado: ", bold: true, color: MUTED, size: 16 }),
          new TextRun({ text: partida.tiempo, color: MUTED, size: 16 })
        ]
      })] : [])
    ]
  });
}

function internalDescriptionCell(partida: Partida) {
  return new TableCell({
    width: { size: 5233, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: ROW_MARGINS,
    children: [
      ...(partida.cat ? [new Paragraph({
        spacing: { after: 35 },
        children: [new TextRun({ text: partida.cat.toUpperCase(), bold: true, color: SOFT_MUTED, size: 15, characterSpacing: 18 })]
      })] : []),
      new Paragraph({
        spacing: { after: partida.tiempo ? 60 : 0, line: 270 },
        children: [new TextRun({ text: partida.desc || "—", bold: true, color: DARK, size: 21 })]
      }),
      ...(partida.tiempo ? [new Paragraph({
        children: [
          new TextRun({ text: "Tiempo estimado: ", bold: true, color: MUTED, size: 16 }),
          new TextRun({ text: partida.tiempo, color: MUTED, size: 16 })
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
          color: ACCENT_DEEP,
          fill: ACCENT_SOFT,
          fontSize: 16,
          margins: { top: 180, bottom: 180, left: 240, right: 240 },
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
          fontSize: 21,
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
          textCell("DESCRIPCIÓN", { bold: true, color: WHITE, fill: DARK, fontSize: 15, margins: HEADER_CELL_MARGINS, width: { size: 7970, type: WidthType.DXA } }),
          textCell("TOTAL", { bold: true, color: WHITE, fill: DARK, fontSize: 15, margins: HEADER_CELL_MARGINS, align: AlignmentType.RIGHT, width: { size: 2496, type: WidthType.DXA } })
        ]
      }),
      ...(rows.length ? rows : [new TableRow({ children: [textCell("Añade partidas al presupuesto", { italic: true, color: SOFT_MUTED, columnSpan: 2, width: { size: CONTENT_WIDTH, type: WidthType.DXA } })] })])
    ]
  });
}

function totalsTable(subtotal: number, iva: number, total: number, ivaPct: number) {
  const label = (text: string, large = false) => textCell(text.toUpperCase(), {
    bold: true,
    color: large ? DARK : "9A948A",
    fontSize: 16,
    margins: large ? { top: 180, bottom: 60, left: 240, right: 120 } : { top: 60, bottom: 60, left: 240, right: 120 },
    borders: large ? { top: ACCENT_RULE } : undefined,
    width: { size: 2820, type: WidthType.DXA }
  });
  const value = (text: string, large = false) => textCell(text, {
    bold: true,
    align: AlignmentType.RIGHT,
    color: large ? ACCENT_DEEP : DARK,
    fontSize: large ? 34 : 21,
    margins: large ? { top: 180, bottom: 60, left: 120, right: 240 } : { top: 60, bottom: 60, left: 120, right: 240 },
    borders: large ? { top: ACCENT_RULE } : undefined,
    width: { size: 1830, type: WidthType.DXA }
  });

  return new Table({
    width: { size: TOTALS_WIDTH, type: WidthType.DXA },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [2820, 1830],
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
    spacer(150),
    materialsNote(),
    spacer(120),
    clientItemsTable(partidas),
    spacer(20),
    totalsTable(subtotal, iva, total, meta.ivaPct),
    sectionTitle("Condiciones", true),
    ...meta.condiciones.split(/\n\s*\n/).filter(Boolean).map(text => new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 180, line: 323 },
      children: [new TextRun({ text, color: BODY_TEXT, size: 19 })]
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
        textCell(`${toNumber(partida.cant)} ${partida.unid || ""}`, { align: AlignmentType.RIGHT, fontSize: 20, width: { size: 1570, type: WidthType.DXA } }),
        textCell(fmt(toNumber(partida.precio)), { align: AlignmentType.RIGHT, fontSize: 20, width: { size: 1831, type: WidthType.DXA } }),
        textCell(fmt(lineTotal), { align: AlignmentType.RIGHT, bold: true, fontSize: 20, width: { size: 1832, type: WidthType.DXA } })
      ]
    });
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    indent: { size: 0, type: WidthType.DXA },
    columnWidths: [5233, 1570, 1831, 1832],
    layout: TableLayoutType.FIXED,
    borders: ROW_DIVIDERS,
    rows: [
      new TableRow({
        tableHeader: true,
        cantSplit: true,
        children: [
          textCell("DESCRIPCIÓN", { bold: true, color: WHITE, fill: DARK, fontSize: 15, margins: HEADER_CELL_MARGINS, width: { size: 5233, type: WidthType.DXA } }),
          textCell("CANT.", { bold: true, color: WHITE, fill: DARK, fontSize: 15, margins: HEADER_CELL_MARGINS, align: AlignmentType.RIGHT, width: { size: 1570, type: WidthType.DXA } }),
          textCell("P. UNIT.", { bold: true, color: WHITE, fill: DARK, fontSize: 15, margins: HEADER_CELL_MARGINS, align: AlignmentType.RIGHT, width: { size: 1831, type: WidthType.DXA } }),
          textCell("TOTAL", { bold: true, color: WHITE, fill: DARK, fontSize: 15, margins: HEADER_CELL_MARGINS, align: AlignmentType.RIGHT, width: { size: 1832, type: WidthType.DXA } })
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
        textCell(left[1], { color: MUTED, fontSize: 20, margins: EXPENSE_CELL_MARGINS, width: { size: 3400, type: WidthType.DXA } }),
        textCell(fmt(gastos[left[0]]), { align: AlignmentType.RIGHT, bold: true, fontSize: 20, margins: EXPENSE_CELL_MARGINS, width: { size: 1833, type: WidthType.DXA } }),
        textCell(right?.[1] || "", { color: MUTED, fontSize: 20, margins: EXPENSE_CELL_MARGINS, width: { size: 3400, type: WidthType.DXA } }),
        textCell(right ? fmt(gastos[right[0]]) : "", { align: AlignmentType.RIGHT, bold: true, fontSize: 20, margins: EXPENSE_CELL_MARGINS, width: { size: 1833, type: WidthType.DXA } })
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

function profitCard(label: string, value: string, width: number, fill = CARD_FILL, color = DARK) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { type: ShadingType.CLEAR, fill },
    margins: { top: 240, bottom: 240, left: 240, right: 240 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 90 },
        children: [new TextRun({ text: label.toUpperCase(), bold: true, color: fill === CARD_FILL ? MUTED : color, size: 16, characterSpacing: 15 })]
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: value, bold: true, color, size: 30 })]
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
      top: NONE,
      bottom: NONE,
      left: NONE,
      right: NONE,
      insideHorizontal: NONE,
      insideVertical: { style: BorderStyle.SINGLE, size: 72, color: WHITE }
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
    spacer(150),
    sectionTitle("Partidas presupuestadas"),
    internalItemsTable(partidas),
    spacer(450),
    expensesTable(gastos),
    spacer(510),
    profitTable(subtotal, gastosTotal, beneficio),
    spacer(510),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: "Margen: ", color: DARK, size: 20 }),
        new TextRun({ text: margen, bold: true, color: DARK, size: 20 })
      ]
    })
  ];
}

export async function buildDocx(kind: PdfKind, data: EditableDocumentData) {
  const topMargin = kind === "cliente" ? 1530 : 1260;
  const bottomMargin = kind === "cliente" ? 1020 : 910;
  const document = new Document({
    creator: "Bakana Reformas y Pintura",
    title: `${data.meta.num} · ${kind === "cliente" ? "Presupuesto" : "Uso interno"}`,
    description: "Presupuesto editable generado por Bakana Presupuestos",
    styles: {
      default: {
        document: {
          run: { font: "Arial", size: 20, color: DARK },
          paragraph: { spacing: { after: 0, line: 270 } }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: A4_WIDTH, height: A4_HEIGHT, orientation: PageOrientation.PORTRAIT },
            margin: { top: topMargin, right: 720, bottom: bottomMargin, left: 720, header: 260, footer: 0 }
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
