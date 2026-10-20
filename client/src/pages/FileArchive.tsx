import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileImage, FileSpreadsheet, FileText, FolderOpen, LoaderCircle, Trash2, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { EmptyState, PageHeader, Panel, PrimaryButton } from "@/components/shared/Primitives";
import {
  ALLOWED_RESTAURANT_FILE_TYPES,
  MAX_RESTAURANT_FILE_SIZE,
  deleteRestaurantFile,
  getRestaurantFileUrl,
  listRestaurantFiles,
  uploadRestaurantFile,
  validateRestaurantFile,
} from "@/lib/restaurantFiles";
import type { RestaurantFile } from "@/types/models";

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFileDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function FileTypeIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <FileImage />;
  if (mimeType.includes("spreadsheet")) return <FileSpreadsheet />;
  return <FileText />;
}

export default function FileArchive() {
  const { restaurantId, user, canManageOperations } = useAuth();
  const [files, setFiles] = useState<RestaurantFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      setFiles(await listRestaurantFiles(restaurantId));
      setMessage(null);
    } catch {
      setMessage("Impossibile caricare l'archivio del ristorante.");
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !restaurantId || !user || !canManageOperations) return;

    try {
      validateRestaurantFile(file);
      setWorkingId("upload");
      const uploadedFile = await uploadRestaurantFile({ restaurantId, userId: user.id, file });
      setFiles((current) => [uploadedFile, ...current]);
      setMessage("File archiviato correttamente.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossibile archiviare il file.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleDownload = async (file: RestaurantFile) => {
    try {
      setWorkingId(file.id);
      window.open(await getRestaurantFileUrl(file), "_blank", "noopener,noreferrer");
    } catch {
      setMessage("Impossibile aprire il file richiesto.");
    } finally {
      setWorkingId(null);
    }
  };

  const handleDelete = async (file: RestaurantFile) => {
    if (!canManageOperations || !window.confirm(`Eliminare “${file.fileName}” dall'archivio?`)) return;
    try {
      setWorkingId(file.id);
      await deleteRestaurantFile(file);
      setFiles((current) => current.filter((item) => item.id !== file.id));
      setMessage("File rimosso dall'archivio.");
    } catch {
      setMessage("Impossibile rimuovere il file. Riprova.");
    } finally {
      setWorkingId(null);
    }
  };

  const allowedExtensions = ".pdf,.png,.jpg,.jpeg,.webp,.txt,.docx,.xlsx";

  return (
    <div className="page archive-page">
      <PageHeader
        eyebrow="Documenti del ristorante"
        title="Archivio"
        description="Conserva e consulta i documenti riservati del tuo ristorante."
        action={canManageOperations ? (
          <PrimaryButton onClick={() => fileInputRef.current?.click()} disabled={workingId === "upload"}>
            {workingId === "upload" ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />} Carica file
          </PrimaryButton>
        ) : undefined}
      />

      <input
        ref={fileInputRef}
        className="archive-file-input"
        type="file"
        accept={allowedExtensions}
        onChange={(event) => void handleUpload(event)}
      />

      <Panel className="archive-info-panel">
        <FolderOpen size={20} />
        <div><b>Archivio privato del ristorante</b><span>PDF, immagini, TXT, DOCX e XLSX fino a 10 MB. I documenti restano disponibili solo agli utenti autorizzati.</span></div>
      </Panel>

      {message && <div className="archive-message" role="status">{message}</div>}

      <Panel className="archive-list-panel">
        <div className="archive-list-head"><span>File archiviati</span><small>{files.length} {files.length === 1 ? "elemento" : "elementi"}</small></div>
        {loading ? (
          <div className="archive-loading"><LoaderCircle className="spin" size={18} />Caricamento archivio...</div>
        ) : files.length === 0 ? (
          <EmptyState title="Archivio vuoto" description={canManageOperations ? "Carica il primo documento riservato del ristorante." : "Non sono ancora presenti documenti nel tuo archivio."} />
        ) : (
          <div className="archive-list">
            {files.map((file) => {
              const working = workingId === file.id;
              return <article className="archive-file-row" key={file.id}>
                <span className="archive-file-icon"><FileTypeIcon mimeType={file.mimeType} /></span>
                <div className="archive-file-copy"><b title={file.fileName}>{file.fileName}</b><small>{formatFileSize(file.sizeBytes)} · Caricato il {formatFileDate(file.createdAt)}</small></div>
                <div className="archive-file-actions">
                  <button aria-label={`Apri ${file.fileName}`} onClick={() => void handleDownload(file)} disabled={working}><Download size={16} /></button>
                  {canManageOperations && <button className="archive-delete" aria-label={`Elimina ${file.fileName}`} onClick={() => void handleDelete(file)} disabled={working}><Trash2 size={16} /></button>}
                </div>
              </article>;
            })}
          </div>
        )}
      </Panel>

      <p className="archive-access-note">{canManageOperations ? "Puoi caricare o rimuovere documenti. Dipendenti autorizzati possono solo consultarli." : "Puoi consultare e scaricare i documenti autorizzati del ristorante."}</p>
    </div>
  );
}
