import React, { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';
import Chat from './components/Chat';
import JobCard from './components/JobCard';
import Tracker from './components/Tracker';
import ProfileForm from './components/ProfileForm';
import DocumentsView from './components/DocumentsView';
import Toast from './components/Toast';
import { API_BASE_URL, LLM_LABEL } from './config';

const EMOJI_OPTIONS = [
  '📁','📂','⭐','🎯','🚀','💼','🎓','📈','📊','💡',
  '🔑','🏆','🌟','🏢','💻','🎨','📝','🔧','⚡','🌱',
  '🤝','💰','🔍','📌','⚙️','🎭','🌍','🏋️','🎵','✨',
];

let nextId = (() => {
  try {
    const h = JSON.parse(localStorage.getItem('jobster_history') || '[]');
    return h.length ? Math.max(...h.map(x => (typeof x.id === 'number' ? x.id : 0))) + 1 : 1;
  } catch { return 1; }
})();

const DEFAULT_PROJECTS = [
  { id: 'p1', name: 'Alternance', icon: '🎓', color: '#185FA5' },
  { id: 'p2', name: 'CDI',        icon: '💼', color: '#0F6E56' },
  { id: 'p3', name: 'Intérim',    icon: '⚡', color: '#D97706' },
];

function App() {
  const [chats, setChats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jobster_chats') || '{}'); } catch { return {}; }
  });
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jobster_history') || '[]'); } catch { return []; }
  });
  const [activeChat, setActiveChat]     = useState(null);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [searchQuery, setSearchQuery]   = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [menuOpen, setMenuOpen]         = useState(null);
  const [renaming, setRenaming]         = useState(null);
  const [renameValue, setRenameValue]   = useState('');
  const [projects, setProjects] = useState(() => {
    try { const s = localStorage.getItem('jobster_projects'); return s ? JSON.parse(s) : DEFAULT_PROJECTS; } catch { return DEFAULT_PROJECTS; }
  });
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectEmoji, setNewProjectEmoji] = useState('📁');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [renamingProject, setRenamingProject] = useState(null);
  const [renameProjectValue, setRenameProjectValue] = useState('');
  // activeView controls the MAIN PANEL — sidebar always stays full
  // 'landing'     = no chat open, show landing page
  // 'chat'        = show active chat
  // 'all-chats'   = conversations overview (all threads + dates)
  // 'project'     = project contents
  // 'favoris' | 'candidatures' | 'documents' | 'profil' | 'guide' = section views
  const [activeView, setActiveView]     = useState('landing');
  // which project is open in the main panel
  const [activeProjectId, setActiveProjectId] = useState(null);
  // favorites — array of job objects saved via ❤️ on JobCards
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jobster_favorites') || '[]'); } catch { return []; }
  });
  // tracker refresh signal — incremented when a job is added or removed
  const [trackerRefreshKey, setTrackerRefreshKey] = useState(0);
  // maps job URL/title → candidature DB id, so the 🔖 icon can toggle (undo)
  const [savedCandidatures, setSavedCandidatures] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jobster_saved_cands') || '{}'); } catch { return {}; }
  });

  // ── Toast notifications ──
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
  }, []);

  // ── Profile data for banner (loaded once on mount) ──
  const [profileSummary, setProfileSummary] = useState(null);

  const menuRef        = useRef(null);
  const searchRef      = useRef(null);
  const emojiPickerRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(null);
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── P2-B : Charger les favoris depuis le backend au démarrage ──
  useEffect(() => {
    fetch(`/favorites`)
      .then(r => r.json())
      .then(data => {
        if (data.favorites && data.favorites.length > 0) {
          setFavorites(data.favorites.map(f => ({
            _backendId: f.id,
            title:     f.titre,
            company:   f.entreprise,
            url:       f.url || '#',
            location:  f.location,
            contract:  f.contract_type,
            source:    f.source,
          })));
        }
      })
      .catch(() => {}); // backend indisponible → on garde localStorage
  }, []);

  // ── Load profile summary for chat banner ──
  useEffect(() => {
    fetch(`/profile`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.profile) setProfileSummary(data.profile);
      })
      .catch(() => {});
  }, []);

  // ── P2-C : Charger les projets depuis le backend au démarrage ──
  useEffect(() => {
    fetch(`/projects`)
      .then(r => r.json())
      .then(data => {
        if (data.projects && data.projects.length > 0) {
          setProjects(data.projects.map(p => ({
            id:         `db_${p.id}`,
            _backendId: p.id,
            name:       p.name,
            icon:       p.emoji,
            color:      p.color,
          })));
        }
      })
      .catch(() => {}); // backend indisponible → on garde localStorage
  }, []);

  // ── Persist session data in localStorage (browser-only, never goes to git) ──
  useEffect(() => { try { localStorage.setItem('jobster_chats',    JSON.stringify(chats));    } catch {} }, [chats]);
  useEffect(() => { try { localStorage.setItem('jobster_history',  JSON.stringify(history));  } catch {} }, [history]);
  useEffect(() => { try { localStorage.setItem('jobster_projects', JSON.stringify(projects)); } catch {} }, [projects]);
  useEffect(() => { try { localStorage.setItem('jobster_favorites',JSON.stringify(favorites));} catch {} }, [favorites]);
  useEffect(() => { try { localStorage.setItem('jobster_saved_cands', JSON.stringify(savedCandidatures)); } catch {} }, [savedCandidatures]);

  // ── Chat actions ──
  const startNewChat = (projectId = null) => {
    const id = nextId++;
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    const entry = {
      id, title: 'Nouvelle recherche',
      date: dateStr,
      lastUpdated: dateStr,
      pinned: false, projectId,
    };
    setHistory(prev => [entry, ...prev]);
    setChats(prev => ({ ...prev, [id]: [] }));
    setActiveChat(id);
    setMenuOpen(null);
    setSearchQuery('');
    setActiveView('chat');
    setActiveProjectId(null);
  };

  const updateTitle    = (id, firstMsg) => setHistory(prev => prev.map(h =>
    // Only auto-set title if it's still the default — preserve manually renamed titles
    h.id === id && h.title === 'Nouvelle recherche'
      ? { ...h, title: firstMsg.slice(0, 36) }
      : h
  ));
  const updateMessages = (id, messages) => {
    setChats(prev => ({ ...prev, [id]: messages }));
    // update lastUpdated timestamp on every new message
    const now = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    setHistory(prev => prev.map(h => h.id === id ? { ...h, lastUpdated: now } : h));
  };

  const deleteChat = (id) => {
    setHistory(prev => prev.filter(h => h.id !== id));
    setChats(prev => { const c = { ...prev }; delete c[id]; return c; });
    if (activeChat === id) setActiveChat(null);
    setMenuOpen(null);
  };
  const togglePin = (id) => {
    setHistory(prev => {
      const updated = prev.map(h => h.id === id ? { ...h, pinned: !h.pinned } : h);
      return [...updated.filter(h => h.pinned), ...updated.filter(h => !h.pinned)];
    });
    setMenuOpen(null);
  };
  const startRename   = (id, title) => { setRenaming(id); setRenameValue(title); setMenuOpen(null); };
  const confirmRename = (id) => {
    if (renameValue.trim()) setHistory(prev => prev.map(h => h.id === id ? { ...h, title: renameValue.trim().slice(0, 36) } : h));
    setRenaming(null);
  };

  // ── Project actions ──
  const addProject = () => {
    if (!newProjectName.trim()) { setAddingProject(false); setNewProjectEmoji('📁'); return; }
    const colors = ['#185FA5', '#0F6E56', '#8B5CF6', '#D97706', '#0891B2'];
    const localId = `p${Date.now()}`;
    const newProj = {
      id: localId,
      name: newProjectName.trim(),
      icon: newProjectEmoji,
      color: colors[projects.length % 5],
    };
    setProjects(prev => [...prev, newProj]);
    setNewProjectName('');
    setNewProjectEmoji('📁');
    setShowEmojiPicker(false);
    setAddingProject(false);

    // P2-C : Persister dans le backend (fire-and-forget)
    fetch(`/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProj.name, emoji: newProj.icon, color: newProj.color }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.project?.id) {
          // Met à jour l'ID local avec l'ID backend pour les futures suppressions
          setProjects(prev => prev.map(p =>
            p.id === localId ? { ...p, _backendId: data.project.id } : p
          ));
        }
      })
      .catch(() => {}); // fallback localStorage déjà actif
  };

  const deleteProject = (pid) => {
    // P2-C : Supprimer dans le backend si on a un _backendId
    const proj = projects.find(p => p.id === pid);
    if (proj?._backendId) {
      fetch(`${API_BASE_URL}/projects/${proj._backendId}`, { method: 'DELETE' })
        .catch(() => {});
    }
    setProjects(prev => prev.filter(p => p.id !== pid));
    setHistory(prev => prev.map(h => h.projectId === pid ? { ...h, projectId: null } : h));
    if (activeProjectId === pid) { setActiveView('landing'); setActiveProjectId(null); }
  };

  const startRenameProject   = (pid, name) => { setRenamingProject(pid); setRenameProjectValue(name); };
  const confirmRenameProject = (pid) => {
    if (renameProjectValue.trim()) setProjects(prev => prev.map(p => p.id === pid ? { ...p, name: renameProjectValue.trim() } : p));
    setRenamingProject(null);
  };

  const openProject = (pid) => {
    setActiveProjectId(pid);
    setActiveView('project');
    setActiveChat(null);
  };

  // ── Chat → Project assignment (called from Chat.js) ──
  const assignChatToProject = (chatId, projectId) => {
    setHistory(prev => prev.map(h => h.id === chatId ? { ...h, projectId } : h));
  };
  // ── Remove from tracker (undo 🔖) ──
  const handleRemoveFromTracker = (jobKey) => {
    const id = savedCandidatures[jobKey];
    const removeLocal = () => {
      setSavedCandidatures(prev => { const n = { ...prev }; delete n[jobKey]; return n; });
      setTrackerRefreshKey(k => k + 1);
    };
    // If we have a real numeric id, call DELETE on the backend
    if (typeof id === 'number') {
      return fetch(`${API_BASE_URL}/candidatures/${id}`, { method: 'DELETE' })
        .then(res => { if (res.ok || res.status === 404) removeLocal(); });
    }
    // No backend id (edge case) — just clear locally
    removeLocal();
    return Promise.resolve();
  };

  // ── Favorites (P2-B) ──
  const toggleFavorite = (job) => {
    const key = job.url || job.lien || job.title;
    const existing = favorites.find(f => (f.url || f.lien || f.title) === key);

    if (existing) {
      // Suppression optimiste
      setFavorites(prev => prev.filter(f => (f.url || f.lien || f.title) !== key));
      showToast('Retiré des favoris', 'info');
      // Sync backend
      if (existing._backendId) {
        fetch(`${API_BASE_URL}/favorites/${existing._backendId}`, { method: 'DELETE' })
          .catch(() => {});
      }
    } else {
      // Ajout optimiste
      const newFav = { ...job, _backendId: null };
      setFavorites(prev => [...prev, newFav]);
      showToast('Ajouté aux favoris ❤️');
      // Sync backend — récupère l'ID généré pour les futures suppressions
      fetch(`/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre:         job.title  || job.titre     || 'Offre',
          entreprise:    job.company || job.entreprise || '',
          url:           job.url    || job.lien       || null,
          location:      job.location || job.lieu     || '',
          contract_type: job.contract || job.contrat  || '',
          source:        job.source   || '',
        }),
      })
        .then(r => r.json())
        .then(data => {
          if (data.favorite?.id) {
            setFavorites(prev => prev.map(f =>
              (f.url || f.lien || f.title) === key
                ? { ...f, _backendId: data.favorite.id }
                : f
            ));
          }
        })
        .catch(() => {}); // localStorage fallback déjà actif
    }
  };

  const createAndAssign = (chatId, name, emoji) => {
    if (!name.trim()) return;
    const colors = ['#185FA5', '#0F6E56', '#8B5CF6', '#D97706', '#0891B2'];
    const localId = `p${Date.now()}`;
    const newProj = {
      id: localId,
      name: name.trim(),
      icon: emoji || '📁',
      color: colors[projects.length % 5],
    };
    setProjects(prev => [...prev, newProj]);
    setHistory(prev => prev.map(h => h.id === chatId ? { ...h, projectId: localId } : h));

    // P2-C : Persister dans le backend
    fetch(`/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newProj.name, emoji: newProj.icon, color: newProj.color }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.project?.id) {
          setProjects(prev => prev.map(p =>
            p.id === localId ? { ...p, _backendId: data.project.id } : p
          ));
        }
      })
      .catch(() => {});
  };

  // ── Filtered lists — chats always visible regardless of project ──
  const filtered = searchQuery.trim()
    ? history.filter(h => h.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : history;

  const pinned = filtered.filter(h => h.pinned);

  const currentProjectId  = history.find(h => h.id === activeChat)?.projectId ?? null;
  const currentChatEntry  = history.find(h => h.id === activeChat) ?? null;

  const handleRenameChat = (id, newTitle) => {
    if (newTitle?.trim()) {
      setHistory(prev => prev.map(h => h.id === id ? { ...h, title: newTitle.trim().slice(0, 60) } : h));
    }
  };

  return (
    <div className="app">
      {/* ════════════════════════════════════════
          SIDEBAR — always shows nav + chats + projects
          ════════════════════════════════════════ */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>

        {/* Top bar */}
        <div className="sb-topbar">
          <div className="sb-logo">
            <div className="logo-mark">J</div>
            {sidebarOpen && <span className="logo-text">obster</span>}
          </div>
          <button className="sb-icon-btn" onClick={() => setSidebarOpen(v => !v)} title="Réduire">
            {sidebarOpen ? '⇤' : '⇥'}
          </button>
        </div>

        {sidebarOpen && (
          <>
            {/* New chat button */}
            <div className="sb-actions">
              <button className="sb-new-btn" onClick={() => startNewChat()}>
                <span>✏️</span> Nouvelle recherche
              </button>
            </div>

            {/* ── Navigation principale ── */}
            <nav className="sb-nav">
              <button
                className={`sb-nav-item ${activeView === 'all-chats' ? 'active' : ''}`}
                onClick={() => { setActiveView('all-chats'); setActiveProjectId(null); }}
              >
                <span className="sb-nav-icon">💬</span>
                <span className="sb-nav-label">Chats</span>
              </button>
              <button className={`sb-nav-item ${activeView === 'favoris' ? 'active' : ''}`} onClick={() => setActiveView('favoris')}>
                <span className="sb-nav-icon">❤️</span>
                <span className="sb-nav-label">Favoris</span>
              </button>
              <button className={`sb-nav-item ${activeView === 'candidatures' ? 'active' : ''}`} onClick={() => setActiveView('candidatures')}>
                <span className="sb-nav-icon">📋</span>
                <span className="sb-nav-label">Candidatures</span>
              </button>
              <button className={`sb-nav-item ${activeView === 'documents' ? 'active' : ''}`} onClick={() => setActiveView('documents')}>
                <span className="sb-nav-icon">📄</span>
                <span className="sb-nav-label">Mes Documents</span>
              </button>
              <button className={`sb-nav-item ${activeView === 'profil' ? 'active' : ''}`} onClick={() => setActiveView('profil')}>
                <span className="sb-nav-icon">👤</span>
                <span className="sb-nav-label">Mon Profil</span>
              </button>
              <button className={`sb-nav-item ${activeView === 'guide' ? 'active' : ''}`} onClick={() => setActiveView('guide')}>
                <span className="sb-nav-icon">🧭</span>
                <span className="sb-nav-label">Guide Jobster</span>
              </button>
            </nav>

            {/* ── Chats + Projects always visible ── */}
            <>
              <div className={`sb-search ${searchFocused ? 'focused' : ''}`}>
                <span className="sb-search-icon">🔎</span>
                <input
                  ref={searchRef}
                  className="sb-search-input"
                  placeholder="Rechercher une conversation..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                />
                {searchQuery && (
                  <button className="sb-clear-btn" onClick={() => setSearchQuery('')}>✕</button>
                )}
              </div>

              <div className="sb-body">
                {/* ── Projets ── */}
                <div className="sb-section">
                  <button className="sb-section-header" onClick={() => setProjectsOpen(v => !v)}>
                    <span className="sb-section-label">Projets</span>
                    <span className={`sb-chevron ${projectsOpen ? 'open' : ''}`}>›</span>
                  </button>
                  {projectsOpen && (
                    <div className="sb-section-body">
                      {projects.map(p => (
                        <div
                          key={p.id}
                          className={`project-item ${activeProjectId === p.id ? 'active' : ''}`}
                          title={p.name}
                          onClick={() => openProject(p.id)}
                        >
                          <span className="project-icon" style={{ background: p.color + '20', color: p.color }}>{p.icon}</span>
                          {renamingProject === p.id ? (
                            <input
                              autoFocus
                              className="project-rename-input"
                              value={renameProjectValue}
                              onChange={e => setRenameProjectValue(e.target.value)}
                              onBlur={() => confirmRenameProject(p.id)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') confirmRenameProject(p.id);
                                if (e.key === 'Escape') setRenamingProject(null);
                              }}
                              onClick={e => e.stopPropagation()}
                            />
                          ) : (
                            <span className="project-name">{p.name}</span>
                          )}
                          <div className="project-actions">
                            <button className="proj-btn" onClick={e => { e.stopPropagation(); startNewChat(p.id); }} title="Nouveau chat dans ce projet">+</button>
                            <button className="proj-btn" onClick={e => { e.stopPropagation(); startRenameProject(p.id, p.name); }} title="Renommer">✏️</button>
                            <button className="proj-btn danger" onClick={e => { e.stopPropagation(); deleteProject(p.id); }} title="Supprimer">✕</button>
                          </div>
                        </div>
                      ))}

                      {addingProject ? (
                        <div className="project-add-row" ref={emojiPickerRef}>
                          <div className="project-add-inner">
                            <div className="emoji-select-wrap">
                              <button className="emoji-select-btn" onClick={() => setShowEmojiPicker(v => !v)} title="Choisir un emoji">
                                {newProjectEmoji}
                              </button>
                              {showEmojiPicker && (
                                <div className="emoji-picker-dropdown">
                                  {EMOJI_OPTIONS.map(e => (
                                    <button key={e} className="emoji-option" onClick={() => { setNewProjectEmoji(e); setShowEmojiPicker(false); }}>
                                      {e}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                            <input
                              className="project-add-input"
                              autoFocus
                              placeholder="Nom du projet..."
                              value={newProjectName}
                              onChange={e => setNewProjectName(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') addProject();
                                if (e.key === 'Escape') { setAddingProject(false); setShowEmojiPicker(false); setNewProjectName(''); setNewProjectEmoji('📁'); }
                              }}
                            />
                            <button className="proj-add-confirm" onClick={addProject} title="Créer">✓</button>
                          </div>
                        </div>
                      ) : (
                        <button className="sb-add-project-btn" onClick={() => setAddingProject(true)}>
                          + Nouveau projet
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Flat conversation list — no date labels, click opens chat ── */}
                {searchQuery && filtered.length === 0 && (
                  <p className="sb-empty">Aucune conversation trouvée</p>
                )}

                {pinned.length > 0 && (
                  <div className="sb-section">
                    <div className="sb-section-label-plain">📌 Épinglées</div>
                    <ConvList items={pinned} activeChat={activeChat} menuOpen={menuOpen} menuRef={menuRef}
                      renaming={renaming} renameValue={renameValue}
                      onSelect={id => { setActiveChat(id); setActiveView('chat'); setActiveProjectId(null); setMenuOpen(null); }}
                      onMenu={id => setMenuOpen(menuOpen === id ? null : id)}
                      onDelete={deleteChat} onPin={togglePin}
                      onRename={startRename} onRenameChange={setRenameValue} onRenameConfirm={confirmRename}
                    />
                  </div>
                )}

                {filtered.filter(h => !h.pinned).length > 0 && (
                  <div className="sb-section">
                    <ConvList items={filtered.filter(h => !h.pinned)} activeChat={activeChat} menuOpen={menuOpen} menuRef={menuRef}
                      renaming={renaming} renameValue={renameValue}
                      onSelect={id => { setActiveChat(id); setActiveView('chat'); setActiveProjectId(null); setMenuOpen(null); }}
                      onMenu={id => setMenuOpen(menuOpen === id ? null : id)}
                      onDelete={deleteChat} onPin={togglePin}
                      onRename={startRename} onRenameChange={setRenameValue} onRenameConfirm={confirmRename}
                    />
                  </div>
                )}

                {!searchQuery && history.length === 0 && (
                  <p className="sb-empty">Aucune conversation encore.<br/>Lance une nouvelle recherche !</p>
                )}
              </div>
            </>

            {/* Footer */}
            <div className="sb-footer">
              <div className="sb-footer-inner">
                <div className="user-avatar-lg">C</div>
                <div className="user-details">
                  <p className="user-name">Candidat·e</p>
                  <p className="user-sub">Agent IA · {LLM_LABEL}</p>
                </div>
                <div className="sb-footer-status">
                  <span className="status-dot" />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Sidebar fermée */}
        {!sidebarOpen && (
          <div className="sb-closed-icons">
            <button className="sb-icon-btn-lg" onClick={() => startNewChat()} title="Nouvelle recherche">✏️</button>
            <button className="sb-icon-btn-lg" onClick={() => { setSidebarOpen(true); setTimeout(() => searchRef.current?.focus(), 300); }} title="Rechercher">🔎</button>
          </div>
        )}
      </aside>

      {/* ════════════════════════════════════════
          MAIN PANEL — switches based on activeView
          ════════════════════════════════════════ */}
      <main className="main">

        {/* ── Landing (no chat open) ── */}
        {activeView === 'landing' && (
          <div className="landing">
            <div className="landing-badge"><span className="landing-dot" /> Agent IA actif · {LLM_LABEL}</div>
            <h1 className="landing-title">Trouve ton emploi<br /><span>avec sérénité.</span></h1>
            <p className="landing-sub">Recherche, analyse, postule. Ton agent IA s'occupe du reste.</p>
            <button className="landing-btn" onClick={() => startNewChat()}>Commencer une recherche →</button>
            <button className="landing-discover-link" onClick={() => setActiveView('guide')}>
              Découvrir ce que l'agent peut faire →
            </button>
          </div>
        )}

        {/* ── Active chat ── */}
        {activeView === 'chat' && activeChat !== null && (
          <>
            {/* Profile nudge banner — only shows if titre_cible or localisations is missing */}
            {profileSummary !== null && (!profileSummary?.titre_cible || !profileSummary?.localisations) && (
              <div className="profile-nudge-banner">
                <span className="profile-nudge-text">
                  💡 Personnalise tes résultats en complétant ton profil (2 min)
                </span>
                <button className="profile-nudge-cta" onClick={() => setActiveView('profil')}>
                  Compléter mon profil →
                </button>
              </div>
            )}
          <Chat
            key={activeChat}
            chatId={activeChat}
            initialMessages={chats[activeChat] || []}
            onFirstMessage={(msg) => updateTitle(activeChat, msg)}
            onMessagesChange={(msgs) => updateMessages(activeChat, msgs)}
            onNewChat={startNewChat}
            projects={projects}
            currentProjectId={currentProjectId}
            onAssignToProject={(pid) => assignChatToProject(activeChat, pid)}
            onCreateAndAssign={(name, emoji) => createAndAssign(activeChat, name, emoji)}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            savedCandidatures={savedCandidatures}
            onAddToTracker={(job, id) => {
              setTrackerRefreshKey(k => k + 1);
              const key = (job?.url && job?.url !== '#') ? job.url : (job?.title || '');
              if (key) setSavedCandidatures(prev => ({ ...prev, [key]: id ?? null }));
              showToast('Candidature ajoutée au suivi ✓');
            }}
            onRemoveFromTracker={handleRemoveFromTracker}
            chatTitle={currentChatEntry?.title}
            chatDate={currentChatEntry?.date}
            chatLastUpdated={currentChatEntry?.lastUpdated}
            onRenameChat={(newTitle) => handleRenameChat(activeChat, newTitle)}
          />
          </>
        )}

        {/* ── All conversations overview (Chats nav) ── */}
        {activeView === 'all-chats' && (
          <div className="view-panel">
            <div className="view-header">
              <h2 className="view-title">💬 Conversations</h2>
              <button className="view-new-btn" onClick={() => startNewChat()}>+ Nouvelle recherche</button>
            </div>
            <div className="view-body">
              {history.length === 0 ? (
                <div className="view-empty">
                  <div className="view-empty-icon">💬</div>
                  <p className="view-empty-title">Aucune conversation pour l'instant</p>
                  <p className="view-empty-desc">Lance ta première recherche d'emploi<br/>pour commencer.</p>
                  <button className="landing-btn" style={{ marginTop: 16 }} onClick={() => startNewChat()}>
                    Commencer une recherche →
                  </button>
                </div>
              ) : (
                <ul className="all-chats-list">
                  {history.map(h => {
                    const proj = h.projectId ? projects.find(p => p.id === h.projectId) : null;
                    return (
                      <li
                        key={h.id}
                        className={`all-chats-item ${activeChat === h.id ? 'active' : ''}`}
                        onClick={() => { setActiveChat(h.id); setActiveView('chat'); }}
                      >
                        <div className="all-chats-icon">💬</div>
                        <div className="all-chats-info">
                          <div className="all-chats-title">
                            {h.pinned && <span className="all-chats-pin">📌 </span>}
                            {h.title}
                          </div>
                          <div className="all-chats-meta">
                            <span title="Créé le">🗓 {h.date}</span>
                            {h.lastUpdated && h.lastUpdated !== h.date && (
                              <span title="Dernière activité">· Mis à jour {h.lastUpdated}</span>
                            )}
                            {proj && (
                              <span className="all-chats-proj" style={{ color: proj.color, background: proj.color + '18' }}>
                                {proj.icon} {proj.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="all-chats-arrow">→</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ── Project view — shows chats belonging to this project ── */}
        {activeView === 'project' && activeProjectId && (() => {
          const proj = projects.find(p => p.id === activeProjectId);
          const projChats = history.filter(h => h.projectId === activeProjectId);
          return (
            <div className="view-panel">
              <div className="view-header">
                <button className="view-back-btn" onClick={() => { setActiveView('all-chats'); setActiveProjectId(null); }}>← Retour</button>
                <span className="view-header-icon" style={{ background: (proj?.color || '#185FA5') + '20', color: proj?.color || '#185FA5' }}>{proj?.icon}</span>
                <h2 className="view-title">{proj?.name}</h2>
              </div>
              <div className="view-body">
                {projChats.length === 0 ? (
                  <div className="view-empty">
                    <div className="view-empty-icon">{proj?.icon}</div>
                    <p className="view-empty-title">Aucune conversation dans ce projet</p>
                    <p className="view-empty-desc">Lance une recherche et assigne-la à ce projet<br/>depuis le bouton ⋯ dans l'en-tête du chat.</p>
                    <button className="landing-btn" style={{ marginTop: 16 }} onClick={() => startNewChat(activeProjectId)}>
                      + Nouvelle recherche dans ce projet
                    </button>
                  </div>
                ) : (
                  <ul className="proj-chat-list">
                    {projChats.map(h => (
                      <li
                        key={h.id}
                        className={`proj-chat-item ${activeChat === h.id ? 'active' : ''}`}
                        onClick={() => { setActiveChat(h.id); setActiveView('chat'); }}
                      >
                        <span className="proj-chat-icon">💬</span>
                        <span className="proj-chat-title">{h.title}</span>
                        <span className="proj-chat-date">{h.date}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Show the chat if one is selected within a project */}
                {activeChat !== null && history.find(h => h.id === activeChat)?.projectId === activeProjectId && (
                  <Chat
                    key={activeChat}
                    chatId={activeChat}
                    initialMessages={chats[activeChat] || []}
                    onFirstMessage={(msg) => updateTitle(activeChat, msg)}
                    onMessagesChange={(msgs) => updateMessages(activeChat, msgs)}
                    onNewChat={startNewChat}
                    projects={projects}
                    currentProjectId={currentProjectId}
                    onAssignToProject={(pid) => assignChatToProject(activeChat, pid)}
                    onCreateAndAssign={(name, emoji) => createAndAssign(activeChat, name, emoji)}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                    savedCandidatures={savedCandidatures}
                    onAddToTracker={(job, id) => {
                      setTrackerRefreshKey(k => k + 1);
                      const key = (job?.url && job?.url !== '#') ? job.url : (job?.title || '');
                      if (key) setSavedCandidatures(prev => ({ ...prev, [key]: id ?? null }));
                    }}
                    onRemoveFromTracker={handleRemoveFromTracker}
                    chatTitle={currentChatEntry?.title}
                    chatDate={currentChatEntry?.date}
                    chatLastUpdated={currentChatEntry?.lastUpdated}
                    onRenameChat={(newTitle) => handleRenameChat(activeChat, newTitle)}
                  />
                )}
              </div>
            </div>
          );
        })()}

        {/* ── Favoris view ── */}
        {activeView === 'favoris' && (
          <div className="view-panel">
            <div className="view-header">
              <h2 className="view-title">❤️ Favoris</h2>
              {favorites.length > 0 && (
                <span className="view-count">{favorites.length} offre{favorites.length > 1 ? 's' : ''}</span>
              )}
            </div>
            <div className="view-body">
              {favorites.length === 0 ? (
                <div className="view-empty">
                  <div className="view-empty-icon">❤️</div>
                  <p className="view-empty-title">Aucun favori pour l'instant</p>
                  <p className="view-empty-desc">Les offres que tu sauvegardes apparaîtront ici.<br/>Clique sur 🤍 sur une offre pour l'ajouter.</p>
                </div>
              ) : (
                <div className="fav-grid">
                  {favorites.map((job, i) => {
                    const jobKey = (job?.url && job?.url !== '#') ? job.url : (job?.title || '');
                    return (
                      <JobCard
                        key={i}
                        job={job}
                        isFavorite={true}
                        onToggleFavorite={() => toggleFavorite(job)}
                        isSaved={jobKey ? jobKey in savedCandidatures : false}
                        onAddToTracker={(j) => {
                          return fetch(`/candidatures`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              poste:         j.title,
                              entreprise:    j.company,
                              location:      j.location || '',
                              contract_type: j.contract || '',
                              source:        j.source   || '',
                              url:           j.url      || '',
                              status_code:   'applied',
                            }),
                          })
                          .then(r => r.json())
                          .then(data => {
                            setTrackerRefreshKey(k => k + 1);
                            const key = (j?.url && j?.url !== '#') ? j.url : (j?.title || '');
                            if (key) setSavedCandidatures(prev => ({ ...prev, [key]: data?.candidature?.id ?? null }));
                          });
                        }}
                        onRemoveFromTracker={handleRemoveFromTracker}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Candidatures view ── */}
        {activeView === 'candidatures' && (
          <div className="view-panel view-panel--full">
            <Tracker refreshTrigger={trackerRefreshKey} />
          </div>
        )}

        {/* ── Documents view ── */}
        {activeView === 'documents' && (
          <div className="view-panel view-panel--full">
            <DocumentsView />
          </div>
        )}

        {/* ── Profil view ── */}
        {activeView === 'profil' && (
          <div className="view-panel view-panel--full">
            <ProfileForm
              onToast={(msg, type) => showToast(msg, type)}
              onProfileSaved={(profile) => setProfileSummary(profile)}
            />
          </div>
        )}

        {/* ── Guide Jobster view ── */}
        {activeView === 'guide' && (
          <div className="view-panel">
            <div className="view-header">
              <h2 className="view-title">🧭 Guide Jobster</h2>
              <span className="view-count">8 outils disponibles</span>
            </div>
            <div className="view-body guide-body">
              <p className="guide-intro">
                Jobster est ton agent IA local pour la recherche d'emploi en France.
                Tape l'une de ces commandes dans le chat pour activer chaque outil.
              </p>

              {/* ── Section 1 — Recherche & Analyse ── */}
              <div className="guide-section">
                <h3 className="guide-section-title">🔍 Recherche & Analyse</h3>
                <div className="guide-tools">

                  <div className="guide-tool">
                    <div className="guide-tool-header">
                      <span className="guide-tool-icon">🗂️</span>
                      <span className="guide-tool-name">Chercher des offres</span>
                    </div>
                    <p className="guide-tool-desc">Recherche des offres en temps réel sur France Travail et Adzuna selon ton métier et ta ville.</p>
                    <div className="guide-examples">
                      <span className="guide-example">"développeur web alternance Lyon"</span>
                      <span className="guide-example">"chef de projet CDI Paris"</span>
                      <span className="guide-example">"stage marketing Bordeaux"</span>
                    </div>
                  </div>

                  <div className="guide-tool">
                    <div className="guide-tool-header">
                      <span className="guide-tool-icon">🔍</span>
                      <span className="guide-tool-name">Analyser une offre</span>
                    </div>
                    <p className="guide-tool-desc">Colle le lien d'une annonce — l'agent extrait les missions, compétences, niveau requis et salaire. Disponible aussi via le bouton <strong>🔍 Voir les détails</strong> sur chaque carte d'offre.</p>
                    <div className="guide-examples">
                      <span className="guide-example">"analyse cette offre https://..."</span>
                      <span className="guide-example">Coller un lien seul suffit aussi</span>
                    </div>
                  </div>

                  <div className="guide-tool">
                    <div className="guide-tool-header">
                      <span className="guide-tool-icon">📊</span>
                      <span className="guide-tool-name">Score de matching</span>
                      <span className="guide-tool-badge">CV requis</span>
                    </div>
                    <p className="guide-tool-desc">Compare ton profil avec une offre et calcule un score de compatibilité. Nécessite un CV uploadé dans Mon Profil.</p>
                    <div className="guide-examples">
                      <span className="guide-example">"match https://... avec mon profil"</span>
                      <span className="guide-example">"score compatible https://..."</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* ── Section 2 — Rédaction ── */}
              <div className="guide-section">
                <h3 className="guide-section-title">✍️ Rédaction & Candidature</h3>
                <div className="guide-tools">

                  <div className="guide-tool">
                    <div className="guide-tool-header">
                      <span className="guide-tool-icon">📝</span>
                      <span className="guide-tool-name">Lettre de motivation & Email</span>
                    </div>
                    <p className="guide-tool-desc">Génère une lettre de motivation ou un email de candidature personnalisé à partir d'une offre. Encore plus pertinent si ton CV est dans Mon Profil.</p>
                    <div className="guide-examples">
                      <span className="guide-example">"lettre de motivation https://..."</span>
                      <span className="guide-example">"prépare un email de candidature pour https://..."</span>
                      <span className="guide-example">"texte formulaire https://..."</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* ── Section 3 — Entreprises & Opportunités ── */}
              <div className="guide-section">
                <h3 className="guide-section-title">🏢 Entreprises & Opportunités</h3>
                <div className="guide-tools">

                  <div className="guide-tool">
                    <div className="guide-tool-header">
                      <span className="guide-tool-icon">🏢</span>
                      <span className="guide-tool-name">Rapport entreprise</span>
                    </div>
                    <p className="guide-tool-desc">Obtiens des informations sur une entreprise avant un entretien : activité, culture, actualités, données légales.</p>
                    <div className="guide-examples">
                      <span className="guide-example">"rapport entreprise Capgemini"</span>
                      <span className="guide-example">"infos entreprise LVMH"</span>
                      <span className="guide-example">"que sais-tu de Decathlon"</span>
                    </div>
                  </div>

                  <div className="guide-tool">
                    <div className="guide-tool-header">
                      <span className="guide-tool-icon">🌟</span>
                      <span className="guide-tool-name">La Bonne Boîte</span>
                    </div>
                    <p className="guide-tool-desc">Trouve les entreprises susceptibles de recruter dans ton secteur pour une candidature spontanée — source France Travail.</p>
                    <div className="guide-examples">
                      <span className="guide-example">"bonne boite développeur Paris"</span>
                      <span className="guide-example">"entreprises qui recrutent Lyon"</span>
                      <span className="guide-example">"candidature spontanée marketing"</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* ── Section 4 — Suivi & Événements ── */}
              <div className="guide-section">
                <h3 className="guide-section-title">📋 Suivi & Événements</h3>
                <div className="guide-tools">

                  <div className="guide-tool">
                    <div className="guide-tool-header">
                      <span className="guide-tool-icon">✅</span>
                      <span className="guide-tool-name">Tracker candidatures</span>
                    </div>
                    <p className="guide-tool-desc">Ajoute et consulte tes candidatures en cours. Chaque offre peut être marquée directement depuis la carte via le bouton ✓.</p>
                    <div className="guide-examples">
                      <span className="guide-example">"tracker voir"</span>
                      <span className="guide-example">"ajouter candidature Google UX Designer"</span>
                      <span className="guide-example">"statut candidature BNP"</span>
                    </div>
                  </div>

                  <div className="guide-tool">
                    <div className="guide-tool-header">
                      <span className="guide-tool-icon">🎪</span>
                      <span className="guide-tool-name">Événements emploi</span>
                    </div>
                    <p className="guide-tool-desc">Trouve les salons, job datings et forums emploi près de chez toi via l'API France Travail.</p>
                    <div className="guide-examples">
                      <span className="guide-example">"événements emploi Paris"</span>
                      <span className="guide-example">"salon recrutement Lille"</span>
                      <span className="guide-example">"job dating Marseille"</span>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* ── Toast notification overlay ── */}
      <Toast toast={toast} onClose={() => setToast(null)} />

    </div>
  );
}

// ── Shared sub-components ──
function ConvList({ items, activeChat, menuOpen, menuRef, renaming, renameValue, onSelect, onMenu, onDelete, onPin, onRename, onRenameChange, onRenameConfirm }) {
  return (
    <ul className="conv-list">
      {items.map(item => (
        <ConvItem key={item.id} item={item}
          active={activeChat === item.id}
          menuOpen={menuOpen === item.id}
          menuRef={menuRef}
          renaming={renaming === item.id}
          renameValue={renameValue}
          onSelect={() => onSelect(item.id)}
          onMenu={() => onMenu(item.id)}
          onDelete={() => onDelete(item.id)}
          onPin={() => onPin(item.id)}
          onRename={() => onRename(item.id, item.title)}
          onRenameChange={onRenameChange}
          onRenameConfirm={() => onRenameConfirm(item.id)}
        />
      ))}
    </ul>
  );
}

function ConvItem({ item, active, menuOpen, menuRef, renaming, renameValue, onSelect, onMenu, onDelete, onPin, onRename, onRenameChange, onRenameConfirm }) {
  const inputRef = useRef(null);
  useEffect(() => { if (renaming && inputRef.current) inputRef.current.focus(); }, [renaming]);

  return (
    <li className={`conv-item ${active ? 'active' : ''}`} onClick={onSelect}>
      {renaming ? (
        <input ref={inputRef} className="rename-input" value={renameValue}
          onChange={e => onRenameChange(e.target.value)}
          onBlur={onRenameConfirm}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') onRenameConfirm(); }}
          onClick={e => e.stopPropagation()}
        />
      ) : (
        <span className="conv-title">{item.pinned ? '📌 ' : ''}{item.title}</span>
      )}
      <button className="conv-menu-btn" onClick={e => { e.stopPropagation(); onMenu(); }}>⋯</button>
      {menuOpen && (
        <div className="conv-dropdown" ref={menuRef} onClick={e => e.stopPropagation()}>
          <button className="dd-item" onClick={onRename}>✏️ Renommer</button>
          <button className="dd-item" onClick={onPin}>{item.pinned ? '📌 Désépingler' : '📌 Épingler'}</button>
          <div className="dd-divider" />
          <button className="dd-item danger" onClick={onDelete}>🗑️ Supprimer</button>
        </div>
      )}
    </li>
  );
}

export default App;
