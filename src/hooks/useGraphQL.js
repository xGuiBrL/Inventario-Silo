import { useCallback } from 'react'
import { API_URL } from '../config'

export function useGraphQL() {
  const graphQLRequest = useCallback(async (query, variables = {}, token) => {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables })
    })

    const payload = await response.json()

    if (!response.ok || payload.errors) {
      const errorMessage = payload.errors?.[0]?.message ?? 'Error en la solicitud'
      throw new Error(errorMessage)
    }

    return payload.data
  }, [])

  return { graphQLRequest }
}
