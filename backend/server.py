"""
JOBSTER — Backend FastAPI (détection d'intention améliorée)

Hiérarchie de décision :
1. Message conversationnel pur → Ollama (salutation, question sur Jobster, aide...)
2. Outil spécifique détecté → outil direct, pas d'Ollama
3. Recherche d'offres détectée → scraper direct, pas d'Ollama
4. Sinon → Ollama conversationnel
"""

import sys, os, re
import json
import shutil
import sqlite3
from datetime import datetime
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List

SCRAPING_PATH   = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scraping")
FICHIER_PROFIL  = os.path.join(SCRAPING_PATH, "profil.json")
sys.path.insert(0, SCRAPING_PATH)

import llm_backend as ollama  # bascule Ollama (local) / Groq (cloud) — voir scraping/llm_backend.py

app = FastAPI(title="Jobster API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

MODELE = "qwen3:1.7b"

SYSTEM_PROMPT = """Tu es Jobster, un agent IA expert en recherche d'emploi, conçu par une équipe d'étudiants EPITECH.

Tu aides les utilisateurs à :
1. 🔍 Rechercher des offres d'emploi en temps réel (France Travail + Adzuna)
2. 📊 Analyser une offre en détail à partir d'une URL
3. 💯 Calculer un score de matching entre un profil et une offre
4. ✉️ Rédiger des lettres de motivation et des emails de candidature
5. 🏢 Analyser une entreprise (avis, actualités, données légales)
6. 📋 Suivre ses candidatures (tracker SQLite)
7. 🌟 Trouver des entreprises qui recrutent pour une candidature spontanée
8. 📅 Trouver des événements emploi, salons et job datings

Commandes rapides :
- "développeur web Lyon CDI" → recherche d'offres en temps réel
- "analyse cette offre https://..." → analyse détaillée d'une annonce
- "match https://... avec mon profil" → score de compatibilité
- "lettre https://..." → lettre de motivation personnalisée
- "prépare un email de candidature pour https://..." → email prêt à envoyer
- "rapport entreprise Capgemini" → analyse d'entreprise
- "tracker voir" → voir toutes les candidatures en cours
- "tracker ajouter" → ajouter une candidature au suivi
- "bonne boite développeur Paris" → entreprises qui recrutent
- "évènements emploi Marseille" → salons emploi à venir

Tu réponds toujours en français. Tu es direct, bienveillant et orienté résultat."""


# ── Détecteurs d'intention ──────────────────────────────────

CONVERSATIONNEL = [
    "que sais-tu faire", "que sais tu faire", "qu'est-ce que tu sais faire",
    "que peux-tu faire", "que peux tu faire", "qu'est-ce que tu peux faire",
    "comment tu fonctionnes", "comment fonctionne jobster", "explique toi",
    "aide", "help", "comment ça marche", "quelles sont tes fonctionnalités",
    "présente toi", "tu fais quoi", "c'est quoi jobster", "qui es-tu",
    "bonjour", "salut", "hello", "bonsoir", "coucou",
    "merci", "super", "génial", "parfait", "cool",
    "ok", "d'accord", "ça marche", "très bien",
]

MOTS_RECHERCHE = [
    "trouve", "cherche", "recherche", "offres", "emploi", "poste", "job",
    "cdi", "cdd", "alternance", "stage", "intérim", "freelance",
    "ingénieur", "développeur", "manager", "directeur", "chef de projet",
    "commercial", "consultant", "analyste", "technicien", "assistant",
    "à paris", "à lyon", "à marseille", "à bordeaux", "à lille",
    "à toulouse", "à nantes", "à strasbourg", "en france",
]

MOTS_EVENEMENTS = [
    "évènement", "evenement", "événement", "salon emploi", "job dating",
    "forum emploi", "salon recrutement", "job fair", "journée recrutement",
    "événements emploi", "evènements emploi",
    # Variantes naturelles supplémentaires (gap routing)
    "salon", "salons", "speed recruiting", "matinale recrutement",
    "recrutement près de", "recrutement pres de", "job datings",
]

MOTS_BONNE_BOITE = [
    "bonne boite", "bonne boîte", "entreprises qui recrutent", "candidature spontanée",
    # Variantes naturelles supplémentaires (gap routing)
    "entreprises qui embauchent", "sociétés qui recrutent", "societes qui recrutent",
    "boites qui recrutent", "boîtes qui recrutent", "boites qui embauchent",
    "qui pourrait me recruter", "qui pourraient me recruter",
    "qui cherchent du monde", "entreprises susceptibles", "entreprises qui pourraient",
]

MOTS_MARCHE = [
    "marché du travail", "statistiques emploi", "comment se porte", "taux chômage"
]

MOTS_AGENCE = [
    "agence france travail", "agence pôle emploi", "agence ft", "pôle emploi"
]

MOTS_ROME = [
    "fiche métier", "fiche metier", "compétences pour devenir", "competences pour devenir",
    "reconversion vers", "reconversion en", "reconversion", "métier de", "metier de",
    "devenir ", "comment devenir", "formation pour devenir",
    "rome", "fiche rome", "code rome",
    # Patterns naturels supplémentaires : "métier data analyst", "métier infirmier", etc.
    "quel métier", "quel metier", "ce métier", "ce metier", "ce type de métier",
    "métier en ", "metier en ", "métier d'", "metier d'",
    # Variantes naturelles supplémentaires (gap routing)
    "me reconvertir", "se reconvertir", "envie de me reconvertir",
    "vers quel métier", "vers quel metier", "quel métier choisir", "quel metier choisir",
]

MOTS_PROFIL_QUERY = [
    # Français
    "que sais-tu de moi", "que sais-tu de mon profil", "que sais-tu sur moi",
    "ce que tu sais sur moi", "ce que tu sais de moi",
    "connais-tu mon profil", "mon profil enregistré", "mon profil utilisateur",
    "basé sur mon cv", "à partir de mon cv", "en te basant sur mon cv",
    "tu connais mon cv", "tu as mon cv",
    "tu connais mon profil", "mon cv a été uploadé", "mon cv uploadé",
    "tu as vu mon cv", "tu as accès à mon profil",
    "tu as accès à mon cv", "accès à mon cv",
    "quel type d'emploi", "quel type de poste", "quel poste je cherche",
    "tu sais ce que je cherche", "tu connais mes critères",
    # Anglais — questions méta sur le profil/CV
    "what do you know about me", "what do you know about my",
    "what type of job", "what kind of job", "what jobs am i",
    "do you know what", "know what i", "know what type",
    "do you know my", "you know my profile", "you know my cv",
    "what are my skills", "what is my profile", "tell me about my profile",
    "based on my profile", "based on my cv", "based on my background",
    "what do i need", "what am i looking for",
]

# Phrases signalant une recherche d'emploi vague/profilée (pas de mots-clés métier précis)
# → on skip comprendre_demande() et on lit le profil directement
MOTS_VAGUE_PROFIL = [
    # Français
    "pour moi", "adapté à moi", "adapté à mon profil", "adaptés à mon profil",
    "adapté à mes critères", "adapté à mes compétences",
    "qui me correspond", "qui me correspondent", "qui me convient",
    "selon mon profil", "basé sur mon profil", "en fonction de mon profil",
    "selon mes critères", "selon mes compétences",
    "emploi pour moi", "offres pour moi", "poste pour moi",
    "trouve moi un emploi", "trouve-moi un emploi",
    "trouve moi un poste", "trouve-moi un poste",
    "trouve moi des offres", "trouve-moi des offres",
    "recommande moi", "recommande-moi", "suggère moi", "suggère-moi",
    "offres qui me correspondent", "offres adaptées",
    "cherche pour moi", "propose moi",
    # Anglais — recherche profilée
    "suited for me", "match my profile", "fit my profile",
    "match my background", "match my skills",
    "jobs for me", "jobs that match", "jobs that fit",
    "that match my profile", "that suit me", "suitable for me",
    "find me jobs", "find me a job", "find a job for me",
    "pull up jobs", "pull up some jobs",
    "look for jobs adapted", "adapted to my profile",
    "jobs adapted to my profile", "adapted to my background",
    "recommend jobs", "recommend me jobs", "suggest jobs",
    "for my profile", "for my background", "for my skills",
    "that match what i", "matching my profile",
    # Variantes naturelles supplémentaires (gap routing)
    "opportunités pour mon profil", "opportunites pour mon profil",
    "profil comme le mien", "comme le mien",
    "qui colle à mon profil", "qui colle a mon profil",
    "en lien avec mon profil", "adapté à ma situation", "adapte a ma situation",
]

# Mots-clés trop génériques — si comprendre_demande() retourne ça, on utilise le profil
KEYWORDS_GENERIQUES = {
    "jobs", "job", "emploi", "emplois", "travail", "poste", "postes",
    "offre", "offres", "work", "recherche", "cherche", "trouver",
    "emploi du temps", "temps partiel", "temps plein", "full time", "part time",
    "opportunité", "opportunités", "vacancy", "vacancies", "opening",
}

# Types de contrat détectables dans les messages utilisateur
# Utilisé pour appliquer l'intention de l'utilisateur même quand les keywords
# viennent du profil (ex: "et en CDI ?" après un titre_cible "Alternance Digital Marketing")
CONTRACT_TYPES_MAP = {
    "cdi":          "CDI",
    "cdd":          "CDD",
    "alternance":   "Alternance",
    "stage":        "Stage",
    "intérim":      "Intérim",
    "interim":      "Intérim",
    "freelance":    "Freelance",
    "apprentissage":"Alternance",
    "contrat pro":  "Alternance",
}

# Villes françaises connues — détection déterministe sans Ollama
VILLES_CONNUES = [
    "paris", "lyon", "marseille", "toulouse", "bordeaux", "lille",
    "nantes", "strasbourg", "nice", "rennes", "montpellier", "grenoble",
    "rouen", "toulon", "dijon", "angers", "brest", "limoges", "metz",
    "nancy", "reims", "caen", "amiens", "saint-etienne", "perpignan",
    "pau", "le havre", "clermont-ferrand", "orléans", "mulhouse",
    "besançon", "aix-en-provence", "dunkerque", "valenciennes",
]


def est_conversationnel(message: str) -> bool:
    """Détecte si le message est purement conversationnel (pas une action)."""
    d = message.lower().strip()
    # Court et sans mots-clés de recherche
    if len(d) < 60 and not any(m in d for m in MOTS_RECHERCHE):
        if any(m in d for m in CONVERSATIONNEL):
            return True
    # Question directe sur les capacités
    if any(m in d for m in CONVERSATIONNEL[:12]):
        return True
    return False


def est_recherche_offres(message: str) -> bool:
    """Détecte si le message est une recherche d'offres."""
    d = message.lower()
    urls = re.findall(r'https?://[^\s]+', message)
    if urls:
        return False  # URL = outil spécifique, pas recherche générale
    if any(m in d for m in MOTS_RECHERCHE):
        return True
    # Heuristique courte : 1–5 mots sans URL ni outil spécifique → assume recherche d'offres
    # Couvre les titres métier non listés : "infirmière arras", "médecin urgentiste Lyon", etc.
    words = d.split()
    if 1 <= len(words) <= 5:
        return True
    return False


def ville_dans_message(message_lower: str) -> bool:
    """
    Retourne True si le message contient explicitement une ville connue.
    Utilisé pour éviter de remplacer une ville réelle par la localisation du profil.
    """
    return any(v in message_lower for v in VILLES_CONNUES)


def detect_contract_in_message(message_lower: str) -> Optional[str]:
    """
    Détecte si le message contient un type de contrat explicite.
    Retourne la forme normalisée (ex: "CDI") ou None.
    Utilisé pour corriger les keywords du profil quand l'utilisateur dit
    "et en CDI ?" alors que son titre_cible est "Alternance Digital Marketing".
    """
    for key, val in CONTRACT_TYPES_MAP.items():
        if key in message_lower:
            return val
    return None


def keywords_trop_generiques(keywords: str) -> bool:
    """
    Retourne True si les mots-clés extraits par comprendre_demande() sont trop
    vagues pour une vraie recherche (ex: "jobs", "emploi", "emploi du temps"…).
    Dans ce cas, on les remplace par le titre_cible du profil.
    """
    k = keywords.lower().strip()
    # Trop court = probablement rien d'utile
    if len(k) < 5:
        return True
    # Correspond exactement à un terme générique
    if k in KEYWORDS_GENERIQUES:
        return True
    # Contient uniquement des termes génériques (combinaisons courantes)
    words = set(k.split())
    if words and words.issubset(KEYWORDS_GENERIQUES):
        return True
    return False


def formater_offres(offres, keywords, location):
    """Formate les offres sans Ollama."""
    n = len(offres)
    top3 = offres[:3]
    lines = [f"**{n} offres trouvées** pour *{keywords}* à *{location}* :\n"]
    for i, o in enumerate(top3, 1):
        titre = o.get("titre", o.get("title", "Poste"))
        ent   = o.get("entreprise", o.get("company", ""))
        lieu  = o.get("lieu", o.get("location", ""))
        contrat = o.get("contrat", o.get("contract", ""))
        c_str = f" · {contrat}" if contrat else ""
        lines.append(f"{i}. **{titre}** — {ent} ({lieu}{c_str})")
    if n > 3:
        lines.append(f"\n*+{n - 3} autres offres disponibles ci-dessous.*")
    lines.append("\n**Conseil :** Clique sur « Voir l'offre » pour accéder directement à l'annonce.")
    return "\n".join(lines)


def formater_outil(resultat):
    """Retourne le résultat d'un outil brut, tronqué si besoin."""
    if not resultat:
        return "Aucun résultat trouvé pour cette demande."
    return resultat[:3000] + ("\n\n*[Résultat tronqué]*" if len(resultat) > 3000 else "")


def fix_doubled_chars(text: str) -> str:
    """
    Corrige l'extraction pdfplumber sur certains PDFs où chaque caractère
    est doublé (ex : EEDDUUCCAATTIIOONN → EDUCATION).
    Détecte le problème en comptant la proportion de paires doublées —
    si > 40 % du texte est doublé, c'est systématique et on corrige.
    """
    if not text:
        return text
    stripped = re.sub(r'[\s\n]', '', text)
    if len(stripped) < 20:
        return text
    doubled_pairs = len(re.findall(r'(.)\1', stripped))
    if doubled_pairs / len(stripped) > 0.40:
        text = re.sub(r'(.)\1', r'\1', text)
    return text


def load_profil() -> dict:
    """Charge profil.json, retourne {} si absent ou invalide."""
    if not os.path.exists(FICHIER_PROFIL):
        return {}
    try:
        with open(FICHIER_PROFIL, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {}


def build_system_prompt() -> str:
    """
    Retourne SYSTEM_PROMPT enrichi du profil utilisateur si profil.json existe.
    Injecté dans TOUS les appels Ollama — le modèle a ainsi toujours le contexte
    de l'utilisateur (nom, poste cible, localisation, CV…).
    """
    p = load_profil()
    if not p:
        return SYSTEM_PROMPT

    lines = [SYSTEM_PROMPT, "\n\n---\n🧑 **Profil de l'utilisateur actuellement connecté :**"]

    nom = p.get("nom", "").strip()
    if nom:
        lines.append(f"- Nom : {nom}")

    titre = p.get("titre_cible", "").strip()
    if titre:
        alt = p.get("titres_alternatifs", [])
        alt_str = f" (aussi ouvert·e à : {', '.join(alt)})" if alt else ""
        lines.append(f"- Poste cible : {titre}{alt_str}")

    niveau  = p.get("niveau_experience", "").strip()
    famille = p.get("famille_metier", "").strip()
    if niveau or famille:
        lines.append(f"- Positionnement : {' / '.join(x for x in [famille, niveau] if x)}")

    locs = p.get("localisations", [])
    if locs:
        loc_str = ", ".join(locs) if isinstance(locs, list) else str(locs)
        lines.append(f"- Localisation(s) préférée(s) : {loc_str}")

    contrats = p.get("types_contrat", [])
    if contrats:
        lines.append(f"- Types de contrat souhaités : {', '.join(contrats)}")

    sect = p.get("secteurs_preferes", [])
    if sect:
        lines.append(f"- Secteurs préférés : {', '.join(sect)}")

    taille = p.get("taille_entreprise", [])
    if taille:
        lines.append(f"- Taille d'entreprise : {', '.join(taille)}")

    mode = p.get("mode_travail_prefere", "").strip()
    if mode:
        lines.append(f"- Mode de travail : {mode}")

    s_min  = p.get("salaire_min")
    s_max  = p.get("salaire_max")
    s_type = p.get("salaire_type", "brut annuel")
    if s_min or s_max:
        if s_min and s_max:
            lines.append(f"- Prétentions salariales : {s_min}–{s_max} € {s_type}")
        elif s_min:
            lines.append(f"- Salaire minimum : {s_min} € {s_type}")

    skills = p.get("competences", [])
    if skills:
        sk = skills if isinstance(skills, list) else [skills]
        lines.append(f"- Compétences clés : {', '.join(sk[:12])}")

    exp = p.get("experience", "").strip()
    if exp:
        lines.append(f"- Expérience professionnelle : {exp[:300]}")

    formation = p.get("formation", "").strip()
    if formation:
        lines.append(f"- Formation : {formation[:200]}")

    certs_raw = p.get("certifications", "")
    if isinstance(certs_raw, list):
        certs = ", ".join(certs_raw)
    else:
        certs = str(certs_raw).strip()
    if certs:
        lines.append(f"- Certifications : {certs}")

    cv_texte = p.get("cv_texte", "").strip()
    if cv_texte:
        lines.append(f"\n📄 **Contenu extrait du CV :**\n{cv_texte[:2000]}")

    lines.append(
        "\n---\n"
        "Consignes importantes :\n"
        "- Utilise toujours le profil ci-dessus pour personnaliser tes réponses.\n"
        "- Quand l'utilisateur cherche un emploi sans préciser de ville, utilise ses localisations préférées.\n"
        "- Quand l'utilisateur te demande ce que tu sais de lui, de son CV ou de son profil : "
        "réponds en 2-3 phrases MAXIMUM. Confirme brièvement les éléments clés (poste cible, type de contrat, ville) "
        "et propose ton aide. Ne liste pas tous les champs du profil. Sois naturel, direct, bienveillant.\n"
        "- Pour le matching ou les lettres de motivation, utilise le contenu du CV ci-dessus comme contexte."
    )

    return "\n".join(lines)


def build_ollama_messages(sys_prompt: str, history: list, message: str) -> list:
    """
    Assemble la liste de messages envoyée à Ollama.
    Ordre : [system] → [history (6 derniers max, 800 chars/msg)] → [message courant]

    Pourquoi 6 messages / 800 chars :
    - qwen3:1.7b a ~4k tokens de fenêtre de contexte.
    - Le system prompt enrichi peut peser ~1000 tokens.
    - 6 messages × ~200 tokens ≈ 1200 tokens — laisse de la marge pour la réponse.
    - On tronque chaque message à 800 chars pour éviter qu'une réponse avec
      des offres formatées ne déborde la fenêtre.
    """
    msgs = [{"role": "system", "content": sys_prompt}]
    for h in history[-6:]:
        role    = h.get("role", "")
        content = str(h.get("content", ""))[:800].strip()
        if role in ("user", "assistant") and content:
            msgs.append({"role": role, "content": content})
    msgs.append({"role": "user", "content": message})
    return msgs


def format_profil_summary() -> str:
    """
    Lit profil.json et retourne un résumé formaté de ce que l'agent sait
    sur l'utilisateur — utilisé pour répondre aux questions du type
    "que sais-tu de moi" ou "tu as accès à mon CV ?".
    """
    if not os.path.exists(FICHIER_PROFIL):
        return (
            "Je n'ai pas encore de profil enregistré pour toi.\n\n"
            "👤 Rends-toi dans **Mon Profil** pour saisir tes coordonnées, "
            "ton poste cible, tes compétences et ton expérience.\n"
            "📄 Tu peux aussi importer ton CV en PDF — je l'utiliserai automatiquement "
            "pour le matching et la rédaction de lettres."
        )
    try:
        with open(FICHIER_PROFIL, "r", encoding="utf-8") as f:
            p = json.load(f)
    except Exception:
        return "Erreur lors de la lecture du profil. Réessaie ou réimporte ton profil."

    lines = ["**Voici ce que je sais sur toi :**\n"]

    # Coordonnées
    nom   = p.get("nom", "").strip()
    email = p.get("email", "").strip()
    tel   = p.get("telephone", "").strip()
    li    = p.get("linkedin", "").strip()
    if nom or email or tel:
        coord_parts = [x for x in [nom, email, tel] if x]
        lines.append("👤 " + " · ".join(coord_parts))
    if li:
        lines.append(f"🔗 {li}")

    # Recherche / positionnement
    titre = p.get("titre_cible", "").strip()
    if titre:
        alt = p.get("titres_alternatifs", [])
        alt_str = (" · aussi ouvert·e à : " + ", ".join(alt)) if alt else ""
        lines.append(f"🎯 Poste cible : {titre}{alt_str}")

    niveau = p.get("niveau_experience", "").strip()
    famille = p.get("famille_metier", "").strip()
    if niveau or famille:
        parts = [x for x in [famille, niveau] if x]
        lines.append(f"📊 Niveau : {' · '.join(parts)}")

    contrats = p.get("types_contrat", [])
    if contrats:
        lines.append(f"📄 Contrats recherchés : {', '.join(contrats)}")

    locs = p.get("localisations", [])
    if locs:
        loc_str = ", ".join(locs) if isinstance(locs, list) else str(locs)
        lines.append(f"📍 Localisations : {loc_str}")

    # Company fit
    sect_pref = p.get("secteurs_preferes", [])
    sect_excl = p.get("secteurs_exclus", [])
    taille    = p.get("taille_entreprise", [])
    type_ent  = p.get("type_entreprise", [])
    if sect_pref:
        lines.append(f"🏭 Secteurs préférés : {', '.join(sect_pref)}")
    if sect_excl:
        lines.append(f"🚫 Secteurs exclus : {', '.join(sect_excl)}")
    if taille or type_ent:
        fit_parts = []
        if taille:  fit_parts.append("Taille : " + ", ".join(taille))
        if type_ent: fit_parts.append("Type : " + ", ".join(type_ent))
        lines.append(f"🏢 Entreprises : {' · '.join(fit_parts)}")

    # Work preferences
    mode = p.get("mode_travail_prefere", "").strip()
    preavis = p.get("preavis", "").strip()
    dispo = p.get("disponibilite", "").strip()
    s_min = p.get("salaire_min")
    s_max = p.get("salaire_max")
    s_type = p.get("salaire_type", "Brut annuel")
    if mode:
        lines.append(f"🏠 Mode de travail : {mode}")
    if s_min or s_max:
        if s_min and s_max:
            lines.append(f"💰 Salaire : {s_min}–{s_max} € ({s_type})")
        elif s_min:
            lines.append(f"💰 Salaire minimum : {s_min} € ({s_type})")
        else:
            lines.append(f"💰 Salaire maximum : {s_max} € ({s_type})")
    if preavis:
        lines.append(f"⏱ Préavis : {preavis}")
    if dispo:
        lines.append(f"📅 Disponibilité : {dispo}")

    skills = p.get("competences", [])
    if skills:
        sk_str = ", ".join(skills) if isinstance(skills, list) else str(skills)
        lines.append(f"🛠 Compétences : {sk_str}")

    # Parcours
    exp = p.get("experience", "").strip()
    if exp:
        preview = exp[:300] + ("…" if len(exp) > 300 else "")
        lines.append(f"\n📝 **Expérience :**\n{preview}")

    formation = p.get("formation", "").strip()
    if formation:
        lines.append(f"\n🎓 **Formation :**\n{formation}")

    certs = p.get("certifications", "").strip()
    if certs:
        lines.append(f"\n🏅 **Certifications :**\n{certs}")

    # CV
    cv_filename  = p.get("cv_filename", "").strip()
    cv_uploaded  = p.get("cv_uploaded_at", "").strip()
    cv_texte     = p.get("cv_texte", "").strip()
    if cv_filename:
        date_str = ""
        if cv_uploaded:
            try:
                dt = datetime.fromisoformat(cv_uploaded)
                date_str = f" (importé le {dt.strftime('%d/%m/%Y')})"
            except Exception:
                pass
        lines.append(f"\n📄 **CV importé :** {cv_filename}{date_str}")
        if cv_texte:
            chars = len(cv_texte)
            lines.append(
                f"✅ Texte extrait du CV disponible ({chars} caractères) — "
                "je l'utilise automatiquement pour le matching et la lettre de motivation."
            )
        else:
            lines.append(
                "⚠️ Le texte du CV n'a pas pu être extrait. "
                "Réimporte ton CV pour que l'agent puisse l'utiliser."
            )
    else:
        lines.append(
            "\n📄 **Pas de CV importé.** "
            "Importe ton CV depuis Mon Profil → section « Mon CV » "
            "pour améliorer la précision du matching."
        )

    if not any([nom, titre, exp, cv_filename]):
        lines.append(
            "\n⚠️ Ton profil est vide ou incomplet. "
            "Complète-le dans **Mon Profil** pour des résultats de matching optimaux."
        )

    return "\n".join(lines)


def appeler_outil_mcp(message: str):
    """
    Retourne (texte, offres_json, besoin_ollama, is_rome, evenements_json).
    besoin_ollama=True → Ollama doit répondre.
    is_rome=True → la réponse est une fiche métier (pour le frontend).
    evenements_json=liste d'évènements structurés (pour le composant EventCard), ou None.
    """
    try:
        from jobster_agent import (
            comprendre_demande, lancer_scraper,
            analyser_offre_url, calculer_matching,
            generer_lettre_motivation, generer_cv_adapte,
            generer_copier_coller, generer_urls_intelligentes,
            scraper_infos_entreprise, tracker_candidature,
            generer_rappels_ics, api_la_bonne_boite,
            api_marche_travail, api_evenements_emploi,
            api_agences_france_travail, api_rome_metier,
            ville_vers_dept,
        )

        d = message.lower()
        urls = re.findall(r'https?://[^\s]+', message)

        # ── Outils spécifiques avec URL ──
        if any(m in d for m in ["lettre", "motivation"]) and urls:
            return formater_outil(generer_lettre_motivation(message)), None, False, False, None
        if any(m in d for m in ["adapter mon cv", "adapte mon cv", "cv adapté", "optimise mon cv"]) and urls:
            return formater_outil(generer_cv_adapte(message)), None, False, False, None
        if any(m in d for m in ["prépare mail", "mail candidature", "texte formulaire"]) and urls:
            return formater_outil(generer_copier_coller(message)), None, False, False, None
        if any(m in d for m in ["liens utiles", "trouve recruteur"]) and urls:
            return formater_outil(generer_urls_intelligentes(urls[0])), None, False, False, None
        if any(m in d for m in ["match", "score", "compatible"]) and urls:
            return formater_outil(calculer_matching(message)), None, False, False, None
        if any(m in d for m in ["analyse cette offre", "analyse offre", "décrypte offre"]) and urls:
            return formater_outil(analyser_offre_url(urls[0])), None, False, False, None
        if urls and len(message.strip()) < 80:
            return formater_outil(analyser_offre_url(urls[0])), None, False, False, None

        # ── Outils sans URL ──

        # Profil / CV query — must come BEFORE the "que sais-tu de" company check
        # Route to Ollama (with enriched context) for a natural, conversational response.
        if any(m in d for m in MOTS_PROFIL_QUERY):
            if not load_profil():
                return (
                    "Je n'ai pas encore de profil enregistré. "
                    "Rends-toi dans **Mon Profil** pour saisir tes informations et importer ton CV.",
                    None, False, False, None
                )
            return None, None, True, False, None  # Ollama répondra avec le profil en contexte

        if any(m in d for m in ["rapport entreprise", "infos entreprise", "analyse entreprise", "que sais-tu de"]):
            return formater_outil(scraper_infos_entreprise(message)), None, False, False, None

        if any(m in d for m in ["tracker", "mes candidatures", "ajouter candidature", "voir candidature", "statut candidature"]):
            return formater_outil(tracker_candidature(message)), None, False, False, None

        if any(m in d for m in ["rappel", "relance", "ics"]):
            return formater_outil(generer_rappels_ics(message)), None, False, False, None

        # ── APIs France Travail spéciales ──
        if any(m in d for m in MOTS_EVENEMENTS):
            infos = comprendre_demande(message)
            loc = infos.get("location", "Paris")
            r = api_evenements_emploi(loc, ville_vers_dept(loc))
            if isinstance(r, dict):
                # api_evenements_emploi() retourne une structure enrichie
                # ({_type, _total, _items, _text}) pour le composant EventCard du
                # frontend. Le texte reste affiché dans le fil de chat, et les
                # items structurés sont renvoyés à part dans le champ "evenements"
                # de /chat pour que EventCard puisse les afficher en cartes
                # cliquables (bouton "Je découvre" → GET /evenements/{id}).
                lignes = [r.get("_text", f"Évènements emploi à {loc} :")]
                for ev in r.get("_items", [])[:8]:
                    titre = ev.get("titre", "Évènement")
                    date_evt = ev.get("date", "")
                    heure = ev.get("heureDebut", "")
                    ville_evt = ev.get("ville", loc)
                    lignes.append(f"\n• **{titre}**\n  📅 {date_evt} {heure} — 📍 {ville_evt}")
                texte = "\n".join(lignes)
                evenements_json = r.get("_items", [])[:8]
            else:
                texte = r
                evenements_json = None
            return formater_outil(texte), None, False, False, evenements_json

        if any(m in d for m in MOTS_BONNE_BOITE):
            infos = comprendre_demande(message)
            loc = infos.get("location", "Paris")
            r = api_la_bonne_boite(infos.get("keywords", ""), loc)
            return formater_outil(r), None, False, False, None

        if any(m in d for m in MOTS_MARCHE):
            infos = comprendre_demande(message)
            r = api_marche_travail(infos.get("keywords", message))
            return formater_outil(r), None, False, False, None

        if any(m in d for m in MOTS_AGENCE):
            infos = comprendre_demande(message)
            loc = infos.get("location", "Paris")
            r = api_agences_france_travail(loc, ville_vers_dept(loc))
            return formater_outil(r), None, False, False, None

        if any(m in d for m in MOTS_ROME):
            infos = comprendre_demande(message)
            r = api_rome_metier(infos.get("keywords", message))
            return formater_outil(r), None, False, True, None  # 4e valeur = is_rome

        # ── Recherche d'offres (default si mots-clés détectés) ──
        if est_recherche_offres(message):
            profil_data = load_profil()
            d_lower     = message.lower()
            has_city    = ville_dans_message(d_lower)
            is_vague    = any(m in d_lower for m in MOTS_VAGUE_PROFIL)

            if is_vague:
                # ── Recherche profilée : ne pas appeler comprendre_demande() ──
                # comprendre_demande() hallucinerait des mots-clés aléatoires sur un message vague
                # et retournerait toujours "Paris" comme ville par défaut.
                locs  = profil_data.get("localisations", [])
                titre = profil_data.get("titre_cible", "").strip()

                location = (locs[0] if isinstance(locs, list) and locs
                            else locs  if isinstance(locs, str)  and locs
                            else "Paris")

                if titre:
                    keywords = titre  # ex. "Alternance Digital Marketing"
                else:
                    # Pas de poste cible → comprendre_demande comme fallback pour les keywords
                    infos    = comprendre_demande(message)
                    keywords = infos.get("keywords", message)

            else:
                # ── Recherche précise : utiliser comprendre_demande() pour extraire métier+ville ──
                infos    = comprendre_demande(message)
                keywords = infos.get("keywords", message)
                location = infos.get("location") or None  # None si aucune ville détectée

                # Filet de sécurité : si comprendre_demande() a retourné des keywords trop génériques
                # (hallucination courante sur les messages vagues ou en anglais), utiliser le profil
                if keywords_trop_generiques(keywords):
                    titre_profil = profil_data.get("titre_cible", "").strip()
                    if titre_profil:
                        keywords = titre_profil

                # Si aucune ville détectée (comprendre_demande retourne None) ou si le message
                # ne contenait pas de ville explicite → préférer la localisation du profil
                if (not location or not has_city) and profil_data.get("localisations"):
                    locs = profil_data.get("localisations", [])
                    if isinstance(locs, list) and locs:
                        location = locs[0]
                    elif isinstance(locs, str) and locs:
                        location = locs

                # Dernier fallback si toujours pas de ville
                if not location:
                    location = "Paris"

            # ── Override contrat si l'utilisateur en a précisé un dans son message ──
            # Ex: "et en CDI ?" après un titre_cible "Alternance Digital Marketing"
            # → keywords devient "CDI Digital Marketing" au lieu d'ignorer le CDI.
            contract_override = detect_contract_in_message(d_lower)
            if contract_override:
                for ct in set(CONTRACT_TYPES_MAP.values()):
                    keywords = re.sub(r'\b' + re.escape(ct) + r'\b', '', keywords, flags=re.IGNORECASE).strip()
                keywords = f"{contract_override} {keywords}".strip()

            offres = lancer_scraper(keywords, location)
            if offres:
                offres_json = [{
                    "title":    o.get("titre", ""),
                    "company":  o.get("entreprise", ""),
                    "location": o.get("lieu", ""),
                    "contract": o.get("contrat", ""),
                    "salary":   o.get("salaire", ""),
                    "url":      o.get("lien", "#"),
                    "source":   o.get("source", ""),
                } for o in offres]
                return formater_offres(offres, keywords, location), offres_json, False, False, None

            # ── Fallback si aucun résultat : essayer les autres villes du profil, puis national ──
            if location.lower() not in ("france", ""):
                profile_locs = profil_data.get("localisations", [])
                fallback_locs = []
                if isinstance(profile_locs, list):
                    fallback_locs = [loc for loc in profile_locs if loc.lower() != location.lower()]
                fallback_locs.append("France")  # dernier recours : national

                for fallback_loc in fallback_locs:
                    offres_fallback = lancer_scraper(keywords, fallback_loc)
                    if offres_fallback:
                        offres_json = [{
                            "title":    o.get("titre", ""),
                            "company":  o.get("entreprise", ""),
                            "location": o.get("lieu", ""),
                            "contract": o.get("contrat", ""),
                            "salary":   o.get("salaire", ""),
                            "url":      o.get("lien", "#"),
                            "source":   o.get("source", ""),
                        } for o in offres_fallback]
                        if fallback_loc == "France":
                            prefix = f"*Pas de résultats à {location} — voici des offres en France :*\n\n"
                        else:
                            prefix = f"*Pas de résultats à {location} — voici des offres à {fallback_loc} :*\n\n"
                        return (
                            prefix + formater_offres(offres_fallback, keywords, fallback_loc),
                            offres_json, False, False, None
                        )

            return "Aucune offre trouvée pour cette recherche. Essaie d'autres mots-clés ou une autre ville.", None, False, False, None

        # ── Pas d'outil détecté → Ollama ──
        return None, None, True, False, None

    except Exception as e:
        print(f"[MCP] Erreur : {e}")
        return None, None, True, False, None


@app.get("/")
def root():
    return {"status": "OK", "model": MODELE}


@app.post("/chat")
def chat(data: dict):
    message = data.get("message", "").strip()
    history = data.get("history", [])   # list of {role, content} — prior turns from this chat
    if not message:
        return {"response": "Message vide.", "offres": None}

    # Build enriched system prompt once per request (reads profil.json)
    sys_prompt = build_system_prompt()

    # Conversationnel pur → Ollama directement, pas d'outil
    if est_conversationnel(message):
        try:
            resp = ollama.chat(
                model=MODELE,
                messages=build_ollama_messages(sys_prompt, history, message),
            )
            return {"response": resp["message"]["content"], "offres": None}
        except Exception as e:
            return {"response": "Jobster n'est pas disponible pour le moment. Vérifie qu'Ollama est bien lancé (`ollama run qwen3:1.7b`) et réessaie.", "offres": None}

    # Sinon → détection d'outil
    texte, offres, besoin_ollama, is_rome, evenements = appeler_outil_mcp(message)

    if not besoin_ollama and texte:
        return {"response": texte, "offres": offres, "rome": is_rome, "evenements": evenements}

    # Fallback Ollama (aussi utilisé pour les requêtes profil/CV)
    try:
        resp = ollama.chat(
            model=MODELE,
            messages=build_ollama_messages(sys_prompt, history, message),
        )
        return {"response": resp["message"]["content"], "offres": None}
    except Exception as e:
        return {"response": "Jobster n'est pas disponible pour le moment. Vérifie qu'Ollama est bien lancé (`ollama run qwen3:1.7b`) et réessaie.", "offres": None}


@app.get("/evenements/{event_id}")
def get_evenement_detail(event_id: str):
    """
    Détail enrichi d'un évènement emploi pour le bouton "Je découvre" (EventCard).
    Tente l'API interne MEE en premier (description + déroulement complets),
    puis l'API officielle France Travail en repli si l'interne ne renvoie rien.
    Le frontend dégrade déjà gracieusement si cet endpoint échoue (catch silencieux
    dans handleDiscoverEvent), donc aucune erreur 404/500 n'est renvoyée ici.
    """
    from jobster_agent import api_evenement_detail_interne, api_evenement_detail_officiel

    detail = api_evenement_detail_interne(event_id)
    if not detail:
        detail = api_evenement_detail_officiel(event_id)

    return {"event": detail}


# ── Phase 2 : Tracker de candidatures ──────────────────────────────────────────

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "scraping", "candidatures_jobster.db")

# Reference data — status codes, French labels, and display colors
STATUSES = [
    ("saved",               "Sauvegardée",          "#888888", "#F2F2F0"),
    ("applied",             "Candidature envoyée",  "#3B63D0", "#EFF3FF"),
    ("follow_up_due",       "Relance à faire",      "#B07A10", "#FFF8E6"),
    ("follow_up_sent",      "Relance envoyée",      "#D97706", "#FFF4E6"),
    ("interview_scheduled", "Entretien prévu",      "#7C3AED", "#F4F0FF"),
    ("interview_done",      "Entretien passé",      "#4F46E5", "#EEF2FF"),
    ("test_case",           "Test technique",       "#0F7070", "#E6F5F5"),
    ("offer_received",      "Offre reçue",          "#256A25", "#F0FAF0"),
    ("rejected",            "Refusée",              "#C0392B", "#FDF0EF"),
    ("withdrawn",           "Retirée",              "#666666", "#F5F5F3"),
    ("archived",            "Archivée",             "#999999", "#F5F5F3"),
]
VALID_STATUS_CODES = {s[0] for s in STATUSES}


class CandidatureCreate(BaseModel):
    poste: str
    entreprise: str
    location: Optional[str] = ""
    contract_type: Optional[str] = ""
    source: Optional[str] = ""
    url: Optional[str] = ""
    status_code: Optional[str] = "saved"
    # Legacy field kept for backward compatibility
    statut: Optional[str] = None
    notes: Optional[str] = ""


class CandidatureUpdate(BaseModel):
    poste: Optional[str] = None
    entreprise: Optional[str] = None
    location: Optional[str] = None
    contract_type: Optional[str] = None
    source: Optional[str] = None
    url: Optional[str] = None
    status_code: Optional[str] = None
    statut: Optional[str] = None   # legacy
    notes: Optional[str] = None
    date_candidature: Optional[str] = None
    date_next_action: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    interviewer: Optional[str] = None
    interview_date: Optional[str] = None
    offer_salary: Optional[str] = None
    rejection_reason: Optional[str] = None


def get_db():
    """Retourne une connexion SQLite. Crée et migre les tables si besoin."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Statuses reference table
    conn.execute("""
        CREATE TABLE IF NOT EXISTS statuses (
            code  TEXT PRIMARY KEY,
            label TEXT NOT NULL,
            color TEXT NOT NULL,
            bg    TEXT NOT NULL
        )
    """)
    # Seed statuses (safe — INSERT OR IGNORE)
    conn.executemany(
        "INSERT OR IGNORE INTO statuses (code, label, color, bg) VALUES (?, ?, ?, ?)",
        STATUSES
    )

    # Candidatures table — full schema
    conn.execute("""
        CREATE TABLE IF NOT EXISTS candidatures (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            poste            TEXT NOT NULL,
            entreprise       TEXT NOT NULL,
            location         TEXT DEFAULT '',
            contract_type    TEXT DEFAULT '',
            source           TEXT DEFAULT '',
            url              TEXT DEFAULT '',
            status_code      TEXT DEFAULT 'saved' REFERENCES statuses(code),
            statut           TEXT DEFAULT '',
            notes            TEXT DEFAULT '',
            date_ajout       TEXT DEFAULT (date('now')),
            date_candidature TEXT,
            date_next_action TEXT,
            date_updated     TEXT DEFAULT (date('now')),
            contact_name     TEXT DEFAULT '',
            contact_email    TEXT DEFAULT '',
            interviewer      TEXT DEFAULT '',
            interview_date   TEXT,
            offer_salary     TEXT DEFAULT '',
            rejection_reason TEXT DEFAULT ''
        )
    """)

    # Migration — add missing columns to existing tables
    existing_cols = {row[1] for row in conn.execute("PRAGMA table_info(candidatures)")}
    new_cols = [
        ("location",         "TEXT DEFAULT ''"),
        ("contract_type",    "TEXT DEFAULT ''"),
        ("source",           "TEXT DEFAULT ''"),
        ("status_code",      "TEXT DEFAULT 'saved'"),
        ("date_candidature", "TEXT"),
        ("date_next_action", "TEXT"),
        ("date_updated",     "TEXT DEFAULT (date('now'))"),
        ("contact_name",     "TEXT DEFAULT ''"),
        ("contact_email",    "TEXT DEFAULT ''"),
        ("interviewer",      "TEXT DEFAULT ''"),
        ("interview_date",   "TEXT"),
        ("offer_salary",     "TEXT DEFAULT ''"),
        ("rejection_reason", "TEXT DEFAULT ''"),
    ]
    for col_name, col_def in new_cols:
        if col_name not in existing_cols:
            conn.execute(f"ALTER TABLE candidatures ADD COLUMN {col_name} {col_def}")

    # Favorites table — Phase 3
    conn.execute("""
        CREATE TABLE IF NOT EXISTS favorites (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            titre         TEXT NOT NULL,
            entreprise    TEXT DEFAULT '',
            url           TEXT UNIQUE,
            location      TEXT DEFAULT '',
            contract_type TEXT DEFAULT '',
            source        TEXT DEFAULT '',
            saved_at      TEXT DEFAULT (datetime('now'))
        )
    """)

    # Projects table — Phase 3
    conn.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT NOT NULL,
            emoji      TEXT DEFAULT '📁',
            color      TEXT DEFAULT '#6B7280',
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    conn.commit()
    return conn


@app.get("/statuses")
def get_statuses():
    """Retourne tous les statuts avec leurs labels et couleurs."""
    return {"statuses": [
        {"code": s[0], "label": s[1], "color": s[2], "bg": s[3]}
        for s in STATUSES
    ]}


@app.get("/candidatures")
def get_candidatures():
    """Retourne toutes les candidatures enregistrées."""
    try:
        conn = get_db()
        rows = conn.execute("SELECT * FROM candidatures ORDER BY id DESC").fetchall()
        conn.close()
        return {"candidatures": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/candidatures", status_code=201)
def add_candidature(data: CandidatureCreate):
    """Ajoute une nouvelle candidature. Retourne l'existante si même URL (pas de doublon)."""
    try:
        conn = get_db()
        # ── Duplicate guard: same URL already exists → return existing row ──
        if data.url and data.url.strip() and data.url.strip() != '#':
            existing = conn.execute(
                "SELECT * FROM candidatures WHERE url = ?", (data.url.strip(),)
            ).fetchone()
            if existing:
                conn.close()
                return {"candidature": dict(existing), "duplicate": True}
        status_code = data.status_code if data.status_code in VALID_STATUS_CODES else "saved"
        cur = conn.execute(
            """INSERT INTO candidatures
               (poste, entreprise, location, contract_type, source, url, status_code, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (data.poste, data.entreprise, data.location, data.contract_type,
             data.source, data.url, status_code, data.notes)
        )
        conn.commit()
        new_id = cur.lastrowid
        row = conn.execute("SELECT * FROM candidatures WHERE id = ?", (new_id,)).fetchone()
        conn.close()
        return {"candidature": dict(row)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.patch("/candidatures/{candidature_id}")
def update_candidature(candidature_id: int, data: CandidatureUpdate):
    """Met à jour un ou plusieurs champs d'une candidature."""
    try:
        conn = get_db()
        row = conn.execute("SELECT * FROM candidatures WHERE id = ?", (candidature_id,)).fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Candidature non trouvée")

        # Build SET clause dynamically — only update provided fields
        updatable = [
            "poste", "entreprise", "location", "contract_type", "source", "url",
            "status_code", "notes", "date_candidature", "date_next_action",
            "contact_name", "contact_email", "interviewer", "interview_date",
            "offer_salary", "rejection_reason",
        ]
        updates, values = [], []
        for field in updatable:
            val = getattr(data, field, None)
            if val is not None:
                if field == "status_code" and val not in VALID_STATUS_CODES:
                    continue
                updates.append(f"{field} = ?")
                values.append(val)

        if not updates:
            conn.close()
            return {"candidature": dict(row)}

        updates.append("date_updated = date('now')")
        values.append(candidature_id)
        conn.execute(
            f"UPDATE candidatures SET {', '.join(updates)} WHERE id = ?",
            values
        )
        conn.commit()
        updated = conn.execute("SELECT * FROM candidatures WHERE id = ?", (candidature_id,)).fetchone()
        conn.close()
        return {"candidature": dict(updated)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/candidatures/{candidature_id}", status_code=200)
def delete_candidature(candidature_id: int):
    """Supprime une candidature."""
    try:
        conn = get_db()
        row = conn.execute("SELECT id FROM candidatures WHERE id = ?", (candidature_id,)).fetchone()
        if not row:
            conn.close()
            raise HTTPException(status_code=404, detail="Candidature non trouvée")
        conn.execute("DELETE FROM candidatures WHERE id = ?", (candidature_id,))
        conn.commit()
        conn.close()
        return {"deleted": candidature_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Phase 2 : Profil utilisateur ───────────────────────────────────────────────
# Le profil est écrit dans scraping/profil.json — le même fichier que lit
# extraire_cv_depuis_message() dans jobster_agent.py (mode "profil").
# Ainsi, matching et lettre de motivation utilisent automatiquement le profil
# sauvegardé, sans aucune modification du code agent de Gildas.

class ProfileData(BaseModel):
    # Section 1 — Identity & Contact
    nom: Optional[str] = ""
    email: Optional[str] = ""
    telephone: Optional[str] = ""
    linkedin: Optional[str] = ""
    portfolio_url: Optional[str] = ""
    github_url: Optional[str] = ""
    # Section 2 — Target Role & Positioning
    titre_cible: Optional[str] = ""
    titres_alternatifs: Optional[List[str]] = []
    roles_adjacents: Optional[List[str]] = []
    famille_metier: Optional[str] = ""
    niveau_experience: Optional[str] = ""
    types_contrat: Optional[List[str]] = []
    # Section 3 — Company Fit & Industry
    secteurs_preferes: Optional[List[str]] = []
    secteurs_exclus: Optional[List[str]] = []
    taille_entreprise: Optional[List[str]] = []
    type_entreprise: Optional[List[str]] = []
    valeurs_culture: Optional[List[str]] = []
    # Section 4 — Skills & Location (existing)
    localisations: Optional[List[str]] = []
    competences: Optional[List[str]] = []
    # Section 5 — Background (existing)
    experience: Optional[str] = ""
    formation: Optional[str] = ""
    certifications: Optional[str] = ""
    # Section 7 — Work Preferences & Constraints
    mode_travail_prefere: Optional[str] = ""
    salaire_min: Optional[int] = None
    salaire_max: Optional[int] = None
    salaire_type: Optional[str] = "Brut annuel"
    preavis: Optional[str] = ""
    disponibilite: Optional[str] = ""
    voyages_pro: Optional[str] = ""


@app.get("/profile")
def get_profile():
    """Retourne le profil sauvegardé depuis scraping/profil.json."""
    if not os.path.exists(FICHIER_PROFIL):
        raise HTTPException(status_code=404, detail="Profil non configuré")
    try:
        with open(FICHIER_PROFIL, "r", encoding="utf-8") as f:
            data = json.load(f)
        return {"profile": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/documents/upload")
async def upload_cv(file: UploadFile = File(...)):
    """
    Upload d'un CV PDF.
    - Stocke le fichier dans scraping/cv_utilisateur.pdf
    - Extrait le texte avec pdfplumber
    - Ajoute cv_texte + cv_filename + cv_uploaded_at à profil.json
    - L'agent (extraire_cv_depuis_message) lira automatiquement profil.json
      et trouvera cv_texte sans aucune modification du code agent.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Format non supporté. PDF uniquement.")

    # Chemin de stockage
    fichier_cv = os.path.join(SCRAPING_PATH, "cv_utilisateur.pdf")

    # Sauvegarde du fichier
    try:
        with open(fichier_cv, "wb") as f:
            shutil.copyfileobj(file.file, f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde : {e}")

    # Extraction du texte avec pdfplumber (même lib que jobster_agent.py)
    cv_texte = ""
    try:
        import pdfplumber
        with pdfplumber.open(fichier_cv) as pdf:
            for page in pdf.pages:
                cv_texte += page.extract_text() or ""
        cv_texte = cv_texte.strip()
        # Fix PDFs where each character is extracted twice (EEDDUUCCAATTIIOONN → EDUCATION)
        cv_texte = fix_doubled_chars(cv_texte)
    except ImportError:
        # pdfplumber non installé — le chemin sera lisible par l'agent via lire_pdf()
        cv_texte = ""
    except Exception:
        cv_texte = ""

    # Mise à jour de profil.json — on ne touche pas aux autres champs
    profil = {}
    if os.path.exists(FICHIER_PROFIL):
        try:
            with open(FICHIER_PROFIL, "r", encoding="utf-8") as f:
                profil = json.load(f)
        except Exception:
            pass

    profil["cv_texte"]      = cv_texte
    profil["cv_filename"]   = file.filename
    profil["cv_uploaded_at"] = datetime.now().isoformat()

    try:
        with open(FICHIER_PROFIL, "w", encoding="utf-8") as f:
            json.dump(profil, f, ensure_ascii=False, indent=2)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur écriture profil : {e}")

    return {
        "message":          "CV uploadé avec succès",
        "filename":         file.filename,
        "extracted_chars":  len(cv_texte),
        "preview":          cv_texte[:200] if cv_texte else "",
    }


@app.post("/profile")
def save_profile(data: ProfileData):
    """
    Sauvegarde le profil dans scraping/profil.json.
    Ce fichier est lu automatiquement par l'agent (matching, lettre de motivation)
    quand l'utilisateur n'a pas collé son CV dans le message.

    IMPORTANT: on lit d'abord le fichier existant pour préserver les champs CV
    (cv_texte, cv_filename, cv_uploaded_at) qui sont écrits par POST /documents/upload.
    Sans ce merge, un clic sur "Enregistrer" effacerait le CV uploadé.
    """
    try:
        # Read existing file to preserve CV fields written by /documents/upload
        existing = {}
        if os.path.exists(FICHIER_PROFIL):
            try:
                with open(FICHIER_PROFIL, "r", encoding="utf-8") as f:
                    existing = json.load(f)
            except Exception:
                pass

        # Merge: start from form data, layer preserved CV fields on top
        profil = data.dict()
        for cv_field in ("cv_texte", "cv_filename", "cv_uploaded_at"):
            if cv_field in existing:
                profil[cv_field] = existing[cv_field]

        with open(FICHIER_PROFIL, "w", encoding="utf-8") as f:
            json.dump(profil, f, ensure_ascii=False, indent=2)
        return {"profile": profil, "message": "Profil sauvegardé avec succès"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class CvTextUpdate(BaseModel):
    cv_texte: str


@app.patch("/profile/cv-text")
def update_cv_text(data: CvTextUpdate):
    """
    Met à jour uniquement le champ cv_texte dans profil.json.
    Permet à l'utilisateur de corriger le texte extrait par pdfplumber
    sans toucher aux autres champs du profil.
    """
    if not os.path.exists(FICHIER_PROFIL):
        raise HTTPException(status_code=404, detail="Profil non configuré — uploade d'abord un CV")
    try:
        with open(FICHIER_PROFIL, "r", encoding="utf-8") as f:
            profil = json.load(f)
        profil["cv_texte"] = data.cv_texte.strip()
        with open(FICHIER_PROFIL, "w", encoding="utf-8") as f:
            json.dump(profil, f, ensure_ascii=False, indent=2)
        return {"message": "Texte du CV mis à jour", "chars": len(data.cv_texte.strip())}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Phase 2 : Documents ────────────────────────────────────────────────────────

@app.get("/documents")
def get_documents():
    """
    Retourne trois listes de fichiers :
    - 'uploaded'      : CV importé par l'utilisateur (depuis profil.json)
    - 'generated'     : fichiers .docx / .pdf / .ics générés par l'agent dans scraping/
    - 'other_uploads' : fichiers importés via /documents/upload-other
                        (identifiés par leur préfixe horodaté YYYYMMDD_HHMMSS_)
    """
    uploaded      = []
    generated     = []
    other_uploads = []

    # ── CV uploadé ──
    cv_path = os.path.join(SCRAPING_PATH, "cv_utilisateur.pdf")
    profil = {}
    if os.path.exists(FICHIER_PROFIL):
        try:
            with open(FICHIER_PROFIL, "r", encoding="utf-8") as f:
                profil = json.load(f)
        except Exception:
            pass

    if os.path.exists(cv_path) and profil.get("cv_filename"):
        stat = os.stat(cv_path)
        uploaded.append({
            "id":       "cv_utilisateur",
            "name":     profil.get("cv_filename", "cv_utilisateur.pdf"),
            "type":     "cv",
            "size":     stat.st_size,
            "date":     profil.get("cv_uploaded_at", datetime.fromtimestamp(stat.st_mtime).isoformat()),
            "download": "/documents/download/cv_utilisateur.pdf",
        })

    # ── Fichiers générés par l'agent + autres imports ──
    GENERATED_EXTS   = ('.docx', '.pdf', '.ics')
    OTHER_EXTS       = ('.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.txt')
    EXCLUDE          = {'cv_utilisateur.pdf', 'profil.json'}
    # Fichiers uploadés via /documents/upload-other : préfixe YYYYMMDD_HHMMSS_
    OTHER_UPLOAD_PAT = re.compile(r'^\d{8}_\d{6}_')

    if os.path.isdir(SCRAPING_PATH):
        for fname in sorted(os.listdir(SCRAPING_PATH)):
            if fname in EXCLUDE:
                continue
            fpath = os.path.join(SCRAPING_PATH, fname)
            if not os.path.isfile(fpath):
                continue
            stat = os.stat(fpath)

            # ── Autres uploads : préfixe horodaté YYYYMMDD_HHMMSS_ ──
            if OTHER_UPLOAD_PAT.match(fname):
                ext = os.path.splitext(fname)[1].lower()
                if ext in OTHER_EXTS:
                    display_name = OTHER_UPLOAD_PAT.sub('', fname)
                    other_uploads.append({
                        "id":       fname,           # nom stocké (avec préfixe) — utilisé pour download/delete
                        "name":     display_name,    # nom affiché (sans préfixe horodaté)
                        "size":     stat.st_size,
                        "date":     datetime.fromtimestamp(stat.st_mtime).isoformat(),
                        "download": f"/documents/download/{fname}",
                    })
                continue  # ne pas classer aussi dans generated

            # ── Fichiers générés par l'agent ──
            if not fname.lower().endswith(GENERATED_EXTS):
                continue
            if fname.endswith('.docx'):
                doc_type = 'lettre'
            elif fname.endswith('.pdf'):
                doc_type = 'cv_adapte'
            elif fname.endswith('.ics'):
                doc_type = 'calendrier'
            else:
                doc_type = 'autre'
            generated.append({
                "id":       fname,
                "name":     fname,
                "type":     doc_type,
                "size":     stat.st_size,
                "date":     datetime.fromtimestamp(stat.st_mtime).isoformat(),
                "download": f"/documents/download/{fname}",
            })

    return {"uploaded": uploaded, "generated": generated, "other_uploads": other_uploads}


@app.get("/documents/download/{filename}")
def download_document(filename: str):
    """Télécharge un fichier depuis le dossier scraping/."""
    from fastapi.responses import FileResponse
    # Security: prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")
    fpath = os.path.join(SCRAPING_PATH, filename)
    if not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    return FileResponse(fpath, filename=filename)


@app.post("/documents/upload-other")
async def upload_other_document(file: UploadFile = File(...)):
    """
    Upload d'un document quelconque (PDF, DOCX, image).
    Contrairement à /documents/upload (CV), ce endpoint :
    - N'extrait PAS le texte avec pdfplumber
    - N'écrit PAS dans profil.json
    - Sauvegarde le fichier tel quel dans scraping/ avec un préfixe horodaté
    """
    ALLOWED_EXTS = ('.pdf', '.docx', '.doc', '.png', '.jpg', '.jpeg', '.txt')
    ext = os.path.splitext(file.filename or '')[1].lower()
    if ext not in ALLOWED_EXTS:
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté. Formats acceptés : {', '.join(ALLOWED_EXTS)}"
        )

    # Préfixe horodaté pour éviter les collisions
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_name = re.sub(r'[^\w.\-]', '_', file.filename or 'document')
    stored_name = f"{timestamp}_{safe_name}"
    fpath = os.path.join(SCRAPING_PATH, stored_name)

    try:
        with open(fpath, "wb") as f:
            shutil.copyfileobj(file.file, f)
        size = os.path.getsize(fpath)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde : {e}")

    return {
        "message":  "Fichier uploadé avec succès",
        "filename": stored_name,
        "original": file.filename,
        "size":     size,
        "download": f"/documents/download/{stored_name}",
    }


@app.delete("/documents/{filename}")
def delete_document(filename: str):
    """Supprime un fichier généré depuis le dossier scraping/."""
    # Security: prevent path traversal
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nom de fichier invalide")
    fpath = os.path.join(SCRAPING_PATH, filename)
    if not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="Fichier non trouvé")
    os.remove(fpath)
    return {"deleted": filename}


# ── Phase 3 : Favoris persistants ──────────────────────────────────────────────

class FavoriteCreate(BaseModel):
    titre:         str
    entreprise:    Optional[str] = ""
    url:           Optional[str] = None
    location:      Optional[str] = ""
    contract_type: Optional[str] = ""
    source:        Optional[str] = ""


@app.get("/favorites")
def get_favorites():
    """Retourne tous les favoris enregistrés."""
    try:
        conn = get_db()
        rows = conn.execute("SELECT * FROM favorites ORDER BY id DESC").fetchall()
        conn.close()
        return {"favorites": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/favorites", status_code=201)
def add_favorite(data: FavoriteCreate):
    """Ajoute un favori. Retourne l'existant si même URL (pas de doublon)."""
    try:
        conn = get_db()
        # Get-or-create by URL
        if data.url:
            existing = conn.execute(
                "SELECT * FROM favorites WHERE url = ?", (data.url,)
            ).fetchone()
            if existing:
                conn.close()
                return {"favorite": dict(existing), "created": False}
        cur = conn.execute(
            """INSERT INTO favorites (titre, entreprise, url, location, contract_type, source)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (data.titre, data.entreprise, data.url, data.location, data.contract_type, data.source)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM favorites WHERE id = ?", (cur.lastrowid,)).fetchone()
        conn.close()
        return {"favorite": dict(row), "created": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/favorites/{fav_id}")
def delete_favorite(fav_id: int):
    """Supprime un favori par son ID."""
    try:
        conn = get_db()
        result = conn.execute("DELETE FROM favorites WHERE id = ?", (fav_id,))
        conn.commit()
        conn.close()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Favori non trouvé")
        return {"deleted": fav_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Phase 3 : Projets persistants ──────────────────────────────────────────────

class ProjectCreate(BaseModel):
    name:  str
    emoji: Optional[str] = "📁"
    color: Optional[str] = "#6B7280"


@app.get("/projects")
def get_projects():
    """Retourne tous les projets enregistrés."""
    try:
        conn = get_db()
        rows = conn.execute("SELECT * FROM projects ORDER BY id DESC").fetchall()
        conn.close()
        return {"projects": [dict(r) for r in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/projects", status_code=201)
def add_project(data: ProjectCreate):
    """Crée un nouveau projet."""
    try:
        conn = get_db()
        cur = conn.execute(
            "INSERT INTO projects (name, emoji, color) VALUES (?, ?, ?)",
            (data.name, data.emoji, data.color)
        )
        conn.commit()
        row = conn.execute("SELECT * FROM projects WHERE id = ?", (cur.lastrowid,)).fetchone()
        conn.close()
        return {"project": dict(row), "created": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/projects/{project_id}")
def delete_project(project_id: int):
    """Supprime un projet par son ID."""
    try:
        conn = get_db()
        result = conn.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
        conn.close()
        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Projet non trouvé")
        return {"deleted": project_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
