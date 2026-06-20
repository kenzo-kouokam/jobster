# Jobster — Agent IA de recherche d'emploi

[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org)
[![Groq](https://img.shields.io/badge/LLM-Groq%20%2F%20Ollama-F55036?style=flat-square)](https://groq.com)

**🔗 Démo en ligne : [à compléter après déploiement](https://jobster.vercel.app)**

---

## Contexte

**Le problème** : je mène une recherche d'alternance intensive et multi-canal — des dizaines d'offres à analyser quotidiennement, sur des critères différents (stack technique, rythme, localisation), sans outil centralisé pour trier, prioriser et candidater efficacement.

**La solution** : j'ai développé Jobster, un agent IA conversationnel qui orchestre 8 outils en autonomie — recherche d'offres en temps réel (via 2 API publiques que j'ai reverse-engineerées par interception réseau : La Bonne Boîte, Mes Événements Emploi), scoring de matching contre mon profil, génération automatique de lettres de motivation (.docx). Backend FastAPI (16 endpoints), routing d'intention via un LLM (Groq en production / Ollama en local), frontend React, persistance SQLite.

**Le résultat** : 98 entreprises et 372 événements intégrés en production — recherche, scoring et génération de documents réunis dans un seul flux automatisé, là où le processus était manuel et dispersé sur plusieurs outils.

> Projet initialement développé en équipe de 4 dans le cadre du cursus Epitech (Hephaestus). Ce repo est mon fork personnel : j'y porte ma contribution (architecture backend, agent IA, system prompt, intégration des API, déploiement) vers une version déployée et maintenue de façon autonome.

### Logique derrière le projet

Ce qui m'intéressait n'était pas de "faire un chatbot", mais de répondre à un problème métier concret avec le système le plus simple qui le résout vraiment :

- **Comprendre le besoin avant la techno** : le vrai coût n'était pas de "ne pas trouver d'offres" mais de perdre du temps à les trier manuellement sur des critères incohérents d'un site à l'autre → d'où le choix d'une interface conversationnelle (un seul point d'entrée) plutôt qu'un agrégateur de plus.
- **Aller chercher la donnée là où elle est, même non documentée** : quand les scopes officiels (France Travail) n'étaient pas accessibles pour 2 des 8 outils, j'ai fait du reverse engineering d'API privées par interception réseau (Playwright) plutôt que d'abandonner la fonctionnalité.
- **Dégrader proprement plutôt que planter** : chaque source de données (8 scrapers, 2 LLM possibles) échoue en silence et retombe sur les autres sources — l'agent reste utilisable même si une API tombe.
- **Optimiser le coût avant la sophistication** : LLM local gratuit en dev, bascule vers une API cloud gratuite (Groq) en prod plutôt qu'un abonnement payant — le bon outil au bon moment, pas le plus impressionnant sur le papier.

---

## Compétences mobilisées

| Domaine | Détail |
|---|---|
| **Backend / API** | FastAPI, conception de 16 endpoints REST, SQLite, gestion CORS, variables d'environnement / secrets |
| **IA appliquée** | Routing d'intention (NLU par règles + fallback LLM), prompt engineering, intégration LLM interchangeable (Ollama ↔ Groq) |
| **Reverse engineering** | Interception réseau (Playwright) pour identifier 2 API privées non documentées et les intégrer en production |
| **Scraping & résilience** | BeautifulSoup, Playwright, gestion d'erreurs en cascade (dégradation propre multi-sources) |
| **Frontend** | React 18, gestion d'état, consommation d'API REST, configuration par variables d'environnement |
| **Génération de documents** | python-docx, ReportLab, iCalendar |
| **DevOps / déploiement** | Render, Vercel, Groq, gestion des secrets, CI gratuite (free tier), CORS multi-domaines |
| **Esprit produit** | Priorisation des gaps par rapport coût / impact, dégradation acceptable vs blocage total |

---

## Les 8 outils de Jobster

| # | Outil | Commande exemple |
|---|-------|-----------------|
| 1 | **Recherche d'offres** — France Travail + Adzuna en temps réel | `"développeur web Lyon CDI"` |
| 2 | **Analyse d'offre** — décrypte une annonce depuis son URL | `"analyse cette offre https://..."` ou bouton 🔍 sur la carte |
| 3 | **Score de matching** — compatibilité profil / offre (nécessite un CV) | `"match https://... avec mon profil"` |
| 4 | **Lettre de motivation & Email** — rédaction personnalisée à partir de l'offre | `"lettre https://..."` · `"prépare un email pour https://..."` |
| 5 | **Rapport entreprise** — avis, actualités, données légales | `"rapport entreprise Capgemini"` |
| 6 | **Tracker candidatures** — suivi SQLite avec statuts | `"tracker voir"` · `"tracker ajouter"` |
| 7 | **La Bonne Boîte** — entreprises susceptibles de recruter (API privée reverse-engineerée) | `"bonne boite développeur Paris"` |
| 8 | **Événements emploi** — salons, job datings, forums (API privée reverse-engineerée) | `"évènements emploi Marseille"` |

---

## Schéma du flux de données

<img width="1400" height="1800" alt="01_flux_donnees" src="https://github.com/user-attachments/assets/0827e9c8-5679-45d3-bf78-b864e5e425e7" />

---

## Architecture technique

<img width="1600" height="1100" alt="02_architecture" src="https://github.com/user-attachments/assets/2ae90b41-2d15-4cc4-adab-3fd24a4cb482" />

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React 18 + DM Sans + Playfair Display |
| Serveur API | Python + FastAPI + Uvicorn |
| Moteur IA | Groq (cloud, gratuit) en production · Ollama + Qwen3 1.7B en local |
| Function calling | Routing d'intention personnalisé (mots-clés + fallback LLM) |
| Scraping offres | requests + BeautifulSoup4 + Playwright (best-effort, dégradation propre si indisponible) |
| API La Bonne Boîte | API privée reverse-engineerée — `labonneboite.francetravail.fr/api/v2/search` |
| API Événements emploi | API privée reverse-engineerée — `mesevenementsemploi.francetravail.fr` (POST) |
| Génération Word | python-docx |
| Génération PDF | ReportLab |
| Base de données | SQLite |
| Calendrier | iCalendar (.ics) |
| Hébergement | Render (backend) + Vercel (frontend) — 100% free tier |

---

## Lancer le projet en local

### Prérequis

| Outil | Version | Lien |
|-------|---------|------|
| Python | 3.9+ | [python.org](https://python.org/downloads) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Git | any | [git-scm.com](https://git-scm.com) |
| Ollama *(optionnel, sinon utiliser Groq)* | latest | [ollama.ai](https://ollama.ai) |

### 1 — Cloner le projet

```bash
git clone https://github.com/kenzo-kouokam/jobster.git
cd jobster
```

### 2 — Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows : venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Renseigner GROQ_API_KEY (gratuit sur console.groq.com) ou laisser vide pour utiliser Ollama en local
# Les clés FRANCE_TRAVAIL_* / ADZUNA_* sont optionnelles : sans elles, ces 2 sources renvoient
# simplement 0 résultat, le reste de l'app fonctionne normalement.

uvicorn server:app --reload --port 8000
```

### 3 — Frontend

```bash
cd frontend/jobster-app
npm install
npm start
```

Ouvre **http://localhost:3000**.

> Étapes détaillées de déploiement en production (Render + Vercel + Groq, 100% gratuit) : voir [`DEPLOY.md`](DEPLOY.md).

---

## Utilisation rapide

| Tu tapes... | Ce que Jobster fait |
|-------------|---------------------|
| `développeur web Lyon CDI` | Scrape les offres en temps réel, affiche des cartes cliquables |
| `analyse cette offre https://...` | Analyse l'annonce — missions, compétences, salaire |
| `rapport entreprise Capgemini` | Récupère avis, actualités et données légales |
| `match https://... avec mon profil` | Calcule le score de compatibilité (CV requis) |
| `lettre https://...` | Génère une lettre de motivation personnalisée |
| `tracker voir` | Affiche toutes les candidatures en cours |
| `bonne boite développeur Paris` | Entreprises susceptibles de recruter |
| `évènements emploi Marseille` | Salons emploi et job datings à venir |

---

## Structure du projet

```
jobster/
│
├── backend/
│   ├── server.py          # FastAPI — /chat, /candidatures, /profile, /documents, /favorites, /projects
│   ├── requirements.txt
│   └── .env.example       # Modèle de configuration (aucun secret)
│
├── frontend/
│   └── jobster-app/
│       └── src/
│           ├── App.js
│           ├── config.js           # URL backend configurable (REACT_APP_API_URL)
│           └── components/         # Chat, Tracker, ProfileForm, DocumentsView, JobCard...
│
├── scraping/
│   ├── jobster_agent.py   # Agent IA — 8 outils (routing par mots-clés)
│   ├── jobster_scraper.py # France Travail + Adzuna + Indeed/Cadremploi/JobTeaser/WTTJ (Playwright)
│   ├── llm_backend.py     # Bascule Groq (cloud) / Ollama (local)
│   └── .env.example
│
├── docs/                  # Documentation UX/technique d'origine — personas, journey map, architecture
├── DEPLOY.md              # Guide de déploiement pas à pas + gaps connus et priorisation
└── README.md
```

---

## Dépannage

| Problème | Solution |
|----------|----------|
| `ModuleNotFoundError` | Active le venv : `source venv/bin/activate` |
| Backend inaccessible | Vérifie que uvicorn tourne sur le port 8000 |
| Aucune offre trouvée | Normal sans clés France Travail/Adzuna — voir `DEPLOY.md` pour les obtenir gratuitement |
| Réponses lentes en local | Normal avec Ollama sur CPU (10-30s) — Groq est quasi instantané |
| Page blanche React | Ouvre F12 dans le navigateur et consulte la Console |

---

## Limites connues et axes d'amélioration

Voir [`DEPLOY.md`](DEPLOY.md) section "Gaps" pour le détail et la priorisation coût/effort :
- Routing d'intention par mots-clés (pas encore de pré-classification IA généralisée)
- Scraping best-effort sur certaines sources sans API officielle (anti-bot, sélecteurs fragiles)
- Pas encore de déduplication des offres entre sources

---

## Licence

Usage personnel / portfolio. Projet à l'origine développé dans le cadre du cursus Epitech (Hephaestus).
