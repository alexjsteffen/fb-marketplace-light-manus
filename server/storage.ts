// Storage helpers — supports Manus Forge API, or falls back to local file storage

import fs from "fs";
import path from "path";

type StorageConfig = { baseUrl: string; apiKey: string };

function getStorageConfig(): StorageConfig | null {
  // Only use the Forge storage proxy when explicitly configured
  const baseUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

  if (!baseUrl || !apiKey) {
    return null;
  }

  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}

function buildUploadUrl(baseUrl: string, relKey: string): URL {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}

async function buildDownloadUrl(
  baseUrl: string,
  relKey: string,
  apiKey: string
): Promise<string> {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey),
  });
  return (await response.json()).url;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function toFormData(
  data: Buffer | Uint8Array | string,
  contentType: string,
  fileName: string
): FormData {
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

// ---------------------------------------------------------------------------
// Local file-system fallback (used when Forge API is not configured)
// ---------------------------------------------------------------------------

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

function localPut(
  relKey: string,
  data: Buffer | Uint8Array | string
): { key: string; url: string } {
  ensureUploadsDir();
  const sanitizedKey = relKey.replace(/\.\./g, "").replace(/^\/+/, "");
  const filePath = path.join(UPLOADS_DIR, sanitizedKey);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, data);
  return { key: sanitizedKey, url: `/uploads/${sanitizedKey}` };
}

function localGet(relKey: string): { key: string; url: string } {
  const sanitizedKey = relKey.replace(/\.\./g, "").replace(/^\/+/, "");
  return { key: sanitizedKey, url: `/uploads/${sanitizedKey}` };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getStorageConfig();
  if (!config) {
    return localPut(relKey, data);
  }

  const { baseUrl, apiKey } = config;
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string; }> {
  const config = getStorageConfig();
  if (!config) {
    return localGet(relKey);
  }

  const { baseUrl, apiKey } = config;
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey),
  };
}
