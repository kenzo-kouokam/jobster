# Feature → API → UI Mapping — Jobster
> Source de vérité · Alignement UX ↔ Frontend ↔ Backend
> Dernière mise à jour : 2026-06-08 · Phases 1, 2, 2.5 et 3 complètes

---

## Objectif de ce document

Ce tableau connecte les fonctionnalités visibles par l'utilisateur, les composants React qui les implémentent, et les endpoints backend qui les alimentent. Il sert de **référence commune** entre :
- Gendell (frontend / UX) → sait quoi construire visuellement
- Cédric / Gildas (backend) → sait quels endpoints sont attendus par le frontend
- Yahia (scraping) → comprend comment les données arrivent dans l'UI

---

## Légende des phases

| Phase | Description | Backend requis | Statut |
|---|---|---|---|
| ✅ Phase 1 | UX layer — sidebar, chat, cartes | Non (chat existant) | ✅ Complète |
| ✅ Phase 2 | Fonctionnalités cœur — tracker, profil, documents | Oui | ✅ Complète |
| ✅ Phase 2.5 | Intelligence agent — profil injecté, historique conversation | Oui | ✅ Complète |
| ✅ Phase 3 | Extensions — favoris/projets SQLite, scrapers Playwright, ROME, upload-other | Oui | ✅ Complète (2026-06-08) |

---

## PHASE 1 — UX Layer ✅

| Feature | Action utilisateur | Composant UI | API | Méthode | Comportement | Résultat UI |
|---|---|---|---|---|---|---|
| Chat interaction | Envoie un message | `Chat.js` — textarea + send-btn | `/chat` | POST | LLM traite la requête + interroge les APIs. Envoie `history` (6 derniers messages) | Réponse IA dans le fil |
| Affichage des offres | L'IA retourne des offres | `JobCard.js` via `Message.js` | `/chat` | — | Offres incluses dans la réponse JSON | Carousel JobCards dans le chat |
| Navigation sidebar | Clique sur un chat existant | `App.js` — sidebar Chats | localStorage | — | Charge la conversation | Conversation affichée |
| Nouveau chat | Clique sur + Nouvelle recherche | `App.js` — sidebar button | Aucun | — | Crée une nouvelle conversation | Chat vide avec welcome screen |
| Suggestions de démarrage | Clique sur une suggestion | `Chat.js` — suggestion-card | `/chat` | POST | Envoie la suggestion comme message | Résultats dans le chat |
| All-chats overview | Clique sur Chats dans sidebar | `App.js` | localStorage | — | Liste tous les chats avec titre, dates, badge projet | Panel vue d'ensemble |
| Projets | Crée / renomme / supprime | `App.js` | `POST/GET/DELETE /projects` | REST | CRUD projets + emoji picker + assignation de chats · SQLite Phase 3 | Sidebar mise à jour |
| Favoris view | Ouvre Favoris | `App.js` (inline) | `GET/POST/DELETE /favorites` | REST | Grille de JobCards sauvegardées ou état vide · SQLite Phase 3 | Cards favoris avec toggle ❤️ |

---

## PHASE 2 — Fonctionnalités connectées au backend ✅

### Candidatures (tracker SQLite)

| Feature | Action utilisateur | Composant UI | API Endpoint | Méthode | Payload / Notes | Résultat UI |
|---|---|---|---|---|---|---|
| Sauvegarder une candidature | Clique sur 🔖 sur une JobCard | `JobCard.js` | `POST /candidatures` | POST | `{ poste, entreprise, location, contract_type, source, url }` · get-or-create par URL | Bouton vire coloré · Entrée dans tracker |
| Annuler la sauvegarde | Clique à nouveau sur ✅ | `JobCard.js` | `DELETE /candidatures/{id}` | DELETE | `id` de la candidature | Bouton revient neutre |
| Voir le tracker | Ouvre Candidatures | `Tracker.js` | `GET /candidatures` | GET | — | Tableau 10 colonnes, 11 statuts |
| Modifier statut / champs | Clique sur une ligne, édite le tiroir | `Tracker.js` — slide-in drawer | `PATCH /candidatures/{id}` | PATCH | Champs modifiés uniquement (dynamic SET) | Mise à jour immédiate |
| Supprimer une candidature | Bouton supprimer dans le tiroir | `Tracker.js` | `DELETE /candidatures/{id}` | DELETE | `id` | Ligne disparaît |

**11 statuts disponibles :**
`saved` · `applied` · `follow_up_due` · `follow_up_sent` · `interview_scheduled` · `interview_done` · `test_case` · `offer_received` · `rejected` · `withdrawn` · `archived`

---

### Documents et CV

| Feature | Action utilisateur | Composant UI | API Endpoint | Méthode | Payload / Notes | Résultat UI |
|---|---|---|---|---|---|---|
| Upload CV | Sélectionne et envoie un PDF | `ProfileForm.js` — section Mon CV | `POST /documents/upload` | POST | `FormData (file: PDF)` · extrait texte via pdfplumber → écrit `cv_texte` dans `profil.json` | Nom de fichier + date affichés |
| Upload autre document | Clique sur la zone d'upload dans Mes Documents | `DocumentsView.js` — zone d'upload cliquable | `POST /documents/upload-other` | POST | PDF, DOCX, image, TXT · sans extraction · nom horodaté · UI ajoutée 2026-06-10 | Fichier visible dans "Fichiers importés" avec download |
| Voir les documents | Ouvre Mes Documents | `DocumentsView.js` | `GET /documents` | GET | — | Deux sections : Fichiers importés + Documents générés |
| Télécharger un document | Clique sur le lien de téléchargement | `DocumentsView.js` | `GET /documents/download/{filename}` | GET | `filename` sécurisé (pas de path traversal) | Téléchargement déclenché |
| Supprimer un document | Clique sur 🗑️ | `DocumentsView.js` | `DELETE /documents/{filename}` | DELETE | Protection path traversal | Ligne disparaît |

---

### Profil utilisateur

| Feature | Action utilisateur | Composant UI | API Endpoint | Méthode | Payload / Notes | Résultat UI |
|---|---|---|---|---|---|---|
| Renseigner le profil | Remplit et soumet le formulaire | `ProfileForm.js` | `POST /profile` | POST | Tous les champs profil · merge avec `profil.json` existant (ne supprime pas `cv_texte`) | Confirmation visuelle · badge vert |
| Charger le profil existant | Ouvre Mon Profil | `ProfileForm.js` | `GET /profile` | GET | — | Champs pré-remplis |
| Profil dans le chat | Requête personnalisée | Backend automatique | `GET /profile` (interne) | — | `build_system_prompt()` injecte le profil + CV dans chaque appel Ollama | Réponses LLM personnalisées |

---

## PHASE 2.5 — Intelligence agent ✅

| Feature | Composant | Mécanisme | Statut |
|---|---|---|---|
| Profil injecté dans chaque réponse | `server.py` `build_system_prompt()` | Lit `profil.json` · injecte poste cible, localisations, compétences, CV | ✅ |
| Historique conversation | `Chat.js` → `server.py` | Envoie `history[]` (6 derniers messages filtrés × 800 chars) | ✅ |
| Recherche profilée sans reformulation | `server.py` `MOTS_VAGUE_PROFIL` | Bypass `comprendre_demande()` pour requêtes vagues → profil direct | ✅ |
| Détection ville dans le message | `server.py` `VILLES_CONNUES` | Détection déterministe · évite "Paris par défaut" Ollama | ✅ |
| Détection type de contrat | `server.py` `CONTRACT_TYPES_MAP` | Détecte CDI/CDD/Alternance/etc. dans le message, écrase les keywords | ✅ |
| Fallback national | `server.py` + `jobster_agent.py` | Si 0 résultats ville → essaie autres villes profil → France | ✅ |
| Erreur Ollama gracieuse | `server.py` | Message utilisateur compréhensible si Ollama est éteint | ✅ |

---

## PHASE 3 — Extensions ✅ Complète (2026-06-08)

### Favoris persistants (SQLite)

| Feature | Action utilisateur | Composant UI | API Endpoint | Méthode | Statut |
|---|---|---|---|---|---|
| Sauvegarder un favori | Clique ❤️ sur JobCard | `JobCard.js` + `App.js` | `POST /favorites` | POST | ✅ Implémenté |
| Voir ses favoris | Ouvre Favoris | `App.js` inline | `GET /favorites` | GET | ✅ Implémenté |
| Retirer un favori | Clique ❤️ à nouveau | `JobCard.js` + `App.js` | `DELETE /favorites/{id}` | DELETE | ✅ Implémenté |

*Fallback localStorage si le backend est indisponible.*

### Projets persistants (SQLite)

| Feature | Action utilisateur | Composant UI | API Endpoint | Méthode | Statut |
|---|---|---|---|---|---|
| Créer un projet | Bouton + dans sidebar | `App.js` | `POST /projects` | POST | ✅ Implémenté |
| Voir ses projets | Sidebar section Projets | `App.js` | `GET /projects` | GET | ✅ Implémenté |
| Supprimer un projet | Menu contextuel sidebar | `App.js` | `DELETE /projects/{id}` | DELETE | ✅ Implémenté |

### Scrapers Playwright

| Source | Type | Statut | Notes |
|---|---|---|---|
| France Travail | API officielle | ✅ Opérationnel | Via OAuth2 · paramétré par ville/contrat/keywords |
| Adzuna | API officielle | ✅ Opérationnel | Nécessite `.env` |
| Indeed | Playwright (thread parallèle) | ✅ Opérationnel | Timeout 25s · Chromium headless · anti-détection |
| WTTJ | Playwright (thread parallèle) | ⚡ Best-effort | SPA anti-bot · retourne [] silencieusement |

### Fiches métier ROME

| Feature | Déclencheur | Mécanisme | Statut |
|---|---|---|---|
| Fiche métier ROME | "fiche métier", "reconversion", "devenir développeur"... | `MOTS_ROME` → `api_rome_metier()` (Ollama) → `rome: true` → `RomeCard` dans `Message.js` | ✅ Implémenté 2026-06-10 (carte structurée) |

### Fix biais géographique

| Correction | Avant | Après | Statut |
|---|---|---|---|
| `comprendre_demande()` few-shot | Retournait "Paris" si aucune ville | Retourne `null` → profil.json → fallback national | ✅ Corrigé |

---

## PHASE 3.5 — Outils 7 & 8 réimplémentés ✅ (2026-06-10)

Les scopes France Travail `api_labonneboitev1` et `api_evenementsv1` n'étant pas activés sur l'application francetravail.io, les deux outils ont été réimplémentés par reverse-engineering des APIs publiques officielles.

### La Bonne Boîte (outil 7)

| Feature | Déclencheur | Mécanisme | Résultat | Statut |
|---|---|---|---|---|
| Entreprises susceptibles de recruter | `"bonne boite développeur Lyon"` | GET `labonneboite.francetravail.fr/api/v2/search` — résolution ROME via autocomplete + citycode INSEE via autocomplete | 98 entreprises, score /100, secteur, contact email | ✅ Opérationnel |

**Étapes techniques :**
1. `/api/v2/autocomplete/jobs?q=<métier>` → liste de codes ROME + libellés → sélection du plus pertinent par scoring mots-clés
2. `/api/v2/autocomplete/location?q=<ville>` → citycode INSEE (ex. Lyon = 69123)
3. `/api/v2/search?rome=<code>&citycode=<code>&distance=30&sort_by=romes.hiring_potential` → liste d'entreprises

### Événements emploi (outil 8)

| Feature | Déclencheur | Mécanisme | Résultat | Statut |
|---|---|---|---|---|
| Salons, job datings, ateliers emploi | `"évènements emploi Lyon"` | POST `mesevenementsemploi.francetravail.fr/api-candidat/mee/v1/de/evenement/all/filtered` | 372 événements Lyon, avec date/horaires/lieu/type/places | ✅ Opérationnel |

**Headers requis (identifiés par interception réseau Playwright) :**
- `x-initialized-at` : timestamp Unix en millisecondes
- `user_location` : `"2"`

---

## Composants UI — état final

| Composant | Statut | Rôle |
|---|---|---|
| `App.js` | ✅ Complet | Orchestrateur · Sidebar · State machine `activeView` · Favoris/Projets SQLite |
| `Chat.js` | ✅ Complet | Interface chat · `sendMessage()` avec `history[]` |
| `Message.js` | ✅ Complet | Rendu markdown + JobCards carousel + action chips post-analyse |
| `JobCard.js` | ✅ Complet | Carte offre · 🔖 save/undo · ❤️ favoris · 🔍 voir détails |
| `Tracker.js` | ✅ Complet | Vue Candidatures · tableau · tiroir · 11 statuts · tri · recherche |
| `DocumentsView.js` | ✅ Complet | Vue Mes Documents · upload-other · download · delete |
| `ProfileForm.js` | ✅ Complet | Formulaire Mon Profil · upload CV PDF · badge actif |

---

## Flux de données complet

```
[Utilisateur tape] → POST /chat (+ history[]) → [server.py]
                                                      ↓
                         [build_system_prompt() : profil + CV injecté]
                                                      ↓
                         [intent routing] → [Ollama ou scraper]
                                                      ↓
                    France Travail API + Adzuna API + Indeed Playwright
                                                      ↓
                                              [Réponse + offres JSON]
                                                      ↓
                                           [JobCards affichées]
                                                      ↓
    [🔖 Candidater] → POST /candidatures → [Tracker SQLite]
    [❤️ Favori]     → POST /favorites   → [Favoris SQLite]
    [🔍 Voir détails] → POST /chat (analyse URL) → [Action chips]
    [📊 Matcher]    → POST /chat (matching)    → [Score profil]
    [📄 Lettre]     → POST /chat (lettre URL)  → [.docx téléchargeable]

[Upload CV]     → POST /documents/upload       → [cv_texte dans profil.json]
[Upload doc]    → POST /documents/upload-other → [fichier dans scraping/]
[Mon Profil]    → POST/GET /profile            → [profil.json · contexte LLM enrichi]
[Mes Documents] → GET /documents               → [liste fichiers]
[Tracker]       → PATCH /candidatures/{id}     → [mise à jour statut / champs]
[Projets]       → POST/GET/DELETE /projects    → [SQLite projects table]
```

---

*Document Jobster-hephaestus · Epitech MSc MSI Hephaestus · mis à jour 06Juin2026*
*Toutes les phases sont complètes (8/8 outils opérationnels). Prochaine étape : soutenance Keynote 30 juin 2026.*
