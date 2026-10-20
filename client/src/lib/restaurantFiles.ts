import { supabase } from "@/lib/supabase";
import type { RestaurantFile, RestaurantFileUpload } from "@/types/models";

export const RESTAURANT_DOCUMENTS_BUCKET = "restaurant-documents";
export const MAX_RESTAURANT_FILE_SIZE = 10 * 1024 * 1024;
export const ALLOWED_RESTAURANT_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

type DatabaseRestaurantFile = {
  id: string;
  restaurant_id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_by: string;
  created_at: string;
};

function mapFile(row: DatabaseRestaurantFile): RestaurantFile {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

function extensionFor(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return extension ? `.${extension}` : "";
}

function objectPath(restaurantId: string, file: File) {
  return `${restaurantId}/${crypto.randomUUID()}${extensionFor(file)}`;
}

export function validateRestaurantFile(file: File) {
  if (!ALLOWED_RESTAURANT_FILE_TYPES.includes(file.type)) {
    throw new Error("Formato non supportato. Carica PDF, immagini, TXT, DOCX o XLSX.");
  }
  if (file.size > MAX_RESTAURANT_FILE_SIZE) {
    throw new Error("Il file supera la dimensione massima di 10 MB.");
  }
  if (!file.size) throw new Error("Il file selezionato è vuoto.");
}

export async function listRestaurantFiles(restaurantId: string) {
  if (!supabase) throw new Error("Configurazione Supabase non disponibile.");
  const { data, error } = await supabase
    .from("restaurant_files")
    .select("id, restaurant_id, storage_path, file_name, mime_type, size_bytes, created_by, created_at")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DatabaseRestaurantFile[]).map(mapFile);
}

export async function uploadRestaurantFile({ restaurantId, userId, file }: RestaurantFileUpload) {
  if (!supabase) throw new Error("Configurazione Supabase non disponibile.");
  validateRestaurantFile(file);

  const storagePath = objectPath(restaurantId, file);
  const { error: uploadError } = await supabase.storage
    .from(RESTAURANT_DOCUMENTS_BUCKET)
    .upload(storagePath, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error: metadataError } = await supabase
    .from("restaurant_files")
    .insert({
      restaurant_id: restaurantId,
      storage_path: storagePath,
      file_name: file.name.slice(0, 180),
      mime_type: file.type,
      size_bytes: file.size,
      created_by: userId,
    })
    .select("id, restaurant_id, storage_path, file_name, mime_type, size_bytes, created_by, created_at")
    .single();

  if (metadataError) {
    await supabase.storage.from(RESTAURANT_DOCUMENTS_BUCKET).remove([storagePath]);
    throw metadataError;
  }
  return mapFile(data as DatabaseRestaurantFile);
}

export async function getRestaurantFileUrl(file: RestaurantFile) {
  if (!supabase) throw new Error("Configurazione Supabase non disponibile.");
  const { data, error } = await supabase.storage
    .from(RESTAURANT_DOCUMENTS_BUCKET)
    .createSignedUrl(file.storagePath, 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteRestaurantFile(file: RestaurantFile) {
  if (!supabase) throw new Error("Configurazione Supabase non disponibile.");
  const { error: metadataError } = await supabase.from("restaurant_files").delete().eq("id", file.id);
  if (metadataError) throw metadataError;
  const { error: storageError } = await supabase.storage.from(RESTAURANT_DOCUMENTS_BUCKET).remove([file.storagePath]);
  if (storageError) throw storageError;
}
