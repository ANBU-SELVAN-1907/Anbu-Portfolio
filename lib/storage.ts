import { firebaseBucket, store } from "./firebase";
import { r2Put, r2Read, r2Remove, r2DownloadUrl } from "./r2";
export async function storageDownload(id: string) {
  const row = await store.get("media", id);
  return row?.storage === "r2"
    ? r2DownloadUrl(
        `media/${id}`,
        String(row.type).startsWith("video/") ||
          String(row.type).startsWith("audio/")
          ? 3600
          : 60,
      )
    : null;
}
// New writes use R2 exclusively. Existing Firestore files remain readable until migrated.
export const fileBucket = {
  async put(
    id: string,
    bytes: Uint8Array,
    options: { httpMetadata: { contentType: string } },
  ) {
    await r2Put(`media/${id}`, bytes, options.httpMetadata.contentType);
  },
  async get(id: string) {
    const row = await store.get("media", id);
    return row?.storage === "r2"
      ? r2Read(`media/${id}`)
      : firebaseBucket.get(id);
  },
  async delete(id: string) {
    const row = await store.get("media", id);
    if (row?.storage === "r2") await r2Remove(`media/${id}`);
    else await firebaseBucket.delete(id);
  },
};
