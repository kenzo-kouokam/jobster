import React, { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import Message from './Message';
import './Chat.css';
import { API_BASE_URL } from '../config';

const EMOJI_OPTIONS = [
  '📁','📂','⭐','🎯','🚀','💼','🎓','📈','📊','💡',
  '🔑','🏆','🌟','🏢','💻','🎨','📝','🔧','⚡','🌱',
  '🤝','💰','🔍','📌','⚙️','🎭','🌍','🏋️','🎵','✨',
];

const SUGGESTIONS = [
  { icon: '🔍', label: 'chef de projet Paris CDI', desc: 'Chercher un emploi' },
  { icon: '🎓', label: 'développeur web alternance Lyon', desc: 'Stage & alternance' },
  { icon: '📊', label: 'rapport entreprise Capgemini', desc: 'Analyser une entreprise' },
  { icon: '✅', label: 'tracker voir', desc: 'Mes candidatures' },
];

// Quick chips shown under the input once the conversation has started
const QUICK_CHIPS = [
  { icon: '🔍', label: 'Chercher des offres',   text: 'chercher des offres ' },
  { icon: '🔎', label: 'Analyser une offre',    text: 'analyse cette offre ' },
  { icon: '📊', label: 'Score de matching',     text: 'match ' },
  { icon: '📝', label: 'Lettre de motivation',  text: 'lettre de motivation ' },
];

const API_URL = `${API_BASE_URL}/chat`;

export default function Chat({
  chatId, initialMessages, onFirstMessage, onMessagesChange, onNewChat,
  projects, currentProjectId, onAssignToProject, onCreateAndAssign,
  favorites, onToggleFavorite, onAddToTracker, onRemoveFromTracker, savedCandidatures,
  // Event favorites
  eventFavorites, onToggleEventFavorite,
  // Chat header metadata
  chatTitle, chatDate, chatLastUpdated, onRenameChat,
}) {
  const [messages, setMessages] = useState(initialMessages || []);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingLabel, setLoadingLabel] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjEmoji, setNewProjEmoji] = useState('📁');
  const [showModalEmoji, setShowModalEmoji] = useState(false);
  // Inline title rename state
  const [renamingTitle, setRenamingTitle] = useState(false);
  const [titleValue, setTitleValue]       = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const isFirst = useRef(initialMessages?.length === 0);
  const textareaRef = useRef(null);
  const modalRef = useRef(null);
  const titleInputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [chatId]);

  // Close modal on outside click
  useEffect(() => {
    if (!showProjectModal) return;
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShowProjectModal(false);
        setShowModalEmoji(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProjectModal]);

  const handleInput = (e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const getLoadingLabel = (msg) => {
    const d = msg.toLowerCase();
    const hasUrl = /https?:\/\//.test(msg);
    if (hasUrl && (d.includes('lettre') || d.includes('motivation')))
      return { icon: '✉️', text: 'Rédaction de la lettre de motivation...' };
    if (hasUrl && (d.includes('match') || d.includes('score') || d.includes('compatible')))
      return { icon: '📊', text: 'Calcul du score de compatibilité...' };
    if (hasUrl && (d.includes('cv') || d.includes('adapter') || d.includes('adapte')))
      return { icon: '📄', text: 'Adaptation du CV en cours...' };
    if (hasUrl || d.includes('analyse') || d.includes('décrypte'))
      return { icon: '🔍', text: "Analyse de l'offre en cours..." };
    if (d.includes('rapport entreprise') || d.includes('infos entreprise') || d.includes('analyse entreprise'))
      return { icon: '🏢', text: "Analyse de l'entreprise en cours..." };
    if (d.includes('lettre') || d.includes('motivation') || d.includes('mail candidature'))
      return { icon: '✉️', text: 'Rédaction en cours...' };
    if (d.includes('tracker') || d.includes('candidature'))
      return { icon: '📋', text: 'Consultation du tracker...' };
    const searchWords = ['cherche', 'trouve', 'offre', 'emploi', 'poste', 'job',
      'cdi', 'cdd', 'stage', 'alternance', 'intérim', 'freelance',
      'développeur', 'ingénieur', 'manager', 'commercial', 'consultant', 'technicien'];
    if (searchWords.some(w => d.includes(w)))
      return { icon: '🔎', text: 'Recherche en cours · France Travail · Adzuna · Indeed' };
    return null;
  };

  const sendMessage = useCallback(async (text, attachToResponse = {}) => {
    const msg = text.trim();
    if (!msg || loading) return;

    if (isFirst.current) {
      onFirstMessage?.(msg);
      isFirst.current = false;
    }

    const newMessages = [...messages, { role: 'user', content: msg }];
    setMessages(newMessages);
    onMessagesChange?.(newMessages);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);
    setLoadingLabel(getLoadingLabel(msg));

    try {
      // Send prior turns so Ollama can maintain context across a conversation.
      // We cap at 6 messages (3 back-and-forth) × 800 chars each to stay inside
      // qwen3:1.7b's context window after the enriched system prompt is included.
      // We use `messages` (state before this send) — the current `msg` goes in
      // the dedicated `message` field so the backend can route it through tools
      // without conflict.
      const historyForBackend = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .slice(-6)
        .map(m => ({ role: m.role, content: (m.content || '').slice(0, 800) }));

      const { data } = await axios.post(API_URL, { message: msg, history: historyForBackend });
      const withReply = [...newMessages, {
        role: 'assistant',
        content: data.response,
        offres: data.offres || null,
        evenements: data.evenements || null,
        isRome: data.rome === true,
        ...attachToResponse,
      }];
      setMessages(withReply);
      onMessagesChange?.(withReply);
    } catch (err) {
      const errMsg = err.message || 'Erreur de connexion';
      const withErr = [...newMessages, {
        role: 'assistant',
        content: `**Impossible de contacter le backend.**\n\nVérifie que le serveur tourne sur \`${API_BASE_URL}\`.\n\nErreur : ${errMsg}`,
        isError: true,
      }];
      setMessages(withErr);
      onMessagesChange?.(withErr);
    } finally {
      setLoading(false);
      setLoadingLabel(null);
    }
  }, [loading, messages, onFirstMessage, onMessagesChange]);

  const handleAnalyzeJob = useCallback((job) => {
    const url = typeof job === 'string' ? job : job.url;
    const meta = typeof job === 'object' && job !== null ? { analysedJob: job } : {};
    sendMessage(`analyse cette offre ${url}`, meta);
  }, [sendMessage]);

  const handleQuickAction = useCallback((text) => {
    sendMessage(text);
  }, [sendMessage]);

  // ── Discover event — inject formatted event details directly into the chat ──
  const handleDiscoverEvent = useCallback(async (event) => {
    const loadingMsg = { role: 'assistant', content: `⏳ Récupération des détails pour **${event.titre || 'cet évènement'}**…` };
    const withLoading = [...messages, loadingMsg];
    setMessages(withLoading);
    onMessagesChange?.(withLoading);

    // Try backend enrichment (needs api_evenementsemploi_v1 scope — silently skips if unavailable)
    let enriched = { ...event };
    try {
      const res = await fetch(`${API_BASE_URL}/evenements/${encodeURIComponent(event.id)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.event) enriched = { ...enriched, ...data.event };
      }
    } catch (_) { /* use card data as fallback */ }

    // Build France Travail website URL from id + title slug — always works
    const buildFtUrl = (ev) => {
      if (!ev.id) return null;
      const slug = (ev.titre || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80);
      return `https://mesevenementsemploi.francetravail.fr/mes-evenements-emploi/evenement/${ev.id}/${slug}`;
    };

    const date = enriched.date || '';
    const timeStr = enriched.heureDebut
      ? ` à ${enriched.heureDebut}${enriched.heureFin ? `–${enriched.heureFin}` : ''}`
      : '';
    const adresseComplete = (enriched.estEnLigne || enriched.enLigne)
      ? '🌐 En ligne'
      : [enriched.adresse, enriched.codePostal, enriched.ville].filter(Boolean).join(', ') || 'Non précisé';

    // Places: prefer restantes if available, fallback to total
    const placesStr = (() => {
      if (enriched.nbPlacesRestantes != null) {
        return `${enriched.nbPlacesRestantes} place${enriched.nbPlacesRestantes !== 1 ? 's' : ''} restante${enriched.nbPlacesRestantes !== 1 ? 's' : ''}`;
      }
      if (enriched.nbPlaces != null) {
        return `${enriched.nbPlaces} place${enriched.nbPlaces !== 1 ? 's' : ''}`;
      }
      return null;
    })();

    const listItems = [
      `- 📅 **Date :** ${date}${timeStr}`,
      `- 📍 **Lieu :** ${adresseComplete}`,
      `- 🎪 **Type :** ${enriched.type || 'Évènement emploi'}`,
      placesStr                         ? `- 🪑 **Places :** ${placesStr}` : null,
      enriched.preinscription           ? `- 📋 **Préinscription requise**` : null,
      enriched.secteur                  ? `- 🏭 **Secteur :** ${enriched.secteur}` : null,
      enriched.publicCible              ? `- 👥 **Public :** ${enriched.publicCible}` : null,
      enriched.objectifs                ? `- 🎯 **Objectifs :** ${enriched.objectifs}` : null,
      enriched.organisateur             ? `- 🏢 **Organisateur :** ${enriched.organisateur}` : null,
      enriched.emailOrganisateur        ? `- ✉️ **Contact :** ${enriched.emailOrganisateur}` : null,
    ].filter(Boolean).join('\n');

    const parts = [
      `📋 **Détails de l'évènement**\n\n**${enriched.titre || 'Évènement'}**`,
      listItems,
    ];

    if (enriched.description && enriched.description.trim()) {
      parts.push(`📝 **Description**\n\n${enriched.description.trim()}`);
    }

    if (enriched.deroulement && enriched.deroulement.trim()) {
      parts.push(`📌 **Déroulement**\n\n${enriched.deroulement.trim()}`);
    }

    // Link: inscription/online link if available, otherwise no link at all (we already have all the info)
    const inscriptionLien = enriched.lien && enriched.lien.trim() ? enriched.lien.trim() : null;
    if (inscriptionLien) {
      parts.push(`[🔗 S'inscrire à cet évènement](${inscriptionLien})`);
    } else if (!enriched.description && !enriched.deroulement) {
      // Only show FT link if we got nothing useful back
      const ftUrl = buildFtUrl(enriched);
      if (ftUrl) parts.push(`[🌐 Voir la fiche complète sur France Travail](${ftUrl})`);
    }

    const detailMsg = parts.join('\n\n');
    const final = [...messages, { role: 'assistant', content: detailMsg }];
    setMessages(final);
    onMessagesChange?.(final);
  }, [messages, onMessagesChange]);

  const handleAddToTracker = useCallback((job) => {
    return fetch(`${API_BASE_URL}/candidatures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poste:         job.title,
        entreprise:    job.company,
        location:      job.location || '',
        contract_type: job.contract || '',
        source:        job.source   || '',
        url:           job.url      || '',
        status_code:   'saved',
      }),
    }).then(res => {
      if (!res.ok) throw new Error();
      return res.json();
    }).then(data => {
      onAddToTracker?.(job, data?.candidature?.id ?? null); // pass job + DB id back to App
    });
  }, [onAddToTracker]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleAssign = (pid) => {
    onAssignToProject?.(pid);
    setShowProjectModal(false);
  };

  const handleCreateAndAssign = () => {
    if (!newProjName.trim()) return;
    onCreateAndAssign?.(newProjName, newProjEmoji);
    setNewProjName('');
    setNewProjEmoji('📁');
    setShowModalEmoji(false);
    setShowProjectModal(false);
  };

  const assignedProject = projects?.find(p => p.id === currentProjectId);

  const startTitleRename = () => {
    setTitleValue(chatTitle || 'Nouvelle recherche');
    setRenamingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 30);
  };

  const commitTitleRename = () => {
    const trimmed = titleValue.trim();
    if (trimmed && trimmed !== chatTitle) onRenameChat?.(trimmed);
    setRenamingTitle(false);
  };

  // Format date meta string shown in header
  const headerMeta = (() => {
    if (!chatDate) return null;
    if (chatLastUpdated && chatLastUpdated !== chatDate) {
      return `${chatDate} · mis à jour ${chatLastUpdated}`;
    }
    return chatDate;
  })();

  return (
    <div className="chat">
      <div className="chat-header">
        {/* ── Left: title + project badge ── */}
        <div className="chat-header-title-area">
          {renamingTitle ? (
            <input
              ref={titleInputRef}
              className="chat-title-input"
              value={titleValue}
              onChange={e => setTitleValue(e.target.value)}
              onBlur={commitTitleRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitTitleRename();
                if (e.key === 'Escape') setRenamingTitle(false);
              }}
              maxLength={60}
            />
          ) : (
            <span
              className="chat-title-text"
              title="Double-clic pour renommer"
              onDoubleClick={startTitleRename}
            >
              {chatTitle || 'Nouvelle recherche'}
            </span>
          )}
          {assignedProject && (
            <span className="header-project-badge" style={{ background: assignedProject.color + '18', color: assignedProject.color }}>
              {assignedProject.icon} {assignedProject.name}
            </span>
          )}
        </div>
        {/* ── Right: date meta + ⋯ button ── */}
        <div className="header-actions">
          {headerMeta && (
            <span className="chat-header-meta">{headerMeta}</span>
          )}
          <button
            className={`header-menu-btn ${showProjectModal ? 'active' : ''}`}
            onClick={() => setShowProjectModal(v => !v)}
            title="Ajouter au projet"
          >
            ⋯
          </button>
        </div>
      </div>

      {/* ── Project modal ── */}
      {showProjectModal && (
        <div className="proj-modal-overlay">
          <div className="proj-modal" ref={modalRef}>
            <div className="proj-modal-header">
              <span className="proj-modal-title">Ajouter au projet</span>
              <button className="proj-modal-close" onClick={() => setShowProjectModal(false)}>✕</button>
            </div>

            {assignedProject && (
              <div className="proj-modal-current">
                <span className="proj-modal-current-label">
                  Dans : <b>{assignedProject.icon} {assignedProject.name}</b>
                </span>
                <button className="proj-modal-remove" onClick={() => handleAssign(null)}>
                  Retirer
                </button>
              </div>
            )}

            <div className="proj-modal-list">
              {(projects || []).length === 0 && (
                <p className="proj-modal-empty">Aucun projet existant.</p>
              )}
              {(projects || []).map(p => (
                <button
                  key={p.id}
                  className={`proj-modal-item ${p.id === currentProjectId ? 'selected' : ''}`}
                  onClick={() => handleAssign(p.id)}
                >
                  <span className="proj-modal-item-icon" style={{ background: p.color + '20', color: p.color }}>{p.icon}</span>
                  <span className="proj-modal-item-name">{p.name}</span>
                  {p.id === currentProjectId && <span className="proj-modal-check">✓</span>}
                </button>
              ))}
            </div>

            <div className="proj-modal-divider" />

            <div className="proj-modal-new">
              <p className="proj-modal-new-label">Nouveau projet</p>
              <div className="proj-modal-new-inner">
                <div className="emoji-select-wrap modal-emoji-wrap">
                  <button
                    className="emoji-select-btn"
                    onClick={() => setShowModalEmoji(v => !v)}
                    title="Choisir un emoji"
                  >
                    {newProjEmoji}
                  </button>
                  {showModalEmoji && (
                    <div className="emoji-picker-dropdown">
                      {EMOJI_OPTIONS.map(e => (
                        <button key={e} className="emoji-option" onClick={() => { setNewProjEmoji(e); setShowModalEmoji(false); }}>
                          {e}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  className="proj-modal-input"
                  placeholder="Nom du projet..."
                  value={newProjName}
                  onChange={e => setNewProjName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleCreateAndAssign(); }}
                  autoFocus={!assignedProject}
                />
                <button
                  className={`proj-modal-create-btn ${newProjName.trim() ? 'active' : ''}`}
                  disabled={!newProjName.trim()}
                  onClick={handleCreateAndAssign}
                >
                  Créer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="chat-body">
        {messages.length === 0 ? (
          <div className="welcome">
            <p className="welcome-greeting">Bonjour 👋</p>
            <h2 className="welcome-title">Que cherches-tu aujourd'hui ?</h2>
            <p className="welcome-sub">
              Emploi, stage, alternance · Tape ta demande ou clique sur une suggestion.
            </p>
            <div className="suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} className="suggestion-card" onClick={() => sendMessage(s.label)}>
                  <span className="suggestion-icon">{s.icon}</span>
                  <div>
                    <p className="suggestion-label">{s.label}</p>
                    <p className="suggestion-desc">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="messages">
            {messages.map((msg, i) => (
              <Message
                key={i}
                role={msg.role}
                content={msg.content}
                offres={msg.offres}
                evenements={msg.evenements}
                isError={msg.isError}
                isRome={msg.isRome}
                analysedJob={msg.analysedJob}
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
                onAnalyzeJob={handleAnalyzeJob}
                onAddToTracker={handleAddToTracker}
                onRemoveFromTracker={onRemoveFromTracker}
                savedCandidatures={savedCandidatures}
                onQuickAction={handleQuickAction}
                eventFavorites={eventFavorites}
                onToggleEventFavorite={onToggleEventFavorite}
                onDiscoverEvent={handleDiscoverEvent}
              />
            ))}
            {loading && (
              <div className="msg-row assistant">
                <div className="msg-avatar assistant-avatar">J</div>
                {loadingLabel ? (
                  <div className="typing-bubble typing-bubble--labeled">
                    <span className="typing-label-icon">{loadingLabel.icon}</span>
                    <span className="typing-label-text">{loadingLabel.text}</span>
                    <span /><span /><span />
                  </div>
                ) : (
                  <div className="typing-bubble"><span /><span /><span /></div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="chat-input-wrapper">
        {/* Quick chips — visible once conversation has started */}
        {messages.length > 0 && (
          <div className="chat-quick-chips">
            {QUICK_CHIPS.map((chip, i) => (
              <button
                key={i}
                className="chat-quick-chip"
                onClick={() => {
                  setInput(chip.text);
                  setTimeout(() => inputRef.current?.focus(), 50);
                }}
                disabled={loading}
                title={chip.label}
              >
                <span>{chip.icon}</span> {chip.label}
              </button>
            ))}
          </div>
        )}
        <div className="chat-input-box">
          <textarea
            ref={el => { inputRef.current = el; textareaRef.current = el; }}
            className="chat-textarea"
            value={input}
            onChange={handleInput}
            onKeyDown={handleKey}
            placeholder="Ex : alternance marketing Lille • analyse cette offre https://... • tracker voir"
            rows={1}
            disabled={loading}
          />
          <button
            className={`send-btn ${input.trim() && !loading ? 'active' : ''}`}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            {loading ? <span className="send-spinner" /> : '↑'}
          </button>
        </div>
      </div>
    </div>
  );
}
