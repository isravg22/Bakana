const FOLDER_CLIENTE = '1KUGhNu9WifELQkIZ2oXf46joiN7TnbUG';
const FOLDER_INTERNO = '1pFYSC3NOxxhTx0A0qMZtIXbR1ifznUWo';

const FORMATOS = {
  pdf: {
    campo: 'pdf',
    mimeType: 'application/pdf'
  },
  docx: {
    campo: 'docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }
};

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Petición vacía');
    }

    const data = JSON.parse(e.postData.contents);
    const formato = data.formato || 'pdf';
    const config = FORMATOS[formato];

    if (!config) {
      throw new Error('Formato no permitido: ' + formato);
    }

    if (data.tipo !== 'cliente' && data.tipo !== 'interno') {
      throw new Error('Tipo de documento no permitido: ' + data.tipo);
    }

    if (!data.filename) {
      throw new Error('Falta el nombre del archivo');
    }

    // data.pdf mantiene la compatibilidad con la versión anterior.
    const contenidoBase64 = data[config.campo] || (formato === 'pdf' ? data.pdf : null);
    if (!contenidoBase64) {
      throw new Error('No se recibió contenido para el formato ' + formato);
    }

    const folderId = data.tipo === 'cliente'
      ? FOLDER_CLIENTE
      : FOLDER_INTERNO;

    const blob = Utilities.newBlob(
      Utilities.base64Decode(contenidoBase64),
      config.mimeType,
      data.filename
    );

    const file = DriveApp
      .getFolderById(folderId)
      .createFile(blob);

    Logger.log(JSON.stringify({
      filename: data.filename,
      tipo: data.tipo,
      formato: formato,
      fileId: file.getId()
    }));

    return jsonResponse({
      success: true,
      filename: file.getName(),
      formato: formato,
      url: file.getUrl()
    });
  } catch (error) {
    Logger.log(error && error.stack ? error.stack : String(error));

    return jsonResponse({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }
}

function testFolder() {
  const folderCliente = DriveApp.getFolderById(FOLDER_CLIENTE);
  const folderInterno = DriveApp.getFolderById(FOLDER_INTERNO);

  Logger.log('Cliente: ' + folderCliente.getName());
  Logger.log('Interno: ' + folderInterno.getName());
}

function testDoPostPdf() {
  const e = {
    postData: {
      contents: JSON.stringify({
        tipo: 'cliente',
        formato: 'pdf',
        filename: 'prueba.pdf',
        pdf: Utilities.base64Encode('PDF de prueba')
      })
    }
  };

  Logger.log(doPost(e).getContent());
}
