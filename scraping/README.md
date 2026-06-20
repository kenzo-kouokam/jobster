# Scraping : Jobster

Ce dossier contient le moteur de Jobster : le scraper multi-sources et l'agent IA avec ses 8 outils actifs.

---

## Fichiers

```
scraping/
├── jobster_scraper.py        # Récupère les offres via les APIs France Travail et Adzuna
├── jobster_agent.py          # Agent IA avec les 8 outils actifs — le cerveau du projet
├── .env                      # Clés API (ne jamais committer, déjà dans .gitignore)
└── candidatures_jobster.db   # Base SQLite du tracker (générée automatiquement au premier lancement)
```

---

## Installation

```
pip install -r ../backend/requirements.txt
```

Ou depuis le dossier backend :
```
pip install -r requirements.txt
```

Installer Ollama : https://ollama.com puis :
```
ollama pull qwen3:1.7b
```

---

## Fichier .env à créer

Crée un fichier `.env` dans ce dossier `scraping/` avec ce contenu :

```
FRANCE_TRAVAIL_CLIENT_ID=ton_client_id
FRANCE_TRAVAIL_CLIENT_SECRET=ton_client_secret
ADZUNA_APP_ID=ton_app_id
ADZUNA_APP_KEY=ton_app_key
```

Ce fichier doit aussi être copié dans `backend/` pour que le serveur FastAPI puisse l'utiliser :

```
# Windows
copy scraping\.env backend\.env
```

Obtenir tes propres clés gratuitement : voir [`DEPLOY.md`](../DEPLOY.md).

---

## Lancer le scraper seul (pour tester)

```
python jobster_scraper.py
```

Ce script teste directement la connexion aux APIs France Travail et Adzuna et affiche les offres trouvées dans le terminal.

## Lancer l'agent IA seul (pour tester)

```
python jobster_agent.py
```

Ce script lance l'agent en mode terminal. Tu peux taper des commandes directement pour tester les outils sans passer par le frontend.

---

## Architecture interne

```
React (frontend)
    |
    | POST /chat
    v
FastAPI (backend/server.py)
    |
    | importe et appelle
    v
jobster_agent.py
    |
    |-- détecte l'intention
    |-- appelle le bon outil
    |
    |-- jobster_scraper.py    (recherche d'offres)
    |-- Ollama + Qwen3        (réponses conversationnelles)
    |-- APIs France Travail   (données officielles)
    |-- Adzuna API            (agrège Monster, Reed et autres)
    |-- Indeed (Playwright)   (thread démon, timeout 25 s)
    |-- WTTJ (Playwright)     (best-effort, retourne [] si bloqué)
    v
résultat renvoyé au backend, puis au frontend
```

---

## Les 8 outils actifs — mots-clés déclencheurs

| # | Ce que tu tapes | Ce que Jobster fait |
|---|----------------|---------------------|
| 1 | `chef de projet Lyon` | Recherche d'offres en temps réel sur France Travail et Adzuna |
| 2 | `analyse cette offre https://...` | Analyse complète d'une annonce : missions, compétences, salaire |
| 3 | `match [CV] https://...` | Calcule un score de compatibilité entre ton profil et l'offre |
| 4 | `lettre https://...` ou `prépare un email pour https://...` | Génère une lettre de motivation (.docx) ou un email de candidature prêt à envoyer |
| 5 | `rapport entreprise Capgemini` | Récupère avis employés, actualités et données légales |
| 6 | `tracker voir` / `tracker ajouter` / `tracker statut` | Gère le suivi des candidatures dans la base SQLite |
| 7 | `bonne boite développeur Paris` | API publique LBB — résout ROME + citycode via autocomplete, retourne les entreprises triées par score de recrutement |
| 8 | `évènement emploi Marseille` | API publique MEE — retourne les salons, job datings et ateliers emploi à venir par département |

---

## Sources actives

| Source | Volume | Ce qu'elle couvre |
|--------|--------|-------------------|
| France Travail API v2 | Jusqu'à 50 offres par requête | Offres officielles France Travail |
| Adzuna API | Jusqu'à 10 offres par requête | Agrège Monster, Reed et autres jobboards |
| Indeed (Playwright) | ~5 offres par requête | Scraping Playwright headless — best-effort (anti-bot) |
| WTTJ (Playwright) | 0–5 offres | Best-effort — SPA anti-headless, retourne [] silencieusement si bloqué |
| La Bonne Boîte (API publique) | Jusqu'à 10 entreprises par requête | Entreprises à fort potentiel d'embauche — `labonneboite.francetravail.fr/api/v2/search` |
| Mes Événements Emploi (API publique) | Jusqu'à 8 événements par requête | Salons et job datings — `mesevenementsemploi.francetravail.fr/api-candidat/mee/v1/de/evenement/all/filtered` |

---

## Comment fonctionne jobster_scraper.py

1. Authentification OAuth2 sur l'API France Travail (token temporaire de 25 minutes)
2. Requête de recherche avec les mots-clés et le département déduit de la ville
3. Requête parallèle sur Adzuna avec les mêmes critères
4. Fusion et dédoublonnage des résultats
5. Retour d'une liste de dictionnaires avec : titre, entreprise, lieu, contrat, lien, source

---

## Comment fonctionne jobster_agent.py

1. Reçoit le message de l'utilisateur depuis `server.py`
2. Le backend injecte le profil utilisateur (`profil.json`) dans chaque appel Ollama via `build_system_prompt()`
3. Le backend passe l'historique de conversation (`history[]`, 6 derniers messages) pour maintenir le contexte
4. `server.py` analyse l'intention et route directement vers le bon outil (détection par mots-clés, sans passer par Ollama)
5. `comprendre_demande()` extrait mots-clés et ville si nécessaire — avec filets de sécurité (mots génériques → profil, pas de ville → profil localisations)
6. L'outil est exécuté et retourne le résultat brut au backend
7. Le backend formate et renvoie au frontend

**Phase 3.5 — outils 7 & 8 réimplémentés (2026-06-10) :**
- ✅ `api_la_bonne_boite()` — remplace l'API FT inaccessible par l'API publique `labonneboite.francetravail.fr/api/v2/search`. Résout le code ROME via l'autocomplete LBB, le citycode INSEE via l'autocomplete location, sélectionne le ROME le plus pertinent par scoring sur les mots-clés
- ✅ `api_evenements_emploi()` — remplace l'API FT inaccessible par l'API publique `mesevenementsemploi.francetravail.fr/api-candidat/mee/v1/de/evenement/all/filtered` (POST). Nécessite les headers `x-initialized-at` (timestamp ms) et `user_location: 2`
- ✅ `server.py` — appel `api_la_bonne_boite` mis à jour pour passer la ville extraite par `comprendre_demande()`

**Phase 2.5 — améliorations agent (2026-05-19/25) :**
- Profil injecté automatiquement dans chaque réponse Ollama (poste cible, localisations, compétences, CV texte)
- Recherche "vague/profilée" : bypass `comprendre_demande()` → profil lu directement (titre_cible + localisations)
- Détection ville déterministe dans `server.py` (pas d'hallucination Ollama "Paris par défaut")
- Détection type de contrat dans le message (CDI/CDD/Alternance/Stage/etc.) — écrase les mots-clés génériques
- Fallback national : si 0 résultats → autres villes profil → France (sans filtre département)

---

## Problèmes connus (à corriger)

| Problème | Fichier | Assigné à | Statut |
|---------|---------|-----------|---------|
| `playwright` manquant dans `requirements.txt` | `requirements.txt` | Yahia | ✅ Ajouté 2026-05-25 |
| Indeed silencieusement cassé (sélecteurs HTML obsolètes) | `jobster_scraper.py` | Cédric | ✅ Corrigé 2026-06-08 — 5 offres réelles testées |
| WTTJ bloqué par anti-bot SPA | `jobster_scraper.py` | Cédric | ⚠️ Best-effort — retourne [] silencieusement, non bloquant |
| `ville_vers_dept()` — fallback national mappait sur Paris | `jobster_agent.py` | Gildas/Gendell | ✅ Corrigé 2026-05-25 |
| Recherche nationale : `departement` toujours envoyé même vide | `jobster_scraper.py` | Gildas/Gendell | ✅ Corrigé 2026-05-25 |
| `init_db()` créait un schéma 8 colonnes conflictuel avec server.py (20 colonnes) | `jobster_agent.py` | Cédric | ✅ Corrigé 2026-06-08 — `init_db()` est désormais un no-op |
| Outils 7 & 8 bloqués (scopes `api_labonneboitev1` + `api_evenementsv1` non activés) | `jobster_agent.py` | Gildas/Cédric | ✅ Réimplémentés avec APIs publiques LBB + MEE — 2026-06-10 |

**Fixes appliqués le 2026-05-12 (Gendell) :**
- ✅ `requirements.txt` réécrit proprement — était corrompu encodage UTF-16, manquait `beautifulsoup4`, `requests`, `python-dotenv`
- ✅ `load_dotenv()` dans `jobster_scraper.py` et `jobster_agent.py` — maintenant chemin absolu relatif au fichier
- ✅ `ADZUNA_API_KEY` renommé en `ADZUNA_APP_KEY` dans `backend/.env` — corrigeait toutes les erreurs 401 Adzuna

**Fixes appliqués le 2026-05-14 (Gendell) :**
- ✅ Normalisation des types de contrat Adzuna dans `JobCard.js` — `full_time` → "Temps plein", `permanent` → "CDI", etc.

**Fixes appliqués le 2026-05-25 (Gendell) :**
- ✅ `ville_vers_dept()` — ajouté `"france": "", "national": "", "": ""` → recherche nationale sans filtre département
- ✅ `scrape_france_travail()` — paramètre `departement` ajouté conditionnellement (skipé si vide)
- ✅ `lancer_scraper()` — skip du dept quand vide pour recherche nationale sans filtrer sur Paris
- ✅ `requirements.txt` — `playwright` ajouté, encodage UTF-16 corrigé, packages manquants ajoutés

## Dépannage

| Problème | Solution |
|----------|----------|
| `ModuleNotFoundError: No module named 'dotenv'` | `pip install python-dotenv` |
| `ModuleNotFoundError: No module named 'requests'` | `pip install requests` |
| `ERREUR France Travail : 400 Bad Request` | Vérifie que les clés dans `.env` sont correctes |
| `AUCUN RÉSULTAT` | Vérifie que le fichier `.env` existe bien dans `scraping/` |
| `name 'ville_vers_dept' is not defined` | La fonction est en bas du fichier — ne pas la supprimer |
| Adzuna retourne 400 | Vérifie ADZUNA_APP_ID et ADZUNA_APP_KEY dans `.env` |
