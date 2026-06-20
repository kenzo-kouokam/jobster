# docs/ — Documentation technique de Jobster

Ce dossier contient la documentation technique du projet Jobster (Epitech MSc MSI Hephaestus).

**Responsable :** @boolshyt (Gendell) pour UX · @Gilpropm (Gildas) pour technique

---

## Fichiers

| Fichier | Contenu | Utilité |
|---------|---------|---------|
| `01_personas.md` | 4 profils utilisateurs (Samira, Lina, Yassine, Claire) avec besoins, contextes et frustrations | Comprendre pour qui on développe |
| `02_ux_journey_map.md` | Parcours utilisateur en 6 étapes — de la découverte à l'entretien | Identifier les points de friction |
| `03_ux_flow_diagram.md` | Diagramme de flux des interactions — comment les écrans s'enchaînent | Référence pour le routing React |
| `04_ux_system_diagram.md` | Diagramme système — comment frontend, backend, agent et APIs sont connectés | Vue d'ensemble technique |
| `05_feature_api_ui_mapping.md` | Tableau de correspondance — chaque fonctionnalité UI liée à son endpoint backend | Roadmap Phases 1/2/2.5/3/3.5 — toutes complètes (8/8 outils) |
| `06_contraintes_techniques.md` | 9 contraintes techniques réelles rencontrées + comment elles ont été gérées | Référence soutenance / évaluateurs |
| `07_bilan_technique.md` | Choix d'architecture, difficultés rencontrées, résultats mesurés, répartition du travail | **Document soutenance Keynote 30 juin** |

---

## Statut des fonctionnalités

| Phase | Fonctionnalité | Status |
|-------|---------------|--------|
| Phase 1 | Sidebar 5 sections avec empty states | ✅ Implémenté |
| Phase 1 | Gestion projets (créer/renommer/supprimer/emoji) | ✅ Implémenté |
| Phase 1 | Chat → assignation à un projet | ✅ Implémenté |
| Phase 1 | Carousel ‹ › + batch loading + Guide Jobster (8 outils) | ✅ Implémenté |
| Phase 1 | Favoris frontend | ✅ Implémenté |
| Phase 1 | JobCard : tags contrat dual + normalisation Adzuna | ✅ Implémenté |
| Phase 1 | JobCard : bouton « 🔍 Voir les détails » → analyse dans le chat | ✅ Implémenté |
| Phase 1 | CSS responsive (breakpoints 1100px / 768px / 480px) | ✅ Implémenté 2026-06-08 |
| Phase 1 | Persistance session (localStorage — chats, projets, favoris, candidatures) | ✅ Implémenté |
| Phase 2 | `GET/POST/PATCH/DELETE /candidatures` + Tracker.js (11 statuts, tiroir, tri) | ✅ Implémenté |
| Phase 2 | `GET/POST /profile` + ProfileForm.js (formulaire + upload CV) | ✅ Implémenté |
| Phase 2 | `POST /documents/upload` — upload PDF CV + extraction texte pdfplumber | ✅ Implémenté |
| Phase 2 | Icône 🔖 save/undo sur JobCard + chips action sur messages analyse | ✅ Implémenté |
| Phase 2 | `GET /documents` + `GET /documents/download/{filename}` + DocumentsView.js | ✅ Implémenté |
| Phase 2.5 | Agent profilé : `build_system_prompt()` injecte profil + CV dans chaque réponse | ✅ Implémenté |
| Phase 2.5 | Historique conversation : `history[]` (6 msgs) envoyé au backend depuis Chat.js | ✅ Implémenté |
| Phase 2.5 | Détection ville + contrat déterministe, fallback national, erreur Ollama gracieuse | ✅ Implémenté |
| Phase 3 | `GET/POST/DELETE /favorites` + table SQLite · frontend App.js | ✅ Implémenté 2026-06-08 |
| Phase 3 | `GET/POST/DELETE /projects` + table SQLite · frontend App.js | ✅ Implémenté 2026-06-08 |
| Phase 3 | `DELETE /documents/{filename}` + bouton 🗑️ DocumentsView.js | ✅ Implémenté |
| Phase 3 | `POST /documents/upload-other` (PDF, DOCX, images sans extraction) | ✅ Implémenté 2026-06-08 |
| Phase 3 | Scrapers Playwright Indeed + WTTJ dans pipeline live (threads parallèles, timeout 25s) | ✅ Implémenté 2026-06-08 |
| Phase 3 | Fix `comprendre_demande()` biais Paris → `null` + profil fallback | ✅ Implémenté 2026-06-08 |
| Phase 3 | `MOTS_ROME` étendu → `api_rome_metier()` exposée dans `/chat` | ✅ Implémenté 2026-06-08 |
| Phase 3 | Toast notifications (succès/erreur/info) — favoris + tracker | ✅ Implémenté 2026-06-09 |
| Phase 3 | Barre de complétion profil (`computeCompletion()` — 6 champs, vert/ambre/bleu) | ✅ Implémenté 2026-06-09 |
| Phase 3 | Chips de suggestion rapide (4 actions sous l'input — après 1er message) | ✅ Implémenté 2026-06-09 |
| Phase 3 | Bannière non-bloquante "Compléter mon profil" (si titre/loc manquants) | ✅ Implémenté 2026-06-09 |
| Phase 3 | Max-width messages assistant (640px — lisibilité grands écrans) | ✅ Implémenté 2026-06-09 |
| Phase 3 | Lien "Découvrir ce que l'agent peut faire →" sur l'écran d'accueil | ✅ Implémenté 2026-06-09 |
| Phase 3.5 | Outil 7 — La Bonne Boîte : API publique `labonneboite.francetravail.fr/api/v2/search` | ✅ Implémenté 2026-06-10 |
| Phase 3.5 | Outil 8 — Événements emploi : API publique `mesevenementsemploi.francetravail.fr` (POST) | ✅ Implémenté 2026-06-10 |
| Phase 3.5 | `RomeCard` dans `Message.js` — carte structurée 5 sections pour fiches métier | ✅ Implémenté 2026-06-10 |
| Phase 3.5 | Zone d'upload non-CV dans `DocumentsView.js` (PDF, Word, images) | ✅ Implémenté 2026-06-10 |
