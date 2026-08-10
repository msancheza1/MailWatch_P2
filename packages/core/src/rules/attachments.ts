import type { EmailMessage, Signal } from '../types.js';

const EXECUTABLE = new Set(['exe', 'scr', 'bat', 'cmd', 'com', 'msi', 'jar', 'vbs', 'js', 'ps1', 'apk', 'lnk', 'hta']);
const MACRO_DOCS = new Set(['docm', 'xlsm', 'xlsb', 'pptm', 'dotm']);
const ARCHIVES = new Set(['zip', 'rar', '7z', 'iso', 'img', 'gz']);

/**
 * Un adjunto web abre una página real en el navegador, servida desde el disco:
 * ningún filtro de reputación de URL la ve porque nunca hubo una URL.
 */
const WEB_PAGE = new Set(['html', 'htm', 'xhtml', 'shtml', 'svg']);

/** Extensiones que la gente confía y que por eso se usan como primera extensión falsa. */
const DECOY = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'png', 'txt']);

function extensionsOf(filename: string): string[] {
  return filename.toLowerCase().split('.').slice(1);
}

/** RF-02: análisis de adjuntos (inspección estática de nombre y tipo, no del contenido). */
export function analyzeAttachments(email: EmailMessage): Signal[] {
  const signals: Signal[] = [];

  for (const attachment of email.attachments) {
    const parts = extensionsOf(attachment.filename);
    const ext = parts.at(-1) ?? '';
    const previous = parts.at(-2);

    if (previous && DECOY.has(previous) && ext !== previous) {
      signals.push({
        id: 'attachments.double-extension',
        category: 'attachments',
        weight: 40,
        explanation: `El archivo "${attachment.filename}" aparenta ser un .${previous} pero en realidad es un .${ext}. Es un disfraz clásico para que abras un programa creyendo que es un documento.`,
        evidence: attachment.filename,
      });
      continue;
    }

    if (EXECUTABLE.has(ext)) {
      signals.push({
        id: 'attachments.executable',
        category: 'attachments',
        weight: 40,
        explanation: `El adjunto "${attachment.filename}" es un programa ejecutable (.${ext}). Abrirlo instalaría software en tu equipo.`,
        evidence: attachment.filename,
      });
      continue;
    }

    if (WEB_PAGE.has(ext)) {
      signals.push({
        id: 'attachments.web-page',
        category: 'attachments',
        weight: 35,
        explanation: `El adjunto "${attachment.filename}" es una página web (.${ext}), no un documento. Al abrirlo se ve un formulario idéntico al de un banco o un correo, pero servido desde tu propio equipo para que ningún filtro lo detecte.`,
        evidence: attachment.filename,
      });
      continue;
    }

    if (MACRO_DOCS.has(ext)) {
      signals.push({
        id: 'attachments.macro-document',
        category: 'attachments',
        weight: 30,
        explanation: `El documento "${attachment.filename}" puede contener macros (.${ext}), que son pequeños programas que se ejecutan al abrirlo.`,
        evidence: attachment.filename,
      });
      continue;
    }

    if (ARCHIVES.has(ext)) {
      signals.push({
        id: 'attachments.archive',
        category: 'attachments',
        weight: 12,
        explanation: `El adjunto viene comprimido (.${ext}), formato que se usa para que el contenido real no se pueda revisar antes de descargarlo.`,
        evidence: attachment.filename,
      });
    }
  }

  return signals;
}
