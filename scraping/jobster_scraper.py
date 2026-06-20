"""
JOBSTER — Scraper d'offres d'emploi (version 3 — sélecteurs précis)
=====================================================================
Sites inclus :
  1. France Travail  → API officielle — 100% fiable
  2. Indeed          → Playwright avec sélecteurs précis
  3. HelloWork       → BS4 avec sélecteurs corriges
  4. APEC            → BS4 avec sélecteurs corriges
  5. Cadremploi      → Playwright avec sélecteurs précis
  6. Monster         → URL corrigee
  7. JobTeaser       → Playwright avec sélecteurs précis
  8. L'Etudiant      → URL corrigee
  9. Welcome to the Jungle → Playwright avec sélecteurs précis

Comment utiliser ce fichier :
  1. Ouvre un terminal dans ton dossier scraping
  2. Tape : python jobster_scraper.py
  3. Le fichier offres_jobster.json sera créé avec toutes les offres
"""

import requests
from bs4 import BeautifulSoup
import json
import time
import random
import os
from dotenv import load_dotenv

# ============================================================
# CHARGEMENT DES CLES SECRETES
# On lit le fichier .env qui contient nos clés API.
# Ce fichier reste sur ton PC et ne part JAMAIS sur GitHub.
# ============================================================

load_dotenv(dotenv_path=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'backend', '.env'))
FRANCE_TRAVAIL_CLIENT_ID = os.getenv("FRANCE_TRAVAIL_CLIENT_ID")
FRANCE_TRAVAIL_CLIENT_SECRET = os.getenv("FRANCE_TRAVAIL_CLIENT_SECRET")
ADZUNA_APP_ID = os.getenv("ADZUNA_APP_ID")
ADZUNA_APP_KEY = os.getenv("ADZUNA_APP_KEY")


# ============================================================
# LES 5 DEGUISEMENTS DU ROBOT
# Au lieu d'utiliser toujours le même déguisement,
# le robot en change à chaque fois au hasard.
# ============================================================

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
]


# ============================================================
# LA CARTE D'IDENTITE COMPLETE DU ROBOT
# Un vrai navigateur envoie beaucoup plus d'informations
# qu'un simple User-Agent. Ici on envoie tout ce qu'un
# vrai Chrome enverrait, pour ne pas être détecté.
# ============================================================

def get_headers():
    return {
        "User-Agent": random.choice(USER_AGENTS),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "DNT": "1",
    }


# ============================================================
# LA PAUSE ALEATOIRE
# Un vrai humain ne clique pas à la même vitesse à chaque fois.
# On attend entre 2 et 5 secondes de façon aléatoire.
# ============================================================

def pause():
    duree = random.uniform(2, 5)
    print(f"   Pause de {duree:.1f} secondes...")
    time.sleep(duree)


# ============================================================
# LA SESSION PERSISTANTE
# Un vrai navigateur garde en mémoire les cookies d'un site.
# Ici on crée une session qui fait pareil.
# ============================================================

def nouvelle_session():
    session = requests.Session()
    session.headers.update(get_headers())
    return session


# ============================================================
# SITE 1 — FRANCE TRAVAIL (API officielle)
# C'est la source la plus fiable. Elle utilise nos clés
# API stockées dans le fichier .env pour s'authentifier.
# ============================================================

def get_france_travail_token():
    url = "https://entreprise.francetravail.fr/connexion/oauth2/access_token"
    params = {"realm": "/partenaire"}
    data = {
        "grant_type": "client_credentials",
        "client_id": FRANCE_TRAVAIL_CLIENT_ID,
        "client_secret": FRANCE_TRAVAIL_CLIENT_SECRET,
        "scope": "api_offresdemploiv2 o2dsoffre",
    }
    reponse = requests.post(url, params=params, data=data)
    reponse.raise_for_status()
    return reponse.json()["access_token"]

def scrape_france_travail(keywords="chef de projet", departement="75", max_results=10):
    print(f"\n[1/9] France Travail — '{keywords}' — departement {departement}")
    try:
        token = get_france_travail_token()
        url = "https://api.francetravail.io/partenaire/offresdemploi/v2/offres/search"
        entete_api = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
        params = {"motsCles": keywords, "range": f"0-{max_results - 1}"}
        if departement:  # recherche nationale si dept vide — pas de filtre
            params["departement"] = departement
        reponse = requests.get(url, headers=entete_api, params=params)
        reponse.raise_for_status()
        offres_brutes = reponse.json().get("resultats", [])
        offres = []
        for o in offres_brutes:
            offres.append({
                "titre": o.get("intitule", "N/A"),
                "entreprise": o.get("entreprise", {}).get("nom", "N/A"),
                "lieu": o.get("lieuTravail", {}).get("libelle", "N/A"),
                "contrat": o.get("typeContratLibelle", "N/A"),
                "lien": o.get("origineOffre", {}).get("urlOrigine", "N/A"),
                "source": "France Travail",
            })
            print(f"   OK  {o.get('intitule', 'N/A')} — {o.get('entreprise', {}).get('nom', 'N/A')}")
        print(f"   Total : {len(offres)} offres")
        return offres
    except Exception as e:
        print(f"   ERREUR France Travail : {e}")
        return []


# ============================================================
# SITE 2 — ADZUNA (API officielle)
# Adzuna est un moteur d'emploi qui agrège les offres de
# plusieurs sites : Indeed, Monster, Cadremploi et d'autres.
# C'est une API gratuite qui nous donne accès à des milliers
# d'offres sans aucun blocage.
# ============================================================

def scrape_adzuna(keywords="chef de projet", location="Paris", max_results=10):
    """Recupere les offres via l'API officielle Adzuna."""
    print(f"\n[2/9] Adzuna — '{keywords}' — {location}")
    try:
        url = "https://api.adzuna.com/v1/api/jobs/fr/search/1"
        params = {
            "app_id": ADZUNA_APP_ID,
            "app_key": ADZUNA_APP_KEY,
            "what": keywords,
            "where": location,
            "results_per_page": max_results,
            "content-type": "application/json",
        }
        reponse = requests.get(url, params=params, timeout=15)
        print(f"   Reponse : {reponse.status_code}")
        reponse.raise_for_status()
        offres_brutes = reponse.json().get("results", [])
        offres = []
        for o in offres_brutes:
            offres.append({
                "titre": o.get("title", "N/A"),
                "entreprise": o.get("company", {}).get("display_name", "N/A"),
                "lieu": o.get("location", {}).get("display_name", location),
                "contrat": o.get("contract_time", "N/A"),
                "lien": o.get("redirect_url", "N/A"),
                "source": "Adzuna",
            })
            print(f"   OK  {o.get('title', 'N/A')} — {o.get('company', {}).get('display_name', 'N/A')}")
        print(f"   Total : {len(offres)} offres")
        return offres
    except Exception as e:
        print(f"   ERREUR Adzuna : {e}")
        return []


# ============================================================
# SITE 3 — INDEED (Playwright)
# Indeed bloque tous les robots classiques avec un code 403.
# On utilise Playwright qui simule un vrai humain en train
# de naviguer. On attend que la page charge complètement
# puis on cible les cartes d'offres avec leur vrai sélecteur.
# ============================================================

def scrape_indeed(keywords="chef de projet", location="Paris", max_results=10):
    print(f"\n[2/9] Indeed (Playwright) — '{keywords}' — {location}")
    try:
        from playwright.sync_api import sync_playwright
        offres = []
        with sync_playwright() as p:
            nav = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-blink-features=AutomationControlled"]
            )
            ctx = nav.new_context(
                user_agent=random.choice(USER_AGENTS),
                locale="fr-FR",
                viewport={"width": 1280, "height": 800},
            )
            page = ctx.new_page()
            kw = keywords.replace(" ", "+")
            page.goto(f"https://fr.indeed.com/jobs?q={kw}&l={location}", timeout=30000)
            try:
                page.wait_for_selector(".job_seen_beacon", timeout=10000)
            except:
                pass
            page.wait_for_timeout(3000)

            # Sélecteurs mis à jour (juin 2026) :
            # – titre : h3.jobTitle a (aria-label contient le titre)
            # – lien  : a[data-jk] sur la carte
            cartes = page.query_selector_all(".job_seen_beacon")
            for carte in cartes[:max_results]:
                # Titre via aria-label du lien ou texte du h3
                titre = "N/A"
                lien_tag = carte.query_selector("a[data-jk]")
                if lien_tag:
                    aria = lien_tag.get_attribute("aria-label") or ""
                    if aria:
                        # aria-label = "tous les détails sur « Titre »"
                        import re as _re
                        m = _re.search(r'«\s*(.+?)\s*»', aria)
                        titre = m.group(1) if m else aria[:80]
                    else:
                        h3 = carte.query_selector("h3.jobTitle, h2.jobTitle")
                        if h3:
                            titre = h3.inner_text().strip()[:80]

                entreprise_tag = carte.query_selector("[data-testid='company-name']")
                entreprise = entreprise_tag.inner_text().strip() if entreprise_tag else "N/A"
                lieu_tag = carte.query_selector("[data-testid='text-location']")
                lieu = lieu_tag.inner_text().strip() if lieu_tag else location

                if lien_tag:
                    href = lien_tag.get_attribute("href") or ""
                    lien = ("https://fr.indeed.com" + href) if href.startswith("/") else href
                else:
                    lien = "N/A"

                if titre != "N/A" and len(titre) > 3:
                    offres.append({
                        "titre": titre, "entreprise": entreprise,
                        "lieu": lieu, "contrat": "N/A",
                        "lien": lien, "source": "Indeed",
                    })
                    print(f"   OK  {titre} — {entreprise}")
            nav.close()
        print(f"   Total : {len(offres)} offres")
        return offres
    except Exception as e:
        print(f"   ERREUR Indeed : {e}")
        return []


# ============================================================
# SITE 3 — HELLOWORK (BeautifulSoup)
# HelloWork répond avec un code 200 mais les offres sont
# chargées en JavaScript. On cherche les données JSON
# cachées dans la page HTML plutôt que les balises HTML.
# ============================================================

def scrape_hellowork(keywords="chef de projet", location="Paris", max_results=10):
    print(f"\n[3/9] HelloWork — '{keywords}' — {location}")
    session = nouvelle_session()
    try:
        session.get("https://www.hellowork.com", timeout=10)
        pause()
    except:
        pass

    kw = keywords.replace(" ", "%20")
    loc = location.replace(" ", "%20")
    url = f"https://www.hellowork.com/fr-fr/emploi/recherche.html?k={kw}&l={loc}"
    try:
        reponse = session.get(url, timeout=15)
        print(f"   Reponse : {reponse.status_code} — {len(reponse.text)} chars")
        soup = BeautifulSoup(reponse.text, "html.parser")

        # HelloWork stocke ses offres dans des balises <li> avec data-id-job
        cartes = soup.find_all("li", {"data-id-job": True})

        # Fallback : chercher les balises article
        if not cartes:
            cartes = soup.find_all("article")

        # Fallback 2 : chercher les divs avec des classes contenant "job"
        if not cartes:
            cartes = soup.find_all("div", class_=lambda c: c and "JobCard" in str(c))

        offres = []
        for carte in cartes[:max_results]:
            titre_tag = carte.find(["h2", "h3", "h4"])
            titre = titre_tag.get_text(strip=True) if titre_tag else "N/A"
            if titre == "N/A" or len(titre) < 5:
                continue
            lien_tag = carte.find("a", href=True)
            lien = lien_tag["href"] if lien_tag else "N/A"
            if lien and not lien.startswith("http"):
                lien = "https://www.hellowork.com" + lien
            offres.append({"titre": titre, "entreprise": "N/A", "lieu": location, "contrat": "N/A", "lien": lien, "source": "HelloWork"})
            print(f"   OK  {titre}")
        print(f"   Total : {len(offres)} offres")
        pause()
        return offres
    except Exception as e:
        print(f"   ERREUR HelloWork : {e}")
        return []


# ============================================================
# SITE 4 — APEC (BeautifulSoup)
# L'APEC répond avec un code 200. Les offres sont dans des
# balises article avec une classe spécifique contenant "card".
# On cherche aussi les attributs data- pour être plus précis.
# ============================================================

def scrape_apec(keywords="chef de projet", location="Paris", max_results=10):
    print(f"\n[4/9] APEC — '{keywords}' — {location}")
    session = nouvelle_session()
    try:
        session.get("https://www.apec.fr", timeout=10)
        pause()
    except:
        pass

    url = "https://www.apec.fr/candidat/recherche-emploi.html/emploi"
    params = {"motsCles": keywords, "lieuTravail": location, "nbParPage": max_results}
    try:
        reponse = session.get(url, params=params, timeout=15)
        print(f"   Reponse : {reponse.status_code} — {len(reponse.text)} chars")
        soup = BeautifulSoup(reponse.text, "html.parser")

        # APEC : les offres sont dans des article avec classe card-offer
        cartes = soup.find_all("article", class_=lambda c: c and "offer" in str(c).lower())
        if not cartes:
            cartes = soup.find_all("article")
        if not cartes:
            # Chercher dans les divs avec data-id
            cartes = soup.find_all("div", attrs={"data-offer-id": True})

        offres = []
        for carte in cartes[:max_results]:
            titre_tag = carte.find(["h2", "h3", "h4"])
            titre = titre_tag.get_text(strip=True) if titre_tag else "N/A"
            if titre == "N/A" or len(titre) < 5:
                continue
            entreprise_tag = carte.find(class_=lambda c: c and ("company" in str(c).lower() or "entreprise" in str(c).lower()))
            entreprise = entreprise_tag.get_text(strip=True) if entreprise_tag else "N/A"
            lien_tag = carte.find("a", href=True)
            lien = lien_tag["href"] if lien_tag else "N/A"
            if lien and not lien.startswith("http"):
                lien = "https://www.apec.fr" + lien
            offres.append({"titre": titre, "entreprise": entreprise, "lieu": location, "contrat": "Cadre", "lien": lien, "source": "APEC"})
            print(f"   OK  {titre} — {entreprise}")
        print(f"   Total : {len(offres)} offres")
        pause()
        return offres
    except Exception as e:
        print(f"   ERREUR APEC : {e}")
        return []


# ============================================================
# SITE 5 — CADREMPLOI (Playwright)
# Cadremploi bloque les robots classiques.
# On utilise Playwright et on cible les balises article
# qui contiennent les vraies offres d'emploi.
# ============================================================

def scrape_cadremploi(keywords="chef de projet", location="Paris", max_results=10):
    print(f"\n[5/9] Cadremploi (Playwright) — '{keywords}' — {location}")
    try:
        from playwright.sync_api import sync_playwright
        offres = []
        with sync_playwright() as p:
            nav = p.chromium.launch(headless=True)
            page = nav.new_page(user_agent=random.choice(USER_AGENTS), locale="fr-FR")
            kw = keywords.replace(" ", "+")
            page.goto(f"https://www.cadremploi.fr/emploi/liste_offres.html?quoi={kw}&ou={location}", timeout=30000)
            try:
                page.wait_for_selector("article", timeout=8000)
            except:
                pass
            page.wait_for_timeout(3000)

            cartes = page.query_selector_all("article")
            for carte in cartes[:max_results]:
                titre_tag = carte.query_selector("h2, h3, [class*='title']")
                titre = titre_tag.inner_text().strip() if titre_tag else "N/A"
                # On filtre les éléments qui ne sont pas des offres
                if titre == "N/A" or len(titre) < 10:
                    continue
                entreprise_tag = carte.query_selector("[class*='company'], [class*='entreprise']")
                entreprise = entreprise_tag.inner_text().strip() if entreprise_tag else "N/A"
                lien_tag = carte.query_selector("a")
                lien = lien_tag.get_attribute("href") if lien_tag else "N/A"
                if lien and not lien.startswith("http"):
                    lien = "https://www.cadremploi.fr" + lien
                offres.append({"titre": titre, "entreprise": entreprise, "lieu": location, "contrat": "Cadre", "lien": lien, "source": "Cadremploi"})
                print(f"   OK  {titre} — {entreprise}")
            nav.close()
        print(f"   Total : {len(offres)} offres")
        return offres
    except Exception as e:
        print(f"   ERREUR Cadremploi : {e}")
        return []


# ============================================================
# SITE 6 — MONSTER (BeautifulSoup)
# L'URL de Monster France a changé. On utilise la bonne
# adresse avec les bons paramètres de recherche.
# ============================================================

def scrape_monster(keywords="chef de projet", location="Paris", max_results=10):
    print(f"\n[6/9] Monster — '{keywords}' — {location}")
    session = nouvelle_session()
    try:
        session.get("https://www.monster.fr", timeout=10)
        pause()
    except:
        pass

    # URL correcte de Monster France
    kw = keywords.replace(" ", "-")
    url = f"https://www.monster.fr/emploi/recherche/?q={kw}&where={location}&cy=fr&lang=fr_FR"
    try:
        reponse = session.get(url, timeout=15)
        print(f"   Reponse : {reponse.status_code} — {len(reponse.text)} chars")
        if reponse.status_code != 200:
            print(f"   BLOQUE par Monster (code {reponse.status_code})")
            return []
        soup = BeautifulSoup(reponse.text, "html.parser")
        # Monster utilise des balises section avec une classe contenant "card"
        cartes = soup.find_all("section", class_=lambda c: c and "card" in str(c).lower())
        if not cartes:
            cartes = soup.find_all("article")
        if not cartes:
            cartes = soup.find_all("div", attrs={"data-job-id": True})
        offres = []
        for carte in cartes[:max_results]:
            titre_tag = carte.find(["h2", "h3"])
            titre = titre_tag.get_text(strip=True) if titre_tag else "N/A"
            if titre == "N/A" or len(titre) < 5:
                continue
            lien_tag = carte.find("a", href=True)
            lien = lien_tag["href"] if lien_tag else "N/A"
            if lien and not lien.startswith("http"):
                lien = "https://www.monster.fr" + lien
            offres.append({"titre": titre, "entreprise": "N/A", "lieu": location, "contrat": "N/A", "lien": lien, "source": "Monster"})
            print(f"   OK  {titre}")
        print(f"   Total : {len(offres)} offres")
        pause()
        return offres
    except Exception as e:
        print(f"   ERREUR Monster : {e}")
        return []


# ============================================================
# SITE 7 — JOBTEASER (Playwright)
# JobTeaser bloque les robots classiques.
# On utilise Playwright et on filtre les éléments pour
# ne garder que les vraies offres (pas les liens de nav).
# Un titre d'offre fait au moins 10 caractères.
# ============================================================

def scrape_jobteaser(keywords="chef de projet", location="Paris", max_results=10):
    print(f"\n[7/9] JobTeaser (Playwright) — '{keywords}' — {location}")
    try:
        from playwright.sync_api import sync_playwright
        offres = []
        with sync_playwright() as p:
            nav = p.chromium.launch(headless=True)
            page = nav.new_page(user_agent=random.choice(USER_AGENTS), locale="fr-FR")
            kw = keywords.replace(" ", "%20")
            page.goto(f"https://www.jobteaser.com/fr/job-offers?search%5Bwhat%5D={kw}&search%5Bwhere%5D={location}", timeout=30000)
            try:
                # On attend qu'une liste d'offres apparaisse
                page.wait_for_selector("[class*='JobCard'], [class*='job-card'], article", timeout=8000)
            except:
                pass
            page.wait_for_timeout(3000)

            # On cherche les cartes d'offres spécifiques à JobTeaser
            cartes = page.query_selector_all("[class*='JobCard']")
            if not cartes:
                cartes = page.query_selector_all("article")
            if not cartes:
                cartes = page.query_selector_all("li[class*='job']")

            for carte in cartes[:max_results]:
                titre_tag = carte.query_selector("h2, h3, [class*='title'], [class*='Title']")
                titre = titre_tag.inner_text().strip() if titre_tag else "N/A"
                # On ignore les liens de navigation (trop courts)
                if titre == "N/A" or len(titre) < 10:
                    continue
                entreprise_tag = carte.query_selector("[class*='company'], [class*='Company'], [class*='employer']")
                entreprise = entreprise_tag.inner_text().strip() if entreprise_tag else "N/A"
                lien_tag = carte.query_selector("a")
                lien = lien_tag.get_attribute("href") if lien_tag else "N/A"
                if lien and not lien.startswith("http"):
                    lien = "https://www.jobteaser.com" + lien
                offres.append({"titre": titre, "entreprise": entreprise, "lieu": location, "contrat": "Stage/Alternance", "lien": lien, "source": "JobTeaser"})
                print(f"   OK  {titre} — {entreprise}")
            nav.close()
        print(f"   Total : {len(offres)} offres")
        return offres
    except Exception as e:
        print(f"   ERREUR JobTeaser : {e}")
        return []


# ============================================================
# SITE 8 — L'ETUDIANT (BeautifulSoup)
# L'URL jobs.letudiant.fr n'existe plus. On utilise la
# bonne URL : letudiant.fr avec le bon chemin pour les
# offres de jobs étudiants et stages.
# ============================================================

def scrape_letudiant(keywords="chef de projet", location="Paris", max_results=10):
    print(f"\n[8/9] L'Etudiant — '{keywords}' — {location}")
    session = nouvelle_session()
    try:
        session.get("https://www.letudiant.fr", timeout=10)
        pause()
    except:
        pass

    # URL corrigee — l'ancien domaine jobs.letudiant.fr n'existe plus
    kw = keywords.replace(" ", "+")
    url = f"https://www.letudiant.fr/jobstudiants.html?search={kw}&location={location}"
    try:
        reponse = session.get(url, timeout=15)
        print(f"   Reponse : {reponse.status_code} — {len(reponse.text)} chars")
        if reponse.status_code != 200:
            print(f"   BLOQUE par L'Etudiant (code {reponse.status_code})")
            return []
        soup = BeautifulSoup(reponse.text, "html.parser")
        cartes = soup.find_all("article")
        if not cartes:
            cartes = soup.find_all("div", class_=lambda c: c and "offer" in str(c).lower())
        offres = []
        for carte in cartes[:max_results]:
            titre_tag = carte.find(["h2", "h3"])
            titre = titre_tag.get_text(strip=True) if titre_tag else "N/A"
            if titre == "N/A" or len(titre) < 5:
                continue
            lien_tag = carte.find("a", href=True)
            lien = lien_tag["href"] if lien_tag else "N/A"
            if lien and not lien.startswith("http"):
                lien = "https://www.letudiant.fr" + lien
            offres.append({"titre": titre, "entreprise": "N/A", "lieu": location, "contrat": "Stage", "lien": lien, "source": "L'Etudiant"})
            print(f"   OK  {titre}")
        print(f"   Total : {len(offres)} offres")
        pause()
        return offres
    except Exception as e:
        print(f"   ERREUR L'Etudiant : {e}")
        return []


# ============================================================
# SITE 9 — WELCOME TO THE JUNGLE (Playwright)
# WTTJ utilise React — tout est chargé en JavaScript.
# On ouvre Chrome en mode invisible, on attend que les
# offres apparaissent, puis on cible les bons sélecteurs.
# WTTJ utilise des data-testid pour identifier ses éléments.
# ============================================================

def scrape_wttj(keywords="chef de projet", location="Paris", max_results=10):
    """
    Welcome to the Jungle — Playwright (best-effort).
    WTTJ charge ses offres en React/SPA avec une protection anti-bot
    qui bloque les navigateurs headless non fingerprinted.
    La fonction retourne [] silencieusement si WTTJ bloque :
    les autres sources (France Travail, Adzuna, Indeed) compensent.
    """
    print(f"\n[9/9] Welcome to the Jungle (Playwright) — '{keywords}' — {location}")
    try:
        from playwright.sync_api import sync_playwright
        offres = []
        with sync_playwright() as p:
            nav = p.chromium.launch(
                headless=True,
                args=["--no-sandbox", "--disable-blink-features=AutomationControlled"]
            )
            ctx = nav.new_context(
                user_agent=random.choice(USER_AGENTS),
                locale="fr-FR",
                viewport={"width": 1280, "height": 800},
            )
            page = ctx.new_page()
            kw = keywords.replace(" ", "+")
            page.goto(
                f"https://www.welcometothejungle.com/fr/jobs?query={kw}"
                f"&refinementList%5Boffices.country_code%5D%5B%5D=FR",
                timeout=30000
            )
            # Accepter les cookies si banner présent
            try:
                page.click('button:has-text("Tout accepter"), button:has-text("Accept all")', timeout=3000)
            except:
                pass
            page.wait_for_timeout(6000)

            # Sélecteurs WTTJ (React SPA — peut changer à chaque déploiement)
            cartes = page.query_selector_all("[data-testid='job-card']")
            if not cartes:
                cartes = page.query_selector_all("article")

            for carte in cartes[:max_results]:
                titre_tag = carte.query_selector("h4, h3, h2, [data-testid='job-title']")
                titre = titre_tag.inner_text().strip() if titre_tag else "N/A"
                if titre == "N/A" or len(titre) < 5:
                    continue
                entreprise_tag = carte.query_selector("[class*='company'], [data-testid='company-name']")
                entreprise = entreprise_tag.inner_text().strip() if entreprise_tag else "N/A"
                lien_tag = carte.query_selector("a")
                lien = lien_tag.get_attribute("href") if lien_tag else "N/A"
                if lien and not lien.startswith("http"):
                    lien = "https://www.welcometothejungle.com" + lien
                offres.append({
                    "titre": titre, "entreprise": entreprise,
                    "lieu": location, "contrat": "N/A",
                    "lien": lien, "source": "WTTJ",
                })
                print(f"   OK  {titre} — {entreprise}")
            nav.close()
        print(f"   Total : {len(offres)} offres")
        return offres
    except Exception as e:
        print(f"   ERREUR WTTJ : {e}")
        return []


# ============================================================
# AGREGATEUR PRINCIPAL
# C'est la fonction qui lance tout et rassemble les résultats.
# ============================================================

def aggregate_all(keywords="chef de projet", location="Paris"):
    print("=" * 60)
    print("  JOBSTER — Lancement de la recherche")
    print(f"  Mots-cles  : {keywords}")
    print(f"  Lieu       : {location}")
    print("=" * 60)

    toutes_les_offres = []

    # France Travail — API officielle, clés lues depuis .env
    toutes_les_offres += scrape_france_travail(keywords, "75")

    # Adzuna — API officielle, agrège plusieurs sites
    toutes_les_offres += scrape_adzuna(keywords, location)

    # Sites avec BeautifulSoup
    toutes_les_offres += scrape_hellowork(keywords, location)
    toutes_les_offres += scrape_apec(keywords, location)
    toutes_les_offres += scrape_monster(keywords, location)
    toutes_les_offres += scrape_letudiant(keywords, location)

    # Sites avec Playwright (navigateur invisible)
    toutes_les_offres += scrape_indeed(keywords, location)
    toutes_les_offres += scrape_cadremploi(keywords, location)
    toutes_les_offres += scrape_jobteaser(keywords, location)
    toutes_les_offres += scrape_wttj(keywords, location)

    print(f"\n{'=' * 60}")
    print(f"  TERMINE — {len(toutes_les_offres)} offres collectees au total")
    print("=" * 60)

    with open("offres_jobster.json", "w", encoding="utf-8") as fichier:
        json.dump(toutes_les_offres, fichier, ensure_ascii=False, indent=2)

    print("  Fichier cree : offres_jobster.json")
    print("  Ce fichier sera lu par l'agent IA de Jobster.")
    return toutes_les_offres


# ============================================================
# BOUTON ON — Lance le programme quand on tape :
# python jobster_scraper.py
# ============================================================

if __name__ == "__main__":
    aggregate_all(keywords="chef de projet", location="Paris")
