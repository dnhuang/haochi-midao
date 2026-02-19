import type { AnalyzeResponse, MenuResponse, UploadResponse } from "./types";

const BASE = "/api";

async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || res.statusText);
  }
  return res;
}

function authHeaders(password: string): HeadersInit {
  return { "X-Password": password };
}

export async function fetchMenu(password: string): Promise<MenuResponse> {
  const res = await apiFetch("/menu", { headers: authHeaders(password) });
  return res.json();
}

export async function uploadFile(password: string, file: File): Promise<UploadResponse> {
  const form = new FormData();
  form.append("file", file);
  const res = await apiFetch("/upload", {
    method: "POST",
    headers: authHeaders(password),
    body: form,
  });
  return res.json();
}

export async function analyzeOrders(
  password: string,
  orders: Record<string, number>[],
): Promise<AnalyzeResponse> {
  const res = await apiFetch("/analyze", {
    method: "POST",
    headers: { ...authHeaders(password), "Content-Type": "application/json" },
    body: JSON.stringify({ orders }),
  });
  return res.json();
}

export async function downloadLabels(
  password: string,
  sortedItems: { item_name: string; quantity: number }[],
): Promise<Blob> {
  const res = await apiFetch("/labels", {
    method: "POST",
    headers: { ...authHeaders(password), "Content-Type": "application/json" },
    body: JSON.stringify({ sorted_items: sortedItems }),
  });
  return res.blob();
}
