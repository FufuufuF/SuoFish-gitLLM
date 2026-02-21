import axios, { type AxiosInstance } from "axios";
import { API_CONFIG } from "./config";

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

  public get<T>(apiPath: string, params?: any): Promise<T> {
    return this.axios.get(apiPath, { params });
  }

  public post<T, D>(apiPath: string, data: D): Promise<T> {
    return this.axios.post(apiPath, data);
  }

  public patch<T, D>(apiPath: string, data: D): Promise<T> {
    return this.axios.patch(apiPath, data);
  }
}

export const apiClient = new ApiClient();
