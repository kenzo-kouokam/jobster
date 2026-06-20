# Frontend : Jobster

Interface React de Jobster — application de chat mono-page (pas de site vitrine multi-pages).

**Responsable :** @boolshyt (Gendell) — propriétaire de `frontend/` et `docs/`

---

## Ce que fait ce dossier

Le frontend est l'interface que l'utilisateur voit. Il envoie les messages au backend via `POST /chat` et affiche les réponses : texte en markdown, cartes d'offres cliquables, sidebar de navigation, gestion des projets.

---

## Structure des fichiers

```
frontend/jobster-app/src/
│
├── App.js              # Composant racine
│                       #   — sidebar avec navigation 5 sections
│                       #   — gestion des projets (créer, renommer, supprimer, emoji)
│                       #   — historique des conversations (épingler, renommer, supprimer)
│                       #   — assignation d'un chat à un projet
│
├── App.css             # Thème global — CSS variables, layout, sidebar, nav, modaux
│
└── components/
    ├── Chat.js         # Zone de chat
    │                   #   — envoi de messages (Enter = envoyer, Shift+Enter = saut de ligne)
    │                   #   — suggestions de démarrage (4 cartes)
    │                   #   — chips de suggestion rapide (4 actions, apparaissent après 1er message)
    │                   #   — indicateur de frappe animé + label contextuel (ex. "Recherche en cours…")
    │                   #   — modal "Ajouter au projet" (⋯ en haut à droite)
    │
    ├── Chat.css        # Styles du chat — bulles, header, input, chips, modal projet
    │
    ├── Message.js      # Rendu d'un message — markdown + JobCards si offres détectées
    │                   #   — carousel ‹ › avec flèches de navigation
    │                   #   — batch loading : 8 cartes affichées, carte "+N de plus" pour charger la suite
    │                   #   — carte "Fin des résultats" après dernier batch
    │
    ├── JobCard.js      # Carte offre cliquable — CDI/CDD/alternance/stage/intérim
    │                   #   — expand/collapse description
    │                   #   — normalisation France Travail vs Adzuna
    │
    ├── Tracker.js      # Tableau de candidatures
    │                   #   — table triable, filtre statut, tiroir latéral éditable
    │                   #   — 11 statuts, surlignage retard (date_next_action dépassée)
    │
    ├── Tracker.css     # Styles du tracker
    │
    ├── ProfileForm.js  # Formulaire profil utilisateur
    │                   #   — 4 sections : coordonnées, recherche, parcours, Mon CV
    │                   #   — barre de complétion profil (% + champs manquants)
    │                   #   — upload CV PDF → POST /documents/upload
    │                   #   — sauvegarde profil → POST /profile
    │
    ├── ProfileForm.css # Styles du formulaire profil (incl. barre de complétion)
    │
    ├── Toast.js        # Système de notification toast
    │                   #   — position fixe bas-droite, 3 variantes (succès/erreur/info)
    │                   #   — auto-fermeture 3,2 s, accessible role="status"
    │
    ├── Toast.css       # Styles toast — entrée/sortie animée, couleurs par variante
    │
    ├── DocumentsView.js  # Vue Mes Documents
    │                     #   — section fichiers importés (CV)
    │                     #   — section documents générés (lettres, CV adaptés)
    │                     #   — téléchargement + suppression (🗑️ DELETE /documents/{filename})
    │
    └── DocumentsView.css # Styles de la vue documents
```

---

## Sections de la sidebar

La sidebar propose 5 vues via la barre de navigation :

| Section | État | Contenu actuel |
|---------|------|----------------|
| 💬 **Chats** | ✅ Phase 1 | Historique conversations + gestion projets |
| ❤️ **Favoris** | ✅ Phase 3 | Vue active avec JobCards — persistant SQLite (GET/POST/DELETE /favorites — Cédric June 8) |
| 🧭 **Guide Jobster** | ✅ Phase 1 | Panneau des 8 outils avec descriptions et exemples |
| 📋 **Candidatures** | ✅ Phase 2 | Tracker.js — table triable, tiroir latéral, 11 statuts |
| 📄 **Mes Documents** | ✅ Phase 2 | DocumentsView.js — fichiers importés + générés, téléchargement + suppression |
| 👤 **Mon Profil** | ✅ Phase 2 | ProfileForm.js — formulaire complet + upload CV PDF |

---

## Fonctionnalités implémentées (Phase 1)

- Navigation sidebar 6 sections avec états vides descriptifs
- `activeView` state machine : `'landing' | 'chat' | 'all-chats' | 'project' | 'favoris' | 'candidatures' | 'documents' | 'profil'`
- "Chats" nav → panneau `all-chats` : liste toutes les conversations avec date créée, dernière mise à jour, badge projet
- Cliquer une conversation depuis `all-chats` → ouvre le chat
- Vue Projet dans le panneau principal : liste les chats du projet, bouton Retour vers `all-chats`
- `lastUpdated` tracké par conversation, mis à jour à chaque nouveau message
- Sidebar conv list : liste plate (titre uniquement, sans labels de date)
- Gestion des projets : créer (avec emoji picker), renommer (inline), supprimer
- Projets par défaut : Alternance, CDI, Intérim
- Assignation d'un chat à un projet via modal ⋯ dans l'en-tête du chat
- Création de projet directement depuis le modal chat
- Badge projet affiché dans l'en-tête quand un chat est assigné
- Conversations toujours visibles en sidebar, quel que soit le projet assigné
- Recherche/filtre dans l'historique des conversations
- Épingler / renommer / supprimer des conversations
- Suggestion cards de démarrage (4 requêtes types)
- Indicateur de frappe animé (3 points)
- Affichage markdown des réponses
- JobCards avec expand/collapse et titre cliquable (lien vers l'offre, ouvre en nouvel onglet)
- **Carousel ‹ › :** flèches de navigation gauche/droite, pas de scrollbar visible
- **Batch loading :** 8 cartes affichées, carte "+N offres de plus" pour charger le lot suivant (max 8 par lot), carte "Fin des résultats ✓" en fin
- **Favoris :** état `favorites` dans App.js, `toggleFavorite` threadé jusqu'à JobCard ; vue Favoris affiche les `<JobCard>` sauvegardées — persistant SQLite via `GET/POST/DELETE /favorites` (P2-B ✅ juin 2026)
- **Guide Jobster :** onglet 🧭 dans la nav, panneau listant les 8 outils actifs avec descriptions et exemples cliquables

---

## Communication avec le backend

- **URL :** `http://127.0.0.1:8000/chat` (définie dans `Chat.js`, ligne `const API_URL`)
- **Méthode :** `POST` via Axios
- **Corps :** `{ "message": "texte de l'utilisateur", "history": [...] }`
- **Réponse :** `{ "response": "...", "offres": [...] | null }`
- **`history`** : les 6 derniers messages filtrés (rôles `user`/`assistant`, plafonnés à 800 chars) — envoyés par `sendMessage()` dans Chat.js

Si le backend ne tourne pas, un message d'erreur s'affiche dans le chat.

---

## Lancer le frontend

```powershell
# Depuis le dossier frontend/jobster-app
npm install      # une seule fois
npm start        # lance sur http://localhost:3000
```

Attendre `Compiled successfully` avant d'utiliser l'interface.

> **Note :** Le frontend fonctionne sans backend pour tout ce qui est UI (sidebar, projets, navigation). Seul l'envoi de message nécessite le backend sur le port 8000.

---

## Variables CSS (App.css)

Toutes les couleurs et tailles sont centralisées dans `:root` en haut de `App.css` :

| Variable | Valeur | Usage |
|----------|--------|-------|
| `--blue` | `#185FA5` | Couleur primaire, boutons, liens |
| `--green` | `#0F6E56` | Couleur secondaire, statut actif |
| `--bg` | `#FAFAF8` | Fond principal (off-white) |
| `--sb-bg` | `#F2F0EC` | Fond sidebar |
| `--font` | DM Sans | Typographie principale |
| `--font-display` | Playfair Display | Titres |

---

## Phases de développement

| Phase | Status | Notes |
|-------|--------|-------|
| **Phase 1** | ✅ Fait 2026-05-12 | Sidebar, carousel, favoris, Guide Jobster, localStorage |
| **Phase 2** | ✅ Fait 2026-05-16 | Tracker.js, ProfileForm.js, DocumentsView.js, action chips, save icons |
| **Phase 2.5** | ✅ Fait 2026-05-19 | Historique conversation, header chat redesign, ProfileForm.css complet |
| **Phase 2 (delete)** | ✅ Fait 2026-05-29 | 🗑️ suppression documents générés |
| **Phase 3 — P2-B** | ✅ Fait 2026-06-08 | Favoris → SQLite (GET/POST/DELETE /favorites — Cédric) |
| **Phase 3 — P2-C** | ✅ Fait 2026-06-08 | Projets → SQLite (GET/POST/DELETE /projects — Cédric) |
| **Phase 3 — P1 UX** | ✅ Fait 2026-06-09 | Toast, % profil, chips, bannière, max-width, lien découverte (@boolshyt) |

---

## Notes techniques

- **`App.js`** — toute la logique d'état est ici (chats, projets, vue active, favorites, toast, profileSummary). Les composants enfants reçoivent des callbacks via props.
- **`Chat.js`** accepte des props : `projects`, `currentProjectId`, `onAssignToProject`, `onCreateAndAssign`, `favorites`, `onToggleFavorite`.
- **`Message.js`** — carousel avec flèches `‹ ›`, batch loading par tranches de 8, `useRef` pour le scroll programmatique, `useState` pour `shown`.
- **`JobCard.js`** — normalise les noms de champs entre les API France Travail et Adzuna. Reçoit `isFavorite` + `onToggleFavorite` depuis Message.js.
- **`requirements.txt` backend** — réécrit proprement le 2026-05-12 par Gendell (était corrompu encodage UTF-16), playwright + python-docx + reportlab + icalendar ajoutés le 2026-05-25. Contient : fastapi, uvicorn, ollama, beautifulsoup4, requests, python-dotenv, pydantic, playwright, python-docx, reportlab, pdfplumber.
