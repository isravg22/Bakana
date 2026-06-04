"use client";

import { useEffect, useMemo, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ClientDocument } from "@/components/ClientDocument";
import { InternalSheet } from "@/components/InternalSheet";
import { catalogFallback } from "@/data/catalogFallback";
import { loadCatalogFromGoogle } from "@/lib/googleCatalog";
import { buildPdf, uploadPdfToDrive, type PdfKind } from "@/lib/pdf";
import { normalizeText, toNumber } from "@/lib/format";
import type { Catalog, Cliente, Gastos, Partida, PresupuestoMeta } from "@/types";

type CatalogStatus = { text: string; kind: "loading" | "ok" | "err" };

const initialGastos: Gastos = {
  materiales: 0,
  peones: 0,
  carpintero: 0,
  solador: 0,
  azulejero: 0,
  pintor: 0,
  gasolina: 0,
  portes: 0,
  contenedor: 0,
  andamio: 0,
  comision: 0,
  otros: 0
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function syncCatalogPartidas(partidas: Partida[], catalog: Catalog) {
  return partidas.map(partida => {
    if (partida.tipo !== "catalogo") return partida;
    const items = catalog[partida.cat] || [];
    let index = items.findIndex(item => normalizeText(item.desc) === normalizeText(partida.desc));
    if (index < 0 && items[partida.item]) index = partida.item;
    const item = items[index];
    return item ? { ...partida, item: index, desc: item.desc, unid: item.unid, precio: item.precio } : partida;
  });
}

export default function Page() {
  const [catalog, setCatalog] = useState<Catalog>(catalogFallback);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>({ text: "Conectando con Google Sheets...", kind: "loading" });
  const [driveStatus, setDriveStatus] = useState("");
  const [nextId, setNextId] = useState(1);
  const [meta, setMeta] = useState<PresupuestoMeta>({
    num: "BKN2600001",
    ciudad: "Cádiz",
    fecha: today(),
    ivaPct: 10,
    condiciones: "Presupuesto válido por 30 días naturales desde la fecha de emisión.\n\nLos materiales contemplados corresponden a una gama media. Si el cliente optara por materiales de gama superior, el presupuesto será revisado y ajustado en consecuencia.\n\nLas licencias municipales y tasas administrativas no están incluidas en el presente presupuesto. Electricidad no presupuestado.\n\nFontanería no presupuestado\n\nAlcance del presupuesto y exclusiones:\n\nEste presupuesto ha sido elaborado a partir de la información disponible y de la inspección visual realizada en el momento de la valoración, por lo que refleja únicamente las condiciones aparentes y accesibles del inmueble.\n\nQuedan excluidos expresamente todos aquellos trabajos derivados de vicios ocultos o elementos no visibles en el momento de la elaboración, tales como humedades internas, deficiencias estructurales, instalaciones en mal estado, desniveles no detectables u otras anomalías que solo puedan identificarse tras trabajos previos de demolición o apertura.\n\nSi durante la ejecución de la obra se detectasen circunstancias que requieran actuaciones adicionales no previstas inicialmente, BAKANA lo comunicará al cliente de forma inmediata. Dichas intervenciones serán presupuestadas de forma independiente y no se ejecutarán sin la aprobación previa por escrito del cliente.\n\nEste presupuesto no incluye la retirada, protección, desplazamiento ni manipulación de mobiliario, electrodomésticos u otros enseres ubicados en la zona de trabajo. En caso de ser necesario, se informará previamente del coste adicional correspondiente.\n\nLa aceptación de este presupuesto implica la conformidad plena con las condiciones aquí descritas."
  });
  const [cliente, setCliente] = useState<Cliente>({ nombre: "", direccion: "", cif: "", contacto: "", email: "" });
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [gastos, setGastos] = useState<Gastos>(initialGastos);

  const subtotal = useMemo(
    () => partidas.reduce((sum, p) => sum + toNumber(p.cant) * toNumber(p.precio), 0),
    [partidas]
  );
  const iva = subtotal * (meta.ivaPct / 100);
  const total = subtotal + iva;

  useEffect(() => {
    let cancelled = false;

    async function refreshCatalog() {
      try {
        setCatalogStatus({ text: "Actualizando catálogo desde Google Sheets...", kind: "loading" });
        const googleCatalog = await loadCatalogFromGoogle();
        if (cancelled) return;
        setCatalog(googleCatalog);
        setPartidas(current => syncCatalogPartidas(current, googleCatalog));
        setCatalogStatus({ text: `Catálogo conectado a Google Sheets · ${Object.keys(googleCatalog).length} categorías`, kind: "ok" });
      } catch (error) {
        if (cancelled) return;
        setCatalogStatus({ text: error instanceof Error ? `${error.message}. Usando respaldo local.` : "Usando respaldo local.", kind: "err" });
      }
    }

    refreshCatalog();
    const timer = window.setInterval(refreshCatalog, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  function addCatalogPartida() {
    const cat = Object.keys(catalog)[0];
    const item = catalog[cat]?.[0];
    if (!cat || !item) return;
    setPartidas(current => [
      ...current,
      { id: nextId, tipo: "catalogo", cat, item: 0, cant: 1, unid: item.unid, precio: item.precio, desc: item.desc, tiempo: "" }
    ]);
    setNextId(id => id + 1);
  }

  function addCustomPartida() {
    setPartidas(current => [
      ...current,
      { id: nextId, tipo: "custom", cat: "OTROS", item: -1, cant: 1, unid: "ud", precio: 0, desc: "", tiempo: "" }
    ]);
    setNextId(id => id + 1);
  }

  function changeCategory(id: number, cat: string) {
    const item = catalog[cat]?.[0];
    if (!item) return;
    setPartidas(current => current.map(p => p.id === id ? { ...p, cat, item: 0, desc: item.desc, unid: item.unid, precio: item.precio } : p));
  }

  function changeItem(id: number, itemIndex: number) {
    setPartidas(current => current.map(p => {
      if (p.id !== id) return p;
      const item = catalog[p.cat]?.[itemIndex];
      return item ? { ...p, item: itemIndex, desc: item.desc, unid: item.unid, precio: item.precio } : p;
    }));
  }

  function printKind(kind: PdfKind) {
    document.body.className = kind === "cliente" ? "print-cliente" : "print-interna";
    window.print();
    document.body.className = "";
  }

  async function upload(kind: PdfKind) {
    try {
      setDriveStatus("Generando PDF...");
      const filename = await uploadPdfToDrive(kind, meta.num, cliente.nombre);
      setDriveStatus(`Subido: ${filename}`);
    } catch (error) {
      setDriveStatus(error instanceof Error ? error.message : "No se pudo subir el PDF");
    }
  }

  async function downloadPdf(kind: PdfKind) {
    const pdf = await buildPdf(kind, meta.num);
    pdf.save(`${meta.num}_${kind}.pdf`);
  }

  return (
    <main>
      <Sidebar
        catalog={catalog}
        status={catalogStatus}
        meta={meta}
        cliente={cliente}
        partidas={partidas}
        gastos={gastos}
        subtotal={subtotal}
        iva={iva}
        total={total}
        onMeta={patch => setMeta(current => ({ ...current, ...patch }))}
        onCliente={patch => setCliente(current => ({ ...current, ...patch }))}
        onGastos={patch => setGastos(current => ({ ...current, ...patch }))}
        onAddCatalog={addCatalogPartida}
        onAddCustom={addCustomPartida}
        onRemovePartida={id => setPartidas(current => current.filter(p => p.id !== id))}
        onUpdatePartida={(id, patch) => setPartidas(current => current.map(p => p.id === id ? { ...p, ...patch } : p))}
        onChangeCategory={changeCategory}
        onChangeItem={changeItem}
        onPrintCliente={() => printKind("cliente")}
        onPrintInterno={() => printKind("interno")}
        onUpload={upload}
        driveStatus={driveStatus}
      />

      <section className="preview">
        <div className="quick-actions">
          <button onClick={() => downloadPdf("cliente")}>Descargar Cliente</button>
          <button onClick={() => downloadPdf("interno")}>Descargar Interno</button>
        </div>
        <ClientDocument meta={meta} cliente={cliente} partidas={partidas} subtotal={subtotal} iva={iva} total={total} />
        <InternalSheet meta={meta} cliente={cliente} partidas={partidas} gastos={gastos} subtotal={subtotal} />
      </section>
    </main>
  );
}
