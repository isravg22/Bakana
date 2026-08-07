import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
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

const ACCENT = "FF593F";
const DARK = "1A1A1A";
const MUTED = "777777";
const LIGHT = "F7F7F7";
const BORDER = "E7E7E7";
const A4_WIDTH = 11906;
const A4_HEIGHT = 16838;
const CONTENT_WIDTH = 10466;
const HALF_WIDTH = 5024;
const CELL_MARGINS = { top: 100, bottom: 100, left: 140, right: 140 };
const THIN_BORDER = { style: BorderStyle.SINGLE, size: 1, color: BORDER };
const TABLE_BORDERS = {
  top: THIN_BORDER,
  bottom: THIN_BORDER,
  left: THIN_BORDER,
  right: THIN_BORDER,
  insideHorizontal: THIN_BORDER,
  insideVertical: THIN_BORDER
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
};

function textCell(text: string, options: CellOptions = {}) {
  const { align, bold, color, fill, fontSize, ...cellOptions } = options;

  return new TableCell({
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    ...cellOptions,
    children: [
      new Paragraph({
        alignment: align,
        children: text.split("\n").map((line, index) => new TextRun({
          text: line,
          bold,
          color,
          size: fontSize,
          break: index > 0 ? 1 : undefined
        }))
      })
    ]
  });
}

function infoCell(label: string, lines: string[], width: number) {
  const visibleLines = lines.filter(Boolean);
  return new TableCell({
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.TOP,
    width: { size: width, type: WidthType.DXA },
    children: [
      new Paragraph({
        spacing: { after: 70 },
        children: [new TextRun({ text: label.toUpperCase(), bold: true, color: MUTED, size: 16 })]
      }),
      ...visibleLines.map((line, index) => new Paragraph({
        spacing: { after: index === visibleLines.length - 1 ? 0 : 35 },
        children: [new TextRun({ text: line || "—", bold: index === 0 })]
      }))
    ]
  });
}

function headerTable(title: string) {
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: [CONTENT_WIDTH / 2, CONTENT_WIDTH / 2],
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows: [
      new TableRow({
        children: [
          textCell("BAKANA", { bold: true, color: ACCENT, fontSize: 34, width: { size: CONTENT_WIDTH / 2, type: WidthType.DXA } }),
          textCell(title.toUpperCase(), { bold: true, align: AlignmentType.RIGHT, fontSize: 28, width: { size: CONTENT_WIDTH / 2, type: WidthType.DXA } })
        ]
      })
    ]
  });
}

function sectionTitle(text: string, pageBreakBefore = false) {
  return new Paragraph({
    pageBreakBefore,
    spacing: { before: 260, after: 120 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: DARK } },
    children: [new TextRun({ text: text.toUpperCase(), bold: true, size: 18, color: DARK })]
  });
}

function clientChildren(data: EditableDocumentData) {
  const { meta, cliente, partidas } = data;
  const subtotal = partidas.reduce((sum, partida) => sum + toNumber(partida.cant) * toNumber(partida.precio), 0);
  const iva = subtotal * (meta.ivaPct / 100);
  const total = subtotal + iva;

  const itemRows = partidas.map(partida => {
    if (partida.tipo === "description") {
      return new TableRow({
        children: [
          textCell(partida.desc || partida.cat || "Nuevo título", {
            bold: true,
            color: MUTED,
            fill: LIGHT,
            columnSpan: 2,
            width: { size: CONTENT_WIDTH, type: WidthType.DXA }
          })
        ]
      });
    }

    const lineTotal = toNumber(partida.cant) * toNumber(partida.precio);
    const description = partida.tiempo
      ? `${partida.desc || "Sin descripción"}\nTiempo estimado: ${partida.tiempo}`
      : partida.desc || "Sin descripción";

    return new TableRow({
      cantSplit: true,
      children: [
        textCell(description, { width: { size: 7970, type: WidthType.DXA } }),
        textCell(lineTotal > 0 ? fmt(lineTotal) : "—", {
          bold: true,
          align: AlignmentType.RIGHT,
          width: { size: 2496, type: WidthType.DXA }
        })
      ]
    });
  });

  return [
    headerTable("Presupuesto"),
    new Paragraph({ spacing: { after: 120 } }),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [4900, 2300, 3266],
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          children: [
            infoCell("Para", [cliente.nombre || "—", cliente.direccion, cliente.cif ? `CIF/NIF: ${cliente.cif}` : "", cliente.contacto ? `Tel: ${cliente.contacto}` : "", cliente.email ? `Email: ${cliente.email}` : ""], 4900),
            infoCell("Presupuesto", [meta.num || "—"], 2300),
            infoCell("Fecha", [`${meta.ciudad}, ${fmtFecha(meta.fecha)}`], 3266)
          ]
        })
      ]
    }),
    new Paragraph({
      spacing: { before: 140, after: 140 },
      shading: { type: ShadingType.CLEAR, fill: LIGHT },
      children: [new TextRun({ text: "Materiales incluidos en los precios indicados", bold: true, color: MUTED })]
    }),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [7970, 2496],
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            textCell("DESCRIPCIÓN", { bold: true, color: "FFFFFF", fill: DARK, width: { size: 7970, type: WidthType.DXA } }),
            textCell("TOTAL", { bold: true, color: "FFFFFF", fill: DARK, align: AlignmentType.RIGHT, width: { size: 2496, type: WidthType.DXA } })
          ]
        }),
        ...(itemRows.length ? itemRows : [new TableRow({ children: [textCell("Sin partidas", { color: MUTED, columnSpan: 2, width: { size: CONTENT_WIDTH, type: WidthType.DXA } })] })])
      ]
    }),
    new Paragraph({ spacing: { after: 100 } }),
    new Table({
      width: { size: HALF_WIDTH, type: WidthType.DXA },
      columnWidths: [2512, 2512],
      alignment: AlignmentType.RIGHT,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({ children: [textCell("Base imponible", { color: MUTED, width: { size: 2512, type: WidthType.DXA } }), textCell(fmt(subtotal), { align: AlignmentType.RIGHT, bold: true, width: { size: 2512, type: WidthType.DXA } })] }),
        new TableRow({ children: [textCell(`IVA (${meta.ivaPct}%)`, { color: MUTED, width: { size: 2512, type: WidthType.DXA } }), textCell(fmt(iva), { align: AlignmentType.RIGHT, bold: true, width: { size: 2512, type: WidthType.DXA } })] }),
        new TableRow({ children: [textCell("Total con IVA", { bold: true, fill: LIGHT, width: { size: 2512, type: WidthType.DXA } }), textCell(fmt(total), { align: AlignmentType.RIGHT, bold: true, fill: LIGHT, fontSize: 26, width: { size: 2512, type: WidthType.DXA } })] })
      ]
    }),
    sectionTitle("Condiciones", true),
    ...meta.condiciones.split(/\n\s*\n/).filter(Boolean).map(text => new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 150, line: 300 },
      children: [new TextRun(text)]
    }))
  ];
}

function internalChildren(data: EditableDocumentData) {
  const { meta, cliente, partidas, gastos } = data;
  const subtotal = partidas.reduce((sum, partida) => sum + toNumber(partida.cant) * toNumber(partida.precio), 0);
  const gastosTotal = Object.values(gastos).reduce((sum, value) => sum + value, 0);
  const beneficio = subtotal - gastosTotal;
  const margen = subtotal > 0 ? `${((beneficio / subtotal) * 100).toFixed(1)}%` : "—";

  const itemRows = partidas.map(partida => {
    if (partida.tipo === "description") {
      return new TableRow({
        children: [textCell(partida.desc || partida.cat || "Nuevo título", { bold: true, fill: LIGHT, color: MUTED, columnSpan: 4, width: { size: CONTENT_WIDTH, type: WidthType.DXA } })]
      });
    }

    const lineTotal = toNumber(partida.cant) * toNumber(partida.precio);
    return new TableRow({
      cantSplit: true,
      children: [
        textCell(`${partida.cat ? `${partida.cat}\n` : ""}${partida.desc || "—"}${partida.tiempo ? `\nTiempo estimado: ${partida.tiempo}` : ""}`, { width: { size: 5500, type: WidthType.DXA } }),
        textCell(`${toNumber(partida.cant)} ${partida.unid || ""}`, { align: AlignmentType.RIGHT, width: { size: 1300, type: WidthType.DXA } }),
        textCell(fmt(toNumber(partida.precio)), { align: AlignmentType.RIGHT, width: { size: 1833, type: WidthType.DXA } }),
        textCell(fmt(lineTotal), { align: AlignmentType.RIGHT, bold: true, width: { size: 1833, type: WidthType.DXA } })
      ]
    });
  });

  return [
    headerTable("Uso interno · Rentabilidad"),
    new Paragraph({ spacing: { after: 120 } }),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [2600, 4600, 3266],
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          children: [
            infoCell("Presupuesto", [meta.num || "—"], 2600),
            infoCell("Cliente", [cliente.nombre || "—", cliente.cif ? `CIF/NIF: ${cliente.cif}` : "", cliente.contacto ? `Tel: ${cliente.contacto}` : "", cliente.email ? `Email: ${cliente.email}` : ""], 4600),
            infoCell("Fecha", [`${meta.ciudad}, ${fmtFecha(meta.fecha)}`], 3266)
          ]
        })
      ]
    }),
    sectionTitle("Partidas presupuestadas"),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [5500, 1300, 1833, 1833],
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({
          tableHeader: true,
          children: [
            textCell("DESCRIPCIÓN", { bold: true, color: "FFFFFF", fill: DARK, width: { size: 5500, type: WidthType.DXA } }),
            textCell("CANT.", { bold: true, color: "FFFFFF", fill: DARK, align: AlignmentType.RIGHT, width: { size: 1300, type: WidthType.DXA } }),
            textCell("P. UNIT.", { bold: true, color: "FFFFFF", fill: DARK, align: AlignmentType.RIGHT, width: { size: 1833, type: WidthType.DXA } }),
            textCell("TOTAL", { bold: true, color: "FFFFFF", fill: DARK, align: AlignmentType.RIGHT, width: { size: 1833, type: WidthType.DXA } })
          ]
        }),
        ...(itemRows.length ? itemRows : [new TableRow({ children: [textCell("Sin partidas", { color: MUTED, columnSpan: 4, width: { size: CONTENT_WIDTH, type: WidthType.DXA } })] })])
      ]
    }),
    sectionTitle("Gastos"),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [7700, 2766],
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: gastoLabels.map(([key, label]) => new TableRow({
        cantSplit: true,
        children: [textCell(label, { width: { size: 7700, type: WidthType.DXA } }), textCell(fmt(gastos[key]), { align: AlignmentType.RIGHT, bold: true, width: { size: 2766, type: WidthType.DXA } })]
      }))
    }),
    sectionTitle("Resumen de rentabilidad"),
    new Table({
      width: { size: CONTENT_WIDTH, type: WidthType.DXA },
      columnWidths: [7700, 2766],
      layout: TableLayoutType.FIXED,
      borders: TABLE_BORDERS,
      rows: [
        new TableRow({ children: [textCell("Cobrado al cliente", { color: MUTED, width: { size: 7700, type: WidthType.DXA } }), textCell(fmt(subtotal), { align: AlignmentType.RIGHT, bold: true, width: { size: 2766, type: WidthType.DXA } })] }),
        new TableRow({ children: [textCell("Total gastos", { color: MUTED, width: { size: 7700, type: WidthType.DXA } }), textCell(fmt(gastosTotal), { align: AlignmentType.RIGHT, bold: true, width: { size: 2766, type: WidthType.DXA } })] }),
        new TableRow({ children: [textCell("Beneficio neto", { bold: true, fill: LIGHT, width: { size: 7700, type: WidthType.DXA } }), textCell(fmt(beneficio), { align: AlignmentType.RIGHT, bold: true, fill: LIGHT, fontSize: 26, width: { size: 2766, type: WidthType.DXA } })] }),
        new TableRow({ children: [textCell("Margen", { color: MUTED, width: { size: 7700, type: WidthType.DXA } }), textCell(margen, { align: AlignmentType.RIGHT, bold: true, width: { size: 2766, type: WidthType.DXA } })] })
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
          run: { font: "Arial", size: 20, color: DARK },
          paragraph: { spacing: { after: 80, line: 260 } }
        }
      }
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: A4_WIDTH, height: A4_HEIGHT, orientation: PageOrientation.PORTRAIT },
            margin: { top: 720, right: 720, bottom: 720, left: 720, header: 360, footer: 360 }
          }
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: kind === "cliente"
                      ? "Bakana Reformas y Pintura · hola@bakanareformas.com · ES29 2100 6341 1701 0017 9604"
                      : `Bakana Reformas y Pintura · Documento de uso interno · ${data.meta.num}`,
                    color: MUTED,
                    size: 16
                  })
                ]
              })
            ]
          })
        },
        children: kind === "cliente" ? clientChildren(data) : internalChildren(data)
      }
    ]
  });

  return Packer.toBlob(document);
}
