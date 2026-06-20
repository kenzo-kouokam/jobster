import React, { useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import JobCard from './JobCard';
import EventCard from './EventCard';
import './Message.css';

const BATCH = 8;

function RomeCard({ content }) {
  // Extraire le titre depuis "📚 FICHE MÉTIER — DÉVELOPPEUR WEB :\n\n..."
  const titleMatch = content.match(/📚 FICHE MÉTIER — (.+?) :/i);
  const title = titleMatch ? titleMatch[1] : 'Fiche Métier';
  // Corps = tout après la première ligne
  const body = content.replace(/^📚 FICHE MÉTIER — .+? :\n*/i, '').trim();
  return (
    <div className="rome-card">
      <div className="rome-card-header">
        <span className="rome-card-emoji">📚</span>
        <div className="rome-card-title-group">
          <span className="rome-card-label">Fiche Métier</span>
          <span className="rome-card-title">{title}</span>
        </div>
      </div>
      <div className="rome-card-body">
        <ReactMarkdown>{body}</ReactMarkdown>
      </div>
    </div>
  );
}

export default function Message({ role, content, offres, evenements, isError, isRome, analysedJob, favorites, onToggleFavorite, onAnalyzeJob, onAddToTracker, onRemoveFromTracker, savedCandidatures, onQuickAction, eventFavorites, onToggleEventFavorite, onDiscoverEvent }) {
  const [shown, setShown] = useState(BATCH);
  const [trackerState, setTrackerState] = useState(null); // null | 'adding' | 'removing' | 'error'
  const carouselRef = useRef(null);

  if (role === 'user') {
    return (
      <div className="msg-row user">
        <div className="msg-bubble user-bubble">{content}</div>
        <div className="msg-avatar user-avatar-msg">👤</div>
      </div>
    );
  }

  const scroll = (dir) => {
    carouselRef.current?.scrollBy({ left: dir * 252, behavior: 'smooth' });
  };

  const total      = offres?.length || 0;
  const visible    = offres ? offres.slice(0, shown) : [];
  const remaining  = total - shown;
  const nextBatch  = Math.min(remaining, BATCH);
  const hasMore    = remaining > 0;
  const showEnd    = !hasMore && total > BATCH; // only after user expanded at least once

  const jobKey = analysedJob ? (analysedJob.url || analysedJob.title || '') : '';
  const isJobSaved = !!(savedCandidatures?.[jobKey]);

  const handleTrackerChip = () => {
    if (trackerState || !analysedJob) return;
    if (isJobSaved) {
      setTrackerState('removing');
      Promise.resolve(onRemoveFromTracker?.(jobKey))
        .then(() => setTrackerState(null))
        .catch(() => setTrackerState(null));
    } else {
      setTrackerState('adding');
      onAddToTracker?.(analysedJob)
        .then(() => setTrackerState(null))
        .catch(() => {
          setTrackerState('error');
          setTimeout(() => setTrackerState(null), 2500);
        });
    }
  };

  const isFav = analysedJob && favorites?.some(
    f => (f.url || f.lien || f.title) === (analysedJob.url || analysedJob.title)
  );

  return (
    <div className={`msg-row assistant ${isError ? 'msg-error' : ''}`}>
      <div className="msg-avatar assistant-avatar">J</div>
      <div className="assistant-content">
        {isRome ? (
          <RomeCard content={content} />
        ) : (
          <div className="md-wrapper">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}

        {/* ── Post-analysis action chips ── */}
        {analysedJob && (
          <div className="analysis-actions">
            <button
              className={`analysis-action-btn ${isFav ? 'active-fav' : ''}`}
              onClick={() => onToggleFavorite?.(analysedJob)}
              title={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              {isFav ? '❤️' : '🤍'} Favoris
            </button>

            {analysedJob.url && analysedJob.url !== '#' && (
              <a
                className="analysis-action-link"
                href={analysedJob.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Postuler sur le site de l'offre"
              >
                🔗 Postuler
              </a>
            )}

            <button
              className="analysis-action-btn"
              onClick={() => onQuickAction?.(`match ${analysedJob.url} avec mon profil`)}
              title="Comparer avec mon profil CV"
            >
              📊 Matcher mon profil
            </button>

            <button
              className={`analysis-action-btn tracker-chip ${isJobSaved ? 'done' : ''} ${trackerState === 'error' ? 'err' : ''}`}
              onClick={handleTrackerChip}
              disabled={trackerState === 'adding' || trackerState === 'removing'}
              title={isJobSaved ? 'Retirer des candidatures' : 'Marquer comme candidature'}
            >
              {trackerState === 'adding' || trackerState === 'removing' ? '·' :
               trackerState === 'error' ? '⚠️ Erreur' :
               isJobSaved ? '✅ Retirer candidature' : '✓ Candidater'}
            </button>
          </div>
        )}

        {offres && offres.length > 0 && (
          <div className="carousel-wrapper">

            {/* ← Left arrow */}
            <button
              className="carousel-arrow carousel-arrow-left"
              onClick={() => scroll(-1)}
              aria-label="Précédent"
            >
              ‹
            </button>

            {/* Cards track */}
            <div className="job-cards-carousel" ref={carouselRef}>
              {visible.map((job, i) => {
                const jobKey = job.url || job.lien || `${job.title}-${i}`;
                const fav = favorites?.some(
                  f => (f.url || f.lien || f.title) === jobKey
                );
                const savedKey = job.url || job.lien || job.title || '';
                return (
                  <JobCard
                    key={i}
                    job={job}
                    isFavorite={!!fav}
                    onToggleFavorite={() => onToggleFavorite?.(job)}
                    onAnalyzeJob={onAnalyzeJob}
                    onAddToTracker={onAddToTracker}
                    isSaved={!!(savedCandidatures?.[savedKey])}
                    onRemoveFromTracker={onRemoveFromTracker}
                  />
                );
              })}

              {/* "More results" card */}
              {hasMore && (
                <div
                  className="job-card-more"
                  onClick={() => {
                    setShown(s => s + BATCH);
                    setTimeout(() => {
                      carouselRef.current?.scrollBy({ left: 9999, behavior: 'smooth' });
                    }, 80);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && setShown(s => s + BATCH)}
                  aria-label={`Voir ${nextBatch} offres de plus`}
                >
                  <div className="job-card-more-count">+{nextBatch}</div>
                  <div className="job-card-more-label">
                    offre{nextBatch > 1 ? 's' : ''} de plus
                  </div>
                  <div className="job-card-more-hint">Cliquer pour afficher</div>
                </div>
              )}

              {/* "End of results" card */}
              {showEnd && (
                <div className="job-card-end" aria-label="Fin des résultats">
                  <div className="job-card-end-icon">✓</div>
                  <div className="job-card-end-label">Fin des résultats</div>
                  <div className="job-card-end-hint">
                    {total} offre{total > 1 ? 's' : ''} au total
                  </div>
                </div>
              )}
            </div>

            {/* → Right arrow */}
            <button
              className="carousel-arrow carousel-arrow-right"
              onClick={() => scroll(1)}
              aria-label="Suivant"
            >
              ›
            </button>

          </div>
        )}

        {evenements && evenements.length > 0 && (
          <div className="event-cards-grid">
            {evenements.map((ev, i) => (
              <EventCard
                key={ev.id || i}
                event={ev}
                isFavorite={!!eventFavorites?.includes(ev.id)}
                onToggleFavorite={() => onToggleEventFavorite?.(ev.id)}
                onDiscover={onDiscoverEvent}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
