import React, { useState } from 'react';
import './JobCard.css';

/**
 * Returns { duration, time, colorKey } for a contract string.
 *
 * duration — contract type (CDI / CDD / Alternance / Stage / Intérim …)
 * time     — work rhythm (Temps plein / Temps partiel)
 * colorKey — CSS class suffix for the duration tag and logo
 *
 * Handles both France Travail codes (CDI, CDD, MIS, ALT, SAI, CCE, LIB)
 * and Adzuna English values (full_time, part_time, permanent, contract).
 */
function parseContractLabels(contract) {
  const raw = (contract || '').toLowerCase().trim();

  // ── Time dimension ────────────────────────────────────────
  let time = '';
  if (raw.includes('full_time') || raw.includes('full time') || raw.includes('temps plein'))
    time = 'Temps plein';
  else if (raw.includes('part_time') || raw.includes('part time') || raw.includes('temps partiel'))
    time = 'Temps partiel';

  // ── Duration dimension ────────────────────────────────────
  let duration = '';
  let colorKey = 'default';

  if (raw.includes('cdi') || raw === 'permanent') {
    duration = 'CDI'; colorKey = 'green';
  } else if (raw.includes('cdd')) {
    duration = 'CDD'; colorKey = 'orange';
  } else if (raw.includes('alternance') || raw.includes('apprentissage') || raw === 'alt') {
    duration = 'Alternance'; colorKey = 'blue';
  } else if (raw.includes('stage') || raw === 'internship') {
    duration = 'Stage'; colorKey = 'purple';
  } else if (raw.includes('intérim') || raw.includes('interim') || raw === 'mis') {
    duration = 'Intérim'; colorKey = 'gray';
  } else if (raw === 'lib' || raw.includes('freelance') || raw.includes('libéral')) {
    duration = 'Freelance'; colorKey = 'teal';
  } else if (raw === 'sai' || raw.includes('saisonnier')) {
    duration = 'Saisonnier'; colorKey = 'gray';
  } else if (raw === 'contract' || raw.includes('contrat')) {
    duration = 'Contrat'; colorKey = 'orange';
  } else if (raw) {
    duration = contract.toUpperCase(); colorKey = 'default';
  }

  return { duration, time, colorKey };
}

export default function JobCard({ job, isFavorite, onToggleFavorite, onAnalyzeJob, onAddToTracker, onRemoveFromTracker, isSaved }) {
  const title    = job.title    || job.intitule    || 'Poste';
  const company  = job.company  || job.entreprise?.nom || job.employeur || 'Entreprise';
  const location = job.location || job.lieuTravail?.libelle || job.lieu || '';
  const contract = job.contract || job.typeContrat  || job.contrat || '';
  const salary   = job.salary   || job.salaire?.libelle || '';
  const url      = job.url      || job.lien || job.origineOffre?.urlOrigine || '#';
  const source   = job.source   || 'France Travail';
  const hasUrl   = url && url !== '#';
  const jobKey   = url !== '#' ? url : title;

  const [btnState, setBtnState] = useState(null); // null | 'adding' | 'removing' | 'error'

  const handleTrackerToggle = (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (btnState) return;
    if (isSaved) {
      setBtnState('removing');
      Promise.resolve(onRemoveFromTracker?.(jobKey))
        .then(() => setBtnState(null))
        .catch(() => setBtnState(null));
    } else {
      setBtnState('adding');
      onAddToTracker?.({ title, company, location, contract, source, url })
        .then(() => setBtnState(null))
        .catch(() => {
          setBtnState('error');
          setTimeout(() => setBtnState(null), 2500);
        });
    }
  };

  const { duration, time, colorKey } = parseContractLabels(contract);

  // Full job object passed to the analysis handler so the response
  // can be tagged with job metadata for the action chips in Message.js
  const jobObject = { title, company, location, contract, salary, url, source };

  return (
    <div className="job-card">

      {/* ── Top-right: save icon + heart, stacked horizontally ── */}
      <div className="job-top-actions">
        {onAddToTracker && (
          <button
            className={`job-save-btn ${isSaved ? 'saved' : 'unsaved'} ${btnState === 'error' ? 'err' : ''}`}
            onClick={handleTrackerToggle}
            disabled={btnState === 'adding' || btnState === 'removing'}
            title={isSaved ? 'Retirer des candidatures' : 'Sauvegarder dans Mes candidatures'}
            aria-label={isSaved ? 'Retirer des candidatures' : 'Ajouter aux candidatures'}
          >
            {btnState === 'adding' || btnState === 'removing' ? '·' :
             btnState === 'error' ? '⚠️' :
             isSaved ? '✅' : '🔖'}
          </button>
        )}
        <button
          className={`job-fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={e => { e.stopPropagation(); e.preventDefault(); onToggleFavorite?.(); }}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* ── Logo ── */}
      <div className={`job-logo logo-${colorKey}`}>
        {company.charAt(0).toUpperCase()}
      </div>

      {/* ── Title + company ── */}
      <div className="job-card-body">
        {hasUrl ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="job-title-link">
            <h3 className="job-title">{title} ↗</h3>
          </a>
        ) : (
          <h3 className="job-title">{title}</h3>
        )}
        <p className="job-company">{company}</p>
      </div>

      {/* ── Tags ── */}
      <div className="job-tags">
        {location  && <span className="tag tag-loc">📍 {location}</span>}
        {duration  && <span className={`tag tag-${colorKey}`}>{duration}</span>}
        {time      && <span className="tag tag-time">{time}</span>}
        {salary    && <span className="tag tag-salary">💶 {salary}</span>}
        <span className="tag tag-source">{source}</span>
      </div>

      {/* ── Single action button — Voir les détails ── */}
      {hasUrl && onAnalyzeJob && (
        <div className="job-actions">
          <button
            className="job-analyse-btn"
            onClick={e => { e.stopPropagation(); e.preventDefault(); onAnalyzeJob(jobObject); }}
            title="Voir les détails de l'offre"
          >
            🔍 Voir les détails
          </button>
        </div>
      )}

    </div>
  );
}
