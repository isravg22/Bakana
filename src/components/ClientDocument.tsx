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

function DocumentHeader() {
  return (
    <header className="doc-header client-doc-header">
      <div>
        <div className="brand">BAKANA</div>
        <div className="brand-sub">Reformas y pintura</div>
      </div>
      <h2>Presupuesto</h2>
    </header>
  );
}

export function ClientDocument({ meta, cliente, partidas, subtotal, iva, total }: Props) {
  let lastCat = "";

  return (
    <>
      <article className="page document" id="doc">
        <DocumentHeader />

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
          <div className="table-head"><span>Descripción</span><span>Total</span></div>
          {partidas.length === 0 && <div className="empty">Añade partidas desde el panel izquierdo</div>}
          {partidas.map(partida => {
            const showCat = partida.cat !== lastCat;
            lastCat = partida.cat;
            const lineTotal = toNumber(partida.cant) * toNumber(partida.precio);
            return (
              <div key={partida.id} data-pdf-keep>
                {showCat && <div className="cat-row">{partida.cat}</div>}
                <div className="table-row">
                  <div>
                    <strong>{partida.desc || "Sin descripción"}</strong>
                    {partida.tiempo && <small><b>Tiempo estimado:</b> {partida.tiempo}</small>}
                  </div>
                  
                  <span>{lineTotal > 0 ? fmt(lineTotal) : "—"}</span>
                  
                </div>
              </div>
            );
          })}
          <div className="totals" data-pdf-keep>
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
        <DocumentHeader />
        <section className="conditions-content">
          <h3>Condiciones</h3>
          {meta.condiciones.split("\n\n").map((paragraph, i) => (
            <p key={i} data-pdf-keep>{paragraph}</p>
          ))}
        </section>
      </article>
    </>
  );
}
