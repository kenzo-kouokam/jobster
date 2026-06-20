// URL du backend Jobster. En local : http://127.0.0.1:8000 par défaut.
// En production (Vercel) : défini via la variable d'environnement REACT_APP_API_URL.
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:8000';

// Libellé du moteur LLM affiché dans l'UI. Par défaut Groq (utilisé en prod).
// En local avec Ollama, définir REACT_APP_LLM_LABEL=Ollama · Qwen3:1.7b dans .env.
export const LLM_LABEL = process.env.REACT_APP_LLM_LABEL || 'Groq · Llama 3.1';
