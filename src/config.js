const apiUrl = import.meta.env.VITE_API_URL?.trim()

if (!apiUrl) {
  throw new Error('VITE_API_URL no está definido. Crea un archivo .env basado en .env.example y asigna la URL del backend.')
}

export const API_URL = apiUrl
