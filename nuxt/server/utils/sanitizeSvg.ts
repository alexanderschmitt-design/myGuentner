/**
 * SVG-Sicherheitsprüfung für user-uploaded SVG-Dateien.
 *
 * Ablehnen, nicht still bereinigen — damit der Upload-Caller weiß,
 * warum die Datei abgelehnt wurde und die Quelle prüfen kann.
 *
 * Gemeinsam genutzt von Custom-Icon-Upload und Custom-Grafik-Upload.
 */

export function validateSvg(content: string): { ok: boolean; error?: string } {

  if (/<script/i.test(content))
    return { ok: false, error: 'SVG enthält <script>-Tag' }

  if (/\bon\w+\s*=/i.test(content))
    return { ok: false, error: 'SVG enthält Event-Handler-Attribut (on*)' }

  if (/<image/i.test(content))
    return { ok: false, error: 'SVG enthält <image>-Element' }

  if (/xlink:href\s*=\s*["']https?:/i.test(content))
    return { ok: false, error: 'SVG enthält externe URL via xlink:href' }

  if (/\bhref\s*=\s*["']https?:/i.test(content))
    return { ok: false, error: 'SVG enthält externe URL via href' }

  return { ok: true }
}
