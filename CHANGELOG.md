# CHANGELOG

Toutes les modifications notables de ce projet sont documentées ici.
Les entrées les plus récentes apparaissent en premier.

---

## 2026-06-10 (session 3 — suite)

**Gaps P3-C et P3-E résolus — Fiche ROME + Upload documents**

- `scraping/jobster_agent.py` — `api_rome_metier()` réécrite entièrement. L'API FT ROME 4.0 (`/partenaire/rome-metiers/v1/metiers/metier`) retournait 403 (scope non activé). La fonction utilise désormais Ollama directement avec un prompt structuré imposant 5 sections obligatoires : Description, Compétences clés, Formations recommandées, Évolutions de carrière, Conseil pour se lancer. Les balises `<think>` de Qwen3 sont retirées via regex avant retour.
- `backend/server.py` — `appeler_outil_mcp()` retourne maintenant un 4-tuple `(texte, offres, besoin_ollama, is_rome)`. Tous les `return formater_outil(...)` mis à jour avec `False` en 4e position sauf la route ROME qui retourne `True`. Endpoint `/chat` expose le champ `rome: true` dans la réponse JSON quand une fiche métier est générée.
- `frontend/…/Chat.js` — `sendMessage()` stocke `isRome: data.rome === true` dans l'objet message. Prop `isRome` passée à `<Message>`.
- `frontend/…/Message.js` — Nouveau composant `RomeCard` : extrait le titre depuis le header `📚 FICHE MÉTIER — X :`, affiche un bandeau violet gradient (`.rome-card-header`), corps markdown dans `.rome-card-body`. Rendu conditionnel : si `isRome` → `<RomeCard>`, sinon `<ReactMarkdown>` standard.
- `frontend/…/DocumentsView.js` — Zone d'upload cliquable dans la section "Fichiers importés" (remplace les 2 `EmptySlot` placeholders). `<input type="file">` masqué, `<label>` stylée. Accepte PDF, Word, images. Appelle `POST /documents/upload-other`. Ajoute le fichier uploadé à la liste avec optimistic update. Message de confirmation/erreur avec auto-dismiss 3,5s.
- `frontend/…/DocumentsView.css` — Styles `.doc-upload-zone`, `.doc-upload-label`, `.doc-upload-btn`, `.doc-upload-msg` (variantes `--ok` et `--err`).

---

## 2026-06-10

**Agent IA — Outils 7 & 8 pleinement opérationnels (APIs publiques)**

- `scraping/jobster_agent.py` — `api_la_bonne_boite()` entièrement réécrite. Abandonne l'API partenaire France Travail (`/partenaire/labonneboite/v1/company/` — 403 systématique, scope non activé) au profit de l'**API publique** `labonneboite.francetravail.fr/api/v2/search`. Résolution automatique du code ROME depuis les mots-clés via `/api/v2/autocomplete/jobs` (scoring sur les termes utilisateur pour choisir le ROME le plus pertinent). Résolution du citycode INSEE depuis la ville via `/api/v2/autocomplete/location`. Retourne jusqu'à 10 entreprises avec nom, ville, département, score de recrutement /100, secteur d'activité et indication de contact email. Résultat testé : 98 entreprises pour "développeur Lyon".
- `scraping/jobster_agent.py` — `api_evenements_emploi()` entièrement réécrite. Abandonne l'API partenaire France Travail (`/partenaire/evenements-emploi/v1/evenements` — 401 systématique, scope non activé) au profit de l'**API publique** `mesevenementsemploi.francetravail.fr/api-candidat/mee/v1/de/evenement/all/filtered` (POST). Headers requis identifiés par interception réseau Playwright : `x-initialized-at` (timestamp ms) et `user_location: 2`. Filtre par département via `ville_vers_dept()`. Retourne jusqu'à 8 événements avec titre, date, horaires, ville, type (job dating / réunion d'info / salon), nombre de places, statut préinscription. Résultat testé : 372 événements pour Lyon.
- `backend/server.py` — Appel de `api_la_bonne_boite()` mis à jour : passe désormais la ville extraite par `comprendre_demande()` en deuxième paramètre (au lieu d'utiliser uniquement les coordonnées Paris par défaut).

**Documentation**
- `README.md` — outils 7 & 8 marqués opérationnels (API publique LBB + MEE), FU2 marqué ✅, stack technique étendue.
- `scraping/README.md` — tableau outils 7 & 8 mis à jour, nouvelles sources LBB et MEE dans le tableau des sources actives, problème résolu dans les bugs connus.

---

## 2026-06-09

**Frontend — P1 UX améliorations (6 items) — poussé par @boolshyt**

- `frontend/jobster-app/src/components/Toast.js` *(nouveau)* — Système de notification toast. Position fixe bas-droite, 3 variantes (succès/erreur/info), auto-fermeture 3,2 s, `role="status"` accessible. Déclenché lors du toggle favori (ajout/suppression) et de l'ajout au tracker.
- `frontend/jobster-app/src/components/Toast.css` *(nouveau)* — Styles toast : entrée/sortie animée, couleurs par variante (vert/rouge/bleu), barre de progression.
- `frontend/jobster-app/src/components/ProfileForm.js` — Ajout indicateur de complétion profil : `computeCompletion()` vérifie 6 champs, barre de progression colorée (vert ≥ 80 %, ambre ≥ 50 %, bleu < 50 %), texte "X% complet" + hint sur les champs manquants.
- `frontend/jobster-app/src/components/ProfileForm.css` — Styles de la barre de complétion (`.completion-bar`, `.completion-fill`, couleurs dynamiques).
- `frontend/jobster-app/src/components/Chat.js` — Chips de suggestion contextuels : 4 actions rapides (Chercher des offres, Analyser une offre, Score de matching, Lettre de motivation) affichées au-dessus de l'input après le premier message. Pré-remplit le textarea et focus au clic, désactivé en chargement.
- `frontend/jobster-app/src/components/Chat.css` — Styles des chips (`.quick-chips`, `.chip-btn`).
- `frontend/jobster-app/src/components/Message.css` — `.assistant-content { max-width: 640px }` : limite la longueur des lignes sur grands écrans.
- `frontend/jobster-app/src/App.js` — (1) Bannière de complétion profil non bloquante : bandeau bleu si `titre_cible` ou `localisations` vide, caché si profil complet. (2) Lien "Découvrir ce que l'agent peut faire →" sur l'écran d'accueil, navigue vers le Guide. (3) Import et wiring de `<Toast>`.
- `frontend/jobster-app/src/App.css` — Styles bannière profil (`.nudge-banner`) et lien découverte (`.discover-link`).

---

## 2026-06-08

**Backend**
- `scraping/jobster_agent.py` — `comprendre_demande()` : suppression du biais "Paris par défaut" dans le few-shot. Le modèle retourne désormais `null` quand aucune ville n'est mentionnée. 4 nouveaux exemples variés (messages sans ville, en anglais, message "remote"). Les fallbacks retournent aussi `None` au lieu de `"Paris"`. (P3-B)
- `backend/server.py` — Bloc de recherche d'offres : gère `location = None` retourné par `comprendre_demande()` ; utilise la localisation du profil avant de tomber sur "Paris" en dernier recours. (P3-B)
- `backend/server.py` — `MOTS_ROME` étendu : ajout de "reconversion", "métier de", "devenir ", "comment devenir", "formation pour devenir", "code rome" pour une meilleure couverture des requêtes fiches métier. (P3-C)
- `backend/server.py` — Ajout de `POST /documents/upload-other` : upload de documents quelconques (PDF, DOCX, images, TXT) sans extraction de texte ni écriture dans `profil.json`. Nom de fichier horodaté pour éviter les collisions. Retourne `{filename, original, size, download}`. (P3-E)

**Scraping**
- `scraping/jobster_scraper.py` — `scrape_indeed()` : correctifs sélecteurs HTML (juin 2026). `h3.jobTitle` au lieu de `h2.jobTitle`, titre extrait depuis `aria-label` du lien `a[data-jk]`. Arguments Chromium anti-détection (`--disable-blink-features=AutomationControlled`). Testé : 5 offres réelles retournées. (P3-A)
- `scraping/jobster_scraper.py` — `scrape_wttj()` : arguments Chromium mis à jour, gestion cookie banner, commentaire "best-effort" — WTTJ SPA bloque les navigateurs headless non fingerprinted, retourne [] silencieusement. (P3-A)
- `scraping/jobster_agent.py` — `lancer_scraper()` : Indeed + WTTJ désormais lancés en parallèle via threads démons (timeout 25 s). Le pipeline reste réactif — France Travail + Adzuna répondent en < 5 s, Playwright merge ses résultats si disponibles dans le délai. (P3-A)

**Frontend**
- `frontend/jobster-app/src/App.js` — Favoris persistants SQLite (P2-B) : chargement depuis `GET /favorites` au démarrage (fallback localStorage si backend indisponible). `toggleFavorite` synce avec `POST /favorites` (ajout) et `DELETE /favorites/{id}` (suppression). Mise à jour optimiste + récupération du `_backendId` backend.
- `frontend/jobster-app/src/App.js` — Projets persistants SQLite (P2-C) : chargement depuis `GET /projects` au démarrage (fallback localStorage). `addProject` et `createAndAssign` postent au backend et stockent le `_backendId`. `deleteProject` appelle `DELETE /projects/{id}` si `_backendId` disponible.
- `frontend/jobster-app/src/components/Chat.js` — Ajout de l'état `loadingLabel` et de la fonction `getLoadingLabel(msg)` : détection du type de requête pour afficher un spinner contextuel (ex. "Recherche en cours · France Travail · Adzuna · Indeed" pour les recherches d'offres).
- `frontend/jobster-app/src/App.css`, `Chat.css`, `JobCard.css` — Ajout de breakpoints responsive (1100 px, 768 px, 480 px) : sidebar overlay, adaptation mobile des cartes et du chat.

**Backend (correctifs)**
- `backend/server.py` — Compatibilité Python 3.9 : remplacement de toutes les annotations `str | None` par `Optional[str]` (imports `typing` ajoutés). Résout `TypeError` au démarrage sur Python < 3.10.
- `backend/server.py` — Correction de `build_system_prompt()` : guard `isinstance(certs_raw, list)` ajouté avant la conversion en chaîne — évite un crash si `certifications` est une chaîne dans `profil.json`.
- `backend/server.py` — Expansion de `MOTS_PROFIL_QUERY` : nouveaux mots-clés pour mieux détecter les questions sur le profil.

**Scraping (correctifs)**
- `scraping/jobster_agent.py` — `init_db()` remplacé par une fonction no-op : supprime le conflit de schéma entre `jobster_agent.py` (8 colonnes) et `server.py` (20 colonnes). Le schéma SQLite est désormais géré exclusivement par `get_db()` dans `server.py`.
- `scraping/jobster_agent.py` — Portée OAuth2 France Travail réduite à `api_offresdemploiv2 nomenclatureRome o2dsoffre` : scope minimal pour la recherche d'offres et les fiches ROME. Note : `api_labonneboitev1` et `api_evenementsv1` retirés — les outils LBB et Événements emploi retournent désormais une URL de repli en cas de 401.
- `scraping/jobster_agent.py` — `api_la_bonne_boite()` et `api_evenements_emploi()` : gestion gracieuse du 401/403 — retourne un message avec l'URL du site France Travail plutôt qu'une exception.

**Documentation**
- `docs/07_bilan_technique.md` — nouveau fichier : bilan technique complet (architecture, stack, outils, décisions, limites connues, répartition du travail).
- `docs/05_feature_api_ui_mapping.md` — toutes les phases marquées complètes.
- `docs/README.md` — statuts de toutes les fonctionnalités mis à jour.
- `TODO.md` — P2-B, P2-C, P3-A, P3-B, P3-C, P3-E marqués ✅ terminé.

---

## 2026-05-29

**Backend**
- Ajout de `GET /favorites`, `POST /favorites`, `DELETE /favorites/{id}` — persistance SQLite des favoris (Phase 3). Modèle Pydantic `FavoriteCreate` (titre, entreprise, url, location, contract_type, source). Pattern get-or-create par URL — aucun doublon possible. Retourne `{"favorite": {...}, "created": true/false}`.
- Ajout de `GET /projects`, `POST /projects`, `DELETE /projects/{id}` — persistance SQLite des projets (Phase 3). Modèle Pydantic `ProjectCreate` (name, emoji, color). Retourne `{"project": {...}, "created": true}`.
- Ajout des tables `favorites` et `projects` dans `get_db()` via `CREATE TABLE IF NOT EXISTS` — créées automatiquement au premier démarrage du backend, aucune migration manuelle nécessaire.

---

## 2026-05-28

**Backend**
- Ajout de `DELETE /documents/{filename}` — supprime un fichier généré depuis `scraping/`. Protection contre le path traversal (`..`, `/`, `\` interdits dans le nom de fichier). Retourne `{"deleted": filename}` ou `404` si le fichier n'existe pas.

**Frontend**
- `DocumentsView.js` — ajout du bouton de suppression 🗑️ sur chaque ligne de la section "Documents générés". Appel `DELETE /documents/{filename}`, retrait optimiste de la liste locale sans rechargement. Gestion de l'état `deleting` pour désactiver le bouton pendant la requête.
- `DocumentsView.css` — ajout des styles `.doc-delete-btn` (rond 32px, hover rouge, disabled opacity 0.4).

**Documentation**
- `docs/06_contraintes_techniques.md` — nouveau fichier : 8 contraintes techniques réelles rencontrées (modèle IA léger, interdiction APIs payantes, profil.json flat-file, CORS ouvert, pdfplumber, .docx Markdown artifacts, OAuth2 France Travail, localStorage) avec mitigations et tableau récapitulatif.
- `docs/README.md` — ajout de l'entrée `06_contraintes_techniques.md`, mise à jour du statut DELETE /documents en ✅.
- `README.md` (racine) — ajout d'une section `## Contraintes techniques` avec lien vers `docs/06_contraintes_techniques.md`.
- `TODO.md` — P1-A (`DELETE /documents/{filename}`), P2-A (bouton suppression DocumentsView), P3-D (CV adapté) marqués ✅ terminé.

---

## 2026-05-25

**Backend**
- Ajout de `CONTRACT_TYPES_MAP` et `detect_contract_in_message()` dans `server.py` — détection déterministe du type de contrat (CDI, CDD, Alternance, Stage, Intérim, Freelance, Apprentissage) dans le message utilisateur. Le type détecté est injecté directement dans la requête scraper, remplaçant les mots-clés génériques.
- Correction du fallback national dans le bloc de recherche d'offres — en l'absence de résultats pour la ville demandée, l'agent essaie les autres villes du profil dans l'ordre avant de lancer une recherche nationale (France Travail sans filtre département).
- Correction `build_system_prompt()` — ajout d'une règle de réponse concise (2-3 phrases) pour les questions méta sur le profil.
- Amélioration des messages d'erreur Ollama — remplacement des exceptions brutes par un message utilisateur lisible en français.
- Réécriture complète de `backend/requirements.txt` — encodage UTF-8 corrigé, 14 packages déclarés. Ajout de `playwright`, `lxml`, `python-docx`, `reportlab`, `icalendar`.

**Scraping**
- Correction `ville_vers_dept()` dans `jobster_agent.py` — "france", "national" et la chaîne vide retournent désormais `""` (aucun filtre département pour les recherches nationales).
- Correction `lancer_scraper()` et `scrape_france_travail()` — le paramètre `departement` est omis conditionnellement pour les recherches nationales.

**Documentation**
- Mise à jour de l'ensemble des fichiers README (`/`, `backend/`, `scraping/`, `docs/`) et des documents UX (`docs/02` à `docs/05`) pour refléter l'état réel des Phases 1, 2 et 2.5.

---

## 2026-05-19

**Backend**
- Ajout de `build_system_prompt()` — le profil utilisateur complet (poste cible, localisations, compétences, texte du CV, expérience, formation) est injecté dans chaque appel Ollama via le message système.
- Ajout de `build_ollama_messages()` — assemblage du tableau de messages Ollama : `[system] + historique[-6:] + [message courant]`. Chaque message d'historique est plafonné à 800 caractères.
- Endpoint `/chat` — lecture du champ `history` dans le corps de la requête.
- Ajout de `MOTS_VAGUE_PROFIL` — liste d'expressions déclenchant une recherche profilée directe (lecture de `profil.json`) sans appel à `comprendre_demande()`.
- Ajout de `VILLES_CONNUES` + `ville_dans_message()` — détection déterministe de la ville dans le message (34 villes françaises).
- Ajout de `KEYWORDS_GENERIQUES` + `keywords_trop_generiques()` — remplacement des mots-clés hallucinés par le `titre_cible` du profil.
- Ajout de `load_profil()` — helper centralisé de lecture de `profil.json`.
- Constante `FICHIER_PROFIL` déplacée en début de fichier (ligne 23).

**Frontend**
- `Chat.js` — `sendMessage()` envoie les 6 derniers messages filtrés (rôles `user`/`assistant`, plafonnés à 800 caractères) comme champ `history` à chaque requête POST.
- `ProfileForm.css` — ajout de toutes les classes CSS manquantes : `.multi-chips`, `.multi-chip`, `.profile-select`, `.profile-radio-group`, `.profile-radio-chip`, `.salary-input-wrap`, `.salary-unit`, `.profile-field--narrow`.

---

## 2026-05-16

**Backend**
- Ajout de `GET /documents` — liste les fichiers uploadés et les fichiers générés présents dans `scraping/`.
- Ajout de `GET /documents/download/{filename}` — téléchargement sécurisé de fichiers depuis `scraping/`.
- Correction `POST /profile` — les champs `cv_texte`, `cv_filename`, `cv_uploaded_at` ne sont plus écrasés lors d'une sauvegarde de profil.
- Ajout du champ `certifications` dans le modèle Pydantic `ProfileData` et dans `POST /profile`.

**Frontend**
- Redesign de l'en-tête de chat — affiche le titre de la conversation, renommage par double-clic, horodatages de création et de mise à jour.
- `DocumentsView.js` (nouveau composant) — deux sections : "Fichiers importés" (CV) et "Documents générés" (fichiers produits par l'agent). Liens de téléchargement pour chaque fichier.
- `ProfileForm.js` — ajout d'une section "Certifications" (Section 4, avant "Mon CV").
- `App.js` — `DocumentsView` branché sur la vue Documents de la sidebar.

---

## 2026-05-15

**Backend**
- Ajout de `POST /documents/upload` — accepte un fichier PDF, extrait le texte avec `pdfplumber`, écrit `cv_texte`, `cv_filename` et `cv_uploaded_at` dans `scraping/profil.json`.
- Correction `POST /candidatures` — pattern get-or-create par URL : retourne la ligne existante si l'URL est déjà enregistrée, évite les doublons en base.

**Frontend**
- `Message.js` — affichage de 4 puces d'action sous les messages d'analyse d'offre (déclenchés par "Voir les détails") : ❤️ Favoris, 🔗 Postuler, 📊 Matcher mon profil, ✓ Candidater / ✅ Retirer.
- `JobCard.js` — remplacement du bouton "Candidater" par une icône toggle 🔖/✅ en haut à droite (réversible, avec protection contre les doublons).
- `App.js` — persistance localStorage pour les 5 états : chats, historique, projets, favoris, `savedCandidatures`. Ajout de `handleRemoveFromTracker` (appel `DELETE /candidatures/{id}`).
- `ProfileForm.js` — section "Mon CV" : sélecteur de fichier PDF, upload vers `/documents/upload`, affichage du CV actif avec nom et date.

**Repo**
- Mise à jour `.gitignore` — ajout de `scraping/*.db`, `scraping/profil.json`, `scraping/cv_utilisateur.pdf`, `scraping/*.docx`, `scraping/*.pdf`, `frontend/jobster-app/node_modules/`.

---

## 2026-05-14

**Backend**
- Ajout de `GET /profile` et `POST /profile` — lecture et écriture de `scraping/profil.json`. Modèle Pydantic `ProfileData`.
- Refonte du schéma `candidatures` — 20 colonnes, migration sécurisée via `PRAGMA table_info` + `ALTER TABLE ADD COLUMN`.
- 11 codes statut avec libellés, couleurs et couleurs de fond (`STATUSES`). Table SQLite `statuses`.
- `PATCH /candidatures/{id}` — clause `SET` dynamique, seuls les champs fournis sont mis à jour.
- `GET /statuses` — retourne les 11 codes statut avec libellés et couleurs.

**Frontend**
- `ProfileForm.js` + `ProfileForm.css` (nouveaux composants) — formulaire de profil structuré : coordonnées, recherche d'emploi, parcours. Chargement du profil existant au montage, sauvegarde via `POST /profile`.
- `Tracker.js` — refonte complète. Table triable (10 colonnes), barre de recherche, filtres statut multi-sélection, tiroir latéral (480px) avec sections conditionnelles par statut (offre / candidature / entretien / résultat), surlignage rouge des relances en retard.

---

## 2026-05-14

**Architecture**
- Réduction de la surface exposée de 15 à 8 outils dans `SYSTEM_PROMPT` et le panneau Guide. Les fonctions correspondantes restent présentes dans le code source.

**Frontend**
- `JobCard.js` — normalisation des types de contrat (Adzuna + France Travail). Deux tags indépendants : durée (CDI / CDD / Alternance / Stage / Intérim / Freelance) et temps (Temps plein / Temps partiel).
- Bouton "🔍 Voir les détails" sur chaque `JobCard` avec URL valide — déclenche `analyse cette offre [url]` dans le chat courant.

**Backend**
- Correction `server.py` — suppression du slice `[:10]` sur la liste d'offres. Le frontend reçoit désormais toutes les offres retournées par le scraper.

---

## 2026-05-12

**Backend / Configuration**
- Correction du nom de clé `.env` : `ADZUNA_API_KEY` → `ADZUNA_APP_KEY`.
- Correction des appels `load_dotenv()` dans `jobster_scraper.py` (ligne 35) et `jobster_agent.py` (~ligne 1116) — utilisation d'un chemin absolu dérivé de `__file__` (robuste quel que soit le répertoire de lancement).
- Réécriture de `backend/requirements.txt` — encodage corrigé, packages manquants (`beautifulsoup4`, `requests`, `python-dotenv`) ajoutés.

**Frontend**
- Remplacement du scrollbar horizontal par des boutons `‹` et `›` sur le carousel de `JobCard`.
- Chargement par lots (8 cartes par batch) — carte "+N offres" pour charger le batch suivant, carte "Fin des résultats" après expansion.
- État `favorites` + `toggleFavorite` dans `App.js`. Vue Favoris : grille de `<JobCard>` quand des favoris existent.

---

## 2026-05-11

**Frontend**
- Navigation sidebar — les boutons Chats, Favoris, Candidatures, Documents, Profil contrôlent correctement le panneau principal via la machine à états `activeView`.
- Panneau "Tous les chats" — liste les conversations avec titre, date de création, date de mise à jour et badge projet. Cliquer sur une conversation l'ouvre.
- Projets — vue ouverte dans le panneau principal. Bouton retour vers la liste des chats.
- Champ `lastUpdated` ajouté à chaque entrée d'historique, mis à jour à chaque nouveau message.

---

## 2026-04-28

**Backend**
- Prototype V1 — connexion France Travail API + Ollama (Qwen3:1.7b) via FastAPI. Premier résultat de recherche d'offres fonctionnel en bout en bout.

---

## 2026-04-21

- Initialisation du projet. Thème retenu : assistant IA de recherche d'emploi (Jobster).
- Dépôt GitHub créé : https://github.com/Gilpropm/Jobster-hephaestus
- Rôles définis : Chef de projet / IA (Gildas Sagbo Edoh), Frontend (Gendell Janssens), Backend API (Cédric), Scraping (Yahia Baakili).
- Sources de données retenues : France Travail API + Adzuna API.
- Stack technique retenu : Python / FastAPI / Ollama (Qwen3:1.7b) / React / SQLite.
