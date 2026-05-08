export type CatalogItem = {
  desc: string;
  unid: string;
  precio: number;
};

export type Catalog = Record<string, CatalogItem[]>;

export type Partida = {
  id: number;
  tipo: "catalogo" | "custom";
  cat: string;
  item: number;
  cant: number | string;
  unid: string;
  precio: number | string;
  desc: string;
  tiempo: string;
};

export type Cliente = {
  nombre: string;
  direccion: string;
  cif: string;
  contacto: string;
  email: string;
};

export type PresupuestoMeta = {
  num: string;
  ciudad: string;
  fecha: string;
  ivaPct: number;
};

export type Gastos = {
  materiales: number;
  peones: number;
  carpintero: number;
  solador: number;
  azulejero: number;
  pintor: number;
  gasolina: number;
  portes: number;
  contenedor: number;
  andamio: number;
  comision: number;
  otros: number;
};
