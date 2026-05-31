import { getApiBaseUrl } from "./config";

export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

const resolveOrigin = (): string => {
  if (typeof window !== "undefined") return window.location.origin;
  return "http://localhost:5173";
};

const buildUrl = (path: string, params?: QueryParams): string => {
  const base = getApiBaseUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = base.startsWith("http")
    ? new URL(`${base}${normalizedPath}`)
    : new URL(`${base}${normalizedPath}`, resolveOrigin());

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit & { params?: QueryParams } = {},
): Promise<T> => {
  const { params, ...init } = options;
  const url = buildUrl(path, params);

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string | unknown };
      if (typeof body.detail === "string") {
        detail = body.detail;
      } else if (body.detail !== undefined) {
        detail = JSON.stringify(body.detail);
      }
    } catch {
      /* resposta não-JSON */
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};
