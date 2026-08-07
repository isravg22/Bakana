# Receptor PDF y DOCX para Drive

El archivo completo listo para pegar en Google Apps Script está en `google-apps-script/Code.gs`.

La aplicación envía estos campos al web app de Apps Script:

- `tipo`: `cliente` o `interno`.
- `formato`: `pdf` o `docx`.
- `filename`: nombre final con extensión.
- `mimeType`: tipo MIME real del archivo.
- `pdf` o `docx`: contenido del archivo codificado en Base64.

La parte esencial del nuevo `doPost(e)` selecciona el campo y el MIME según el formato:

```javascript
var formato = data.formato || 'pdf';
var config = FORMATOS[formato];
var contenidoBase64 = data[config.campo];

if (!contenidoBase64) {
  throw new Error("No se recibió contenido para el formato " + formato);
}

var blob = Utilities.newBlob(
  Utilities.base64Decode(contenidoBase64),
  config.mimeType,
  data.filename
);
```

Después se usa el mismo `folder.createFile(blob)` que ya guardaba los PDF.

## Publicación

1. Sustituir el código del proyecto de Apps Script por `google-apps-script/Code.gs`.
2. Guardar el proyecto.
3. Abrir **Implementar > Gestionar implementaciones**.
4. Editar la implementación activa y seleccionar **Nueva versión**.
5. Implementar. La URL del web app se mantiene y no hay que cambiar el frontend.

El PDF anterior sigue siendo compatible: si `formato` no está presente, el receptor usa `pdf`.
