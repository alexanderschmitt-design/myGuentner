-- Docs die seit dem alten dms-import Bug auf 'processing' hängen (kein
-- Fehler-Update wenn Text-Extraktion/Embedding fehlschlug) mit einem
-- Marker-Fehler auf 'failed' setzen. Der User kann sie dann via
-- Reprocess-Button neu triggern — der neue Code (2026-08-21) propagiert
-- den echten Fehler in die documents.error-Spalte.

UPDATE documents
SET status = 'failed',
    error = COALESCE(error, 'Bulk-unstick 2026-08-21: bitte Reprocess klicken, damit der echte Fehler sichtbar wird.')
WHERE status = 'processing'
  AND chunk_count = 0
  AND processed_at IS NULL;
