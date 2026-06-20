# UX Journey Map — Jobster
> Parcours utilisateur en 6 étapes · Touchpoints · Décisions UX · Tableaux d'analyse

---

## Principe de lecture

Ce document cartographie le parcours complet d'un utilisateur Jobster, de son arrivée sur l'interface jusqu'au suivi de ses candidatures. Pour chaque étape, on documente :

- **But utilisateur** — ce qu'il veut accomplir
- **Touchpoints** — les éléments de l'interface qu'il touche
- **Actions utilisateur** — ce qu'il fait concrètement
- **Réponse du système** — ce que Jobster fait en retour
- **Décisions UX** — les choix de design qui guident l'expérience
- **Besoin backend** — l'endpoint ou service impliqué
- **Risque de friction** — ce qui peut bloquer ou décourager
- **Moyen de simplifier** — la solution UX retenue

---

## Vue macro du parcours

```
[Arrivée] → [Recherche] → [Analyse] → [Génération] → [Candidature] → [Suivi]
     1             2            3             4               5              6
```

Transformation visée :
> "Je cherche vaguement un job" → "J'ai trouvé une offre, je l'ai analysée, j'ai préparé ma candidature et je peux suivre l'avancement"

---

## Étape 1 — Arrivée

**But utilisateur :** Comprendre en quelques secondes ce que fait l'outil et commencer à interagir.

### Touchpoints
| Élément | Localisation | État actuel dans le code |
|---|---|---|
| Zone de bienvenue | Chat (zone centrale) | ✅ `welcome` div dans `Chat.js` |
| Message d'accueil | Chat | ✅ "Bonjour 👋 · Que cherches-tu aujourd'hui ?" |
| Suggestions rapides | Sous le message d'accueil | ✅ 4 `suggestion-card` dans `Chat.js` |
| Sidebar visible | Gauche | ⚠️ Sections manquantes (Favoris, Candidatures, etc.) |
| Badge agent IA | En-tête du chat | ✅ "Agent IA · Qwen3:1.7b" |

### Tableau de touchpoints détaillé
| Intention utilisateur | Point d'entrée | Action réalisée | Réaction interface | Décision UX | Besoin backend | Risque de friction | Simplification |
|---|---|---|---|---|---|---|---|
| Comprendre le produit | Landing chat | Lit le message d'accueil | Affiche bienvenue + suggestions | Message clair et non technique | Aucun | Interface trop technique ou vide | Suggestions cliquables par profil |
| Démarrer sans savoir quoi écrire | Suggestions rapides | Clique sur une suggestion | Lance la requête directement | 4 suggestions couvrant les 4 personas | Aucun | Paralysie par manque de départ | Suggestions = exemples concrets de requêtes |
| Comprendre la structure | Sidebar | Parcourt visuellement les sections | Sections visibles même vides | Sidebar = structure mentale immédiate | Aucun | Sections invisibles = product qui semble limité | États vides explicites ("Aucun favori pour le moment") |

### Décisions UX retenues
- Afficher une promesse claire dès l'arrivée (pas de page d'accueil séparée)
- Montrer les sections de la sidebar même si elles sont vides
- Rassurer sur le fait que l'outil peut servir à différents profils
- Les 4 suggestions couvrent les 4 personas : stage, alternance, CDI, analyse entreprise

### Variations par persona
| Persona | Comportement d'arrivée | Suggestion pertinente |
|---|---|---|
| Samira | Lit attentivement, hésite à commencer | "chef de projet Paris CDI" → reformule sa demande en confiance |
| Lina | Clique directement sur la suggestion stage | "développeur web alternance Lyon" ou tape directement sa demande |
| Yassine | Tape sa demande sans lire les suggestions | Cherche "alternance [son domaine]" |
| Claire | Tape directement une requête précise | "chef de projet digital Paris CDI 45k télétravail" |

---

## Étape 2 — Recherche

**But utilisateur :** Formuler sa demande en langage naturel et obtenir des résultats pertinents.

### Touchpoints
| Élément | Localisation | État actuel dans le code |
|---|---|---|
| Zone de saisie (textarea) | Bas du chat | ✅ `chat-textarea` dans `Chat.js` |
| Bouton envoi | Droite du textarea | ✅ `send-btn` |
| Indicateur de chargement | Avatar IA | ✅ `typing-bubble` |
| JobCards dans les messages | Corps du chat | ✅ `JobCard.js` via `Message.js` |
| Hint clavier | Sous la zone de saisie | ✅ "Entrée pour envoyer · Shift+Entrée pour sauter une ligne" |

### Tableau de touchpoints détaillé
| Intention utilisateur | Point d'entrée | Action réalisée | Réaction interface | Décision UX | Besoin backend | Risque de friction | Simplification |
|---|---|---|---|---|---|---|---|
| Formuler une demande précise | Textarea | Tape sa recherche | Envoie la requête au backend | Accepter le langage naturel (pas de formulaire) | POST /chat → LLM + APIs | Requête mal comprise → résultats hors sujet | LLM reformule et confirme la compréhension |
| Voir des offres rapidement | Chat (messages) | Attend les résultats | Affiche des JobCards dans la réponse | Résultats visibles directement dans le fil de chat | France Travail API + Adzuna API | Temps de réponse trop long | Indicateur de chargement visible (typing bubble) |
| Affiner la recherche | Textarea | Envoie un message de précision | Nouvelle réponse avec résultats affinés | Permettre de modifier sans repartir de zéro | POST /chat | Devoir recommencer = frustration | Conversation continue, contexte mémorisé |
| Comprendre la provenance des offres | JobCards | Lit la source de l'offre | Source affichée sur la carte | Afficher l'origine (France Travail / Adzuna) | Données retournées par le backend | Manque de confiance si source inconnue | Tag source visible sur chaque JobCard |

### Décisions UX retenues
- Le chatbot accepte le langage naturel : pas de formulaire complexe
- Le contexte de la conversation est maintenu : l'utilisateur peut affiner sans repartir de zéro
- La source des offres est affichée pour renforcer la confiance
- L'indicateur de chargement (typing bubble) évite la perception d'un outil cassé

### Requêtes types par persona
| Persona | Requête typique | Comportement attendu du chatbot |
|---|---|---|
| Samira | "Je cherche un CDI en marketing digital, je suis en reconversion, niveau débutant" | Résultats adaptés + reformulation des compétences transférables |
| Lina | "Stage marketing à Lille de 3 à 6 mois" | Résultats filtrés par type de contrat + durée |
| Yassine | "Alternance développeur web Paris rythme 4j/1j 2026" | Résultats alternance + indication du rythme si disponible |
| Claire | "Chef de projet digital Paris CDI 45k minimum télétravail possible" | Résultats filtrés par critères multiples |

---

## Étape 3 — Analyse

**But utilisateur :** Comprendre rapidement si une offre vaut la peine d'être explorée davantage.

### Touchpoints
| Élément | Localisation | État actuel dans le code |
|---|---|---|
| JobCard | Dans les messages du chat | ✅ `JobCard.js` — titre, entreprise, lieu, contrat |
| Bouton Favori | Sur la JobCard | ✅ Implémenté · localStorage (Phase 3 : SQLite) |
| Bouton "Marquer comme candidaté" | Sur la JobCard | ✅ Implémenté Phase 2 |
| Résumé automatique de l'offre | Texte de la réponse IA | ✅ Via réponse LLM |
| Comparaison entre offres | Via le chat | ✅ L'utilisateur peut demander "compare ces deux offres" |

### Tableau de touchpoints détaillé
| Intention utilisateur | Point d'entrée | Action réalisée | Réaction interface | Décision UX | Besoin backend | Risque de friction | Simplification |
|---|---|---|---|---|---|---|---|
| Évaluer une offre rapidement | JobCard | Lit les infos clés | Affiche titre, entreprise, lieu, contrat, résumé | Rendre l'offre lisible en 5 secondes max | Données retournées par le backend | Trop d'infos → surcharge cognitive | Hiérarchie visuelle : titre > entreprise > critères clés > résumé |
| Sauvegarder une offre intéressante | Bouton Favori sur JobCard | Clique sur ❤️ | Offre ajoutée aux Favoris, confirmation visuelle | Un seul clic pour sauvegarder | POST /favorites | Bouton absent ou non visible | Bouton toujours visible sur chaque JobCard |
| Comparer plusieurs offres | Chat | "Compare les 3 premières offres" | Réponse structurée du LLM | Permettre la comparaison via le chat | POST /chat | Comparaison mentale difficile | LLM génère un tableau comparatif sur demande |
| Demander plus de détails | Chat | "Dis-m'en plus sur la 2e offre" | Réponse détaillée du LLM sur l'offre | Conversation contextuelle continue | POST /chat | Devoir re-copier l'offre = friction | Contexte des offres mémorisé dans la conversation |

### Décisions UX retenues
- Rendre chaque offre lisible en moins de 5 secondes
- Distinguer les éléments essentiels (titre, type de contrat, localisation) des détails
- Permettre la sauvegarde en un clic sans quitter le chat
- La comparaison entre offres reste accessible via le chat (pas besoin d'un écran dédié en Phase 1)

---

## Étape 4 — Génération

**But utilisateur :** Obtenir un texte utile pour postuler (lettre de motivation, email, présentation).

### Touchpoints
| Élément | Localisation | État actuel dans le code |
|---|---|---|
| Requête de génération | Textarea | ✅ Via chat |
| Message généré | Corps du chat | ✅ Réponse markdown via `react-markdown` |
| Bouton télécharger | Sur les messages générés | ✅ Implémenté Phase 2 — GET /documents/download/{filename} |
| Sauvegarde dans Mes Documents | Sidebar | ✅ Implémenté Phase 2 |

### Tableau de touchpoints détaillé
| Intention utilisateur | Point d'entrée | Action réalisée | Réaction interface | Décision UX | Besoin backend | Risque de friction | Simplification |
|---|---|---|---|---|---|---|---|
| Générer une lettre de motivation | Chat | "Génère une lettre pour ce poste" | LLM produit un texte structuré dans le chat | Génération contextuelle (offre + profil) | POST /chat → LLM (Qwen3:1.7b) | Texte générique non adapté | Profil utilisateur utilisé comme contexte si renseigné |
| Télécharger le document généré | Bouton télécharger sur le message | Clique sur "Télécharger" | Fichier téléchargé (PDF ou DOCX) | Bouton de téléchargement visible sur chaque message généré | GET /download/{file_id} | Ne pas trouver le fichier après génération | Bouton télécharger intégré directement dans le message |
| Modifier le document avant export | Chat | "Reformule le 2e paragraphe" | Nouvelle version générée | Permettre l'itération avant téléchargement | POST /chat | Impression que le document est figé | L'édition se fait naturellement via la conversation |
| Retrouver un document généré | Mes Documents | Clique sur Mes Documents dans la sidebar | Liste des fichiers générés | Documents conservés dans Mes Documents | GET /documents | Perte du document si onglet fermé | Sauvegarde automatique ou bouton "Sauvegarder dans Mes Documents" |

### Décisions UX retenues
- La génération se fait naturellement dans le chat, sans formulaire dédié
- Le document peut être modifié en continuant la conversation
- Le bouton télécharger est visible directement dans le message généré
- Les documents générés sont conservés dans Mes Documents pour être réutilisés

---

## Étape 5 — Candidature

**But utilisateur :** Marquer l'action de candidature et garder une trace sans effort.

### Touchpoints
| Élément | Localisation | État actuel dans le code |
|---|---|---|
| Bouton "Marquer comme candidaté" | Sur chaque JobCard | ✅ Implémenté Phase 2 |
| Section Candidatures | Sidebar | ✅ Implémenté Phase 1 (coquille) + Phase 2 (données) |
| Tracker complet | Vue Candidatures | ✅ Implémenté Phase 2 |
| Statut de candidature | Ligne du tracker | ✅ Implémenté Phase 2 |

### Tableau de touchpoints détaillé
| Intention utilisateur | Point d'entrée | Action réalisée | Réaction interface | Décision UX | Besoin backend | Risque de friction | Simplification |
|---|---|---|---|---|---|---|---|
| Marquer une candidature envoyée | Bouton sur JobCard | Clique sur "✓ Candidaté" | Confirmation visuelle, offre déplacée dans Candidatures | Un seul clic, confirmation immédiate | POST /candidatures | Oublier de marquer | Bouton toujours visible sur la JobCard |
| Voir toutes ses candidatures | Section Candidatures | Clique sur Candidatures dans la sidebar | Tableau complet avec statuts | Tracker complet avec colonnes : titre, entreprise, statut, date, notes | GET /candidatures | Tableau trop complexe | 11 statuts : saved · applied · follow_up_due · follow_up_sent · interview_scheduled · interview_done · test_case · offer_received · rejected · withdrawn · archived |
| Mettre à jour le statut | Tableau Candidatures | Change le statut via un menu déroulant | Statut mis à jour en temps réel | Modification inline sans recharger la page | PATCH /candidatures/{id} | Trop de clics pour changer un statut | Dropdown directement dans la cellule du tableau |
| Ajouter une note | Tableau Candidatures | Clique sur la case Notes | Zone de texte éditable | Notes libres sur chaque candidature | PATCH /candidatures/{id} | Pas de place pour noter le contact ou la relance | Colonne Notes éditable directement dans le tableau |

### Statuts du tracker
| Statut | Signification | Action suivante suggérée |
|---|---|---|
| À faire | Offre repérée, pas encore postulée | Postuler |
| Envoyé | Candidature envoyée | Attendre ou relancer |
| En attente | Réponse en cours | Aucune action immédiate |
| Relance | Relance envoyée | Attendre |
| Refusé | Réponse négative reçue | Archiver ou recommencer |

### Décisions UX retenues
- Réduire la friction : 1 clic pour marquer une candidature
- Tracker centralisé dans la sidebar (pas d'outil externe nécessaire)
- 11 statuts clairs : saved · applied · follow_up_due · follow_up_sent · interview_scheduled · interview_done · test_case · offer_received · rejected · withdrawn · archived
- La section Candidatures est visible dans la sidebar dès la Phase 1 (état vide explicite)

---

## Étape 6 — Suivi

**But utilisateur :** Retrouver l'historique et suivre sa progression sur la durée.

### Touchpoints
| Élément | Localisation | État actuel dans le code |
|---|---|---|
| Historique des chats | Sidebar → Chats | ✅ Conversation threads dans `App.js` |
| Section Projets | Sidebar | ✅ Implémenté Phase 1 |
| Section Favoris | Sidebar | ✅ Implémenté Phase 1 (localStorage · SQLite Phase 3) |
| Tracker Candidatures | Sidebar | ✅ Implémenté Phase 2 |

### Tableau de touchpoints détaillé
| Intention utilisateur | Point d'entrée | Action réalisée | Réaction interface | Décision UX | Besoin backend | Risque de friction | Simplification |
|---|---|---|---|---|---|---|---|
| Reprendre une recherche précédente | Historique Chats | Clique sur un ancien chat | Conversation rechargée complète | Historique permanent des conversations | GET /chats/{id} | Devoir tout recommencer après une fermeture de session | Chats sauvegardés automatiquement |
| Retrouver des offres sauvegardées | Favoris | Clique sur Favoris dans la sidebar | Liste des offres sauvegardées | Favoris = persistants entre sessions | GET /favorites | Offres non retrouvables = perte de temps | Section Favoris toujours visible, même vide |
| Voir la progression globale | Candidatures | Clique sur Candidatures | Tableau complet des candidatures | Vue globale de la progression | GET /candidatures | Pas de visibilité sur les démarches en cours | Tableau avec statuts visuels clairs |
| Organiser ses recherches par stratégie | Projets | Clique sur Projets | Liste des projets (groupes de chats) | Regrouper les chats liés à une même stratégie | GET /projects | Chats non organisés = confusion | Projets = dossiers de chats (ex : "Marketing Lille", "Alternance 2026") |

### Décisions UX retenues
- Permettre de reprendre une recherche sans tout recommencer
- Rendre l'historique visible et navigable facilement
- Éviter la perte d'information entre sessions
- La sidebar est la clé de voûte du suivi : toutes les sections doivent être visibles

---

## Résumé global — Tableau de synthèse

| Étape | But utilisateur | Feature principale | Phase | Composant React |
|---|---|---|---|---|
| 1 · Arrivée | Comprendre l'outil en 5 secondes | Welcome + suggestions | Phase 1 ✅ | `Chat.js` — welcome div |
| 2 · Recherche | Formuler une demande et voir des résultats | Chat input + JobCards | Phase 1 ✅ | `Chat.js` + `JobCard.js` |
| 3 · Analyse | Évaluer et sauvegarder une offre | JobCard + bouton Favori | Phase 1→2 | `JobCard.js` (enrichi) |
| 4 · Génération | Obtenir un document utilisable | Chat + bouton télécharger | Phase 2 | `Message.js` ✅ (action chips implémentées) |
| 5 · Candidature | Marquer et tracker une candidature | Bouton "Candidaté" + Candidatures | Phase 2 | `Tracker.js` ✅ |
| 6 · Suivi | Retrouver et suivre sa progression | Sidebar complète | Phase 1→3 | `App.js` — sidebar étendue |

---

## États vides obligatoires (UX critique)

Chaque section de la sidebar doit avoir un **état vide explicite** visible dès la Phase 1, avant que le backend soit connecté :

| Section | Message d'état vide |
|---|---|
| Favoris | "Aucun favori pour le moment — cliquez sur ❤️ sur une offre pour la sauvegarder" |
| Candidatures | "Aucune candidature enregistrée — cliquez sur ✓ sur une offre pour commencer le suivi" |
| Mes Documents | "Aucun document — uploadez votre CV ou générez une lettre de motivation" |
| Mon Profil | "Complétez votre profil pour recevoir des suggestions plus pertinentes" |
| Projets | "Aucun projet — regroupez vos conversations par stratégie de recherche" |

---

*Document créé dans le cadre du projet Jobster-hephaestus · Epitech S1 IA BOT*
*Aligné sur l'architecture réelle : React 18 · FastAPI · Ollama Qwen3:1.7b · France Travail API · Adzuna API · SQLite*
