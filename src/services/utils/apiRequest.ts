import axios from 'axios'
import type { AxiosRequestConfig, Method } from 'axios'
import { Log } from '@/src/utils/logger'

type ApiRequestOptions<TData = unknown> = {
  method?: Method
  data?: TData
  params?: Record<string, unknown>
  headers?: Record<string, string>
}

export async function apiRequest<TData = unknown, TResponse = unknown>(
  endpoint: string,
  options: ApiRequestOptions<TData> = {}
): Promise<TResponse> {
  const { method = 'GET', data, params, headers } = options

  const config: AxiosRequestConfig = {
    baseURL: process.env.NEXT_PUBLIC_APP_URL,
    url: endpoint,
    method,
    data,
    params,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    withCredentials: true,
  }

  try {
    const response = await axios.request<TResponse>(config)
    return response.data
  } catch (error) {
    Log.error(`API request failed: ${method} ${endpoint}`, error)
    throw error
  }
}
