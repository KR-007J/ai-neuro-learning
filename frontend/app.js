
const API_BASE_URL = 'https://ai-neuro-backend.onrender.com';

// ========================================
// AUTH - Get logged in user
// ========================================

function getCurrentUser() {
    // Guest users are stored in sessionStorage (cleared when tab closes)
    // Signed-in users are stored in localStorage (persisted)
    const guestStr = sessionStorage.getItem('neurolearn_user');
    if (guestStr) {
        try { return JSON.parse(guestStr); } catch { sessionStorage.removeItem('neurolearn_user'); }
    }

    const userStr = localStorage.getItem('neurolearn_user');
    if (!userStr) {
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }
    try {
        const user = JSON.parse(userStr);
        // Check if token is older than 24h as a basic precaution
        const now = new Date().getTime();
        if (user.last_login && (now - user.last_login > 24 * 60 * 60 * 1000)) {
            logout();
            return null;
        }
        return user;
    } catch {
        localStorage.removeItem('neurolearn_user');
        window.location.href = 'login.html';
        return null;
    }
}

function logout() {
    localStorage.removeItem('neurolearn_user');
    sessionStorage.removeItem('neurolearn_user');
    window.location.href = 'login.html';
}

// Get current user — redirects to login if not authenticated
const currentUser = getCurrentUser();
const USER_ID = currentUser?.user_id; // Remove demo fallback for security
const AUTH_TOKEN = currentUser?.id_token;

// ========================================
// Initialize on load
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    setupUserProfile();
    initializeNavigation();
    initializeAnimations();
    wakeBackend();

    // Wait 2s for backend to wake then load data
    setTimeout(() => {
        loadUserData();
        loadRecommendations();
    }, 2000);
});

// ========================================
// Setup sidebar with real user data
// ========================================

function setupUserProfile() {
    if (!currentUser) return;

    // Show guest banner if guest
    if (currentUser.is_guest) {
        const banner = document.createElement('div');
        banner.style.cssText = 'background:#fff8e1;border-bottom:1px solid #ffe082;padding:8px 20px;font-size:12px;color:#795548;display:flex;align-items:center;gap:8px;position:fixed;top:0;left:0;right:0;z-index:999;';
        banner.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> <span><b>Guest Mode</b> — No data will be saved. <a href="login.html" style="color:#4285f4;font-weight:600;">Sign in with Google</a> to save your progress.</span>`;
        document.body.prepend(banner);
    }

    // Update avatar — use Google profile photo if available
    const avatarEl = document.querySelector('.user-avatar');
    if (avatarEl) {
        if (currentUser.avatar) {
            avatarEl.innerHTML = `
                <img src="${currentUser.avatar}"
                    style="width:40px;height:40px;border-radius:50%;object-fit:cover;"
                    alt="avatar"
                    onerror="this.outerHTML='<span>${getInitials(currentUser.name)}</span>'">
            `;
        } else {
            avatarEl.innerHTML = `<span>${getInitials(currentUser.name)}</span>`;
        }
    }

    // Update sidebar name
    const nameEl = document.querySelector('.user-name');
    if (nameEl) nameEl.textContent = currentUser.name || 'User';

    // Update page title with first name
    const titleEl = document.querySelector('.page-title');
    const firstName = currentUser.name?.split(' ')[0] || 'there';
    if (titleEl) titleEl.textContent = `Welcome back, ${firstName} 👋`;
}

function getInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// ========================================
// Wake backend (free tier cold start)
// ========================================

async function wakeBackend() {
    try {
        await fetch(`${API_BASE_URL}/health`);
        console.log('Backend is awake');
    } catch (e) {
        console.log('Backend waking up...');
    }
}

// ========================================
// Navigation
// ========================================

function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            const href = item.getAttribute('href');
            navigateToPage(href);
        });
    });
}

function navigateToPage(page) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    console.log('Navigating to:', page);
}

// ========================================
// Scroll animations
// ========================================

function initializeAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.card, .stat-card').forEach(card => {
        observer.observe(card);
    });
}

// ========================================
// Load user data from API
// ========================================

async function loadUserData() {
    // Skip API call for guests
    if (currentUser?.is_guest) {
        showFallbackData();
        return;
    }

    try {
        showLoadingState();

        const response = await fetch(`${API_BASE_URL}/api/v1/users/${USER_ID}`, {
            method: 'GET',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            }
        });

        if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

        const result = await response.json();
        updateDashboard(result.data);

    } catch (error) {
        console.error('Error loading user data:', error);
        showFallbackData();
    }
}

// ========================================
// Load recommendations from API
// ========================================

async function loadRecommendations() {
    // Skip API call for guests — static recommendations only
    if (currentUser?.is_guest) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/adaptation/recommend-content`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
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

        if (!response.ok) {
            const err = await response.json();
            console.error('Recommendations error:', JSON.stringify(err, null, 2));
            throw new Error(`HTTP error: ${response.status}`);
        }

        const result = await response.json();
        updateRecommendations(result.data);

    } catch (error) {
        console.error('Error loading recommendations:', error);
    }
}

// ========================================
// Update dashboard with API data
// ========================================

function updateDashboard(data) {
    if (!data) return;

    // Stat cards
    if (data.sessions_completed !== undefined) {
        const el = document.querySelector('.stat-card:nth-child(1) .stat-value');
        if (el) el.textContent = data.sessions_completed;
    }

    if (data.average_score !== undefined) {
        const el = document.querySelector('.stat-card:nth-child(2) .stat-value');
        if (el) el.innerHTML = `${(data.average_score * 100).toFixed(1)}<span class="stat-unit">%</span>`;
    }

    if (data.engagement_level !== undefined) {
        const el = document.querySelector('.stat-card:nth-child(3) .stat-value');
        if (el) el.innerHTML = `${(data.engagement_level * 100).toFixed(0)}<span class="stat-unit">%</span>`;
    }

    if (data.streak_days !== undefined) {
        const el = document.querySelector('.stat-card:nth-child(4) .stat-value');
        if (el) el.innerHTML = `🔥 <span>${data.streak_days}</span>`;
    }

    // Cognitive profile
    if (data.learning_style) {
        const el = document.querySelector('.profile-stat:nth-child(1) .profile-stat-value');
        if (el) el.textContent = capitalize(data.learning_style);
    }

    if (data.cognitive_load_capacity) {
        const el = document.querySelector('.profile-stat:nth-child(2) .profile-stat-value');
        if (el) el.textContent = `${data.cognitive_load_capacity}/10`;
    }

    if (data.processing_speed) {
        const el = document.querySelector('.profile-stat:nth-child(3) .profile-stat-value');
        if (el) el.textContent = data.processing_speed;
    }

    if (data.working_memory) {
        const el = document.querySelector('.profile-stat:nth-child(4) .profile-stat-value');
        if (el) el.textContent = data.working_memory;
    }
}

function updateRecommendations(recommendations) {
    const list = document.querySelector('.recommendation-list');
    if (!list || !recommendations?.length) return;

    const types = ['video', 'text', 'code'];
    list.innerHTML = '';

    recommendations.slice(0, 3).forEach((rec, index) => {
        const item = document.createElement('div');
        item.className = 'recommendation-item';
        item.innerHTML = `
            <div class="rec-thumbnail ${types[index % types.length]}"></div>
            <div class="rec-content">
                <h3 class="rec-title">${rec.title || rec.content_id}</h3>
                <div class="rec-meta">
                    <span class="rec-type">${rec.content_type || 'Interactive'} • ${rec.duration_minutes || 45} min</span>
                    <span class="rec-match">${Math.round((rec.score || 0.9) * 100)}% match</span>
                </div>
            </div>
        `;
        item.addEventListener('click', () => {
            window.location.href = `lesson.html?topic=${encodeURIComponent(rec.title || rec.content_id)}&difficulty=${rec.difficulty_level || 'intermediate'}`;
        });
        list.appendChild(item);
    });
}

// ========================================
// Loading states
// ========================================

function showLoadingState() {
    document.querySelectorAll('.stat-value').forEach(el => {
        el.style.opacity = '0.4';
    });
}

function showFallbackData() {
    document.querySelectorAll('.stat-value').forEach(el => {
        el.style.opacity = '1';
    });
    console.log('Using static fallback data');
}

// ========================================
// Progress bar animations
// ========================================

function animateProgressBars() {
    const progressFills = document.querySelectorAll('.progress-fill');
    progressFills.forEach(fill => {
        const width = fill.style.getPropertyValue('--width');
        fill.style.width = '0%';
        setTimeout(() => { fill.style.width = width; }, 100);
    });
}

setTimeout(animateProgressBars, 500);

// ========================================
// Button handlers
// ========================================

// Export Data button
document.querySelectorAll('.action-export').forEach(btn => {
    btn.addEventListener('click', async () => {
        if (currentUser?.is_guest) {
            alert('⚠️ Guest Mode: Data export is only available for signed-in users.');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/users/${USER_ID}/export`, {
                headers: { 'Authorization': `Bearer ${AUTH_TOKEN}` }
            });
            if (response.ok) {
                const blob = await response.blob();
                const url  = URL.createObjectURL(blob);
                const a    = document.createElement('a');
                a.href     = url;
                a.download = `neurolearn-${USER_ID}-export.json`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                alert('Export failed. Please try again later.');
            }
        } catch {
            alert('Export coming soon!');
        }
    });
});

// Start Learning button
document.getElementById('btn-start')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-start');
    const originalContent = btn.innerHTML;
    try {
        btn.disabled = true;
        btn.innerHTML = 'Loading...';
        
        const response = await fetch(`${API_BASE_URL}/api/v1/adaptation/next-lesson`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify({ user_id: USER_ID })
        });

        if (response.ok) {
            const data = await response.json();
            window.location.href = `lesson.html?topic=${encodeURIComponent(data.lesson_title)}&difficulty=${data.difficulty}`;
        } else {
            window.location.href = 'lesson.html';
        }
    } catch {
        window.location.href = 'lesson.html';
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
});

// Stat card hover effects
document.querySelectorAll('.stat-card').forEach(card => {
    card.addEventListener('mouseenter', () => { card.style.transform = 'translateY(-8px)'; });
    card.addEventListener('mouseleave', () => { card.style.transform = 'translateY(0)'; });
});

// ========================================
// Helpers
// ========================================

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

console.log('%c🧠 NeuroLearn AI Dashboard', 'color: #667eea; font-size: 20px; font-weight: bold;');
console.log('%cDashboard loaded successfully!', 'color: #10b981; font-size: 14px;');