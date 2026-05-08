import type { Catalog } from "@/types";

export const catalogFallback: Catalog = {
  RETIRADA: [
    { desc: "Retirada de mueble grande", unid: "ud", precio: 60 },
    { desc: "Retirada de bañera", unid: "ud", precio: 100 },
    { desc: "Retirada de azulejos / alicatado", unid: "m2", precio: 16 }
  ],
  "DEMOLICIÓN": [
    { desc: "Demolición de elementos existentes", unid: "m2", precio: 22 },
    { desc: "Demolición de tabique", unid: "m2", precio: 15 }
  ],
  SUELO: [
    { desc: "Colocación de suelo clic (SPC/vinílico)", unid: "m2", precio: 15 },
    { desc: "Solado con materiales y losas incluidas", unid: "m2", precio: 50 }
  ],
  PINTURA: [
    { desc: "Pintura de paredes interiores", unid: "m2", precio: 10 },
    { desc: "Pintura de techo", unid: "m2", precio: 11 }
  ],
  OTROS: [
    { desc: "Partida adicional personalizada", unid: "ud", precio: 0 }
  ]
};
