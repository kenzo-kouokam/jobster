import React, { useState, useEffect, useRef } from 'react';
import './DocumentsView.css';
import { API_BASE_URL } from '../config';

const API_URL = API_BASE_URL;

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function DocTypeIcon({ type }) {
  const icons = { cv: '📄', lettre: '✉️', cv_adapte: '📋', calendrier: '📅', autre: '📁' };
  return <span className="doc-type-icon">{icons[type] || '📁'}</span>;
}

function DocTypeLabel({ type }) {
  const labels = { cv: 'CV', lettre: 'Lettre de motivation', cv_adapte: 'CV adapté', calendrier: 'Rappel calendrier', autre: 'Document' };
  return <span className="doc-type-tag">{labels[type] || 'Document'}</span>;
}

// A slot shown when a category of uploaded file has nothing yet
function EmptySlot({ icon, label, hint }) {
  return (
    <div className="doc-empty-slot">
      <span className="doc-empty-slot-icon">{icon}</span>
      <div className="doc-empty-slot-info">
        <span className="doc-empty-slot-label">{label}</span>
        <span className="doc-empty-slot-hint">{hint}</span>
      </div>
    </div>
  );
}

export default function DocumentsView() {
  const [uploaded,   setUploaded]  = useState([]);
  const [generated,  setGenerated] = useState([]);
  const [loading,    setLoading]   = useState(true);
  const [error,      setError]     = useState(null);
  const [deleting,   setDeleting]  = useState(null);
  const [uploading,  setUploading] = useState(false);
  const [uploadMsg,  setUploadMsg] = useState(null); // { type: 'ok'|'err', text }
  const uploadInputRef = useRef(null);

  useEffect(() => {
    fetch(`${API_URL}/documents`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setUploaded(data.uploaded  || []);
        setGenerated(data.generated || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (filename) => {
    if (!window.confirm(`Supprimer « ${filename} » ? Cette action est irréversible.`)) return;
    setDeleting(filename);
    fetch(`${API_URL}/documents/${encodeURIComponent(filename)}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setGenerated(prev => prev.filter(f => f.name !== filename));
      })
      .catch(() => alert('Erreur lors de la suppression. Réessaie.'))
      .finally(() => setDeleting(null));
  };

  const handleUploadOther = (e) => {
    const file = e.target.files?.[0];
    if (!uploadInputRef.current) uploadInputRef.current = e.target;
    if (!file) return;
    setUploading(true);
    setUploadMsg(null);
    const formData = new FormData();
    formData.append('file', file);
    fetch(`${API_URL}/documents/upload-other`, { method: 'POST', body: formData })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        setUploaded(prev => [...prev, {
          id: data.filename,
          name: data.original || data.filename,
          type: 'autre',
          size: data.size,
          date: new Date().toISOString(),
          download: `/documents/download/${encodeURIComponent(data.filename)}`,
        }]);
        setUploadMsg({ type: 'ok', text: `"${data.original || data.filename}" importé.` });
        setTimeout(() => setUploadMsg(null), 3500);
      })
      .catch(() => {
        setUploadMsg({ type: 'err', text: 'Échec de l\'import. Réessaie.' });
        setTimeout(() => setUploadMsg(null), 3500);
      })
      .finally(() => {
        setUploading(false);
        if (e.target) e.target.value = '';
      });
  };

  const hasCv = uploaded.some(f => f.type === 'cv');

  return (
    <div className="docs-page">

      <div className="view-header">
        <h2 className="view-title">📄 Mes Documents</h2>
        {!loading && (
          <span className="view-count">
            {uploaded.length + generated.length} fichier{(uploaded.length + generated.length) > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading && (
        <div className="docs-loading">
          <span className="docs-spinner" /> Chargement…
        </div>
      )}

      {error && (
        <div className="docs-error">
          ⚠️ Impossible de charger les documents. Vérifie que le backend tourne sur{' '}
          <code>{API_BASE_URL}</code>.
        </div>
      )}

      {!loading && !error && (
        <div className="docs-body">

          {/* ── Section 1 : Fichiers importés ── */}
          <div className="docs-section">
            <h3 className="docs-section-title">Fichiers importés</h3>
            <p className="docs-section-desc">
              Tes documents personnels importés. Le CV est utilisé automatiquement par l'agent pour le matching et la rédaction de lettres.
            </p>

            <div className="docs-slots">
              {/* CV slot */}
              {hasCv ? (
                uploaded.filter(f => f.type === 'cv').map(f => (
                  <div key={f.id} className="doc-row doc-row--uploaded">
                    <DocTypeIcon type="cv" />
                    <div className="doc-row-info">
                      <span className="doc-row-name">{f.name}</span>
                      <span className="doc-row-meta">
                        <DocTypeLabel type="cv" />
                        {f.size ? <span>{formatSize(f.size)}</span> : null}
                        {f.date ? <span>Importé le {formatDate(f.date)}</span> : null}
                      </span>
                    </div>
                    <a
                      href={`${API_URL}${f.download}`}
                      className="doc-dl-btn"
                      target="_blank"
                      rel="noreferrer"
                      title="Télécharger"
                    >
                      ↓ Télécharger
                    </a>
                  </div>
                ))
              ) : (
                <EmptySlot
                  icon="📄"
                  label="Mon CV"
                  hint="Importe ton CV depuis Mon Profil → section « Mon CV »"
                />
              )}

              {/* Autres fichiers déjà uploadés */}
              {uploaded.filter(f => f.type === 'autre').map(f => (
                <div key={f.id} className="doc-row doc-row--uploaded">
                  <DocTypeIcon type="autre" />
                  <div className="doc-row-info">
                    <span className="doc-row-name">{f.name}</span>
                    <span className="doc-row-meta">
                      <DocTypeLabel type="autre" />
                      {f.size ? <span>{formatSize(f.size)}</span> : null}
                      {f.date ? <span>Importé le {formatDate(f.date)}</span> : null}
                    </span>
                  </div>
                  <a
                    href={`${API_URL}${f.download}`}
                    className="doc-dl-btn"
                    target="_blank"
                    rel="noreferrer"
                    title="Télécharger"
                  >
                    ↓ Télécharger
                  </a>
                </div>
              ))}

              {/* Zone d'upload autres documents */}
              <div className="doc-upload-zone">
                <input
                  ref={uploadInputRef}
                  type="file"
                  id="upload-other-input"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  style={{ display: 'none' }}
                  onChange={handleUploadOther}
                  disabled={uploading}
                />
                <label htmlFor="upload-other-input" className={`doc-upload-label ${uploading ? 'uploading' : ''}`}>
                  <span className="doc-upload-icon">{uploading ? '⏳' : '📎'}</span>
                  <div className="doc-upload-text">
                    <span className="doc-upload-title">
                      {uploading ? 'Import en cours…' : 'Importer un document'}
                    </span>
                    <span className="doc-upload-hint">PDF, Word, image — lettre de recommandation, diplôme, attestation…</span>
                  </div>
                  {!uploading && <span className="doc-upload-btn">Choisir un fichier</span>}
                </label>
                {uploadMsg && (
                  <div className={`doc-upload-msg doc-upload-msg--${uploadMsg.type}`}>
                    {uploadMsg.type === 'ok' ? '✓' : '⚠️'} {uploadMsg.text}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Section 2 : Documents générés par Jobster ── */}
          <div className="docs-section">
            <h3 className="docs-section-title">Documents générés par Jobster</h3>
            <p className="docs-section-desc">
              Lettres de motivation, CV adaptés et rappels générés automatiquement par l'agent lors de tes candidatures.
            </p>

            {generated.length === 0 ? (
              <div className="docs-empty-generated">
                <div className="docs-empty-icon">🤖</div>
                <p className="docs-empty-title">Aucun document généré pour l'instant</p>
                <p className="docs-empty-desc">
                  Demande à Jobster de rédiger une lettre de motivation ou d'adapter ton CV depuis le chat.
                  Les fichiers apparaîtront ici automatiquement.
                </p>
                <div className="docs-empty-tips">
                  <span className="docs-tip-chip">lettre https://[url offre]</span>
                  <span className="docs-tip-chip">adapter mon cv https://[url offre]</span>
                </div>
              </div>
            ) : (
              <div className="docs-generated-list">
                {generated.map(f => (
                  <div key={f.id} className="doc-row doc-row--generated">
                    <DocTypeIcon type={f.type} />
                    <div className="doc-row-info">
                      <span className="doc-row-name">{f.name}</span>
                      <span className="doc-row-meta">
                        <DocTypeLabel type={f.type} />
                        {f.size ? <span>{formatSize(f.size)}</span> : null}
                        {f.date ? <span>Généré le {formatDate(f.date)}</span> : null}
                      </span>
                    </div>
                    <a
                      href={`${API_URL}${f.download}`}
                      className="doc-dl-btn"
                      target="_blank"
                      rel="noreferrer"
                      title="Télécharger"
                    >
                      ↓ Télécharger
                    </a>
                    <button
                      className="doc-delete-btn"
                      onClick={() => handleDelete(f.name)}
                      disabled={deleting === f.name}
                      title="Supprimer"
                    >
                      {deleting === f.name ? '…' : '🗑️'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
