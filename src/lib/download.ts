import api from '@/lib/api'

/**
 * Download a file from the API with the signed-in session and save it under the server's filename.
 * A failed request is rethrown with its JSON error body, so getApiError can read the message.
 */
export async function downloadFromApi(path: string, params: Record<string, string | number | undefined>, fallbackFilename: string): Promise<void> {
  try {
    const response = await api.get<Blob>(path, { params, responseType: 'blob' })
    const filename = /filename="([^"]+)"/.exec(String(response.headers['content-disposition'] ?? ''))?.[1] ?? fallbackFilename
    const url = URL.createObjectURL(response.data)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'response' in error) {
      const response = (error as { response?: { data?: unknown } }).response

      if (response?.data instanceof Blob) {
        try {
          response.data = JSON.parse(await response.data.text())
        } catch {
          // Not a JSON error body; keep the original.
        }
      }
    }

    throw error
  }
}
