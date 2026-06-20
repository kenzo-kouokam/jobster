# UX System Diagram — Jobster
> Architecture système · Composants UI · Connexions Frontend ↔ Backend

---

## Contexte

Jobster n'est **pas** construit de zéro. L'interface de chat existe déjà et fonctionne. La stratégie UX est d'**étendre** ce système existant, pas de le reconstruire.

**Point de départ (existant) :**
- Interface de chat fonctionnelle avec fils de conversation
- JobCards affichées dans les réponses du chatbot
- Historique des conversations dans la sidebar

**Objectif (cible) :**
- Sidebar complète avec 6 sections (Chats · Projets · Favoris · Candidatures · Mes Documents · Mon Profil)
- JobCards enrichies avec actions (Favori · Candidater)
- Chat devenant un hub de déclenchement d'actions (recherche, génération, sauvegarde)

---

## Architecture globale

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTERFACE UTILISATEUR                        │
│                    React 18 · localhost:3000                     │
│                                                                  │
│  ┌──────────────────┐    ┌───────────────────────────────────┐  │
│  │    SIDEBAR        │    │           ZONE PRINCIPALE         │  │
│  │  ~260px · fixe    │    │           Chat + Vues             │  │
│  │                   │    │                                   │  │
│  │  ▸ Chats ✅       │    │  ┌────────────────────────────┐  │  │
│  │  ▸ Projets ✅     │    │  │  Chat Header               │  │  │
│  │  ▸ Favoris ✅     │    │  │  Agent IA · Qwen3:1.7b     │  │  │
│  │  ▸ Candidatures ✅│    │  ├────────────────────────────┤  │  │
│  │  ▸ Mes Documents ✅   │  │  Chat Body                 │  │  │
│  │  ▸ Mon Profil ✅  │    │  │  Messages (User + IA)      │  │  │
│  │                   │    │  │  JobCards (résultats)       │  │  │
│  └──────────────────┘    │  │  États vides                │  │  │
│                           │  ├────────────────────────────┤  │  │
│                           │  │  Chat Input                │  │  │
│                           │  │  Textarea + Bouton Envoi   │  │  │
│                           │  └────────────────────────────┘  │  │
│                           └───────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │  HTTP (axios)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│                   FastAPI · localhost:8000                        │
│                                                                  │
│  POST /chat ─────────── Qwen3:1.7b (Ollama local)               │
│                    └─── France Travail API                       │
│                    └─── Adzuna API                               │
│  POST /candidatures ─── SQLite (tracker)                        │
│  GET  /candidatures ─── SQLite                                   │
│  PATCH /candidatures/{id} SQLite                                 │
│  POST /profile ──────── scraping/profil.json               │
│  GET  /profile ──────── scraping/profil.json                                   │
│  POST /favorites ────── SQLite (Phase 3 — localStorage pour l'instant)                      │
│  GET  /favorites ────── SQLite (Phase 3 — localStorage pour l'instant)                      │
│  DELETE /favorites/{id} SQLite (Phase 3)                      │
│  GET  /documents/download/{filename} Fichiers générés                      │
│  POST /documents/upload ── CV upload (pdfplumber)                      │
│  GET  /documents ─────── Liste fichiers                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Composants React actuels (existants ✅)

### `App.js` — Orchestrateur principal
**Rôle :** Gère les conversations, la sidebar chats, le routage entre vues.

**État actuel :**
```
App
├── Sidebar (toutes sections)
│   ├── Logo / Titre "Jobster"
│   ├── Bouton "+ Nouvelle recherche"
│   └── Liste des conversations (chats)
└── Chat (zone principale)
    ├── Chat.js (avec chatId + messages)
    └── Message.js × N (messages utilisateur + IA)
        └── JobCard.js × N (offres dans les réponses)
```

**Phase 1 + 2 implémentées :**
- Sidebar 5 sections complètes (Chats · Projets · Favoris · Candidatures · Mes Documents · Mon Profil)
- State machine `activeView` + localStorage persistence

---

### `Chat.js` — Interface de chat principale
**Rôle :** Gère la saisie, l'envoi des messages, l'affichage de la conversation.

**Fonctionnalités existantes :**
- Textarea auto-redimensionnable
- Envoi par Entrée (Shift+Entrée = nouvelle ligne)
- Indicateur de chargement (typing bubble)
- Gestion des erreurs backend (message explicite si 8000 non disponible)
- Welcome screen avec 4 suggestions cliquables
- Connexion au backend via `axios.post('http://127.0.0.1:8000/chat')`

**Implémenté en Phase 2 :**
- Bouton "Télécharger" sur les messages générés
- Bouton "Sauvegarder dans Mes Documents" sur les messages générés

---

### `Message.js` — Rendu d'un message
**Rôle :** Affiche un message utilisateur ou IA, avec support markdown et JobCards.

**Fonctionnalités existantes :**
- Rendu markdown via `react-markdown`
- Affichage des JobCards si `offres` présent dans la réponse
- Style différencié (utilisateur vs IA)

**Implémenté en Phase 2 :**
- Détection des messages contenant un fichier généré
- Ajout de boutons d'action sur ces messages (télécharger, copier, sauvegarder)

---

### `JobCard.js` — Carte d'une offre d'emploi
**Rôle :** Affiche une offre avec ses informations clés.

**Fonctionnalités existantes :**
- Titre du poste, entreprise, localisation, type de contrat
- Résumé de l'offre
- Lien vers l'offre originale (si disponible)

**Implémenté en Phase 2 :**
- Bouton ❤️ Favori → `POST /favorites`
- Bouton ✓ Candidater → `POST /candidatures`
- Confirmation visuelle après action

---

## Composants créés en Phase 2 ✅

### `Tracker.js` — Vue Candidatures ✅ Phase 2
**Rôle :** Tableau de suivi des candidatures avec statuts et notes.

**Structure prévue :**
```
Tracker
├── Titre "Mes candidatures"
├── Compteur (N candidatures)
├── Table
│   ├── En-têtes: Poste | Entreprise | Statut | Date | Notes
│   └── TableRow × N
│       ├── Titre + Entreprise (depuis /candidatures)
│       ├── StatusDropdown (À faire / Envoyé / En attente / Relance / Refusé)
│       ├── Date d'ajout
│       └── NoteCell (éditable inline)
└── État vide: "Aucune candidature enregistrée"
```

**Dépendances backend :** `GET /candidatures` · `PATCH /candidatures/{id}`

---

### `DocumentsView.js` — Vue Mes Documents ✅ Phase 2
**Rôle :** Liste des fichiers + upload CV.

**Structure prévue :**
```
DocumentsView
├── Titre "Mes Documents"
├── Section CV
│   ├── Bouton "Uploader un CV" → POST /profile
│   └── CV uploadé (nom, date, bouton télécharger)
├── Section Documents générés
│   ├── Liste des fichiers → GET /documents
│   └── FileItem × N (nom, type, date, télécharger, supprimer)
└── État vide: "Aucun document — uploadez votre CV ou générez une lettre"
```

**Dépendances backend :** `POST /documents/upload` · `GET /documents` · `GET /documents/download/{filename}`

---

### `ProfileForm.js` — Vue Mon Profil ✅ Phase 2
**Rôle :** Formulaire de préférences utilisateur pour personnaliser les réponses du LLM.

**Champs prévus :**
- Objectif : stage / alternance / CDI-CDD / reconversion
- Localisation
- Télétravail : oui / non / hybride
- Secteurs d'activité
- Compétences clés
- Niveau d'expérience
- Langue de travail

**Dépendances backend :** `POST /profile` · `GET /profile`

---

### `FavorisView.js` — Vue Favoris ⏳ Phase 3
**Rôle :** Liste des offres sauvegardées avec actions.

**Structure prévue :**
```
FavorisView
├── Titre "Mes favoris"
├── Liste de JobCards sauvegardées → GET /favorites
│   └── JobCard × N
│       ├── Infos offre (depuis les données sauvegardées)
│       ├── Bouton ✓ Candidater → POST /candidatures
│       └── Bouton × Retirer → DELETE /favorites/{id}
└── État vide: "Aucun favori pour le moment"
```

**Dépendances backend :** `GET /favorites` · `DELETE /favorites/{id}` · `POST /candidatures`

---

## Plan d'extension de la sidebar

**Sidebar actuelle :**
```
Sidebar
├── Logo "Jobster"
├── Bouton + Nouvelle recherche
└── [Section Chats]
    └── ChatItem × N (conversations)
```

**Sidebar cible (Phase 1 → états vides) :**
```
Sidebar
├── Logo "Jobster"
├── Bouton + Nouvelle recherche
├── [Section Chats] ✅
│   └── ChatItem × N
├── [Séparateur]
├── [Section Projets] ✅ Implémenté Phase 1
│   └── "Aucun projet pour le moment"
├── [Section Favoris] ✅ Implémenté Phase 1/2
│   └── "Aucun favori pour le moment"
├── [Section Candidatures] ✅ Implémenté Phase 2
│   └── "Aucune candidature enregistrée"
├── [Section Mes Documents] ✅ Implémenté Phase 2
│   └── "Aucun document uploadé"
└── [Section Mon Profil] ✅ Implémenté Phase 2
    └── "Profil non complété"
```

---

## Règle UX critique — États vides

**Toutes les sections de la sidebar doivent être visibles dès la Phase 1**, même si elles sont vides. L'état vide n'est pas un bug : c'est une décision de design.

Raison : la sidebar donne immédiatement une **structure mentale** à l'utilisateur. Il comprend ce que le produit va faire avant même que les fonctionnalités soient connectées.

---

## Matrice d'états par composant

| Composant | État vide | État chargement | État rempli | État erreur |
|---|---|---|---|---|
| Chat | Welcome screen + suggestions | Typing bubble | Messages + JobCards | Erreur backend explicite |
| JobCard | N/A | N/A | Infos offre + actions | N/A |
| Tracker | "Aucune candidature" | Loading spinner | Tableau complet | "Impossible de charger" |
| DocumentsView | "Aucun document" | Loading | Liste fichiers | "Erreur upload" |
| ProfileForm | Champs vides | Saving… | Profil sauvegardé | "Erreur de sauvegarde" |
| FavorisView | "Aucun favori" | Loading | Liste JobCards | "Impossible de charger" |
| Sidebar sections | Texte état vide | N/A | Contenu chargé | N/A |

---

*Document créé dans le cadre du projet Jobster-hephaestus · Epitech S1 IA BOT*
*Architecture alignée sur le code existant : `App.js` · `Chat.js` · `Message.js` · `JobCard.js`*
