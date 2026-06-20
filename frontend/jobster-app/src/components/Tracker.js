import React, { useState, useEffect, useCallback, useRef } from 'react';
import './Tracker.css';
import { API_BASE_URL } from '../config';

const API = API_BASE_URL;

// ── Status metadata ─────────────────────────────────────────────────────────
const STATUSES_META = {
  saved:               { label: 'Sauvegardée',         color: '#888',    bg: '#F2F2F0' },
  applied:             { label: 'Candidature envoyée', color: '#3B63D0', bg: '#EFF3FF' },
  follow_up_due:       { label: 'Relance à faire',     color: '#B07A10', bg: '#FFF8E6' },
  follow_up_sent:      { label: 'Relance envoyée',     color: '#D97706', bg: '#FFF4E6' },
  interview_scheduled: { label: 'Entretien prévu',     color: '#7C3AED', bg: '#F4F0FF' },
  interview_done:      { label: 'Entretien passé',     color: '#4F46E5', bg: '#EEF2FF' },
  test_case:           { label: 'Test technique',      color: '#0F7070', bg: '#E6F5F5' },
  offer_received:      { label: 'Offre reçue',         color: '#256A25', bg: '#F0FAF0' },
  rejected:            { label: 'Refusée',             color: '#C0392B', bg: '#FDF0EF' },
  withdrawn:           { label: 'Retirée',             color: '#666',    bg: '#F5F5F3' },
  archived:            { label: 'Archivée',            color: '#999',    bg: '#F5F5F3' },
};
const STATUS_CODES = Object.keys(STATUSES_META);

const CONTRACT_TYPES = ['CDI', 'CDD', 'Alternance', 'Stage', 'Intérim', 'Freelance', 'Saisonnier', 'Autre'];

const REJECTION_REASONS = [
  'Profil ne correspond pas',
  'Poste pourvu en interne',
  'Trop d\'expérience requise',
  'Pas assez d\'expérience',
  'Pas de réponse',
  'Position pourvue',
  'Autre',
];

// ── Drawer field visibility per status ──────────────────────────────────────
// Each entry: array of field keys visible for that status
const DRAWER_SECTIONS = {
  saved: {
    offre:       true,
    candidature: false,
    entretien:   false,
    resultat:    false,
  },
  applied: {
    offre:       true,
    candidature: true,
    entretien:   false,
    resultat:    false,
  },
  follow_up_due: {
    offre:       true,
    candidature: true,
    entretien:   false,
    resultat:    false,
  },
  follow_up_sent: {
    offre:       true,
    candidature: true,
    entretien:   false,
    resultat:    false,
  },
  interview_scheduled: {
    offre:       true,
    candidature: true,
    entretien:   true,
    resultat:    false,
  },
  interview_done: {
    offre:       true,
    candidature: true,
    entretien:   true,
    resultat:    false,
  },
  test_case: {
    offre:       true,
    candidature: true,
    entretien:   true,
    resultat:    false,
  },
  offer_received: {
    offre:       true,
    candidature: true,
    entretien:   false,
    resultat:    'offer',
  },
  rejected: {
    offre:       true,
    candidature: false,
    entretien:   false,
    resultat:    'rejected',
  },
  withdrawn: {
    offre:       true,
    candidature: false,
    entretien:   false,
    resultat:    false,
  },
  archived: {
    offre:       true,
    candidature: false,
    entretien:   false,
    resultat:    false,
  },
};

const READONLY_STATUSES = new Set(['withdrawn', 'archived']);

// ── Helper components ────────────────────────────────────────────────────────
function StatusBadge({ code, size = 'md' }) {
  const meta = STATUSES_META[code] || { label: code, color: '#888', bg: '#F2F2F0' };
  return (
    <span
      className={`tracker-badge tracker-badge-${size}`}
      style={{ color: meta.color, background: meta.bg, borderColor: meta.color + '40' }}
    >
      {meta.label}
    </span>
  );
}

function FilterChip({ label, onRemove }) {
  return (
    <span className="tracker-chip">
      {label}
      <button className="tracker-chip-x" onClick={onRemove} aria-label="Retirer filtre">×</button>
    </span>
  );
}

function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <span className="tracker-sort-icon">⇅</span>;
  return <span className="tracker-sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

// ── Empty / loading / error states ──────────────────────────────────────────
function TrackerEmpty() {
  return (
    <div className="tracker-state-box">
      <div className="tracker-state-icon">📋</div>
      <p className="tracker-state-title">Aucune candidature enregistrée</p>
      <p className="tracker-state-sub">
        Clique sur <strong>+ Ajouter</strong> ou utilise le bouton <strong>✓ Candidater</strong> sur une offre.
      </p>
    </div>
  );
}

function TrackerNoResults({ onReset }) {
  return (
    <div className="tracker-state-box">
      <div className="tracker-state-icon">🔍</div>
      <p className="tracker-state-title">Aucun résultat</p>
      <p className="tracker-state-sub">Essaie d'autres filtres ou termes de recherche.</p>
      <button className="tracker-btn-ghost" onClick={onReset}>Réinitialiser les filtres</button>
    </div>
  );
}

// ── Detail / Create drawer ───────────────────────────────────────────────────
function Drawer({ item, mode, onClose, onSave, onDelete }) {
  const isReadonly = mode === 'edit' && READONLY_STATUSES.has(item?.status_code);
  const [form, setForm] = useState(item || { status_code: 'saved' });
  const sections = DRAWER_SECTIONS[form.status_code] || DRAWER_SECTIONS.saved;

  useEffect(() => { setForm(item || { status_code: 'saved' }); }, [item]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  const inputClass = (disabled) =>
    `drawer-input${disabled ? ' drawer-input--disabled' : ''}`;

  return (
    <div className="drawer-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer-panel">
        <div className="drawer-header">
          <h3 className="drawer-title">
            {mode === 'create' ? 'Nouvelle candidature' : form.poste || 'Candidature'}
          </h3>
          <button className="drawer-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <form className="drawer-body" onSubmit={handleSubmit}>

          {/* Status */}
          <div className="drawer-field">
            <label className="drawer-label">Statut</label>
            <select
              className="drawer-select"
              value={form.status_code || 'saved'}
              onChange={e => set('status_code', e.target.value)}
              disabled={isReadonly}
            >
              {STATUS_CODES.map(code => (
                <option key={code} value={code}>{STATUSES_META[code].label}</option>
              ))}
            </select>
          </div>

          {/* Section — Offre */}
          {sections.offre && (
            <section className="drawer-section">
              <h4 className="drawer-section-title">Offre</h4>
              <div className="drawer-row">
                <div className="drawer-field drawer-field--grow">
                  <label className="drawer-label">Poste *</label>
                  <input
                    className={inputClass(isReadonly)}
                    value={form.poste || ''}
                    onChange={e => set('poste', e.target.value)}
                    required
                    disabled={isReadonly}
                  />
                </div>
                <div className="drawer-field drawer-field--grow">
                  <label className="drawer-label">Entreprise *</label>
                  <input
                    className={inputClass(isReadonly)}
                    value={form.entreprise || ''}
                    onChange={e => set('entreprise', e.target.value)}
                    required
                    disabled={isReadonly}
                  />
                </div>
              </div>
              <div className="drawer-row">
                <div className="drawer-field drawer-field--grow">
                  <label className="drawer-label">Lieu</label>
                  <input
                    className={inputClass(isReadonly)}
                    value={form.location || ''}
                    onChange={e => set('location', e.target.value)}
                    disabled={isReadonly}
                  />
                </div>
                <div className="drawer-field">
                  <label className="drawer-label">Contrat</label>
                  <select
                    className="drawer-select"
                    value={form.contract_type || ''}
                    onChange={e => set('contract_type', e.target.value)}
                    disabled={isReadonly}
                  >
                    <option value="">—</option>
                    {CONTRACT_TYPES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="drawer-row">
                <div className="drawer-field">
                  <label className="drawer-label">Source</label>
                  <input
                    className={inputClass(isReadonly)}
                    value={form.source || ''}
                    placeholder="France Travail, LinkedIn…"
                    onChange={e => set('source', e.target.value)}
                    disabled={isReadonly}
                  />
                </div>
                <div className="drawer-field drawer-field--grow">
                  <label className="drawer-label">URL de l'offre</label>
                  <input
                    className={inputClass(isReadonly)}
                    type="url"
                    value={form.url || ''}
                    placeholder="https://…"
                    onChange={e => set('url', e.target.value)}
                    disabled={isReadonly}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Section — Candidature */}
          {sections.candidature && (
            <section className="drawer-section">
              <h4 className="drawer-section-title">Candidature</h4>
              <div className="drawer-row">
                <div className="drawer-field">
                  <label className="drawer-label">Date de candidature</label>
                  <input
                    className={inputClass(isReadonly)}
                    type="date"
                    value={form.date_candidature || ''}
                    onChange={e => set('date_candidature', e.target.value)}
                    disabled={isReadonly}
                  />
                </div>
                <div className="drawer-field">
                  <label className="drawer-label">Prochaine action</label>
                  <input
                    className={inputClass(isReadonly)}
                    type="date"
                    value={form.date_next_action || ''}
                    onChange={e => set('date_next_action', e.target.value)}
                    disabled={isReadonly}
                  />
                </div>
              </div>
              <div className="drawer-row">
                <div className="drawer-field drawer-field--grow">
                  <label className="drawer-label">Contact</label>
                  <input
                    className={inputClass(isReadonly)}
                    value={form.contact_name || ''}
                    placeholder="Nom du recruteur"
                    onChange={e => set('contact_name', e.target.value)}
                    disabled={isReadonly}
                  />
                </div>
                <div className="drawer-field drawer-field--grow">
                  <label className="drawer-label">Email contact</label>
                  <input
                    className={inputClass(isReadonly)}
                    type="email"
                    value={form.contact_email || ''}
                    onChange={e => set('contact_email', e.target.value)}
                    disabled={isReadonly}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Section — Entretien */}
          {sections.entretien && (
            <section className="drawer-section">
              <h4 className="drawer-section-title">Entretien</h4>
              <div className="drawer-row">
                <div className="drawer-field">
                  <label className="drawer-label">Date d'entretien</label>
                  <input
                    className={inputClass(isReadonly)}
                    type="date"
                    value={form.interview_date || ''}
                    onChange={e => set('interview_date', e.target.value)}
                    disabled={isReadonly}
                  />
                </div>
                <div className="drawer-field drawer-field--grow">
                  <label className="drawer-label">Interlocuteur(s)</label>
                  <input
                    className={inputClass(isReadonly)}
                    value={form.interviewer || ''}
                    placeholder="Nom, poste…"
                    onChange={e => set('interviewer', e.target.value)}
                    disabled={isReadonly}
                  />
                </div>
              </div>
            </section>
          )}

          {/* Section — Résultat */}
          {sections.resultat === 'offer' && (
            <section className="drawer-section">
              <h4 className="drawer-section-title">Offre reçue</h4>
              <div className="drawer-field">
                <label className="drawer-label">Salaire proposé</label>
                <input
                  className={inputClass(isReadonly)}
                  value={form.offer_salary || ''}
                  placeholder="Ex : 38 000 € brut / an"
                  onChange={e => set('offer_salary', e.target.value)}
                  disabled={isReadonly}
                />
              </div>
            </section>
          )}

          {sections.resultat === 'rejected' && (
            <section className="drawer-section">
              <h4 className="drawer-section-title">Résultat</h4>
              <div className="drawer-field">
                <label className="drawer-label">Motif de refus</label>
                <select
                  className="drawer-select"
                  value={form.rejection_reason || ''}
                  onChange={e => set('rejection_reason', e.target.value)}
                  disabled={isReadonly}
                >
                  <option value="">— Sélectionner —</option>
                  {REJECTION_REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
            </section>
          )}

          {/* Section — Notes (always) */}
          <section className="drawer-section">
            <h4 className="drawer-section-title">Notes</h4>
            <textarea
              className={`drawer-textarea${isReadonly ? ' drawer-input--disabled' : ''}`}
              value={form.notes || ''}
              rows={3}
              placeholder="Informations supplémentaires, impressions, points à préparer…"
              onChange={e => set('notes', e.target.value)}
              disabled={isReadonly}
            />
          </section>

          {/* Footer */}
          <div className="drawer-footer">
            {mode === 'edit' && onDelete && !isReadonly && (
              <button
                type="button"
                className="tracker-btn-danger"
                onClick={() => onDelete(form.id)}
              >
                Supprimer
              </button>
            )}
            <div className="drawer-footer-right">
              <button type="button" className="tracker-btn-ghost" onClick={onClose}>
                Annuler
              </button>
              {!isReadonly && (
                <button type="submit" className="tracker-btn-primary">
                  {mode === 'create' ? 'Ajouter' : 'Enregistrer'}
                </button>
              )}
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}

// ── Main Tracker component ───────────────────────────────────────────────────
export default function Tracker({ refreshTrigger }) {
  const [candidatures, setCandidatures] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);

  // Filters & search
  const [search, setSearch]                 = useState('');
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [filterSources, setFilterSources]   = useState([]);
  const [filterContracts, setFilterContracts] = useState([]);
  const [sortField, setSortField]           = useState('id');
  const [sortDir, setSortDir]               = useState('desc');

  // Drawer
  const [drawer, setDrawer] = useState({ open: false, mode: 'create', item: null });

  // Filter dropdowns
  const [showStatusDrop, setShowStatusDrop]     = useState(false);
  const [showSourceDrop, setShowSourceDrop]     = useState(false);
  const [showContractDrop, setShowContractDrop] = useState(false);
  const dropRef = useRef(null);

  const fetchCandidatures = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch(`${API}/candidatures`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCandidatures(data.candidatures || []);
    } catch {
      setError('Impossible de contacter le backend. Vérifie que le serveur tourne sur le port 8000.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCandidatures(); }, [fetchCandidatures, refreshTrigger]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setShowStatusDrop(false);
        setShowSourceDrop(false);
        setShowContractDrop(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Derived data ──
  const allSources   = [...new Set(candidatures.map(c => c.source).filter(Boolean))];
  const allContracts = [...new Set(candidatures.map(c => c.contract_type).filter(Boolean))];

  const filtered = candidatures
    .filter(c => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !(c.poste || '').toLowerCase().includes(q) &&
          !(c.entreprise || '').toLowerCase().includes(q) &&
          !(c.location || '').toLowerCase().includes(q)
        ) return false;
      }
      if (filterStatuses.length  && !filterStatuses.includes(c.status_code))   return false;
      if (filterSources.length   && !filterSources.includes(c.source))          return false;
      if (filterContracts.length && !filterContracts.includes(c.contract_type)) return false;
      return true;
    })
    .sort((a, b) => {
      let va = a[sortField] ?? ''; let vb = b[sortField] ?? '';
      if (sortField === 'id') { va = Number(va); vb = Number(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const hasFilters = search || filterStatuses.length || filterSources.length || filterContracts.length;

  const resetFilters = () => {
    setSearch(''); setFilterStatuses([]); setFilterSources([]); setFilterContracts([]);
  };

  // ── Sort toggle ──
  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  // ── Multi-select filter helpers ──
  const toggleFilter = (setter, arr, val) =>
    setter(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);

  // ── Drawer actions ──
  const openCreate = () => setDrawer({ open: true, mode: 'create', item: { status_code: 'saved' } });
  const openEdit   = (item) => setDrawer({ open: true, mode: 'edit', item });
  const closeDrawer = () => setDrawer(d => ({ ...d, open: false }));

  const handleSave = async (form) => {
    try {
      if (drawer.mode === 'create') {
        const res = await fetch(`${API}/candidatures`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCandidatures(prev => [data.candidature, ...prev]);
      } else {
        const res = await fetch(`${API}/candidatures/${form.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        if (!res.ok) throw new Error();
        const data = await res.json();
        setCandidatures(prev => prev.map(c => c.id === form.id ? data.candidature : c));
      }
      closeDrawer();
    } catch {
      alert('Erreur lors de l\'enregistrement.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette candidature ?')) return;
    try {
      await fetch(`${API}/candidatures/${id}`, { method: 'DELETE' });
      setCandidatures(prev => prev.filter(c => c.id !== id));
      closeDrawer();
    } catch {
      alert('Erreur lors de la suppression.');
    }
  };

  // ── Date formatting ──
  const fmtDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }); }
    catch { return d; }
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  // ── Render ──
  if (loading) return (
    <div className="tracker-wrap">
      <div className="tracker-state-box"><div className="tracker-state-icon">⏳</div><p>Chargement…</p></div>
    </div>
  );

  if (error) return (
    <div className="tracker-wrap">
      <div className="tracker-state-box">
        <div className="tracker-state-icon">⚠️</div>
        <p className="tracker-state-title">{error}</p>
        <button className="tracker-btn-primary" onClick={fetchCandidatures}>Réessayer</button>
      </div>
    </div>
  );

  return (
    <div className="tracker-wrap">

      {/* ── Page header ── */}
      <div className="tracker-header">
        <div className="tracker-header-left">
          <h2 className="tracker-title">Mes candidatures</h2>
          {candidatures.length > 0 && (
            <span className="tracker-count">{candidatures.length}</span>
          )}
        </div>
        <button className="tracker-btn-primary" onClick={openCreate}>+ Ajouter</button>
      </div>

      {/* ── Content ── */}
      {candidatures.length === 0 ? (
        <TrackerEmpty />
      ) : (
        <>
          {/* ── Controls row ── */}
          <div className="tracker-controls" ref={dropRef}>
            <div className="tracker-search-wrap">
              <span className="tracker-search-icon">🔍</span>
              <input
                className="tracker-search"
                placeholder="Rechercher poste, entreprise, lieu…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="tracker-search-clear" onClick={() => setSearch('')}>×</button>
              )}
            </div>

            {/* Filter dropdowns */}
            <div className="tracker-filter-group">
              {/* Status filter */}
              <div className="tracker-filter-wrap">
                <button
                  className={`tracker-filter-btn ${filterStatuses.length ? 'active' : ''}`}
                  onClick={() => { setShowStatusDrop(v => !v); setShowSourceDrop(false); setShowContractDrop(false); }}
                >
                  Statut {filterStatuses.length ? `(${filterStatuses.length})` : ''} ▾
                </button>
                {showStatusDrop && (
                  <div className="tracker-dropdown">
                    {STATUS_CODES.map(code => (
                      <label key={code} className="tracker-dropdown-item">
                        <input
                          type="checkbox"
                          checked={filterStatuses.includes(code)}
                          onChange={() => toggleFilter(setFilterStatuses, filterStatuses, code)}
                        />
                        <StatusBadge code={code} size="sm" />
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Source filter */}
              {allSources.length > 0 && (
                <div className="tracker-filter-wrap">
                  <button
                    className={`tracker-filter-btn ${filterSources.length ? 'active' : ''}`}
                    onClick={() => { setShowSourceDrop(v => !v); setShowStatusDrop(false); setShowContractDrop(false); }}
                  >
                    Source {filterSources.length ? `(${filterSources.length})` : ''} ▾
                  </button>
                  {showSourceDrop && (
                    <div className="tracker-dropdown">
                      {allSources.map(s => (
                        <label key={s} className="tracker-dropdown-item">
                          <input
                            type="checkbox"
                            checked={filterSources.includes(s)}
                            onChange={() => toggleFilter(setFilterSources, filterSources, s)}
                          />
                          {s}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Contract filter */}
              {allContracts.length > 0 && (
                <div className="tracker-filter-wrap">
                  <button
                    className={`tracker-filter-btn ${filterContracts.length ? 'active' : ''}`}
                    onClick={() => { setShowContractDrop(v => !v); setShowStatusDrop(false); setShowSourceDrop(false); }}
                  >
                    Contrat {filterContracts.length ? `(${filterContracts.length})` : ''} ▾
                  </button>
                  {showContractDrop && (
                    <div className="tracker-dropdown">
                      {allContracts.map(c => (
                        <label key={c} className="tracker-dropdown-item">
                          <input
                            type="checkbox"
                            checked={filterContracts.includes(c)}
                            onChange={() => toggleFilter(setFilterContracts, filterContracts, c)}
                          />
                          {c}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className="tracker-chips">
              {filterStatuses.map(code => (
                <FilterChip
                  key={code}
                  label={STATUSES_META[code]?.label || code}
                  onRemove={() => setFilterStatuses(prev => prev.filter(x => x !== code))}
                />
              ))}
              {filterSources.map(s => (
                <FilterChip key={s} label={s} onRemove={() => setFilterSources(prev => prev.filter(x => x !== s))} />
              ))}
              {filterContracts.map(c => (
                <FilterChip key={c} label={c} onRemove={() => setFilterContracts(prev => prev.filter(x => x !== c))} />
              ))}
              {search && (
                <FilterChip label={`"${search}"`} onRemove={() => setSearch('')} />
              )}
              <button className="tracker-chip-reset" onClick={resetFilters}>Tout effacer</button>
            </div>
          )}

          {/* Table or no-results */}
          {filtered.length === 0 ? (
            <TrackerNoResults onReset={resetFilters} />
          ) : (
            <div className="tracker-table-wrap">
              <table className="tracker-table">
                <thead>
                  <tr>
                    <th className="col-id" onClick={() => handleSort('id')}>
                      # <SortIcon field="id" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="col-poste" onClick={() => handleSort('poste')}>
                      Poste <SortIcon field="poste" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="col-ent" onClick={() => handleSort('entreprise')}>
                      Entreprise <SortIcon field="entreprise" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="col-loc">Lieu</th>
                    <th className="col-contrat">Contrat</th>
                    <th className="col-source">Source</th>
                    <th className="col-statut" onClick={() => handleSort('status_code')}>
                      Statut <SortIcon field="status_code" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="col-date" onClick={() => handleSort('date_candidature')}>
                      Candidature <SortIcon field="date_candidature" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="col-date col-action" onClick={() => handleSort('date_next_action')}>
                      Prochaine action <SortIcon field="date_next_action" sortField={sortField} sortDir={sortDir} />
                    </th>
                    <th className="col-date" onClick={() => handleSort('date_updated')}>
                      Mis à jour <SortIcon field="date_updated" sortField={sortField} sortDir={sortDir} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr
                      key={c.id}
                      className="tracker-row"
                      onClick={() => openEdit(c)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && openEdit(c)}
                    >
                      <td className="col-id">{c.id}</td>
                      <td className="col-poste">
                        <span
                          className="tracker-poste-text"
                          onClick={e => { if (c.url) { e.stopPropagation(); window.open(c.url, '_blank', 'noreferrer'); } }}
                          title={c.url ? 'Ouvrir l\'offre' : undefined}
                          style={{ cursor: c.url ? 'pointer' : 'default' }}
                        >
                          {c.poste}
                          {c.url && <span className="tracker-ext-icon"> ↗</span>}
                        </span>
                      </td>
                      <td className="col-ent">{c.entreprise}</td>
                      <td className="col-loc">{c.location || '—'}</td>
                      <td className="col-contrat">{c.contract_type || '—'}</td>
                      <td className="col-source">{c.source || '—'}</td>
                      <td className="col-statut">
                        <StatusBadge code={c.status_code || 'saved'} />
                      </td>
                      <td className="col-date">{fmtDate(c.date_candidature)}</td>
                      <td className={`col-date ${isOverdue(c.date_next_action) && c.date_next_action ? 'col-overdue' : ''}`}>
                        {fmtDate(c.date_next_action)}
                      </td>
                      <td className="col-date">{fmtDate(c.date_updated || c.date_ajout)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ── Drawer ── */}
      {drawer.open && (
        <Drawer
          item={drawer.item}
          mode={drawer.mode}
          onClose={closeDrawer}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
