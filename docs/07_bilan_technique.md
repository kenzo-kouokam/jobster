# Bilan technique — Jobster
> Choix d'architecture, difficultés rencontrées, résultats mesurés
> Rédigé pour la soutenance Keynote · 30 juin 2026

---

## 1. Résumé du projet

Jobster est un agent IA de recherche d'emploi développé en 6 semaines dans le cadre du projet académique Hephaestus (Epitech MSc MSI). L'utilisateur dialogue en langage naturel avec un chatbot web : l'agent scrape des offres en temps réel, analyse des annonces, génère des documents (lettres de motivation, CV adaptés), et suit les candidatures dans une base de données.

**Chiffres clés à la livraison :**
- 3 fichiers Python backend (1510 + 1703 + 706 lignes)
- 7 composants React frontend
- 16 endpoints FastAPI
- 8 outils IA distincts
- 4 sources de scraping (France Travail, Adzuna, Indeed, WTTJ)
- 0 € de coût API (IA locale + APIs gratuites)

---

## 2. Choix d'architecture majeurs

### 2.1 IA locale — Ollama + Qwen3 1.7B

**Décision :** Faire tourner le LLM entièrement en local avec Ollama plutôt que d'appeler une API cloud (OpenAI, Anthropic).

**Pourquoi :** Contrainte budgétaire (projet académique sans financement). Les APIs LLM facturent à la requête — avec 8 outils appelés en boucle, le coût deviendrait prohibitif.

**Conséquence positive :** Aucune clé API LLM à gérer, aucun risque de quota dépassé pendant la démo.

**Conséquence négative :** Qwen3 1.7B est significativement moins capable que GPT-4 ou Claude. Les réponses peuvent être en anglais, manquer de nuance, ou halluciner des informations. Mitigation : routing déterministe dans `server.py` — l'agent n'appelle Ollama que pour la reformulation, pas pour les données critiques (offres réelles, structures JSON).

### 2.2 Routing par mots-clés plutôt que function calling

**Décision :** La détection d'intention dans `server.py` est une hiérarchie de règles déterministes (`MOTS_RECHERCHE`, `MOTS_EVENEMENTS`, `MOTS_ROME`…) plutôt qu'un vrai function calling LLM.

**Pourquoi :** Qwen3 1.7B n'est pas fiable pour le function calling — il hallucine des paramètres, rate des outils, ou reformule la question sans appeler de fonction. Le routing déterministe est 100% prévisible.

**Conséquence :** Moins flexible qu'un vrai agent (ne comprend pas les requêtes imprévues), mais beaucoup plus robuste pour une démo.

### 2.3 SQLite flat-file plutôt que PostgreSQL

**Décision :** Toutes les données (candidatures, favoris, projets) sont dans un fichier SQLite local (`scraping/candidatures_jobster.db`).

**Pourquoi :** Pas de serveur de base de données à installer ou maintenir. SQLite suffit pour un usage mono-utilisateur. Facilite le démarrage (aucune migration à lancer).

**Limite :** Non scalable multi-utilisateur. Acceptable pour le périmètre académique.

### 2.4 Scrapers Playwright en threads parallèles avec timeout

**Décision :** Indeed et WTTJ tournent en threads démons avec un timeout de 25 secondes. Ils ne bloquent pas le pipeline — France Travail + Adzuna répondent en < 5s, Playwright merge ses résultats si disponibles dans le délai.

**Pourquoi :** Un scraper Playwright peut prendre 30+ secondes. Bloquer le pipeline principal rendrait l'UX inacceptable.

**Résultat :** France Travail + Adzuna garantissent un minimum de résultats. Indeed ajoute ~5 offres supplémentaires quand le timing le permet.

---

## 3. Difficultés rencontrées et solutions

### 3.1 Biais "Paris par défaut" du LLM

**Problème :** La fonction `comprendre_demande()` utilisait des exemples few-shot qui induisaient systématiquement "Paris" comme ville même pour "développeur web CDI" sans mention de ville.

**Solution :** Réécriture des exemples few-shot avec 4 nouveaux exemples incluant des villes variées et une réponse `null` quand aucune ville n'est mentionnée. Ajout d'une liste `VILLES_CONNUES` pour la détection déterministe côté serveur.

### 3.2 Incohérence du schéma SQLite entre agent et serveur

**Problème :** `jobster_agent.py` créait sa propre table `candidatures` avec les colonnes `date`, `lien`, `date_relance`. `server.py` créait la même table avec `date_ajout`, `url`, `date_next_action`. L'agent échouait silencieusement sur ses INSERT.

**Solution :** `init_db()` dans l'agent remplacé par un no-op. Le schéma est maintenant géré uniquement par `get_db()` dans `server.py`. L'agent utilise les bons noms de colonnes.

### 3.3 Indeed — sélecteurs HTML changeants

**Problème :** Le scraper Indeed utilisait `h2.jobTitle` — Indeed avait changé ses classes CSS en `h3.jobTitle`. 0 offres retournées.

**Solution :** Mise à jour des sélecteurs. Extraction du titre depuis `aria-label` du lien `a[data-jk]` comme fallback. Ajout des flags Chromium anti-détection (`--disable-blink-features=AutomationControlled`).

### 3.4 Extraction de texte PDF — artefacts de mise en forme

**Problème :** pdfplumber extrait le texte d'un CV en respectant la mise en page, ce qui produit des doubles espaces, des sauts de ligne intempestifs, et des caractères dupliqués sur les PDF à colonnes.

**Solution :** Fonction `fix_doubled_chars()` dans `server.py` qui corrige les patterns de duplication courants. Troncature à 2000 caractères dans le system prompt pour éviter de saturer le contexte LLM.

### 3.5 CORS et développement local

**Problème :** Le frontend React (port 3000) ne pouvait pas appeler le backend FastAPI (port 8000) sans erreur CORS.

**Solution :** `CORSMiddleware` avec `allow_origins=["*"]` dans FastAPI. Acceptable en développement local — à restreindre au domaine frontend si déployé.

---

## 4. Ce qui fonctionne bien

| Fonctionnalité | Résultat mesuré |
|---|---|
| Recherche France Travail | 10-15 offres en ~2s pour n'importe quelle ville/contrat/métier |
| Scraping Indeed | 5 offres supplémentaires en ~15s si le délai le permet |
| Génération lettre de motivation | .docx prêt en ~20s (Qwen3 1.7B sur CPU) |
| Score de matching | Analyse qualitative en ~15s |
| Tracker candidatures | 11 statuts, tiroir de détail, tri multi-colonnes, filtres |
| Profil injecté | Toutes les réponses tiennent compte du profil sans que l'utilisateur répète ses critères |
| Upload CV → extraction texte | Texte extrait et injecté dans le contexte LLM en une action |
| La Bonne Boîte (outil 7) | 98 entreprises retournées pour "développeur Lyon" via API publique LBB |
| Événements emploi (outil 8) | 372 événements retournés pour Lyon (job datings, réunions, salons) via API publique MEE |

---

## 5. Limites connues et travaux futurs

| Limite | Impact | Solution envisageable |
|---|---|---|
| Qwen3 1.7B répond parfois en anglais | UX dégradée | Migrer vers Claude API ou Groq (Llama 3.1 70B gratuit) |
| WTTJ anti-bot permanent | 0 offres WTTJ | Utiliser l'API officielle WTTJ si disponible |
| SQLite mono-utilisateur | Pas de multi-compte | PostgreSQL (Supabase) pour un déploiement cloud |
| Ollama non déployable | Démo en local uniquement | Remplacer par une API LLM cloud pour la mise en prod |
| Spinner scraping générique → spinner contextuel (corrigé juin 8) | — ✅ résolu | `getLoadingLabel()` affiche "France Travail · Adzuna · Indeed" pendant la recherche |
| La Bonne Boîte + Événements emploi : scope OAuth2 réduit → 401 | Fallback URL seulement | ✅ **Résolu juin 10** — APIs publiques LBB + MEE (reverse-engineering Playwright) |
| Rendu ROME en texte brut (sans carte structurée) | Moins lisible qu'une carte | ✅ **Résolu juin 10** — `RomeCard` dans `Message.js` + `api_rome_metier()` via Ollama |
| Upload de documents non-CV : backend OK, UI manquante | Fonctionnalité non accessible | ✅ **Résolu juin 10** — zone d'upload dans `DocumentsView.js` |

---

## 6. Répartition du travail

| Membre | Contributions principales |
|---|---|
| **Gildas** (@Gilpropm) | Architecture globale · `jobster_agent.py` (agent IA, 8 outils, routing, `comprendre_demande()`) · system prompt · coordination équipe |
| **Gendell** (@boolshyt) | `frontend/` complet (7 composants React : Chat, JobCard, Tracker, ProfileForm, DocumentsView, Message, App) · CSS responsive · `backend/server.py` : 14 endpoints Phase 2+3 (`/candidatures`, `/profile`, `/documents`, `/favorites`, `/projects`) · schéma SQLite 20 colonnes · documentation UX (`docs/01–06`) |
| **Cédric** (@karisma) | `backend/server.py` : `POST /documents/upload-other`, compat Python 3.9, routing ROME, fix certifications, fix biais Paris · `jobster_scraper.py` : scrapers Indeed + WTTJ Playwright · `jobster_agent.py` : threads parallèles, init\_db no-op, scope OAuth réduit · `App.js` : connexion SQLite favoris/projets (P2-B, P2-C) · `Chat.js` : spinner contextuel |
| **Yahia** | `jobster_scraper.py` · scrapers France Travail + Adzuna · génération .docx/.pdf/.ics |

---

*Document Jobster-hephaestus · Epitech MSc MSI Hephaestus · Mis à jour 2026-06-10*
