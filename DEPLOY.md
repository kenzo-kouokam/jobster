# Déploiement Jobster — guide pas à pas (100% gratuit)

Ce guide t'amène d'un repo GitHub à un site réellement en ligne, sans carte bancaire,
en 4 étapes. Chaque étape indique précisément ce que **toi seul peux faire** (création
de comptes liés à ton identité) vs ce qui est déjà prêt dans le code.

---

## Vue d'ensemble

| Brique | Hébergeur | Coût | Pourquoi |
|---|---|---|---|
| Frontend (React) | Vercel | Gratuit | Déploiement automatique depuis GitHub, CDN inclus |
| Backend (FastAPI) | Render | Gratuit | Web service Python gratuit, déploiement depuis GitHub |
| LLM | Groq | Gratuit | API cloud rapide, compatible OpenAI, sans CB pour le tier gratuit |
| Recherche d'offres | France Travail + Adzuna | Gratuit | APIs officielles, comptes développeur gratuits |

**Limite du tier gratuit à connaître** : le backend Render gratuit se met en veille après
15 minutes d'inactivité. Le premier visiteur après une pause attend ~30-50 secondes que
le service redémarre. Acceptable pour un portfolio ; gênant pour une démo live minutée
(dans ce cas, ouvre le site 2 minutes avant pour le "réveiller").

---

## Étape 1 — Créer ta clé Groq (5 min, obligatoire pour que le chat fonctionne en ligne)

1. Va sur [console.groq.com](https://console.groq.com) → crée un compte (email perso, pas de CB demandée)
2. Menu **API Keys** → **Create API Key** → copie la clé (elle commence par `gsk_...`)
3. Garde-la de côté, tu la colleras dans Render à l'étape 3.

Sans cette clé, le code retombe sur Ollama — qui n'existe pas sur un serveur cloud gratuit,
donc le chat répondra "Jobster n'est pas disponible".

---

## Étape 2 — Déployer le frontend sur Vercel

1. [vercel.com](https://vercel.com) → **Sign up with GitHub** (utilise ton compte `kenzo-kouokam`)
2. **Add New Project** → importe le repo `jobster`
3. Vercel détecte un monorepo : dans **Root Directory**, sélectionne `frontend/jobster-app`
4. Framework Preset : `Create React App` (auto-détecté)
5. **Environment Variables** → ajoute :
   - `REACT_APP_API_URL` = `https://jobster-backend.onrender.com` *(l'URL exacte sera connue après l'étape 3 — tu peux la mettre à jour ensuite dans Vercel → Settings → Environment Variables → redeploy)*
6. **Deploy**

Tu obtiens une URL du type `https://jobster-xxxx.vercel.app` — c'est ton lien de démo.

---

## Étape 3 — Déployer le backend sur Render

1. [render.com](https://render.com) → **Sign up with GitHub**
2. **New** → **Web Service** → sélectionne le repo `jobster`
3. Configuration :
   - **Root Directory** : `backend`
   - **Runtime** : `Python 3`
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Instance Type** : `Free`
4. **Environment Variables** → ajoute :
   - `GROQ_API_KEY` = la clé obtenue à l'étape 1
   - `GROQ_MODEL` = `llama-3.1-8b-instant` *(optionnel, c'est déjà la valeur par défaut)*
   - `FRANCE_TRAVAIL_CLIENT_ID` / `FRANCE_TRAVAIL_CLIENT_SECRET` / `ADZUNA_APP_ID` / `ADZUNA_APP_KEY` → laisse vide pour l'instant (voir étape 4), le code gère leur absence proprement (0 résultat sur ces 2 sources, pas de crash)
5. **Create Web Service** → attends le build (~3-5 min, pas d'installation de navigateurs Playwright pour rester léger sur le tier gratuit)
6. Note l'URL générée (`https://jobster-backend-xxxx.onrender.com`)

7. Retourne sur Vercel → mets à jour `REACT_APP_API_URL` avec cette URL exacte → redeploy.

✅ À ce stade, ton site est en ligne et le chat fonctionne (Groq). La recherche d'offres
renverra des résultats partiels (HelloWork, Apec, Monster, L'Étudiant — scraping direct,
sans clé requise) tant que tu n'as pas tes clés France Travail/Adzuna.

---

## Étape 4 — (Optionnel mais recommandé) Tes propres clés France Travail + Adzuna

Pour activer la recherche complète (France Travail + Adzuna en plus du scraping direct) :

1. **France Travail** : [francetravail.io](https://francetravail.io) → créer un compte →
   "Mes applications" → créer une application → activer le scope `api_offresdemploiv2 o2dsoffre`
   → récupère `Identifiant client` et `Clé secrète`
2. **Adzuna** : [developer.adzuna.com](https://developer.adzuna.com) → Sign up → Create App
   → récupère `App ID` et `App Key`
3. Sur Render → ton service → **Environment** → renseigne les 4 variables → **Save** (redeploy auto)

Ces deux services sont gratuits et ne demandent pas de carte bancaire.

---

## Pages/données qui ne doivent jamais être publiques

Déjà géré dans le code et le `.gitignore`, à vérifier si tu modifies le repo :

| Élément | Statut |
|---|---|
| `.env` (clés réelles) | Jamais commité — seul `.env.example` (vide) est versionné |
| `scraping/profil.json` (données de profil utilisateur) | Jamais commité |
| `scraping/*.db` (SQLite — candidatures, favoris) | Jamais commité |
| Documents générés (`.docx`, `.pdf` de lettres/CV) | Jamais commités |
| Variables d'environnement sur Render/Vercel | Stockées chiffrées côté plateforme, jamais dans le code |

Si un jour tu remplaces le profil de démo par tes vraies infos personnelles pour tester,
assure-toi qu'elles restent dans `scraping/profil.json` (ignoré par git) et ne finissent
jamais dans un commit.

---

## Gaps connus — priorisation coût/effort

| Gap | Impact | Effort | Coût | Priorité |
|---|---|---|---|---|
| **Clés France Travail/Adzuna perso** | Recherche d'offres complète au lieu de partielle | Faible (15 min, 2 comptes gratuits) | 0€ | 🔴 Faire en premier |
| **Routing d'intention par mots-clés** | Rate les formulations naturelles non prévues ("j'ai besoin de boulot") | Moyen (ajouter une pré-classification LLM légère en fallback, le LLM est déjà branché via Groq) | 0€ (déjà sur Groq gratuit) | 🟠 Bon rapport effort/impact |
| **Dédup des offres entre sources** | Même offre affichée 2-3 fois (FT/Adzuna/scraping direct) | Moyen (déduplication par titre+entreprise avant affichage) | 0€ | 🟡 Cosmétique mais visible |
| **Scraping fragile (sélecteurs HTML, anti-bot)** | Certaines sources renvoient parfois 0 résultats | Élevé (maintenance récurrente, sites changent leurs sélecteurs) | 0€ mais coût en temps de maintenance | 🟢 Best-effort, déjà dégradé proprement — pas bloquant |
| **Cold start Render (free tier)** | ~30-50s de latence après 15 min d'inactivité | Aucun effort technique | ~5-7€/mois pour un plan payant qui élimine ça | 🟢 À activer seulement si tu reçois beaucoup de visites recruteurs (ex: juste avant un entretien) |

**Recommandation** : traite le gap "clés API perso" en premier (gratuit, 15 minutes,
débloque la vraie valeur du produit), garde le reste en best-effort — un projet portfolio
n'a pas besoin d'être parfait, il doit démontrer une vraie logique de résolution de problème
et un déploiement qui tient la route, ce qui est déjà le cas après les étapes 1-3.
