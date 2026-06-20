import React, { useState, useEffect } from 'react';
import './ProfileForm.css';
import { API_BASE_URL } from '../config';

const API_URL    = API_BASE_URL;
const API_UPLOAD = `${API_BASE_URL}/documents/upload`;

// ── Select / multi-select option lists ─────────────────────────────────────
const FAMILLE_OPTIONS   = ['Marketing', 'Tech', 'Data', 'Sales', 'Design', 'Finance', 'RH', 'Opérations', 'Juridique', 'Autre'];
const NIVEAU_OPTIONS    = ['Junior (< 2 ans)', 'Confirmé (2–5 ans)', 'Senior (5–10 ans)', 'Expert (10+ ans)', 'Direction'];
const CONTRAT_OPTIONS   = ['CDI', 'CDD', 'Alternance', 'Stage', 'Freelance', 'Intérim'];
const TAILLE_OPTIONS    = ['Startup (< 50)', 'PME (50–250)', 'ETI (250–5 000)', 'Grand groupe (5 000+)', 'Indifferent'];
const TYPE_ENT_OPTIONS  = ['Startup', 'Scale-up', 'ESN', 'Agence', 'Cabinet conseil', 'Grand groupe', 'Secteur public', 'ONG'];
const MODE_OPTIONS      = ['Présentiel', 'Hybride', 'Télétravail', 'Indifferent'];
const SAL_TYPE_OPTIONS  = ['Brut annuel', 'Net mensuel'];
const PREAVIS_OPTIONS   = ['Immédiat', '1 mois', '2 mois', '3 mois', 'À définir'];
const VOYAGES_OPTIONS   = ['Aucun', 'Occasionnel (< 25 %)', 'Régulier (25–50 %)', 'Fréquent (> 50 %)'];

const EMPTY = {
  // Section 1 — Coordonnées
  nom: '', email: '', telephone: '', linkedin: '',
  portfolio_url: '', github_url: '',
  // Section 2 — Poste cible & Positionnement
  titre_cible: '', titres_alternatifs: '', roles_adjacents: '',
  famille_metier: '', niveau_experience: '', types_contrat: [],
  // Section 3 — Préférences entreprises
  secteurs_preferes: '', secteurs_exclus: '',
  taille_entreprise: [], type_entreprise: [], valeurs_culture: '',
  // Section 4 — Compétences & Localisation
  competences: '', localisations: '',
  // Section 5 — Parcours
  experience: '', formation: '',
  // Section 6 — Certifications
  certifications: '',
  // Section 7 — Préférences & Contraintes
  mode_travail_prefere: '', salaire_min: '', salaire_max: '',
  salaire_type: 'Brut annuel', preavis: '', disponibilite: '', voyages_pro: '',
};

// ── Chip-style multi-select ─────────────────────────────────────────────────
function MultiChips({ options, value, name, onChange }) {
  const toggle = (opt) => {
    const next = value.includes(opt)
      ? value.filter(v => v !== opt)
      : [...value, opt];
    onChange(name, next);
  };
  return (
    <div className="multi-chips">
      {options.map(opt => (
        <button
          key={opt}
          type="button"
          className={`multi-chip${value.includes(opt) ? ' selected' : ''}`}
          onClick={() => toggle(opt)}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Profile completeness score (0-100) ────────────────────────────────────
function computeCompletion(form, cvInfo) {
  const checks = [
    !!form.nom?.trim(),
    !!form.titre_cible?.trim(),
    !!form.localisations?.trim(),
    form.types_contrat?.length > 0,
    !!form.niveau_experience?.trim(),
    !!cvInfo,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ProfileForm({ onToast, onProfileSaved }) {
  const [form, setForm]             = useState(EMPTY);
  const [saveState, setSaveState]   = useState('idle');
  const [loaded, setLoaded]         = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  // CV upload state
  const [cvFile, setCvFile]               = useState(null);
  const [cvUploadState, setCvUploadState] = useState(null);
  const [cvInfo, setCvInfo]               = useState(null);
  const [cvFullText, setCvFullText]       = useState('');
  const [showCvText, setShowCvText]       = useState(false);
  const [editingCvText, setEditingCvText] = useState(false);
  const [cvEditValue, setCvEditValue]     = useState('');
  const [cvTextSave, setCvTextSave]       = useState(null);
  const cvInputRef = React.useRef(null);

  // ── Load existing profile on mount ────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_URL}/profile`)
      .then(res => {
        if (res.status === 404) { setLoaded(true); return null; }
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (!data) return;
        const p   = data.profile || {};
        const toS = (v) => Array.isArray(v) ? v.join(', ') : (v || '');
        const toA = (v) => Array.isArray(v) ? v : [];
        setForm({
          nom:               p.nom            || '',
          email:             p.email          || '',
          telephone:         p.telephone      || '',
          linkedin:          p.linkedin       || '',
          portfolio_url:     p.portfolio_url  || '',
          github_url:        p.github_url     || '',
          titre_cible:       p.titre_cible    || '',
          titres_alternatifs: toS(p.titres_alternatifs),
          roles_adjacents:   toS(p.roles_adjacents),
          famille_metier:    p.famille_metier    || '',
          niveau_experience: p.niveau_experience || '',
          types_contrat:     toA(p.types_contrat),
          secteurs_preferes: toS(p.secteurs_preferes),
          secteurs_exclus:   toS(p.secteurs_exclus),
          taille_entreprise: toA(p.taille_entreprise),
          type_entreprise:   toA(p.type_entreprise),
          valeurs_culture:   toS(p.valeurs_culture),
          competences:       toS(p.competences),
          localisations:     toS(p.localisations),
          experience:        p.experience     || '',
          formation:         p.formation      || '',
          certifications:    p.certifications || '',
          mode_travail_prefere: p.mode_travail_prefere || '',
          salaire_min:  p.salaire_min  != null ? String(p.salaire_min)  : '',
          salaire_max:  p.salaire_max  != null ? String(p.salaire_max)  : '',
          salaire_type: p.salaire_type || 'Brut annuel',
          preavis:      p.preavis      || '',
          disponibilite: p.disponibilite || '',
          voyages_pro:  p.voyages_pro  || '',
        });
        if (p.cv_filename) {
          setCvInfo({ cv_filename: p.cv_filename, cv_uploaded_at: p.cv_uploaded_at || null });
          setCvFullText(p.cv_texte || '');
        }
        setHasProfile(true);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => {
    setSaveState('idle');
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleMultiSelect = (name, value) => {
    setSaveState('idle');
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const toArray = (str) =>
    str.split(/[,\n]/).map(s => s.trim()).filter(Boolean);

  const handleCvSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvFile(file);
    setCvUploadState(null);
  };

  const handleCvUpload = async () => {
    if (!cvFile) return;
    setCvUploadState('uploading');
    try {
      const fd = new FormData();
      fd.append('file', cvFile);
      const res = await fetch(API_UPLOAD, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setCvUploadState('done');
      const newCvInfo = { cv_filename: data.filename, cv_uploaded_at: new Date().toISOString() };
      setCvInfo(newCvInfo);
      setCvFile(null);
      if (cvInputRef.current) cvInputRef.current.value = '';
      setHasProfile(true);
      onToast?.('CV chargé avec succès ✓');
      // Re-fetch to get full cv_texte
      fetch(`${API_URL}/profile`)
        .then(r => r.json())
        .then(d => { if (d?.profile?.cv_texte) setCvFullText(d.profile.cv_texte); })
        .catch(() => {});
    } catch {
      setCvUploadState('error');
      setTimeout(() => setCvUploadState(null), 3500);
    }
  };

  const handleCvTextSave = async () => {
    setCvTextSave('saving');
    try {
      const res = await fetch(`${API_URL}/profile/cv-text`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cv_texte: cvEditValue }),
      });
      if (!res.ok) throw new Error();
      setCvFullText(cvEditValue);
      setEditingCvText(false);
      setCvTextSave('saved');
      setTimeout(() => setCvTextSave(null), 3000);
    } catch {
      setCvTextSave('error');
      setTimeout(() => setCvTextSave(null), 3500);
    }
  };

  const handleSave = async () => {
    setSaveState('saving');
    try {
      const payload = {
        ...form,
        localisations:      toArray(form.localisations),
        competences:        toArray(form.competences),
        titres_alternatifs: toArray(form.titres_alternatifs),
        roles_adjacents:    toArray(form.roles_adjacents),
        secteurs_preferes:  toArray(form.secteurs_preferes),
        secteurs_exclus:    toArray(form.secteurs_exclus),
        valeurs_culture:    toArray(form.valeurs_culture),
        certifications:     form.certifications,
        salaire_min: form.salaire_min ? parseInt(form.salaire_min, 10) : null,
        salaire_max: form.salaire_max ? parseInt(form.salaire_max, 10) : null,
      };
      const res = await fetch(`${API_URL}/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      setSaveState('saved');
      setHasProfile(true);
      onToast?.('Profil enregistré ✓');
      onProfileSaved?.({ ...payload });
      setTimeout(() => setSaveState('idle'), 3000);
    } catch {
      setSaveState('error');
      onToast?.('Erreur lors de la sauvegarde', 'error');
      setTimeout(() => setSaveState('idle'), 3000);
    }
  };

  const isEmpty = !form.nom.trim() && !form.titre_cible.trim() && !form.experience.trim();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="profile-page">

      {/* ── Header ── */}
      <div className="view-header">
        <h2 className="view-title">👤 Mon Profil</h2>
        {hasProfile && (
          <span className="profile-status-badge">
            <span className="profile-status-dot" />
            Profil actif — utilisé automatiquement par l'agent
          </span>
        )}
      </div>

      {/* ── Profile completeness indicator ── */}
      {loaded && (() => {
        const pct = computeCompletion(form, cvInfo);
        const color = pct >= 80 ? '#166534' : pct >= 50 ? '#92400E' : '#1D4ED8';
        const bg    = pct >= 80 ? '#F0FAF0' : pct >= 50 ? '#FFFBEB' : '#EFF6FF';
        const border= pct >= 80 ? '#86EFAC' : pct >= 50 ? '#FCD34D' : '#93C5FD';
        const hint  = pct < 100 ? [
          !form.nom?.trim()              && 'Nom',
          !form.titre_cible?.trim()       && 'Poste cible',
          !form.localisations?.trim()     && 'Localisation',
          !form.types_contrat?.length     && 'Type de contrat',
          !form.niveau_experience?.trim() && 'Expérience',
          !cvInfo                          && 'CV',
        ].filter(Boolean).slice(0, 2) : [];
        return (
          <div className="profile-completion-bar" style={{ background: bg, border: `1px solid ${border}`, color }}>
            <div className="profile-completion-left">
              <span className="profile-completion-label">Profil {pct}% complet</span>
              {hint.length > 0 && (
                <span className="profile-completion-hint">— manque : {hint.join(', ')}</span>
              )}
            </div>
            <div className="profile-completion-track">
              <div className="profile-completion-fill" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })()}

      <div className="profile-body">

        {/* ── Tip banner ── */}
        <div className="profile-tip">
          <span className="profile-tip-icon">💡</span>
          <span>
            Renseigne ton profil une seule fois. L'agent l'utilisera automatiquement
            pour le <strong>score de matching</strong> et la <strong>lettre de motivation</strong>.
          </span>
        </div>

        <div className="profile-sections">

          {/* ══ Section 1 — Coordonnées ══════════════════════════════════════ */}
          <div className="profile-section">
            <h3 className="profile-section-title">Coordonnées</h3>

            <div className="profile-row">
              <div className="profile-field">
                <label className="profile-label">Nom complet</label>
                <input className="profile-input" name="nom" value={form.nom}
                  onChange={handleChange} placeholder="Ex : Marie Dupont" />
              </div>
              <div className="profile-field">
                <label className="profile-label">Email</label>
                <input className="profile-input" type="email" name="email"
                  value={form.email} onChange={handleChange}
                  placeholder="marie.dupont@email.com" />
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-field">
                <label className="profile-label">Téléphone</label>
                <input className="profile-input" type="tel" name="telephone"
                  value={form.telephone} onChange={handleChange}
                  placeholder="+33 6 12 34 56 78" />
              </div>
              <div className="profile-field">
                <label className="profile-label">LinkedIn</label>
                <input className="profile-input" type="url" name="linkedin"
                  value={form.linkedin} onChange={handleChange}
                  placeholder="https://linkedin.com/in/marie-dupont" />
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-field">
                <label className="profile-label">Portfolio / Site personnel</label>
                <input className="profile-input" type="url" name="portfolio_url"
                  value={form.portfolio_url} onChange={handleChange}
                  placeholder="https://mon-portfolio.fr" />
              </div>
              <div className="profile-field">
                <label className="profile-label">GitHub</label>
                <input className="profile-input" type="url" name="github_url"
                  value={form.github_url} onChange={handleChange}
                  placeholder="https://github.com/username" />
              </div>
            </div>
          </div>

          {/* ══ Section 2 — Poste cible & Positionnement ═════════════════════ */}
          <div className="profile-section">
            <h3 className="profile-section-title">Poste cible & Positionnement</h3>

            <div className="profile-row">
              <div className="profile-field profile-field--wide">
                <label className="profile-label">Poste principal recherché</label>
                <input className="profile-input" name="titre_cible" value={form.titre_cible}
                  onChange={handleChange} placeholder="Ex : Chargée de Marketing Digital" />
              </div>
              <div className="profile-field">
                <label className="profile-label">
                  Titres alternatifs
                  <span className="profile-label-hint">séparés par des virgules</span>
                </label>
                <input className="profile-input" name="titres_alternatifs"
                  value={form.titres_alternatifs} onChange={handleChange}
                  placeholder="Ex : Social Media Manager, Content Manager" />
              </div>
            </div>

            <div className="profile-field">
              <label className="profile-label">
                Rôles adjacents — aussi ouvert·e à…
                <span className="profile-label-hint">séparés par des virgules</span>
              </label>
              <input className="profile-input" name="roles_adjacents"
                value={form.roles_adjacents} onChange={handleChange}
                placeholder="Ex : Community Manager, Chargé(e) de communication" />
            </div>

            <div className="profile-row">
              <div className="profile-field">
                <label className="profile-label">Famille de métier</label>
                <select className="profile-select" name="famille_metier"
                  value={form.famille_metier} onChange={handleChange}>
                  <option value="">— Sélectionner —</option>
                  {FAMILLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="profile-field">
                <label className="profile-label">Niveau d'expérience</label>
                <select className="profile-select" name="niveau_experience"
                  value={form.niveau_experience} onChange={handleChange}>
                  <option value="">— Sélectionner —</option>
                  {NIVEAU_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="profile-field">
              <label className="profile-label">Types de contrat recherchés</label>
              <MultiChips options={CONTRAT_OPTIONS} value={form.types_contrat}
                name="types_contrat" onChange={handleMultiSelect} />
            </div>

            <div className="profile-field">
              <label className="profile-label">
                Localisations souhaitées
                <span className="profile-label-hint">séparées par des virgules</span>
              </label>
              <input className="profile-input" name="localisations"
                value={form.localisations} onChange={handleChange}
                placeholder="Ex : Lille, Paris, Remote" />
            </div>
          </div>

          {/* ══ Section 3 — Préférences entreprises ══════════════════════════ */}
          <div className="profile-section">
            <h3 className="profile-section-title">Préférences entreprises</h3>

            <div className="profile-row">
              <div className="profile-field">
                <label className="profile-label">
                  Secteurs préférés
                  <span className="profile-label-hint">séparés par des virgules</span>
                </label>
                <input className="profile-input" name="secteurs_preferes"
                  value={form.secteurs_preferes} onChange={handleChange}
                  placeholder="Ex : Tech, E-commerce, Mode, Santé" />
              </div>
              <div className="profile-field">
                <label className="profile-label">
                  Secteurs exclus
                  <span className="profile-label-hint">séparés par des virgules</span>
                </label>
                <input className="profile-input" name="secteurs_exclus"
                  value={form.secteurs_exclus} onChange={handleChange}
                  placeholder="Ex : Armement, Tabac, Jeux d'argent" />
              </div>
            </div>

            <div className="profile-field">
              <label className="profile-label">Taille d'entreprise</label>
              <MultiChips options={TAILLE_OPTIONS} value={form.taille_entreprise}
                name="taille_entreprise" onChange={handleMultiSelect} />
            </div>

            <div className="profile-field">
              <label className="profile-label">Type d'entreprise</label>
              <MultiChips options={TYPE_ENT_OPTIONS} value={form.type_entreprise}
                name="type_entreprise" onChange={handleMultiSelect} />
            </div>

            <div className="profile-field">
              <label className="profile-label">
                Valeurs & culture recherchées
                <span className="profile-label-hint">séparées par des virgules</span>
              </label>
              <input className="profile-input" name="valeurs_culture"
                value={form.valeurs_culture} onChange={handleChange}
                placeholder="Ex : Innovation, Impact social, International, Work-life balance" />
            </div>
          </div>

          {/* ══ Section 4 — Compétences ════════════════════════════════════════ */}
          <div className="profile-section">
            <h3 className="profile-section-title">Compétences clés</h3>
            <div className="profile-field">
              <label className="profile-label">
                Compétences
                <span className="profile-label-hint">séparées par des virgules</span>
              </label>
              <input className="profile-input" name="competences" value={form.competences}
                onChange={handleChange}
                placeholder="Ex : SEO/SEA, Meta Ads, Notion, Canva, Analytics, Copywriting" />
            </div>
          </div>

          {/* ══ Section 5 — Parcours ══════════════════════════════════════════ */}
          <div className="profile-section">
            <h3 className="profile-section-title">Parcours</h3>

            <div className="profile-field">
              <label className="profile-label">
                Expériences professionnelles
                <span className="profile-label-hint">
                  Résumé libre — plus c'est détaillé, plus le matching est précis
                </span>
              </label>
              <textarea className="profile-textarea" name="experience"
                value={form.experience} onChange={handleChange} rows={6}
                placeholder={`Ex :\n4 ans d'expérience en Marketing Digital et Social Media.\nStage 6 mois chez Agence X — gestion des campagnes Meta Ads, rédaction de contenus.\nAlternance 2 ans chez Marque Y — community management, reporting analytics.`}
              />
            </div>

            <div className="profile-field">
              <label className="profile-label">Formation</label>
              <textarea className="profile-textarea" name="formation"
                value={form.formation} onChange={handleChange} rows={3}
                placeholder="Ex : Master Marketing & Influence — EFAP Paris (2024–2026)" />
            </div>
          </div>

          {/* ══ Section 6 — Certifications ════════════════════════════════════ */}
          <div className="profile-section">
            <h3 className="profile-section-title">Certifications & formations complémentaires</h3>
            <div className="profile-field">
              <label className="profile-label">
                Certifications, diplômes et formations additionnelles
                <span className="profile-label-hint">
                  Une par ligne ou séparées par des virgules — inclus l'organisme et l'année
                </span>
              </label>
              <textarea className="profile-textarea" name="certifications"
                value={form.certifications} onChange={handleChange} rows={4}
                placeholder={`Ex :\nMeta Certified Digital Marketing Associate (2025)\nGoogle Analytics 4 — Google (2024)\nTOEIC 935 — ETS (2023)`}
              />
            </div>
          </div>

          {/* ══ Section 7 — Préférences & Contraintes ════════════════════════ */}
          <div className="profile-section">
            <h3 className="profile-section-title">Préférences & Contraintes de travail</h3>

            <div className="profile-field">
              <label className="profile-label">Mode de travail préféré</label>
              <div className="profile-radio-group">
                {MODE_OPTIONS.map(opt => (
                  <label key={opt} className={`profile-radio-chip${form.mode_travail_prefere === opt ? ' selected' : ''}`}>
                    <input type="radio" name="mode_travail_prefere" value={opt}
                      checked={form.mode_travail_prefere === opt} onChange={handleChange}
                      className="profile-radio-hidden" />
                    {opt}
                  </label>
                ))}
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-field">
                <label className="profile-label">Salaire minimum souhaité</label>
                <div className="salary-input-wrap">
                  <input className="profile-input" type="number" name="salaire_min"
                    value={form.salaire_min} onChange={handleChange}
                    placeholder="Ex : 28000" min="0" step="500" />
                  <span className="salary-unit">€</span>
                </div>
              </div>
              <div className="profile-field">
                <label className="profile-label">Salaire maximum souhaité</label>
                <div className="salary-input-wrap">
                  <input className="profile-input" type="number" name="salaire_max"
                    value={form.salaire_max} onChange={handleChange}
                    placeholder="Ex : 35000" min="0" step="500" />
                  <span className="salary-unit">€</span>
                </div>
              </div>
              <div className="profile-field profile-field--narrow">
                <label className="profile-label">Type</label>
                <select className="profile-select" name="salaire_type"
                  value={form.salaire_type} onChange={handleChange}>
                  {SAL_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>

            <div className="profile-row">
              <div className="profile-field">
                <label className="profile-label">Préavis</label>
                <select className="profile-select" name="preavis"
                  value={form.preavis} onChange={handleChange}>
                  <option value="">— Sélectionner —</option>
                  {PREAVIS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="profile-field">
                <label className="profile-label">Disponibilité</label>
                <input className="profile-input" name="disponibilite"
                  value={form.disponibilite} onChange={handleChange}
                  placeholder="Ex : Dès maintenant, Septembre 2026" />
              </div>
              <div className="profile-field">
                <label className="profile-label">Déplacements pro</label>
                <select className="profile-select" name="voyages_pro"
                  value={form.voyages_pro} onChange={handleChange}>
                  <option value="">— Sélectionner —</option>
                  {VOYAGES_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* ══ Section 8 — Mon CV ════════════════════════════════════════════ */}
          <div className="profile-section">
            <h3 className="profile-section-title">Mon CV</h3>

            {/* Current CV status */}
            {cvInfo?.cv_filename && (
              <div className="cv-current">
                <span className="cv-current-icon">📄</span>
                <div className="cv-current-info">
                  <span className="cv-current-name">{cvInfo.cv_filename}</span>
                  {cvInfo.cv_uploaded_at && (
                    <span className="cv-current-date">
                      Importé le {new Date(cvInfo.cv_uploaded_at).toLocaleDateString('fr-FR', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </span>
                  )}
                </div>
                <span className="cv-active-badge">✓ Actif</span>
              </div>
            )}

            {/* CV text preview + edit */}
            {cvInfo?.cv_filename && (
              <div className="cv-preview-block">
                <button className="cv-preview-toggle"
                  onClick={() => { setShowCvText(v => !v); setEditingCvText(false); }}
                  type="button">
                  {showCvText ? '▲ Masquer le texte extrait' : '▼ Voir / corriger le texte extrait de ton CV'}
                </button>

                {showCvText && (
                  <div className="cv-preview-content">
                    {!cvFullText ? (
                      <p className="cv-preview-empty">
                        ⚠️ Aucun texte extrait. Le PDF est peut-être protégé ou scanné sans couche texte.
                        Réimporte un CV avec du texte sélectionnable.
                      </p>
                    ) : editingCvText ? (
                      <>
                        <textarea className="cv-edit-textarea" value={cvEditValue}
                          onChange={e => setCvEditValue(e.target.value)}
                          rows={14} spellCheck={false} />
                        <div className="cv-edit-actions">
                          <button
                            className={`cv-edit-save-btn${cvTextSave === 'saving' ? ' saving' : ''}${cvTextSave === 'error' ? ' error' : ''}`}
                            onClick={handleCvTextSave}
                            disabled={cvTextSave === 'saving'}>
                            {cvTextSave === 'saving' ? <><span className="profile-spinner" /> Sauvegarde…</> :
                             cvTextSave === 'error'  ? '⚠️ Échec — réessaie' :
                             '✓ Enregistrer les corrections'}
                          </button>
                          <button className="cv-edit-cancel-btn" type="button"
                            onClick={() => { setEditingCvText(false); setCvTextSave(null); }}>
                            Annuler
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <pre className="cv-preview-text">
                          {cvFullText.slice(0, 600)}{cvFullText.length > 600 ? '\n…' : ''}
                        </pre>
                        <div className="cv-edit-actions">
                          <button className="cv-edit-btn" type="button"
                            onClick={() => { setEditingCvText(true); setCvEditValue(cvFullText); setCvTextSave(null); }}>
                            ✏️ Corriger le texte extrait
                          </button>
                          {cvTextSave === 'saved' && (
                            <span className="cv-edit-saved-msg">✓ Corrections sauvegardées</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Upload area */}
            <div className="cv-upload-area">
              <p className="cv-upload-hint">
                {cvInfo?.cv_filename
                  ? 'Remplace ton CV en important un nouveau fichier PDF.'
                  : "Importe ton CV en PDF — l'agent l'utilisera pour le matching et la lettre de motivation."}
              </p>
              <div className="cv-upload-row">
                <label className="cv-file-label">
                  <input ref={cvInputRef} type="file" accept=".pdf"
                    className="cv-file-input" onChange={handleCvSelect} />
                  <span className="cv-file-btn">
                    📎 {cvFile ? cvFile.name : 'Choisir un fichier PDF'}
                  </span>
                </label>
                <button
                  className={`cv-upload-btn${cvUploadState === 'done' ? ' done' : ''}${cvUploadState === 'error' ? ' error' : ''}`}
                  onClick={handleCvUpload}
                  disabled={!cvFile || cvUploadState === 'uploading'}>
                  {cvUploadState === 'uploading' ? (
                    <><span className="profile-spinner" /> Import en cours…</>
                  ) : cvUploadState === 'done' ? '✓ CV importé !'
                    : cvUploadState === 'error'  ? '⚠️ Échec — réessaie'
                    : 'Importer'}
                </button>
              </div>
              {cvFile && cvUploadState === null && (
                <p className="cv-file-ready">
                  ✓ <strong>{cvFile.name}</strong> prêt à être importé ({(cvFile.size / 1024).toFixed(0)} Ko)
                </p>
              )}
            </div>
          </div>

        </div>{/* end profile-sections */}

        {/* ── Footer actions ── */}
        <div className="profile-footer">
          {saveState === 'error' && (
            <p className="profile-save-msg profile-save-msg--error">
              ⚠️ Impossible de sauvegarder. Vérifie que le backend tourne sur <code>{API_BASE_URL}</code>.
            </p>
          )}
          {saveState === 'saved' && (
            <p className="profile-save-msg profile-save-msg--ok">
              ✓ Profil sauvegardé — l'agent utilisera ces informations automatiquement.
            </p>
          )}
          <button
            className={`profile-save-btn${saveState === 'saving' ? ' saving' : ''}${isEmpty ? ' disabled' : ''}`}
            onClick={handleSave}
            disabled={saveState === 'saving' || isEmpty}>
            {saveState === 'saving'
              ? <><span className="profile-spinner" /> Sauvegarde…</>
              : saveState === 'saved' ? '✓ Sauvegardé'
              : 'Sauvegarder le profil'}
          </button>
        </div>

      </div>
    </div>
  );
}
