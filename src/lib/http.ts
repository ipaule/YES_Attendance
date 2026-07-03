export class HttpError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new HttpError(json.error || `Request failed with status ${res.status}`, res.status);
  }
  return res.json() as Promise<T>;
}
