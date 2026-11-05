// Talks to the TrimTax API. Every number the app shows comes from here.

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const WORKSPACE_KEY = "trimtax.workspace";

export class NotFound extends Error {}

async function call<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(API_URL + path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  if (response.status === 404) {
    throw new NotFound(path);
  }
  if (!response.ok) {
    let message = `The server said ${response.status}.`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // keep the default message
    }
    throw new Error(message);
  }
  return response.json();
}

export function get<T>(path: string): Promise<T> {
  return call<T>(path);
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return call<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

// The API says where each receipt image lives, e.g. "receipt-images/rcp_140.png" or "uploads/up_…".
export function receiptImageUrl(path: string): string {
  return `${API_URL}/${path}`;
}

export async function uploadFile<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(API_URL + path, { method: "POST", body: form });
  if (!response.ok) {
    let message = `The server said ${response.status}.`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      // keep the default message
    }
    throw new Error(message);
  }
  return response.json();
}

// The browser remembers which workspace is this visitor's.
export function savedWorkspaceId(): string | null {
  try {
    return window.localStorage.getItem(WORKSPACE_KEY);
  } catch {
    return null;
  }
}

export function saveWorkspaceId(id: string) {
  try {
    window.localStorage.setItem(WORKSPACE_KEY, id);
  } catch {
    // Private mode: the workspace just won't survive a reload.
  }
}

export async function newDemoWorkspace(): Promise<string> {
  const result = await post<{ workspace_id: string }>("/workspaces/demo");
  saveWorkspaceId(result.workspace_id);
  return result.workspace_id;
}
