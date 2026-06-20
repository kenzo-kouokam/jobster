# Backend : Jobster

Serveur Python qui fait le lien entre le frontend, l'IA (Ollama) et les outils de scraping.

---

## Ce que fait ce serveur

Quand un utilisateur tape une question dans le chat :

1. Le frontend envoie la question au serveur (route POST /chat)
2. Le serveur analyse l'intention du message (conversationnel, recherche d'offres, outil spécifique)
3. Si un outil est nécessaire, il l'appelle directement (scraper, tracker, lettre...)
4. Si c'est une question conversationnelle, il transmet à Ollama + Qwen3
5. La réponse est renvoyée au frontend avec les offres si applicable

En résumé : le serveur est le conducteur qui fait circuler les messages entre le frontend, les outils de scraping et l'IA.

---

## Prérequis (à installer avant tout le reste)

Vérifie que tu as ces outils sur ta machine. Ouvre PowerShell et tape ces commandes :

```
python --version
```
Tu dois voir : Python 3.12.X

```
git --version
```
Tu dois voir : git version 2.X.X

```
ollama --version
```
Tu dois voir : ollama version 0.X.X

Si tu n'as pas Ollama, télécharge-le sur https://ollama.com/download

Ensuite télécharge le modèle IA :
```
ollama pull qwen3:1.7b
```
Le téléchargement fait environ 1.4 Go, attends la fin.

Vérifie que le modèle est bien là :
```
ollama list
```
Tu dois voir qwen3:1.7b dans la liste.

<img width="1919" height="1107" alt="Capture d'écran 2026-04-24 034946" src="https://github.com/user-attachments/assets/ff5d1392-ec50-473f-82fd-bf94cf479bc1" />
<img width="1625" height="610" alt="Capture d'écran 2026-04-24 032619" src="https://github.com/user-attachments/assets/46c396c1-330d-4d33-a24c-c942cf9efcd2" />

---

## Installation du backend (à faire une seule fois)

### 1. Cloner le repo sur ton PC

```
cd C:\Users\TonPrenom\Documents
git clone https://github.com/kenzo-kouokam/jobster.git
cd jobster
```

Remplace TonPrenom par ton vrai nom d'utilisateur Windows.
Pour le connaître, tape : echo $env:USERNAME

### 2. Aller dans le dossier backend

```
cd backend
```

### 3. Créer un environnement virtuel Python

Un environnement virtuel est une cuisine Python isolée juste pour Jobster. Les bibliothèques installées dedans n'affectent pas le reste de ton ordinateur.

```
python -m venv venv
```

Un dossier venv apparaît dans le dossier backend. Ce dossier ne va PAS sur GitHub (il est ignoré automatiquement).

### 4. Activer l'environnement virtuel

Sur Windows :
```
venv\Scripts\activate
```

Tu dois voir (venv) apparaître au début de ta ligne :
(venv) PS C:\...\backend>

IMPORTANT : chaque fois que tu ouvres un nouveau PowerShell pour travailler sur le backend, tu dois retaper cette commande.

### 5. Installer toutes les bibliothèques

```
pip install -r requirements.txt
```

Cette commande lit le fichier requirements.txt et installe automatiquement tout ce qu'il faut.

---

## Configurer le fichier .env

Crée un fichier `.env` dans ce dossier `backend/` avec ce contenu :

```
FRANCE_TRAVAIL_CLIENT_ID=ta_cle_id
FRANCE_TRAVAIL_CLIENT_SECRET=ta_cle_secret
ADZUNA_APP_ID=ton_app_id
ADZUNA_APP_KEY=ton_app_key
```

Pour copier directement depuis scraping/ :
```
# Windows
copy ..\scraping\.env .env
```

Obtenir tes propres clés gratuitement : voir [`DEPLOY.md`](../DEPLOY.md).

---

## Lancer le serveur

### 1. Activer l'environnement virtuel (si pas déjà fait)

```
venv\Scripts\activate
```

### 2. Lancer le serveur FastAPI

```
uvicorn server:app --reload
```

Ce que tu dois voir :
```
INFO: Uvicorn running on http://127.0.0.1:8000
INFO: Application startup complete.
```

Le serveur tourne maintenant sur ton ordinateur.
- 127.0.0.1 = ton propre ordinateur (pas sur internet)
- 8000 = le numéro de porte du serveur
- --reload = le serveur redémarre si tu modifies le code

### 3. Vérifier que ça marche

Ouvre ton navigateur et va sur :
```
http://127.0.0.1:8000
```
Tu dois voir : {"status": "OK", "model": "qwen3:1.7b"}

### 4. Tester le chat avec l'IA

Va sur :
```
http://127.0.0.1:8000/docs
```

Tu arrives sur une interface de test interactive.

1. Clique sur POST /chat
2. Clique sur Try it out
3. Dans le champ Request body, mets :

{"message": "chef de projet Lyon CDI"}

4. Clique sur Execute
5. La réponse apparaît en bas dans Response body avec les offres trouvées

<img width="1727" height="995" alt="Capture d'écran 2026-04-27 022808" src="https://github.com/user-attachments/assets/4576637c-f274-4077-ae1b-783909a953d4" />
<img width="1710" height="741" alt="Capture d'écran 2026-04-27 022920" src="https://github.com/user-attachments/assets/b91f1523-be59-4163-b2f4-65d01d7f5f5b" />

---

## Les endpoints

### GET /

Vérifie que le serveur tourne.

Réponse :
```
{"status": "OK", "model": "qwen3:1.7b"}
```

### POST /chat

Endpoint principal. Reçoit le message de l'utilisateur et l'historique de la conversation, retourne la réponse de l'agent.

Corps de la requête :
```json
{
  "message": "chef de projet Lyon CDI",
  "history": [
    {"role": "user", "content": "bonjour"},
    {"role": "assistant", "content": "Bonjour ! Comment puis-je t'aider ?"}
  ]
}
```

- **`message`** (obligatoire) : le message courant de l'utilisateur.
- **`history`** (optionnel) : les échanges précédents de la conversation, du plus ancien au plus récent. Limité aux 6 derniers messages × 800 chars. Format : `[{"role": "user"|"assistant", "content": "..."}]`. Utilisé uniquement pour les réponses Ollama (conversationnel + profil) — ignoré pour les outils (scraper, tracker, etc.).

Le serveur injecte automatiquement le profil utilisateur (`scraping/profil.json`) dans chaque appel Ollama — poste cible, localisations, CV, compétences, etc. Le modèle personnalise ses réponses sans que l'utilisateur ait à se répéter.

Réponse :
```json
{
  "response": "20 offres trouvées pour chef de projet à Lyon...",
  "offres": [
    {
      "title": "Chef de projet digital (H/F)",
      "company": "MANPOWER FRANCE",
      "location": "69 - Lyon",
      "contract": "CDI",
      "url": "https://candidat.francetravail.fr/...",
      "source": "France Travail"
    }
  ]
}
```

Le champ `offres` est `null` si la réponse ne contient pas d'offres (conversation, analyse, tracker...).

---

### GET /candidatures

Retourne toutes les candidatures enregistrées dans la base SQLite.

Réponse :
```json
{
  "candidatures": [
    {
      "id": 1,
      "poste": "Développeur React",
      "entreprise": "BNP Paribas",
      "location": "Paris",
      "contract_type": "CDI",
      "source": "France Travail",
      "url": "https://...",
      "status_code": "applied",
      "notes": "Relancer dans 10 jours",
      "date_ajout": "2026-05-14",
      "date_candidature": null,
      "date_relance": null,
      "date_entretien": null,
      "date_next_action": null,
      "contact_nom": null,
      "contact_email": null,
      "lien_offre": null,
      "lien_entreprise": null,
      "salaire": null,
      "created_at": "2026-05-14T10:30:00"
    }
  ]
}
```

### POST /candidatures

Ajoute une nouvelle candidature.

Corps de la requête :
```json
{
  "poste": "Développeur React",
  "entreprise": "BNP Paribas",
  "location": "Paris",
  "contract_type": "CDI",
  "source": "France Travail",
  "url": "https://...",
  "status_code": "saved",
  "notes": ""
}
```

Champs obligatoires : `url`. Les autres sont optionnels.
**Get-or-create :** si une candidature avec la même `url` existe déjà, elle est retournée sans créer de doublon.

### PATCH /candidatures/{id}

Met à jour un ou plusieurs champs d'une candidature existante (dynamic SET — seuls les champs fournis sont modifiés).

Corps de la requête (tous les champs sont optionnels) :
```json
{
  "status_code": "applied",
  "notes": "Entretien prévu le 20 mai",
  "date_entretien": "2026-06-01"
}
```

### DELETE /candidatures/{id}

Supprime une candidature. Retourne `{"deleted": <id>}`.

---

**Codes de statut valides :** `saved` · `applied` · `follow_up_due` · `follow_up_sent` · `interview_scheduled` · `interview_done` · `test_case` · `offer_received` · `rejected` · `withdrawn` · `archived`

---

### GET /profile

Retourne le profil sauvegardé de l'utilisateur depuis `scraping/profil.json`.
Retourne `404` si aucun profil n'a encore été configuré.

Réponse :
```json
{
  "profile": {
    "nom": "Marie Dupont",
    "email": "marie@email.com",
    "telephone": "+33 6 12 34 56 78",
    "linkedin": "https://linkedin.com/in/marie-dupont",
    "titre_cible": "Développeuse Frontend",
    "localisations": ["Paris", "Lyon"],
    "competences": ["React", "JavaScript", "Figma"],
    "experience": "3 ans en développement web...",
    "formation": "Bachelor Informatique — Epitech Paris (2023–2026)"
  }
}
```

### POST /profile

Sauvegarde le profil dans `scraping/profil.json`.

**Important :** ce fichier est lu automatiquement par l'agent (`extraire_cv_depuis_message()` mode "profil") — le matching et la lettre de motivation utilisent ce profil sans que l'utilisateur ait à recoller son CV.

Corps de la requête :
```json
{
  "nom": "Marie Dupont",
  "email": "marie@email.com",
  "telephone": "+33 6 12 34 56 78",
  "linkedin": "https://linkedin.com/in/marie-dupont",
  "titre_cible": "Développeuse Frontend",
  "localisations": ["Paris", "Lyon"],
  "competences": ["React", "JavaScript", "Figma"],
  "experience": "3 ans en développement web...",
  "formation": "Bachelor Informatique — Epitech Paris (2023–2026)"
}
```

Tous les champs sont optionnels. Retourne `{"profile": {...}, "message": "Profil sauvegardé avec succès"}`.

---

### POST /documents/upload

Importe un CV en PDF. Extraire le texte et l'intègre dans `scraping/profil.json`.

**Content-Type :** `multipart/form-data` — champ `file` (PDF uniquement).

Fonctionnement :
1. Valide l'extension `.pdf`
2. Sauvegarde le fichier dans `scraping/cv_utilisateur.pdf`
3. Extrait le texte avec `pdfplumber`
4. Charge `scraping/profil.json` (le crée si absent)
5. Ajoute les champs `cv_texte`, `cv_filename`, `cv_uploaded_at`
6. Retourne un résumé

Réponse :
```json
{
  "message": "CV importé avec succès",
  "filename": "mon_cv.pdf",
  "extracted_chars": 3420,
  "preview": "Marie Dupont — Développeuse Frontend..."
}
```

**Important :** `cv_texte` est automatiquement inclus quand l'agent appelle `extraire_cv_depuis_message()` (mode "profil") — le matching et la génération de lettre utilisent le CV uploadé sans changement de code dans `jobster_agent.py`.

**Dépendances requises :** `pdfplumber` et `python-multipart` (dans `requirements.txt`).

---

### GET /documents

Liste les fichiers disponibles dans le dossier `scraping/` : CV uploadé et documents générés par l'agent (lettres, emails, adaptations CV).

Réponse :
```json
{
  "documents": {
    "cv_uploaded": {
      "filename": "cv_utilisateur.pdf",
      "uploaded_at": "2026-05-15",
      "size_bytes": 85432
    },
    "generated": [
      {
        "filename": "lettre_motivation_BNP.docx",
        "created_at": "2026-05-16",
        "size_bytes": 12300
      }
    ]
  }
}
```

### GET /documents/download/{filename}

Télécharge un fichier depuis `scraping/`. Le paramètre `filename` doit correspondre exactement au nom du fichier retourné par `GET /documents`. Protection contre le path traversal — seuls les fichiers du dossier `scraping/` sont accessibles.

Exemple : `GET /documents/download/cv_utilisateur.pdf`

### DELETE /documents/{filename}

Supprime un fichier généré depuis `scraping/`. Protection contre le path traversal. Retourne `{"deleted": filename}` ou `404` si le fichier n'existe pas.

---

### POST /documents/upload-other

Upload d'un fichier quelconque (PDF, DOCX, images, TXT) **sans** extraction de texte et **sans** écriture dans `profil.json`. Sauvegarde dans `scraping/` avec horodatage pour éviter les collisions.

**Content-Type :** `multipart/form-data` — champ `file`.

Réponse :
```json
{
  "filename": "rapport_2026-06-08T14-22-00.pdf",
  "original": "rapport.pdf",
  "size": 45230,
  "download": "/documents/download/rapport_2026-06-08T14-22-00.pdf"
}
```

> ⚠️ **Gap connu :** `DocumentsView.js` n'a pas encore d'UI pour déclencher cet upload (frontend prévu pour le Keynote).

---

### GET /favorites

Retourne tous les favoris enregistrés en base SQLite.

### POST /favorites

Sauvegarde un favori. Get-or-create par URL — aucun doublon. Corps : `titre` (obligatoire), `entreprise`, `url`, `location`, `contract_type`, `source`.

### DELETE /favorites/{id}

Supprime un favori par ID. Retourne `{"deleted": id}` ou `404`.

---

### GET /projects

Retourne tous les projets enregistrés en base SQLite.

### POST /projects

Crée un projet. Corps : `name` (obligatoire), `emoji` (défaut `📁`), `color` (défaut `#6B7280`).

### DELETE /projects/{id}

Supprime un projet par ID. Retourne `{"deleted": id}` ou `404`.

---

## Logique de détection d'intention dans server.py

Le serveur analyse chaque message et le route vers la bonne action sans demander confirmation.

**Priorité 1 — Message conversationnel** : Ollama répond directement.
Exemples : "que sais-tu faire", "bonjour", "aide", "comment ça marche"

**Priorité 2 — Outil spécifique détecté** : appel direct de l'outil, sans Ollama.

| Mots-clés détectés | Outil appelé |
|-------------------|--------------|
| "lettre" / "motivation" + URL | Génération lettre de motivation |
| "prépare mail" / "texte formulaire" + URL | Email de candidature prêt à envoyer |
| "adapter mon cv" / "optimise mon cv" + URL | Adaptation CV à l'offre |
| "match" / "score" / "compatible" + URL | Score de compatibilité profil / offre |
| "analyse cette offre" + URL | Analyse détaillée de l'annonce |
| URL seule (< 80 caractères de message) | Analyse automatique de l'annonce |
| "rapport entreprise" / "infos entreprise" | Avis, actualités, données légales |
| "tracker" / "mes candidatures" | Suivi des candidatures SQLite |
| "évènement emploi" / "salon emploi" | API France Travail Événements |
| "bonne boite" / "entreprises qui recrutent" | API France Travail La Bonne Boite |

**Priorité 2b — Questions méta sur le profil/CV** : Ollama répond avec le profil injecté dans le contexte (réponse conversationnelle, pas de dump brut).
Exemples : "que sais-tu de moi", "tu as accès à mon CV", "do you know what type of jobs I'm looking for"

**Priorité 3 — Mots-clés emploi détectés** : scraper lancé directement, sans Ollama.
- Recherche précise : `comprendre_demande()` extrait métier + ville, avec filets de sécurité (mots génériques → profil, pas de ville → profil localisations).
- Recherche vague/profilée ("suited for me", "pour moi", "adapté à mon profil"…) : `comprendre_demande()` bypassé — `titre_cible` + `localisations[0]` lus directement depuis profil.json.
Exemples : "chef de projet Paris CDI", "find jobs adapted to my profile", "alternance marketing Lille"

**Priorité 4 — Aucun outil détecté** : Ollama répond en mode conversationnel avec profil injecté.

---

## Structure des fichiers

```
backend/
├── README.md          (ce fichier)
├── requirements.txt   (liste des bibliothèques à installer)
├── server.py          (le serveur FastAPI principal)
└── venv/              (environnement virtuel, PAS sur GitHub)
```

---

## Ce que contient server.py

1. **Importations** : les outils dont le serveur a besoin (FastAPI, Ollama, etc.)
2. **Configuration CORS** : autorisation pour le frontend de parler au backend. Sans ça, React ne peut pas contacter FastAPI.
3. **System prompt** : la personnalité de l'agent Jobster. Le texte qui dit à l'IA qui elle est et comment se comporter.
4. **Détecteurs d'intention** : les listes de mots-clés qui permettent de router vers le bon outil.
5. **Les routes** : GET / pour tester que le serveur tourne, POST /chat pour recevoir un message et renvoyer la réponse.

---

## Commandes utiles à retenir

| Commande | Ce qu'elle fait |
|----------|-----------------|
| `venv\Scripts\activate` | Activer l'environnement virtuel |
| `uvicorn server:app --reload` | Lancer le serveur |
| `pip install -r requirements.txt` | Installer les bibliothèques |
| `pip freeze > requirements.txt` | Mettre à jour la liste |
| `Ctrl + C` | Arrêter le serveur |

## Commande test en 1 minute

```
cd C:\Users\TON_NOM\Documents\Jobster-hephaestus\backend
venv\Scripts\activate
uvicorn server:app --reload
```

Remplace `TON_NOM` par ton nom d'utilisateur Windows (`echo $env:USERNAME` pour le trouver).

<img width="1719" height="503" alt="Capture d'écran 2026-04-27 023354" src="https://github.com/user-attachments/assets/aea5206e-4261-40af-b831-0b9f291e62fa" />

---

## Si tu bloques

**Problème 1 : "venv n'est pas reconnu"**
Vérifie que tu es bien dans le dossier backend :
```
cd C:\Users\TonPrenom\Documents\Jobster-hephaestus\backend
```

**Problème 2 : "uvicorn n'est pas reconnu"**
L'environnement virtuel n'est pas activé :
```
venv\Scripts\activate
```
puis relance uvicorn.

**Problème 3 : l'IA ne répond pas**
Vérifie qu'Ollama tourne en arrière-plan (icône de lama dans la barre des tâches). Si non, ouvre Ollama depuis le menu Démarrer.

**Problème 4 : aucune offre trouvée**
Vérifie que le fichier `.env` existe bien dans `backend/`. Sans lui, les APIs France Travail et Adzuna ne fonctionnent pas.

**Problème 5 : n'importe quelle autre erreur**
Fais une capture d'écran et envoie-la.

---

## Technologies utilisées

| Outil | Rôle | Pourquoi ce choix |
|-------|------|-------------------|
| Python | Langage de programmation | Imposé par le sujet EPITECH |
| FastAPI | Framework serveur | Rapide, moderne, documentation auto |
| Uvicorn | Moteur du serveur | Nécessaire pour faire tourner FastAPI |
| Ollama | Faire tourner l'IA en local | Gratuit, pas d'API payante |
| Qwen3 1.7B | Modèle d'IA | Recommandé par le sujet, léger, parle français |
