/**
 * 将 uni.request 适配为 Supabase 所需的 fetch API（App 真机必需）
 */
export async function uniFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  const method = (init?.method ?? "GET").toUpperCase();
  const headers = normalizeHeaders(init?.headers);

  return new Promise<Response>((resolve, reject) => {
    uni.request({
      url,
      method: method as UniApp.RequestOptions["method"],
      header: headers,
      data: init?.body as UniApp.RequestOptions["data"],
      responseType: "text",
      success: (res) => {
        const status = res.statusCode ?? 0;
        const body =
          typeof res.data === "string" ? res.data : JSON.stringify(res.data ?? "");

        resolve({
          ok: status >= 200 && status < 300,
          status,
          url,
          headers: new Headers(res.header as Record<string, string>),
          text: async () => body,
          json: async () => (body ? JSON.parse(body) : null),
        } as Response);
      },
      fail: (error) => {
        reject(new Error(error.errMsg || "network error"));
      },
    });
  });
}

function normalizeHeaders(
  headers?: HeadersInit
): Record<string, string> {
  if (!headers) return {};

  if (headers instanceof Headers) {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  if (Array.isArray(headers)) {
    return Object.fromEntries(headers);
  }

  return { ...headers };
}

/** 为 Promise 增加超时，避免 iOS 启动时网络调用永久挂起 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = "操作超时"
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}
