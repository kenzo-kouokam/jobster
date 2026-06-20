# Personas — Jobster
> 4 profils utilisateurs enrichis · Alignés sur l'architecture réelle du projet

---

## Vue d'ensemble

Jobster est un chatbot web responsive de recherche d'emploi. Il ne se contente pas de lister des offres : il guide l'utilisateur de la recherche jusqu'au suivi de candidature.

L'interface repose sur :
- une **zone de chat principale** (LLM local Qwen3:1.7b via Ollama)
- une **sidebar persistante** (Chats · Projets · Favoris · Candidatures · Mes Documents · Mon Profil)
- des **JobCards interactives** affichant les résultats des APIs France Travail et Adzuna
- un **tracker SQLite** pour le suivi des candidatures

Ces 4 personas couvrent les cas d'usage prioritaires identifiés par le projet.

---

## Persona 1 — Samira · Reconversion structurée
> Persona principal · Cas d'usage le plus complexe

### Profil
- **Nom fictif :** Samira
- **Âge :** 29 ans
- **Situation :** En reconversion vers le marketing / digital / métiers de bureau, avec un passé professionnel dans un autre domaine (ex : logistique, santé, commerce).
- **Statut recherché :** CDI ou CDD en début de reconversion
- **Niveau d'expérience :** Expérimentée dans son ancien domaine, débutante dans le nouveau
- **Aisance numérique :** Moyenne — utilise des outils courants mais n'est pas développeuse
- **Appareils :** Desktop principalement (ordinateur personnel ou bibliothèque), parfois mobile

### Contexte d'usage
Samira a besoin d'un outil qui l'aide à transformer une recherche d'emploi confuse en parcours clair. Elle n'a pas besoin d'une liste brute d'offres : elle a besoin d'un assistant qui l'aide à **comprendre ce qui est accessible**, **trier ce qui est pertinent**, **préparer une candidature crédible** et **revenir plus tard sans tout recommencer**.

### Objectifs principaux
- Trouver des offres compatibles avec son niveau actuel (pas trop exigeantes)
- Distinguer ce qu'elle peut viser maintenant de ce qu'elle peut viser plus tard
- Mettre en valeur ses compétences transférables dans ses candidatures
- Conserver les offres intéressantes dans les Favoris
- Suivre l'état de ses candidatures dans le tracker
- Stocker ses documents et versions de CV dans Mes Documents
- Garder un profil stable dans Mon Profil pour que le chatbot mémorise ses préférences

### Freins
- Peur de ne pas être assez légitime pour postuler
- Difficulté à traduire son parcours antérieur en compétences pertinentes
- Surcharge d'informations : trop d'offres, pas assez de filtre
- Besoin de réassurance sans être infantilisée

### Critères de décision sur une offre
- Compatibilité réelle avec son profil actuel
- Niveau d'exigence de l'offre (ne cherche pas le poste parfait, mais le poste accessible)
- Localisation / possibilité de télétravail
- Clarté de la fiche de poste
- Possibilité d'évolution à moyen terme
- Rapidité à sauvegarder ou candidater depuis l'interface

### Attentes UX vis-à-vis de Jobster
- Une sidebar claire pour retrouver ses contenus entre deux sessions
- Des cartes d'offres lisibles, avec les infos clés visibles immédiatement
- Une action simple "Marquer comme candidaté" sur chaque JobCard
- Un espace profil pour mémoriser ses préférences (secteur, localisation, type de contrat)
- Un upload CV facile dans Mes Documents pour que le chatbot génère des lettres adaptées
- Une expérience rassurante, fluide et non technique

### Interactions clés avec Jobster
| Action | Interface utilisée |
|---|---|
| Recherche d'offres | Chat → résultats en JobCards |
| Sauvegarde d'une offre | Bouton Favori sur JobCard |
| Génération d'une lettre de motivation | Chat ("génère une lettre pour ce poste") |
| Upload de son CV | Mes Documents → POST /profile |
| Suivi de ses candidatures | Candidatures → GET /candidatures |
| Mémoriser ses critères | Mon Profil → POST/GET /profile |

---

## Persona 2 — Lina · Étudiante cherchant un stage
> Profil standard · Priorité vitesse et simplicité

### Profil
- **Nom fictif :** Lina
- **Âge :** 22 ans
- **Situation :** Étudiante en fin d'études (Bac+3 à Bac+5), recherche un stage obligatoire ou de fin d'études.
- **Statut recherché :** Stage (3 à 6 mois)
- **Niveau d'expérience :** Faible (peu ou pas d'expérience professionnelle)
- **Aisance numérique :** Élevée — à l'aise avec les outils web
- **Appareils :** Mix desktop / mobile

### Contexte d'usage
Lina a besoin de trouver rapidement des offres de stage dans son domaine d'études. Elle manque de temps (entre les cours et les révisions) et veut une interface rapide, claire, sans friction. Elle a peur de postuler à des offres trop exigeantes et cherche une validation que l'offre correspond bien à son niveau.

### Objectifs principaux
- Trouver des offres compatibles avec son niveau d'études
- Filtrer par durée, ville, secteur et date de début
- Comprendre rapidement si l'offre est adaptée à son profil
- Enregistrer les offres intéressantes pour les retrouver plus tard
- Télécharger les documents générés (lettre de motivation) depuis le chat

### Freins
- Manque de temps (sessions de travail courtes)
- Peu d'expérience → difficulté à rédiger une lettre convaincante sans aide
- Peur de postuler à des offres trop exigeantes

### Critères de décision sur une offre
- Durée du stage compatible avec son calendrier scolaire
- Localisation ou télétravail
- Secteur d'activité
- Niveau requis (stage = pas d'expérience demandée)
- Clarté et lisibilité de la fiche de poste

### Attentes UX vis-à-vis de Jobster
- Résultats rapides après une requête en langage naturel
- Explication simple de pourquoi une offre correspond ou non
- Possibilité d'enregistrer des offres en Favoris facilement
- Téléchargement de documents depuis le chat (lettre générée)

### Interactions clés avec Jobster
| Action | Interface utilisée |
|---|---|
| "Stage marketing Paris 3 mois" | Chat → JobCards |
| Sauvegarde d'une offre | Bouton Favori sur JobCard |
| "Génère une lettre de motivation pour cette offre" | Chat → message généré + bouton télécharger |
| Suivi de ses favoris | Favoris → liste des offres sauvegardées |

---

## Persona 3 — Yassine · Candidat en alternance
> Profil intermédiaire · Besoin d'organisation et de comparaison

### Profil
- **Nom fictif :** Yassine
- **Âge :** 19 ans
- **Situation :** En formation (BTS / BUT / Licence Pro), recherche une alternance souvent en parallèle de ses cours.
- **Statut recherché :** Contrat d'apprentissage ou de professionnalisation (1 à 2 ans)
- **Niveau d'expérience :** Faible à intermédiaire
- **Aisance numérique :** Élevée
- **Appareils :** Mobile + desktop

### Contexte d'usage
Yassine jongle entre sa formation et sa recherche d'alternance. Il doit comparer plusieurs offres, comprendre les attentes employeurs, et suivre ses candidatures sur plusieurs semaines. La concurrence est forte dans son secteur, et il a besoin d'un outil qui l'aide à s'organiser plutôt qu'à simplement chercher.

### Objectifs principaux
- Trouver des offres d'alternance compatibles avec son rythme de formation
- Comparer plusieurs offres sur les mêmes critères
- Suivre l'avancement de ses candidatures (envoyé / relance / refus / en attente)
- Organiser ses recherches dans des Projets ("Alternance Dev Web" / "Alternance Marketing")

### Freins
- Concurrence élevée sur les postes d'alternance
- Difficulté à comprendre les attentes des recruteurs
- Besoin d'une organisation simple pour ne pas perdre le fil

### Critères de décision sur une offre
- Compatibilité avec son rythme de formation (ex : 3j/2j ou 4j/1j)
- Secteur et missions proposées
- Localisation + transports
- Réputation ou taille de l'entreprise
- Possibilité d'évolution après l'alternance

### Attentes UX vis-à-vis de Jobster
- Vue claire dans l'onglet Candidatures pour suivre chaque dossier
- Séparation nette entre Favoris (offres intéressantes) et Candidatures (déjà postulé)
- Aide à prioriser les offres selon son profil
- Accès rapide à l'historique de ses chats par projet de recherche

### Interactions clés avec Jobster
| Action | Interface utilisée |
|---|---|
| "Alternance développeur web Paris 2026" | Chat → JobCards |
| Comparaison de plusieurs offres | Favoris → liste comparée visuellement |
| "Marquer comme candidaté" | Bouton sur JobCard → POST /candidatures |
| Suivi de l'état des candidatures | Candidatures → tableau statuts |
| Regrouper ses recherches | Projets → "Alternance Dev" |

---

## Persona 4 — Claire · Professionnelle CDI / CDD
> Profil expérimenté · Priorité efficacité et pertinence

### Profil
- **Nom fictif :** Claire
- **Âge :** 34 ans
- **Situation :** Professionnelle en activité, en recherche discrète d'un nouvel emploi (CDI ou CDD).
- **Statut recherché :** CDI ou CDD dans son domaine de compétence
- **Niveau d'expérience :** Élevé (5-10 ans d'expérience)
- **Aisance numérique :** Élevée
- **Appareils :** Desktop (travail + personnel)

### Contexte d'usage
Claire sait exactement ce qu'elle cherche. Elle perd du temps avec les plateformes classiques qui affichent des offres non pertinentes. Elle a besoin d'un outil capable de filtrer rapidement, d'afficher uniquement ce qui correspond à ses critères, et de garder un historique organisé de ses démarches.

### Objectifs principaux
- Trouver un poste correspondant précisément à ses compétences et critères
- Gagner du temps : pas d'offres inutiles, pas de friction
- Comparer salaire, localisation, télétravail et niveau d'exigence
- Garder le suivi de ses candidatures sans outil externe

### Freins
- Trop d'offres peu pertinentes sur les plateformes classiques
- Besoin de tri rapide et efficace
- Difficulté à garder le suivi des candidatures sans tableau de bord dédié
- Peu de temps disponible (en poste à temps plein)

### Critères de décision sur une offre
- Correspondance exacte avec ses compétences
- Fourchette de salaire
- Localisation et conditions de télétravail
- Type de structure (start-up / grand groupe / PME)
- Culture d'entreprise (si des indices sont disponibles)

### Attentes UX vis-à-vis de Jobster
- Recherche efficace via langage naturel avec critères précis
- Filtres et sauvegarde rapide
- Historique de ses recherches dans les Projets
- Tracker lisible et complet dans Candidatures
- Accès rapide aux documents générés (lettres, emails de relance)

### Interactions clés avec Jobster
| Action | Interface utilisée |
|---|---|
| "Chef de projet digital Paris CDI 45k+ télétravail possible" | Chat → JobCards filtrées |
| Sauvegarde rapide d'offres pertinentes | Favoris |
| "Rédige un email de relance pour cette candidature" | Chat → génération → téléchargement |
| Consultation de l'historique de ses recherches | Projets → historique chats |
| Vue complète de ses candidatures en cours | Candidatures → tracker |

---

## Résumé comparatif

| Dimension | Samira (Reconversion) | Lina (Stage) | Yassine (Alternance) | Claire (CDI/CDD) |
|---|---|---|---|---|
| **Priorité n°1** | Être guidée et rassurée | Rapidité | Organisation | Pertinence et efficacité |
| **Feature la plus critique** | Mon Profil + génération CV | Téléchargement de documents | Tracker Candidatures | Projets + Candidatures |
| **Risque principal** | Surcharge d'infos | Trop de clics pour postuler | Perte de suivi | Résultats non pertinents |
| **Sidebar section clé** | Mes Documents + Mon Profil | Favoris | Candidatures | Projets |
| **Type de session** | Longue, régulière | Courte, ponctuelle | Régulière, multi-sessions | Ciblée et rapide |
| **Génération de contenu** | Lettre de motivation adaptée | Lettre simple | Email de candidature | Email de relance |

---

*Document créé dans le cadre du projet Jobster-hephaestus · Epitech S1 IA BOT*
*Personas enrichis à partir du brief UX projet et alignés sur l'architecture réelle (React 18 · FastAPI · Ollama Qwen3:1.7b · SQLite)*
