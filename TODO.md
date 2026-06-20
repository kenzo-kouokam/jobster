# TODO — Backlog Phase 3
> Dernière mise à jour : 2026-06-10

**Workflow :**
1. Choisir une tâche marquée `libre` dans la priorité la plus haute
2. Changer son statut en `en cours — [ton pseudo git]` et pousser ce changement immédiatement
3. Coder la fonctionnalité
4. Pousser le code, marquer la tâche `✅ terminé`, ajouter une ligne dans `CHANGELOG.md`

---

## 🔴 PRIORITÉ 1 — Endpoints backend

Ces tâches sont indépendantes entre elles et peuvent être faites en parallèle.
Elles débloquent les tâches frontend de la Priorité 2.

---

### [P1-A] `DELETE /documents/{filename}`
**Fichier :** `backend/server.py`

Ajouter un endpoint `DELETE /documents/{filename}` qui supprime le fichier correspondant dans `scraping/`. Valider que le `filename` ne contient pas `..` (protection contre le path traversal). Retourner `{"deleted": filename}` en cas de succès, `404` si le fichier n'existe pas.

**Dépendances :** Aucune
**Statut :** `✅ terminé — boolshyt (2026-05-28)`

---

### [P1-B] `GET /favorites` + `POST /favorites` + `DELETE /favorites/{id}`
**Fichier :** `backend/server.py`

Créer une table SQLite `favorites` avec les colonnes : `id`, `titre`, `entreprise`, `url`, `location`, `contract_type`, `source`, `saved_at`. Ajouter :
- `GET /favorites` — retourne toutes les lignes
- `POST /favorites` — insère une offre (pattern get-or-create par URL, identique à `/candidatures`)
- `DELETE /favorites/{id}` — supprime une ligne

Réutiliser le helper `get_db()` déjà en place dans `server.py`.

**Dépendances :** Aucune (le frontend garde localStorage en fallback jusqu'à la tâche P2-B)
**Statut :** `✅ terminé — boolshyt (2026-05-29)`

---

### [P1-C] `GET /projects` + `POST /projects` + `DELETE /projects/{id}`
**Fichier :** `backend/server.py`

Créer une table SQLite `projects` avec les colonnes : `id`, `name`, `emoji`, `color`, `created_at`. CRUD minimal :
- `GET /projects` — liste tous les projets
- `POST /projects` — crée un projet (`name`, `emoji`, `color` requis)
- `DELETE /projects/{id}` — supprime un projet

Les associations chat → projet restent en localStorage côté frontend pour l'instant.

**Dépendances :** Aucune
**Statut :** `✅ terminé — boolshyt (2026-05-29)`

---

## 🟡 PRIORITÉ 2 — Frontend (nécessite les tâches P1 correspondantes)

---

### [P2-A] Bouton de suppression dans `DocumentsView.js`
**Fichier :** `frontend/jobster-app/src/components/DocumentsView.js`

Ajouter une icône de suppression (🗑️) sur chaque ligne de la section "Documents générés". Au clic, appeler `DELETE /documents/{filename}`, puis retirer le fichier de la liste locale (état React) sans rechargement.

**Dépendances :** [P1-A] doit être mergé avant
**Statut :** `✅ terminé — boolshyt (2026-05-28)`

---

### [P2-B] Favoris persistants — connexion backend SQLite
**Fichier :** `frontend/jobster-app/src/App.js`

Remplacer la gestion localStorage des favoris par des appels backend :
- Au chargement : `GET /favorites` (remplace `localStorage.getItem('jobster_favorites')`)
- Au toggle favori : `POST /favorites` ou `DELETE /favorites/{id}`

Conserver localStorage comme état initial si le backend est indisponible (mode dégradé).

**Dépendances :** [P1-B] doit être mergé avant
**Statut :** `✅ terminé — karisma (2026-06-08)`

---

### [P2-C] Projets persistants — connexion backend SQLite
**Fichier :** `frontend/jobster-app/src/App.js`

Remplacer la gestion localStorage des projets par des appels backend :
- Au chargement : `GET /projects`
- À la création : `POST /projects`
- À la suppression : `DELETE /projects/{id}`

Le champ `projectId` sur les conversations reste en localStorage.

**Dépendances :** [P1-C] doit être mergé avant
**Statut :** `✅ terminé — karisma (2026-06-08)`

---

## 🟢 PRIORITÉ 3 — Extensions agent (indépendant, parallélisable)

---

### [P3-A] Activer les scrapers Playwright (Indeed, WTTJ)
**Fichier :** `scraping/jobster_scraper.py`

`playwright` est déjà dans `requirements.txt`. Étapes :
1. Lancer `playwright install chromium` une fois (commande à exécuter manuellement)
2. Activer les scrapers Indeed et WTTJ dans `lancer_scraper()` — le code existe mais n'est pas routé dans le pipeline live
3. Vérifier qu'un appel retourne des résultats réels (pas d'erreur 403)

**Dépendances :** Aucune
**Statut :** `✅ terminé — karisma (2026-06-08)` — Indeed opérationnel (5 offres réelles testées). WTTJ best-effort (anti-bot SPA, retourne [] silencieusement).

---

### [P3-B] Corriger `comprendre_demande()` — few-shot "Paris par défaut"
**Fichier :** `scraping/jobster_agent.py`

La fonction `comprendre_demande()` utilise des exemples few-shot qui induisent systématiquement "Paris" comme ville par défaut même lorsque le message ne mentionne aucune ville. Mettre à jour ces exemples pour inclure des villes variées et une réponse explicite "ville: null" quand aucune ville n'est mentionnée.

Note : `backend/server.py` contient déjà des garde-fous (`VILLES_CONNUES`, `MOTS_VAGUE_PROFIL`) qui compensent ce problème dans la plupart des cas. Ce fix supprime la cause racine.

**Dépendances :** Aucune
**Statut :** `✅ terminé — karisma (2026-06-08)`

---

### [P3-C] Ré-exposer les fiches métier ROME
**Fichiers :** `backend/server.py`, `frontend/jobster-app/src/components/Message.js`

La fonction `api_rome_metier()` existe dans `scraping/jobster_agent.py` mais n'est pas exposée dans le pipeline `/chat`. Étapes :
1. Ajouter un bloc de détection dans `appeler_outil_mcp()` (mots-clés : "fiche métier", "reconversion", "métier de")
2. Créer un rendu frontend pour les résultats ROME (titre métier, compétences clés, voies d'accès, reconversions)

**Dépendances :** Aucune
**Statut :** `✅ terminé — karisma (2026-06-08)`

---

### [P3-D] Ré-exposer l'adaptation de CV
**Fichier :** `backend/server.py`

La fonction `generer_cv_adapte()` existe dans `scraping/jobster_agent.py` mais n'est pas exposée. Ajouter un bloc de détection dans `appeler_outil_mcp()` (mots-clés : "adapter mon cv", "cv adapté", "personnaliser mon cv"). Le résultat s'affiche comme texte dans le chat — aucun nouveau composant frontend nécessaire.

**Prérequis fonctionnel :** Un CV doit être uploadé dans `profil.json` via `POST /documents/upload`.

**Dépendances :** Aucune
**Statut :** `✅ terminé — déjà implémenté (server.py lignes 592-593, avant 2026-05-28)`

---

### [P3-E] Upload de documents autres que CV
**Fichier :** `backend/server.py`

Ajouter `POST /documents/upload-other` — même logique que `POST /documents/upload` mais sans extraction pdfplumber et sans écriture dans `profil.json`. Accepte PDF, DOCX, ou image. Sauvegarde dans `scraping/` et retourne `{"filename": ..., "size": ...}`. Mettre à jour `DocumentsView.js` pour afficher ces fichiers dans "Fichiers importés".

**Dépendances :** Aucune
**Statut :** `✅ terminé — karisma (2026-06-08)`

---

## ⚠️ Gaps connus — À corriger avant Keynote (30 juin)

| Tâche | Gap | Fichier | Statut |
|-------|-----|---------|--------|
| **P3-C** | Backend ROME ✅ — mais `Message.js` n'a pas de renderer ROME → affichage texte brut uniquement | `frontend/…/Message.js` | ✅ Résolu 2026-06-10 — `RomeCard` + `api_rome_metier()` via Ollama |
| **P3-E** | Backend upload-other ✅ — mais `DocumentsView.js` n'a pas d'UI upload pour fichiers non-CV | `frontend/…/DocumentsView.js` | ✅ Résolu 2026-06-10 — zone d'upload cliquable ajoutée |
| **docs/07** | Attribution `bilan_technique.md` incorrecte — assigne les 16 endpoints à un seul membre au lieu de 2 membres| `docs/07_bilan_technique.md` | ⚠️ Ouvert |
| **Yahia** | Zéro commits depuis le début — risque individuel critique | `scraping/` | ⚠️ Ouvert |
| **Outils 7 & 8** | LBB + Événements emploi bloqués (scopes FT non activés) | `scraping/jobster_agent.py` | ✅ Résolu 2026-06-10 — APIs publiques LBB + MEE |

---

## ✅ Terminé — Phases 1, 2, 2.5 et 3

Toutes les fonctionnalités des Phases 1, 2, 2.5, 3 et 3.5 sont implémentées. Tous les gaps connus sont résolus sauf attribution docs/07 et Yahia 0 commits.
Voir `CHANGELOG.md` pour le détail complet.

| Fonctionnalité | Phase | Auteur |
|---|---|---|
| Navigation sidebar 5 sections | 1 | boolshyt |
| Carousel JobCards `‹ ›` + batch loading | 1 | boolshyt |
| Favoris (état + grille) | 1 | boolshyt |
| Persistance localStorage (chats, projets, favoris, candidatures) | 2 | boolshyt |
| `GET/POST/PATCH/DELETE /candidatures` — 20 colonnes, 11 statuts | 2 | boolshyt |
| `Tracker.js` — table triable, tiroir latéral, surlignage retard | 2 | boolshyt |
| `GET/POST /profile` — lecture/écriture `profil.json` | 2 | boolshyt |
| `ProfileForm.js` — formulaire profil complet + certifications | 2 | boolshyt |
| `POST /documents/upload` — extraction PDF (pdfplumber) → `cv_texte` | 2 | boolshyt |
| `GET /documents` + `GET /documents/download/{filename}` | 2 | boolshyt |
| `DocumentsView.js` — fichiers importés + fichiers générés | 2 | boolshyt |
| Puces d'action sur messages d'analyse (❤️, 🔗, 📊, ✓) | 2 | boolshyt |
| `build_system_prompt()` — profil injecté dans chaque appel Ollama | 2.5 | Gilpropm |
| `build_ollama_messages()` — historique conversation (6 messages) | 2.5 | Gilpropm |
| `MOTS_VAGUE_PROFIL` — recherche profilée sans `comprendre_demande()` | 2.5 | Gilpropm |
| `VILLES_CONNUES` — détection déterministe de la ville | 2.5 | Gilpropm |
| `CONTRACT_TYPES_MAP` — détection déterministe du type de contrat | 2.5 | Gilpropm |
| Fallback national (pas de filtre département pour France entière) | 2.5 | Gilpropm |
| `DELETE /documents/{filename}` + bouton 🗑️ DocumentsView.js | 3 | boolshyt |
| `GET/POST/DELETE /favorites` + table SQLite | 3 | boolshyt |
| `GET/POST/DELETE /projects` + table SQLite | 3 | boolshyt |
| App.js — favoris + projets branchés SQLite (optimistic update) | 3 | karisma |
| Indeed + WTTJ scrapers Playwright (threads parallèles, timeout 25s) | 3 | karisma |
| Fix `comprendre_demande()` biais Paris → `null` | 3 | karisma |
| ROME routing (`MOTS_ROME`) + `api_rome_metier()` dans `/chat` | 3 | karisma |
| `POST /documents/upload-other` (sans extraction pdfplumber) | 3 | karisma |
| `RomeCard` dans `Message.js` — carte violette structurée (5 sections) | 3.5 | karisma |
| `api_rome_metier()` réécrite via Ollama (scope FT ROME non activé → 403) | 3.5 | karisma |
| Zone d'upload non-CV dans `DocumentsView.js` (PDF, Word, images) | 3.5 | karisma |
| CSS responsive (breakpoints 1100px / 768px / 480px) | 3 | karisma |
| Toast notifications (succès/erreur/info — favoris + tracker) | 3 | boolshyt |
| Barre de complétion profil (`computeCompletion()`, vert/ambre/bleu) | 3 | boolshyt |
| Chips de suggestion rapide (4 actions, après 1er message) | 3 | boolshyt |
| Bannière non-bloquante "Compléter mon profil" | 3 | boolshyt |
| Max-width messages assistant (640px) | 3 | boolshyt |
| Lien "Découvrir ce que l'agent peut faire →" (écran d'accueil) | 3 | boolshyt |
