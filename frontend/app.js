/* ========================================
   NeuroLearn AI â€” app.js
   Central authentication, API, and UI logic
   ======================================== */

const API_BASE_URL = 'http://localhost:10000';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TOAST NOTIFICATION SYSTEM
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">âœ•</button>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('show'));
    });

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, duration);
}
window.showToast = showToast;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUTH â€” Session Management
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function getCurrentUser() {
    // Guest: sessionStorage (wiped on tab close)
    // Signed-in: localStorage (persisted 24h)
    const guestRaw = sessionStorage.getItem('neurolearn_user');
    if (guestRaw) {
        try { return JSON.parse(guestRaw); } catch { sessionStorage.removeItem('neurolearn_user'); }
    }

    const raw = localStorage.getItem('neurolearn_user');
    if (!raw) {
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }

    try {
        const user = JSON.parse(raw);
        const now = Date.now();
        // Expire after 24 h
        if (user.last_login && (now - user.last_login > 86400000)) {
            logout(); return null;
        }
        return user;
    } catch {
        localStorage.removeItem('neurolearn_user');
        window.location.href = 'login.html';
        return null;
    }
}
window.getCurrentUser = getCurrentUser;

function logout() {
    localStorage.removeItem('neurolearn_user');
    sessionStorage.removeItem('neurolearn_user');
    window.location.href = 'login.html';
}
window.logout = logout;

// Initialise immediately
const currentUser = getCurrentUser();
const USER_ID = currentUser?.user_id || null;
const AUTH_TOKEN = currentUser?.id_token || null;
const IS_GUEST = currentUser?.is_guest ?? false;

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// UI â€” Theme & Sidebar Management
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

function initUI() {
    // Theme logic
    const themeToggle = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const savedTheme = localStorage.getItem('neurolearn_theme') || 'dark';

    document.documentElement.setAttribute('data-theme', savedTheme);
    if (themeIcon) themeIcon.textContent = savedTheme === 'dark' ? 'ðŸŒ™' : 'â˜€ï¸';

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('neurolearn_theme', next);
            if (themeIcon) themeIcon.textContent = next === 'dark' ? 'ðŸŒ™' : 'â˜€ï¸';
            showToast(`Switched to ${next} mode`, 'info', 2000);
        });
    }

    // Sidebar Collapse logic
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const isCollapsed = localStorage.getItem('neurolearn_sidebar_collapsed') === 'true';

    if (isCollapsed && sidebar) {
        sidebar.classList.add('collapsed');
        document.body.classList.add('sidebar-collapsed');
    }

    const desktopToggle = document.getElementById('btn-sidebar-toggle');

    const toggleSidebar = () => {
        if (!sidebar) return;
        sidebar.classList.toggle('collapsed');
        const nowCollapsed = sidebar.classList.contains('collapsed');
        document.body.classList.toggle('sidebar-collapsed', nowCollapsed);
        localStorage.setItem('neurolearn_sidebar_collapsed', nowCollapsed);
    };

    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    if (desktopToggle) desktopToggle.addEventListener('click', toggleSidebar);

    // Stagger animation trigger
    const staggerGrids = document.querySelectorAll('.anim-stagger');
    staggerGrids.forEach(grid => {
        setTimeout(() => grid.classList.add('loaded'), 100);
    });
}

// DOM READY â€” Bootstrap everything
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
document.addEventListener('DOMContentLoaded', () => {
    initUI();
    setupUserProfile();
    wakeBackend();
    initNeuralWaves();
    initKeyboardShortcuts();

    if (!IS_GUEST) {
        setTimeout(() => {
            loadUserData();
            loadRecommendations();
        }, 1800); // give backend time to wake
    } else {
        showFallbackData();
    }
});

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// USER PROFILE â€” sidebar & header
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function setupUserProfile() {
    if (!currentUser) return;

    // Guest banner
    if (IS_GUEST) {
        const banner = document.createElement('div');
        banner.className = 'guest-banner';
        banner.innerHTML = `
            âš ï¸ <b>Guest Mode</b> â€” No data is saved. Your session will be lost when this tab closes.
            <a href="login.html">Sign in with Google</a> to save progress.
        `;
        document.body.prepend(banner);
    }

    // Sidebar avatar
    const avatarEl = document.getElementById('user-avatar');
    if (avatarEl) {
        if (currentUser.avatar) {
            avatarEl.innerHTML = `<img src="${currentUser.avatar}" alt="avatar"
                onerror="this.outerHTML='<span>${getInitials(currentUser.name)}</span>'">`;
        } else {
            avatarEl.innerHTML = `<span>${getInitials(currentUser.name)}</span>`;
        }
    }

    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const initialsEl = document.getElementById('user-initials');
    const titleEl = document.getElementById('page-title');

    if (nameEl) nameEl.textContent = currentUser.name || 'User';
    if (emailEl) emailEl.textContent = currentUser.email || '';
    if (initialsEl) initialsEl.textContent = getInitials(currentUser.name);

    const firstName = currentUser.name?.split(' ')[0] || 'there';
    if (titleEl) titleEl.textContent = `Welcome back, ${firstName} ðŸ‘‹`;
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// BACKEND HEALTH CHECK (cold-start wake)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function wakeBackend() {
    try {
        const res = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(8000) });
        if (res.ok) console.log('%câœ… Backend online', 'color:#00d4aa;font-weight:bold');
    } catch {
        console.warn('Backend offline or waking upâ€¦');
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOAD USER DATA
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function loadUserData() {
    if (!USER_ID) { showFallbackData(); return; }
    try {
        showLoadingState();
        const res = await fetch(`${API_BASE_URL}/api/v1/users/${USER_ID}`, {
            headers: {
                'Content-Type': 'application/json',
                ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
            }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        updateDashboard(result.data || result);
    } catch (err) {
        console.warn('loadUserData failed:', err.message);
        showFallbackData();
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOAD RECOMMENDATIONS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
async function loadRecommendations() {
    if (!USER_ID || IS_GUEST) return;
    try {
        const res = await fetch(`${API_BASE_URL}/api/v1/adaptation/recommend-content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {})
            },
            body: JSON.stringify({
                user_id: USER_ID,
                user_profile: {
                    user_id: USER_ID,
                    learning_style: currentUser?.learning_style || 'visual',
                    cognitive_load_capacity: currentUser?.cognitive_capacity || 7.5
                },
                performance_history: [0.75, 0.78, 0.82],
                completed_content: []
            })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const result = await res.json();
        updateRecommendations(result.data || result.recommendations || []);
    } catch (err) {
        console.warn('loadRecommendations failed:', err.message);
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DASHBOARD UPDATE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function updateDashboard(data) {
    if (!data) { showFallbackData(); return; }

    // Animated counter helper
    const animateCount = (el, target, suffix = '') => {
        if (!el) return;
        const start = 0;
        const dur = 1200;
        const step = (ts, startTs) => {
            const pct = Math.min((ts - startTs) / dur, 1);
            const ease = 1 - Math.pow(1 - pct, 3);
            el.textContent = Math.round(start + (target - start) * ease) + suffix;
            if (pct < 1) requestAnimationFrame(ts2 => step(ts2, startTs));
        };
        requestAnimationFrame(ts => step(ts, ts));
    };

    if (data.sessions_completed !== undefined) {
        animateCount(document.getElementById('stat-sessions'), data.sessions_completed);
    }
    if (data.average_score !== undefined) {
        const el = document.getElementById('stat-score');
        if (el) el.innerHTML = `${(data.average_score * 100).toFixed(1)}<span style="font-size:18px;color:var(--text-muted)">%</span>`;
    }
    if (data.engagement_level !== undefined) {
        const el = document.getElementById('stat-engagement');
        if (el) el.innerHTML = `${(data.engagement_level * 100).toFixed(0)}<span style="font-size:18px;color:var(--text-muted)">%</span>`;
    }
    if (data.streak_days !== undefined) {
        animateCount(document.getElementById('stat-streak'), data.streak_days);
        const chip = document.getElementById('streak-chip');
        if (chip) chip.textContent = `${data.streak_days} days`;
    }

    // Cognitive profile
    if (data.learning_style) {
        const el = document.getElementById('profile-style');
        if (el) el.textContent = capitalize(data.learning_style);
    }
    if (data.cognitive_load_capacity) {
        const el = document.getElementById('profile-capacity');
        if (el) el.textContent = `${data.cognitive_load_capacity} / 10`;
    }
    if (data.processing_speed) {
        const el = document.getElementById('profile-speed');
        if (el) el.textContent = capitalize(data.processing_speed);
    }
    if (data.working_memory) {
        const el = document.getElementById('profile-memory');
        if (el) el.textContent = capitalize(data.working_memory);
    }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RECOMMENDATIONS UPDATE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function updateRecommendations(recs) {
    const list = document.getElementById('rec-list');
    if (!list || !recs?.length) return;

    const colors = ['c1', 'c2', 'c3'];
    list.innerHTML = '';
    recs.slice(0, 3).forEach((rec, i) => {
        const item = document.createElement('div');
        item.className = 'rec-item';
        item.innerHTML = `
            <div class="rec-dot ${colors[i % 3]}"></div>
            <div class="rec-info">
                <div class="rec-name">${rec.title || rec.content_id || 'Recommended Lesson'}</div>
                <div class="rec-meta">${rec.content_type || 'Interactive'} â€¢ ${rec.duration_minutes || 45} min</div>
            </div>
            <span class="rec-match">${Math.round((rec.score || 0.87) * 100)}%</span>
        `;
        item.addEventListener('click', () => {
            window.location.href = `lesson.html?topic=${encodeURIComponent(rec.title || 'Lesson')}&difficulty=${rec.difficulty_level || 'intermediate'}`;
        });
        list.appendChild(item);
    });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// LOADING STATES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function showLoadingState() {
    ['stat-sessions', 'stat-score', 'stat-engagement', 'stat-streak'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.opacity = '0.3'; el.style.filter = 'blur(4px)'; }
    });
}

function showFallbackData() {
    ['stat-sessions', 'stat-score', 'stat-engagement', 'stat-streak'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.style.opacity = '1'; el.style.filter = 'none'; }
    });
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// CONSOLE BRANDING
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
console.log('%cðŸ§  NeuroLearn AI', 'color:#7c5cfc;font-size:22px;font-weight:800;');
console.log(`%cUser: ${currentUser?.name || 'Guest'} | Mode: ${IS_GUEST ? 'Guest ðŸ‘¤' : 'Signed-in âœ…'}`, 'color:#4f8ef7;font-size:13px;');
// ---------------------------------------
// NEXT GEN ï¿½ Neural Waves & Shortcuts
// ---------------------------------------

function initNeuralWaves() {
    const container = document.getElementById('neural-waves');
    if (!container) return;

    container.innerHTML = '';
    const barCount = 24;
    for (let i = 0; i < barCount; i++) {
        const bar = document.createElement('div');
        bar.className = 'wave-bar';
        const delay = (Math.random() * 2).toFixed(2);
        const dur = (1 + Math.random() * 1.5).toFixed(2);
        bar.style.animationDelay = ${ delay } s;
        bar.style.animationDuration = ${ dur } s;
        container.appendChild(bar);
    }
}

function initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
            e.preventDefault();
            const search = document.getElementById('ai-search');
            if (search) {
                search.focus();
                showToast('AI Command Mode active', 'info', 1000);
            }
        }
    });
}


document.addEventListener('DOMContentLoaded', () => {
    initNeuralWaves();
    initKeyboardShortcuts();
});

