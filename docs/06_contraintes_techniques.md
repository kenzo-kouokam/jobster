# 06 — Contraintes Techniques & Mitigations

> **Statut :** Phase 3.5 — Mis à jour le 2026-06-10
>
> Ce document recense les contraintes techniques réelles rencontrées durant le développement de Jobster, et comment elles ont été gérées. Il est destiné aux évaluateurs, aux contributeurs qui rejoignent le projet, et à la préparation de la soutenance.

---

## ⚠️ Contraintes Techniques & Mitigations

### 1. Modèle IA local léger — Qwen3:1.7b

**Contrainte :** Qwen3:1.7b a une fenêtre de contexte d'environ 4 000 tokens et des capacités limitées pour produire du JSON structuré de manière fiable. Le SDK MCP officiel d'Anthropic repose sur la capacité du LLM à appeler des outils via du JSON strict — ce que Qwen3:1.7b ne produit pas de façon fiable à 100 %.

**Mitigation :** Architecture de routage par mots-clés déterministe (`appeler_outil_mcp()` dans `server.py`). L'intention de l'utilisateur est détectée par correspondance de chaînes Python — pas d'IA impliquée dans le routage des outils. Résultat : zéro hallucination d'appel d'outil, même si le modèle produit du texte incohérent. L'historique de conversation est limité aux 6 derniers messages × 800 caractères pour rester dans la fenêtre de contexte.

---

### 2. Interdiction des APIs IA payantes (contrainte pédagogique EPITECH)

**Contrainte :** Le cahier des charges EPITECH interdit explicitement l'utilisation d'APIs IA payantes (OpenAI, Claude API, Gemini, etc.). Le projet doit fonctionner sans coût de fonctionnement et sans dépendance à un service externe pour l'IA.

**Mitigation :** Ollama + Qwen3:1.7b — moteur d'inférence local, gratuit, tourne sur n'importe quel PC sans GPU dédié. Les seuls services externes sont les APIs d'offres d'emploi (France Travail — API officielle gratuite avec inscription, Adzuna — API agrégateur gratuite avec clé développeur).

---

### 3. Profil utilisateur en fichier plat JSON (non thread-safe)

**Contrainte :** `profil.json` est le seul store de données utilisateur pour le profil, le CV extrait, et les préférences. Il n'y a pas de base de données pour le profil. Les écritures simultanées pourraient corrompre le fichier (pattern lecture → modification → réécriture).

**Mitigation :** L'application est 100 % locale et mono-utilisateur — aucune concurrence réelle. `POST /profile` utilise un pattern load-merge-write qui préserve les champs existants (notamment `cv_texte`, `cv_filename`, `cv_uploaded_at`) plutôt que de remplacer tout le fichier. Un fix spécifique a été ajouté pour éviter que la sauvegarde du profil n'écrase le CV uploadé.

---

### 4. CORS ouvert (`allow_origins=["*"]`)

**Contrainte :** Le backend FastAPI accepte des requêtes de n'importe quelle origine. En production, ce serait une vulnérabilité de sécurité permettant des attaques CSRF.

**Mitigation :** Intentionnel et documenté. L'application est exclusivement locale (`localhost`) — il n'y a aucun serveur distant exposé. La configuration `allow_origins=["*"]` sera remplacée par `allow_origins=["http://localhost:3000"]` si l'application est déployée. Aucune session ni cookie d'authentification n'est utilisé.

---

### 5. Extraction PDF plafonnée — pdfplumber

**Contrainte :** `pdfplumber` extrait le texte des PDFs numériques (créés par Word, LibreOffice, etc.) correctement. Les PDFs scannés (photos de documents) ne contiennent pas de couche texte — l'extraction retourne une chaîne vide ou quasi-vide. Certains PDFs produits par Word encodent un espace entre chaque caractère (`J o b s t e r`).

**Mitigation :** La fonction `fix_doubled_chars()` (`server.py` ligne ~277) détecte et corrige le pattern d'espacement de Word avant de stocker `cv_texte`. Les PDFs scannés : l'utilisateur est informé dans l'interface que le texte n'a pas pu être extrait, avec invitation à coller son CV manuellement dans le chat. L'OCR (Tesseract) n'a pas été intégré pour rester dans les contraintes de complexité du projet.

---

### 6. Génération .docx — artefacts Markdown

**Contrainte :** La fonction `generer_lettre_motivation()` dans `jobster_agent.py` produit du texte formaté en Markdown (utilisation de `**texte**` pour le gras, `# Titre` pour les en-têtes). Quand ce texte est écrit dans un fichier `.docx` via `python-docx`, les balises Markdown (`**`, `#`) apparaissent comme du texte littéral dans Word au lieu d'être rendues comme du formatage.

**Mitigation :** Contournement documenté — les lettres générées sont lisibles et éditables dans Word mais nécessitent un nettoyage manuel des balises (remplacement de `**` par du gras Word, suppression des `#`). Alternative pratique : copier-coller depuis l'aperçu chat où le Markdown est rendu correctement par le frontend React. Correction complète (parser Markdown → styles Word python-docx) identifiée comme amélioration future.

---

### 7. Token OAuth2 France Travail — expiration 25 minutes

**Contrainte :** L'API France Travail utilise OAuth2 avec des tokens temporaires qui expirent après 25 minutes. Un token expiré retourne une erreur 401 et les recherches d'offres échouent silencieusement.

**Mitigation :** `lancer_scraper()` demande un nouveau token à chaque appel — pas de cache de token entre les requêtes. Impact performance : +1 requête HTTP par recherche (négligeable localement). Cette approche est plus simple et plus fiable que de gérer l'expiration côté cache.

---

### 8. Persistance localStorage — favoris et projets

**Contrainte :** Les favoris et les projets sont stockés dans `localStorage` du navigateur. Cette donnée est perdue si l'utilisateur vide le cache du navigateur, utilise un autre navigateur, ou accède au frontend depuis un autre appareil.

**Mitigation :** ✅ **Résolu en Phase 3 (2026-06-08).** Migration vers SQLite effectuée — tâches P1-B et P1-C complètes. `localStorage` reste en fallback si le backend est indisponible.

---

### 9. Scopes OAuth2 France Travail non activés — La Bonne Boîte & Événements emploi

**Contrainte :** Les scopes `api_labonneboitev1` et `api_evenementsv1` ne sont pas activés sur l'application francetravail.io. Les deux endpoints partenaires (`/partenaire/labonneboite/v1/company/` et `/partenaire/evenements-emploi/v1/evenements`) retournent systématiquement 401 ou 403 même avec un token valide.

**Mitigation :** ✅ **Résolu en Phase 3.5 (2026-06-10).** Reverse-engineering des APIs publiques internes des sites officiels :
- **La Bonne Boîte** : `https://labonneboite.francetravail.fr/api/v2/search` (GET, sans token, paramètres `rome` + `citycode` + `distance`)
- **Mes Événements Emploi** : `https://mesevenementsemploi.francetravail.fr/api-candidat/mee/v1/de/evenement/all/filtered` (POST, headers `x-initialized-at` + `user_location` requis, identifiés par interception réseau Playwright)

Ces APIs sont les endpoints utilisés en interne par les SPAs Angular officielles — elles ne sont pas documentées mais sont publiques et fonctionnelles.

---

## Résumé

| # | Contrainte | Sévérité | Statut |
|---|-----------|----------|--------|
| 1 | Qwen3:1.7b — JSON structuré peu fiable | 🔴 Haute | ✅ Contourné (routage déterministe) |
| 2 | Interdiction APIs IA payantes (EPITECH) | 🔴 Haute | ✅ Résolu (Ollama local) |
| 3 | profil.json non thread-safe | 🟡 Moyenne | ✅ Mitigé (mono-utilisateur + merge) |
| 4 | CORS ouvert | 🟡 Moyenne | ✅ Documenté (local only) |
| 5 | pdfplumber — PDFs scannés | 🟡 Moyenne | ✅ Mitigé (fix Word + avertissement) |
| 6 | .docx — artefacts Markdown | 🟠 Faible | ⚠️ Contournement manuel documenté |
| 7 | OAuth2 France Travail — expiration 25 min | 🟡 Moyenne | ✅ Résolu (refresh à chaque appel) |
| 8 | localStorage — favoris et projets | 🟠 Faible | ✅ Résolu Phase 3 (SQLite — juin 8) |
| 9 | Scopes FT non activés — LBB + Événements emploi | 🟡 Moyenne | ✅ Résolu Phase 3.5 (APIs publiques — juin 10) |
