"""
Bascule automatique entre Ollama (local, dev) et Groq (cloud, gratuit, prod)
pour le LLM de Jobster. Même interface que le package `ollama` :

    chat(model=..., messages=[...], options={...}) -> {"message": {"content": "..."}}

Si GROQ_API_KEY est défini dans l'environnement -> Groq (API compatible OpenAI).
Sinon -> Ollama local (nécessite `ollama run <model>` lancé sur la machine).
"""
import os
import requests

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def chat(model=None, messages=None, options=None):
    if GROQ_API_KEY:
        return _chat_groq(messages, options or {})
    return _chat_ollama(model, messages, options or {})


def _chat_groq(messages, options):
    headers = {"Authorization": f"Bearer {GROQ_API_KEY}"}
    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": options.get("temperature", 0.7),
    }
    reponse = requests.post(GROQ_URL, headers=headers, json=payload, timeout=30)
    reponse.raise_for_status()
    contenu = reponse.json()["choices"][0]["message"]["content"]
    return {"message": {"content": contenu}}


def _chat_ollama(model, messages, options):
    import ollama as _ollama_local
    return _ollama_local.chat(model=model, messages=messages, options=options)
