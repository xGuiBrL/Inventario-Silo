# ReactSilo Dashboard

Aplicación SPA en React + Vite que consume el backend GraphQL del inventario. Este README reemplaza el contenido del template para documentar cómo configurar las variables sensibles antes de subir el proyecto a GitHub.

## Requisitos previos

- Node.js 20+
- npm (incluido con Node)

## Configuración de variables de entorno

1. Copia el archivo `.env.example` como `.env` en la raíz del proyecto (`ReactSilo/.env`).
2. Establece la URL del backend GraphQL en `VITE_API_URL`. Ejemplo:

```
VITE_API_URL=https://api.trescruces.com/graphql
```

> Vite cargará este archivo automáticamente. Nunca subas `.env` al repositorio, ya está excluido en `.gitignore`.

## Scripts disponibles

| Comando        | Descripción                      |
| -------------- | -------------------------------- |
| `npm install`  | Instala dependencias             |
| `npm run dev`  | Inicia el servidor de desarrollo |
| `npm run build`| Genera la versión productiva     |
| `npm run preview` | Sirve la build generada       |

## Notas de seguridad

- La URL del backend se obtiene únicamente desde las variables de entorno mediante `import.meta.env.VITE_API_URL`.
- Si la variable falta, la app fallará al arrancar para evitar builds con endpoints incorrectos.
- No almacenes tokens, contraseñas ni llaves en el código fuente; usa siempre el archivo `.env` local.
