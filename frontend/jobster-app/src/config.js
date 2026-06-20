// URL du backend Jobster. En local : http://127.0.0.1:8000 par défaut.
// En production (Vercel) : défini via la variable d'environnement REACT_APP_API_URL.
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';
