import axios, { type AxiosInstance } from "axios";
import { API_CONFIG } from "./config";
import type { PostSseOptions, SseEvent } from "./types";
import { parseSseChunk } from "./utils";

export class ApiClient {
  private baseUrl: string;
  private axios: AxiosInstance;

  constructor() {
    this.baseUrl = API_CONFIG.baseUrl;
    this.axios = axios.create({
      baseURL: this.baseUrl,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
      withCredentials: API_CONFIG.withCredentials,
    });

    this.axios.interceptors.response.use(
      (response) => {
        if (response.data.code === 0) {
          return response.data.data;
        } else {
          return Promise.reject(response.data.message);
        }
      },
      (error) => {
        const response = error.response;
        if (response && response.status === 401) {
          // TODO: 处理未登录
        } else {
          return Promise.reject(error);
        }
      },
    );
  }

  public get<T>(apiPath: string, config?: { params?: unknown }): Promise<T> {
    return this.axios.get(apiPath, config);
  }

  public post<T, D>(apiPath: string, data: D): Promise<T> {
    return this.axios.post(apiPath, data);
  }

  public patch<T, D>(apiPath: string, data: D): Promise<T> {
    return this.axios.patch(apiPath, data);
  }

  public async *postSSE<T extends SseEvent<unknown>, D>(
    apiPath: string,
    request: D,
    options?: PostSseOptions,
  ): AsyncGenerator<T, void, unknown> {
    const defaultHeaders: Record<string, string> = {};
    const axiosHeaders = this.axios.defaults.headers;
    const commonHeaders = axiosHeaders?.common as
      | Record<string, string>
      | undefined;
    if (commonHeaders) {
      Object.assign(defaultHeaders, commonHeaders);
    }
    if (!defaultHeaders["Content-Type"]) {
      defaultHeaders["Content-Type"] = "application/json";
    }

    const response = await fetch(`${this.baseUrl}${apiPath}`, {
      method: "POST",
      body: JSON.stringify(request),
      credentials: API_CONFIG.withCredentials ? "include" : "same-origin",
      signal: options?.signal,
      headers: {
        ...defaultHeaders,
        ...(options?.headers ?? {}),
      },
    });

    if (!response.ok) {
      throw new Error(`SSE request failed: ${response.status}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader!.read();
        if (done) {
          if (buffer.trim()) {
            const maybeEvent = parseSseChunk<T>(buffer);
            if (maybeEvent) {
              yield maybeEvent;
            }
          }
          break;
        }
        buffer += decoder.decode(value, { stream: true });

        let separatorIndex = buffer.indexOf("\n\n");
        while (separatorIndex !== -1) {
          const rawEvent = buffer.slice(0, separatorIndex);
          buffer = buffer.slice(separatorIndex + 2);
          const maybeEvent = parseSseChunk<T>(rawEvent);
          if (maybeEvent) {
            yield maybeEvent;
          }
          separatorIndex = buffer.indexOf("\n\n");
        }
      }
    } finally {
      reader?.releaseLock();
    }
  }
}

export const apiClient = new ApiClient();
