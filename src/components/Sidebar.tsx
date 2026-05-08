"use client";

import type { Catalog, Cliente, Gastos, Partida, PresupuestoMeta } from "@/types";
import { fmt, toNumber } from "@/lib/format";

type Props = {
  catalog: Catalog;
  status: { text: string; kind: "loading" | "ok" | "err" };
  meta: PresupuestoMeta;
  cliente: Cliente;
  partidas: Partida[];
  gastos: Gastos;
  subtotal: number;
  iva: number;
  total: number;
  onMeta: (patch: Partial<PresupuestoMeta>) => void;
  onCliente: (patch: Partial<Cliente>) => void;
  onGastos: (patch: Partial<Gastos>) => void;
  onAddCatalog: () => void;
  onAddCustom: () => void;
  onRemovePartida: (id: number) => void;
  onUpdatePartida: (id: number, patch: Partial<Partida>) => void;
  onChangeCategory: (id: number, cat: string) => void;
  onChangeItem: (id: number, item: number) => void;
  onPrintCliente: () => void;
  onPrintInterno: () => void;
  onUpload: (kind: "cliente" | "interno") => void;
  driveStatus: string;
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
  ["andamio", "Andamio (alquiler)"],
  ["comision", "10% Comisión"],
  ["otros", "Otros gastos"]
];

export function Sidebar(props: Props) {
  const categories = Object.keys(props.catalog);
  const gastosTotal = Object.values(props.gastos).reduce((sum, value) => sum + value, 0);
  const beneficio = props.subtotal - gastosTotal;

  return (
    <aside className="sidebar">
      <h1>Bakana Presupuestos</h1>

      <section>
        <div className="section-title">Documento</div>
        <div className="grid-2">
          <label>Presupuesto<input value={props.meta.num} onChange={e => props.onMeta({ num: e.target.value })} /></label>
          <label>Fecha<input type="date" value={props.meta.fecha} onChange={e => props.onMeta({ fecha: e.target.value })} /></label>
        </div>
        <div className="grid-2">
          <label>Ciudad<input value={props.meta.ciudad} onChange={e => props.onMeta({ ciudad: e.target.value })} /></label>
          <label>IVA
            <select value={props.meta.ivaPct} onChange={e => props.onMeta({ ivaPct: Number(e.target.value) })}>
              <option value={10}>10%</option>
              <option value={21}>21%</option>
            </select>
          </label>
        </div>
      </section>

      <section>
        <div className="section-title">Cliente</div>
        <label>Nombre<input value={props.cliente.nombre} onChange={e => props.onCliente({ nombre: e.target.value })} /></label>
        <label>Dirección<textarea rows={2} value={props.cliente.direccion} onChange={e => props.onCliente({ direccion: e.target.value })} /></label>
        <label>CIF/NIF<input value={props.cliente.cif} onChange={e => props.onCliente({ cif: e.target.value })} /></label>
        <div className="grid-2">
          <label>Contacto<input type="tel" value={props.cliente.contacto} onChange={e => props.onCliente({ contacto: e.target.value })} /></label>
          <label>Email<input type="email" value={props.cliente.email} onChange={e => props.onCliente({ email: e.target.value })} /></label>
        </div>
      </section>

      <section>
        <div className="section-title">Partidas</div>
        
        <div className="partidas-editor">
          {props.partidas.map((partida, index) => {
            const items = props.catalog[partida.cat] || [];
            return (
              <div className="partida-editor" key={partida.id}>
                <button className="remove" onClick={() => props.onRemovePartida(partida.id)} title="Eliminar">x</button>
                <strong>Partida {index + 1} · {partida.tipo === "catalogo" ? "Catálogo" : "Personalizada"}</strong>

                {partida.tipo === "catalogo" ? (
                  <div className="grid-2">
                    <label>Categoría
                      <select value={partida.cat} onChange={e => props.onChangeCategory(partida.id, e.target.value)}>
                        {categories.map(cat => <option key={cat}>{cat}</option>)}
                      </select>
                    </label>
                    <label>Ítem
                      <select value={partida.item} onChange={e => props.onChangeItem(partida.id, Number(e.target.value))}>
                        {items.map((item, itemIndex) => <option key={`${item.desc}-${itemIndex}`} value={itemIndex}>{item.desc}</option>)}
                      </select>
                    </label>
                  </div>
                ) : (
                  <label>Descripción<input value={partida.desc} onChange={e => props.onUpdatePartida(partida.id, { desc: e.target.value })} /></label>
                )}

                <div className="grid-3">
                  <label>Cantidad<input type="number" value={partida.cant} onChange={e => props.onUpdatePartida(partida.id, { cant: e.target.value })} /></label>
                  <label>Unid.<input value={partida.unid} onChange={e => props.onUpdatePartida(partida.id, { unid: e.target.value })} /></label>
                  <label>P. Unit.<input type="number" step="0.01" value={partida.precio} onChange={e => props.onUpdatePartida(partida.id, { precio: e.target.value })} /></label>
                </div>
                <label>Tiempo estimado<input value={partida.tiempo} placeholder="Ej. 2 días, 1 semana..." onChange={e => props.onUpdatePartida(partida.id, { tiempo: e.target.value })} /></label>
                <div className="line-total">Total: {fmt(toNumber(partida.cant) * toNumber(partida.precio))}</div>
              </div>
            );
          })}
        </div>
        <div className="button-grid">
          <button onClick={props.onAddCatalog}>+ Del catálogo</button>
          <button onClick={props.onAddCustom}>+ Personalizada</button>
        </div>
      </section>

      <section>
        <div className="section-title">Resumen</div>
        <div className="summary">
          <span>Subtotal</span><strong>{fmt(props.subtotal)}</strong>
          <span>IVA ({props.meta.ivaPct}%)</span><strong>{fmt(props.iva)}</strong>
          <span>Total</span><strong>{fmt(props.total)}</strong>
        </div>
      </section>

      <section>
        <div className="section-title">Rentabilidad</div>
        {gastoLabels.map(([key, label]) => (
          <label className="expense" key={key}>{label}
            <input type="number" step="0.01" value={props.gastos[key]} onChange={e => props.onGastos({ [key]: Number(e.target.value) } as Partial<Gastos>)} />
          </label>
        ))}
        <div className={beneficio >= 0 ? "beneficio ok" : "beneficio err"}>Beneficio neto: {fmt(beneficio)}</div>
      </section>

      <div className="button-grid">
      </div>
      <div className="button-grid">
        <button onClick={() => props.onUpload("cliente")}>Drive Cliente</button>
        <button onClick={() => props.onUpload("interno")}>Drive Interno</button>
      </div>
      <div className="drive-status">{props.driveStatus}</div>
    </aside>
  );
}
