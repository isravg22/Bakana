import type { Cliente, Partida, PresupuestoMeta } from "@/types";
import { fmt, fmtFecha, toNumber } from "@/lib/format";

type Props = {
  meta: PresupuestoMeta;
  cliente: Cliente;
  partidas: Partida[];
  subtotal: number;
  iva: number;
  total: number;
};

export function ClientDocument({ meta, cliente, partidas, subtotal, iva, total }: Props) {
  let lastCat = "";

  return (
    <>
      <article className="page document" id="doc">
        <header className="doc-header">
          <div>
            <div className="brand">BAKANA</div>
            <div className="brand-sub">Reformas y pintura</div>
          </div>
          <h2>Presupuesto</h2>
        </header>

        <section className="doc-meta">
          <div>
            <label>Para</label>
            <strong>{cliente.nombre || "—"}</strong>
            <span>{cliente.direccion}</span>
            {cliente.cif && <span><b>CIF/NIF:</b> {cliente.cif}</span>}
            {cliente.contacto && <span><b>Tel:</b> {cliente.contacto}</span>}
            {cliente.email && <span><b>Email:</b> {cliente.email}</span>}
          </div>
          <div><label>Presupuesto</label><strong>{meta.num}</strong></div>
          <div><label>Fecha</label><strong>{meta.ciudad}, {fmtFecha(meta.fecha)}</strong></div>
        </section>

        <div className="material-note">Materiales incluidos en los precios indicados</div>

        <section className="table">
          <div className="table-head"><span>Descripción</span><span>Cant.</span><span>P. Unit.</span><span>Total</span></div>
          {partidas.length === 0 && <div className="empty">Añade partidas desde el panel izquierdo</div>}
          {partidas.map(partida => {
            const showCat = partida.cat !== lastCat;
            lastCat = partida.cat;
            const lineTotal = toNumber(partida.cant) * toNumber(partida.precio);
            return (
              <div key={partida.id}>
                {showCat && <div className="cat-row">{partida.cat}</div>}
                <div className="table-row">
                  <div>
                    <strong>{partida.desc || "Sin descripción"}</strong>
                    {partida.tiempo && <small><b>Tiempo estimado:</b> {partida.tiempo}</small>}
                  </div>
                  <span>{toNumber(partida.cant) || "—"} {partida.unid}</span>
                  <span>{toNumber(partida.precio) > 0 ? fmt(toNumber(partida.precio)) : "—"}</span>
                  <span>{lineTotal > 0 ? fmt(lineTotal) : "—"}</span>
                </div>
              </div>
            );
          })}
          <div className="totals">
            <span>Base imponible</span><strong>{fmt(subtotal)}</strong>
            <span>IVA ({meta.ivaPct}%)</span><strong>{fmt(iva)}</strong>
            <span>Total con IVA</span><strong className="grand-total">{fmt(total)}</strong>
          </div>
        </section>

        <footer className="doc-footer">
          <span>Bakana Reformas y Pintura · Carlos G. Calunga Vera · hola@bakanareformas.com</span>
          <strong>ES29 2100 6341 1701 0017 9604</strong>
        </footer>
      </article>

      <article className="page conditions" id="doc-condiciones">
        <h3>Condiciones</h3>
        <p>El presente presupuesto ha sido elaborado conforme a la información disponible y a la inspección visual realizada en el momento de la valoración.</p>
        <p>Quedan excluidos los trabajos derivados de vicios ocultos o elementos no visibles en el momento de la elaboración del presupuesto.</p>
        <p>Las actuaciones adicionales serán comunicadas al cliente y presupuestadas de manera independiente, quedando supeditadas a su aprobación previa.</p>
        <p>La aceptación del presente presupuesto implica la conformidad con las condiciones aquí descritas.</p>
      </article>
    </>
  );
}
