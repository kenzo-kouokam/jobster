# UX Flow Diagram — Jobster
> Flux d'interaction · Diagrammes Mermaid · 6 cas d'usage principaux

---

## Note de lecture

Ces diagrammes décrivent les flux d'interaction utilisateur → interface → backend pour chaque cas d'usage principal. Ils sont utilisables directement comme référence pour le développement frontend et la coordination backend.

- **Rectangles** → actions utilisateur ou états
- **Losanges** → décisions ou branchements
- **Cylindres** → données / endpoints backend
- **Phase 1** → fonctionne sans backend (UI only) — ✅ Implémenté
- **Phase 2** → nécessite les endpoints backend — ✅ Implémenté
- **Phase 3** → extensions SQLite (favorites, projects) — ⏳ À faire pour Keynote

> **État au 2026-05-25 :** Phase 1 + 2 complètes. Les nœuds "Phase 2 - connecté" dans les diagrammes ci-dessous sont tous actifs. POST /favorites reste localStorage pour l'instant (Phase 3).

---

## Flux 1 — Recherche d'offres (Use Case principal)

```mermaid
flowchart TD
    A([Utilisateur arrive sur Jobster]) --> B[Voit le chat avec message de bienvenue]
    B --> C{Saisit sa demande ou clique sur une suggestion?}
    C -->|Clique sur suggestion| D[Suggestion envoyée comme message]
    C -->|Tape sa demande| E[Tape dans le textarea]
    D --> F[Message envoyé → POST /chat]
    E --> F
    F --> G[(Backend: LLM Qwen3:1.7b\n+ France Travail API\n+ Adzuna API)]
    G --> H[Réponse: texte + liste d'offres JSON]
    H --> I[Affiche la réponse IA dans le chat]
    H --> J[Affiche les JobCards dans le chat]
    J --> K{L'utilisateur est-il satisfait des résultats?}
    K -->|Oui| L[Passe à l'analyse — Étape 3]
    K -->|Non - affine| M[Envoie un message de précision]
    M --> F
    K -->|Non - nouvelle recherche| N[Clique sur + Nouvelle recherche]
    N --> B
```

---

## Flux 2 — Analyse et sauvegarde d'une offre

```mermaid
flowchart TD
    A([Utilisateur voit des JobCards dans le chat]) --> B{Que fait-il?}
    B -->|Lit la carte| C[Évalue titre, entreprise, lieu, contrat, résumé]
    C --> D{L'offre l'intéresse?}
    D -->|Non| E[Ignore et continue à lire]
    D -->|Oui - veut sauvegarder| F[Clique sur bouton ❤️ Favori]
    D -->|Oui - veut plus d'infos| G["Tape dans le chat: 'Dis-m'en plus sur cette offre'"]
    G --> H[(POST /chat → LLM analyse l'offre)]
    H --> I[Réponse détaillée dans le chat]
    F --> J{Phase 2: POST /favorites disponible?}
    J -->|Phase 1 - non connecté| K[État visuel favori → stockage local temporaire]
    J -->|Phase 2 - connecté| L[(POST /favorites → SQLite)]
    L --> M[Offre visible dans section Favoris de la sidebar]
    K --> N[Offre marquée visuellement mais non persistée]
    D -->|Oui - candidater directement| O[Clique sur ✓ Marquer comme candidaté]
    O --> P[(POST /candidatures → SQLite)]
    P --> Q[Offre ajoutée au tracker Candidatures]
```

---

## Flux 3 — Génération d'un document (lettre, email, présentation)

```mermaid
flowchart TD
    A([Utilisateur veut générer un document]) --> B{Point de départ?}
    B -->|Depuis une JobCard| C["Demande dans le chat: 'Génère une lettre pour ce poste'"]
    B -->|Directement| D["Demande dans le chat: 'Rédige un email de candidature'"]
    C --> E[(POST /chat → LLM avec contexte offre + profil)]
    D --> E
    E --> F[Document généré dans le chat en format markdown]
    F --> G{L'utilisateur est-il satisfait?}
    G -->|Non - veut modifier| H["Demande dans le chat: 'Reformule le 2e paragraphe'"]
    H --> E
    G -->|Oui - veut télécharger| I[Clique sur bouton Télécharger dans le message]
    I --> J[(GET /download/:file_id)]
    J --> K[Fichier téléchargé: PDF ou DOCX]
    G -->|Oui - veut sauvegarder| L[Clique sur Sauvegarder dans Mes Documents]
    L --> M[(POST /documents)]
    M --> N[Fichier visible dans Mes Documents]
```

---

## Flux 4 — Upload de CV et personnalisation du profil

```mermaid
flowchart TD
    A([Utilisateur veut uploader son CV]) --> B[Clique sur Mes Documents dans la sidebar]
    B --> C{État de la section?}
    C -->|Vide - Phase 1| D["Affiche: 'Aucun document · Uploadez votre CV'"]
    C -->|Phase 2 - connecté| E[Affiche bouton Upload CV]
    D --> E
    E --> F[Clique sur Upload CV]
    F --> G[Sélectionne le fichier: PDF ou DOCX]
    G --> H[(POST /profile avec FormData)]
    H --> I{Upload réussi?}
    I -->|Oui| J[Fichier visible dans Mes Documents]
    I -->|Erreur| K[Message d'erreur clair + bouton réessayer]
    J --> L[Le LLM peut maintenant utiliser le CV comme contexte]
    L --> M["Génération future plus personnalisée: 'Génère une lettre adaptée à mon CV'"]

    A2([Utilisateur veut renseigner son profil]) --> B2[Clique sur Mon Profil dans la sidebar]
    B2 --> C2["Affiche le formulaire: objectif, localisation, secteurs, compétences"]
    C2 --> D2[Remplit les champs]
    D2 --> E2[Clique sur Sauvegarder]
    E2 --> F2[(POST/PUT /profile)]
    F2 --> G2[Profil sauvegardé · Confirmation visuelle]
    G2 --> H2[Les prochaines requêtes chat utilisent le profil comme contexte]
```

---

## Flux 5 — Suivi des candidatures (Tracker)

```mermaid
flowchart TD
    A([Utilisateur veut suivre ses candidatures]) --> B[Clique sur Candidatures dans la sidebar]
    B --> C{Des candidatures existent?}
    C -->|Aucune - Phase 1| D["Affiche: 'Aucune candidature enregistrée'"]
    C -->|Aucune - Phase 2| E[Même message + bouton vers le chat]
    C -->|Des candidatures existent| F[(GET /candidatures → tableau SQLite)]
    F --> G[Affiche tableau: Titre / Entreprise / Statut / Date / Notes]
    G --> H{L'utilisateur veut mettre à jour?}
    H -->|Changer le statut| I[Clique sur le statut → dropdown]
    I --> J{Nouveau statut choisi}
    J -->|"À faire"| K[(PATCH /candidatures/:id)]
    J -->|Envoyé| K
    J -->|En attente| K
    J -->|Relance| K
    J -->|Refusé| K
    K --> L[Statut mis à jour dans le tableau]
    H -->|Ajouter une note| M[Clique sur la cellule Notes]
    M --> N[Tape une note libre]
    N --> O[(PATCH /candidatures/:id)]
    O --> P[Note sauvegardée]
    H -->|Générer une relance| Q["Va dans le chat: 'Rédige un email de relance pour [entreprise]'"]
    Q --> R[(POST /chat → LLM)]
    R --> S[Email de relance généré dans le chat]
```

---

## Flux 6 — Reprise de session (Continuité entre sessions)

```mermaid
flowchart TD
    A([Utilisateur revient sur Jobster]) --> B[Interface se charge avec la sidebar]
    B --> C[Voit l'historique de ses chats dans la sidebar]
    C --> D{Que veut-il faire?}
    D -->|Reprendre un chat existant| E[Clique sur un chat dans l'historique]
    E --> F[(GET /chats/:id)]
    F --> G[Conversation rechargée complète]
    G --> H[Peut continuer depuis où il s'était arrêté]
    D -->|Voir ses favoris| I[Clique sur Favoris]
    I --> J[(GET /favorites)]
    J --> K[Liste des offres sauvegardées]
    K --> L{Que fait-il?}
    L -->|Candidater depuis un favori| M[Clique sur ✓ Candidaté sur la JobCard]
    M --> N[(POST /candidatures)]
    L -->|Retirer un favori| O[Clique sur × Retirer]
    O --> P[(DELETE /favorites/:id)]
    D -->|Voir l'état de ses candidatures| Q[Clique sur Candidatures]
    Q --> R[(GET /candidatures)]
    R --> S[Tableau complet des candidatures]
    D -->|Nouvelle recherche| T[Clique sur + Nouvelle recherche dans la sidebar]
    T --> U[Nouveau chat ouvert]
```

---

## Vue d'ensemble — Flux inter-connectés

```mermaid
flowchart LR
    subgraph CHAT ["💬 Chat (existant + enrichi)"]
        CI[Chat Input]
        CM[Chat Messages]
        JC[JobCards]
    end

    subgraph SIDEBAR ["📋 Sidebar (à étendre)"]
        CH[Chats]
        PR[Projets]
        FA[Favoris]
        CA[Candidatures]
        MD[Mes Documents]
        MP[Mon Profil]
    end

    subgraph BACKEND ["⚙️ Backend FastAPI"]
        LLM[(Ollama\nQwen3:1.7b)]
        FT[(France Travail\nAPI)]
        AZ[(Adzuna\nAPI)]
        DB[(SQLite)]
    end

    CI -->|POST /chat| LLM
    LLM --> CM
    LLM --> FT
    LLM --> AZ
    FT --> JC
    AZ --> JC
    JC -->|POST /favorites| FA
    JC -->|POST /candidatures| CA
    CM -->|GET /download/:id| MD
    MD -->|POST /profile| DB
    MP -->|POST/GET /profile| DB
    CA -->|GET/PATCH /candidatures| DB
    FA -->|GET/DELETE /favorites| DB
    CH -->|GET /chats/:id| DB
```

---

*Document créé dans le cadre du projet Jobster-hephaestus · Epitech S1 IA BOT*
*Diagrammes compatibles Mermaid — rendus dans GitHub, Notion, et la plupart des éditeurs Markdown*
