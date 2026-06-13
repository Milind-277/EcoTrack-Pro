/**
 * EcoTrack Pro - Global App Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initNav();
  checkGamification();
});

// --- Theme Management ---
function initTheme() {
  const savedTheme = localStorage.getItem('ecoTrackTheme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.innerHTML = savedTheme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('ecoTrackTheme', next);
      themeToggle.innerHTML = next === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
      
      // Notify charts if they exist
      if (window.EcoCharts) window.EcoCharts.updateTheme();
    });
  }
}

// --- Navigation & Auth UI ---
function initNav() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.getAttribute('href') === currentPath) {
      link.classList.add('active');
    }
  });

  const user = window.EcoData ? window.EcoData.getCurrentUser() : null;
  const authLinks = document.querySelectorAll('.auth-required');
  const guestLinks = document.querySelectorAll('.guest-only');
  
  if (user) {
    authLinks.forEach(el => el.style.display = '');
    guestLinks.forEach(el => el.style.display = 'none');
    
    // Setup mini avatar and logout
    const avatar = document.getElementById('navAvatar');
    const logoutBtn = document.getElementById('navLogout');
    if(avatar) {
      avatar.style.display = 'flex';
      avatar.innerText = user.name.charAt(0).toUpperCase();
      avatar.title = `Profile: ${user.name}`;
      avatar.addEventListener('click', () => window.location.href = 'profile.html');
    }
    if(logoutBtn) {
      logoutBtn.style.display = 'flex';
      logoutBtn.addEventListener('click', () => {
        window.EcoData.logoutUser();
        window.location.href = 'auth.html';
      });
    }
  } else {
    authLinks.forEach(el => el.style.display = 'none');
    guestLinks.forEach(el => el.style.display = '');
  }
}

// --- Toast Notifications ---
function showToast(message, type = 'info') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'fa-info-circle';
  if (type === 'success') icon = 'fa-check-circle';
  if (type === 'warning') icon = 'fa-exclamation-triangle';
  if (type === 'error') icon = 'fa-times-circle';

  toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'fadeOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// --- Gamification Checks ---
const BADGES = {
  beginner: { id: 'beginner', name: 'Eco Beginner', desc: 'Logged your first entry' },
  streak_3: { id: 'streak_3', name: 'Consistency', desc: 'Maintained a 3-day streak' },
  eco_hero: { id: 'eco_hero', name: 'Eco Hero', desc: 'Accumulated 100 points' }
};

function checkGamification() {
  if (!window.EcoData) return;
  const user = window.EcoData.getCurrentUser();
  if (!user) return;

  if (user.history.length > 0) {
    if(window.EcoData.unlockBadge('beginner')) showToast('Badge Unlocked: Eco Beginner!', 'success');
  }
  if (user.streak >= 3) {
    if(window.EcoData.unlockBadge('streak_3')) showToast('Badge Unlocked: Consistency!', 'success');
  }
  if (user.points >= 100) {
    if(window.EcoData.unlockBadge('eco_hero')) showToast('Badge Unlocked: Eco Hero!', 'success');
  }
}

window.App = { showToast, BADGES };
