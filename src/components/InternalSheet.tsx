import type { Cliente, Gastos, Partida, PresupuestoMeta } from "@/types";
import { fmt, fmtFecha, toNumber } from "@/lib/format";

type Props = {
  meta: PresupuestoMeta;
  cliente: Cliente;
  partidas: Partida[];
  gastos: Gastos;
  subtotal: number;
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

export function InternalSheet({ meta, cliente, partidas, gastos, subtotal }: Props) {
  const gastosTotal = Object.values(gastos).reduce((sum, value) => sum + value, 0);
  const beneficio = subtotal - gastosTotal;
  const margen = subtotal > 0 ? `${((beneficio / subtotal) * 100).toFixed(1)}%` : "—";

  return (
    <article className="page internal" id="doc-interno">
      <header className="doc-header compact">
        <div className="brand">BAKANA</div>
        <strong>Uso interno · Rentabilidad</strong>
      </header>

      <section className="internal-meta">
        <div><label>Presupuesto</label><strong>{meta.num}</strong></div>
        <div>
          <label>Cliente</label><strong>{cliente.nombre || "—"}</strong>
          {cliente.cif && <span>CIF/NIF: {cliente.cif}</span>}
          {cliente.contacto && <span>Tel: {cliente.contacto}</span>}
          {cliente.email && <span>Email: {cliente.email}</span>}
        </div>
        <div><label>Fecha</label><strong>{meta.ciudad}, {fmtFecha(meta.fecha)}</strong></div>
      </section>

      <section className="table">
        <h3>Partidas presupuestadas</h3>
        <div className="table-head"><span>Descripción</span><span>Cant.</span><span>P. Unit.</span><span>Total</span></div>
        {partidas.map(partida => {
          const total = toNumber(partida.cant) * toNumber(partida.precio);
          return (
            <div className="table-row" key={partida.id}>
              <div>
                <em>{partida.cat}</em>
                <strong>{partida.desc || "—"}</strong>
                {partida.tiempo && <small><b>Tiempo estimado:</b> {partida.tiempo}</small>}
              </div>
              <span>{toNumber(partida.cant)} {partida.unid}</span>
              <span>{fmt(toNumber(partida.precio))}</span>
              <span>{fmt(total)}</span>
            </div>
          );
        })}
      </section>

      <section className="expenses-grid">
        {gastoLabels.map(([key, label]) => (
          <div key={key}><span>{label}</span><strong>{fmt(gastos[key])}</strong></div>
        ))}
      </section>

      <section className="profit-grid">
        <div><span>Cobrado al cliente</span><strong>{fmt(subtotal)}</strong></div>
        <div><span>Total gastos</span><strong>{fmt(gastosTotal)}</strong></div>
        <div className={beneficio >= 0 ? "positive" : "negative"}><span>Beneficio neto</span><strong>{fmt(beneficio)}</strong></div>
      </section>
      <div className="margin">Margen: <strong>{margen}</strong></div>
    </article>
  );
}
