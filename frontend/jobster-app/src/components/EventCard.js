import React, { useState } from 'react';
import './EventCard.css';

function formatDate(dateStr) {
  if (!dateStr) return '';
  // Expected format: "2026-06-10" or "10-06-2026" or "10/06/2026"
  try {
    const parts = dateStr.includes('-') ? dateStr.split('-') : dateStr.split('/');
    if (parts.length === 3) {
      // Detect YYYY-MM-DD vs DD-MM-YYYY
      const isISO = parts[0].length === 4;
      const [y, m, d] = isISO
        ? [parts[0], parts[1], parts[2]]
        : [parts[2], parts[1], parts[0]];
      const months = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'];
      return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
    }
  } catch (_) {}
  return dateStr;
}

function typeColor(type) {
  const t = (type || '').toLowerCase();
  if (t.includes('job dating'))    return 'tag-green';
  if (t.includes('forum'))         return 'tag-blue';
  if (t.includes('atelier'))       return 'tag-orange';
  if (t.includes('salon'))         return 'tag-purple';
  if (t.includes('portes'))        return 'tag-teal';
  return 'tag-default';
}

export default function EventCard({ event, isFavorite, onToggleFavorite, onDiscover }) {
  const [discovered, setDiscovered] = useState(false);

  const titre      = event.titre    || 'Événement';
  const date       = formatDate(event.date);
  const heureDebut = event.heureDebut || '';
  const heureFin   = event.heureFin   || '';
  const timeRange  = heureDebut ? `${heureDebut}${heureFin ? `–${heureFin}` : ''}` : '';
  const ville      = event.enLigne ? '🌐 En ligne' : (event.ville ? `📍 ${event.ville}` : '');
  const type       = event.type || '';
  const nbPlaces   = event.nbPlaces;
  const preinscrip = event.preinscription;

  const handleDiscover = (e) => {
    e.stopPropagation();
    if (discovered) return;
    setDiscovered(true);
    onDiscover?.(event);
  };

  return (
    <div className="event-card">
      {/* ── Top: date + time + fav ── */}
      <div className="event-card-top">
        <div className="event-date-block">
          {date && <span className="event-date">{date}</span>}
          {timeRange && <span className="event-time">{timeRange}</span>}
        </div>
        <button
          className={`event-fav-btn ${isFavorite ? 'active' : ''}`}
          onClick={e => { e.stopPropagation(); onToggleFavorite?.(); }}
          title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isFavorite ? '❤️' : '🤍'}
        </button>
      </div>

      {/* ── Title ── */}
      <h3 className="event-title">{titre}</h3>

      {/* ── Tags ── */}
      <div className="event-tags">
        {type     && <span className={`event-tag ${typeColor(type)}`}>{type}</span>}
        {nbPlaces && <span className="event-tag tag-places">🪑 {nbPlaces} places</span>}
        {preinscrip && <span className="event-tag tag-preinscription">📋 Préinscription</span>}
      </div>

      {/* ── Location ── */}
      {ville && <p className="event-location">{ville}</p>}

      {/* ── CTA ── */}
      <div className="event-actions">
        <button
          className={`event-discover-btn ${discovered ? 'discovered' : ''}`}
          onClick={handleDiscover}
          disabled={discovered}
        >
          {discovered ? '✓ Envoyé dans le chat' : 'Je découvre →'}
        </button>
      </div>
    </div>
  );
}
