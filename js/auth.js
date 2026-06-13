/**
 * EcoTrack Pro - Auth Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const toSignup = document.getElementById('toSignup');
  const toLogin = document.getElementById('toLogin');
  
  if (toSignup && toLogin) {
    toSignup.addEventListener('click', (e) => {
      e.preventDefault();
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
    });
    
    toLogin.addEventListener('click', (e) => {
      e.preventDefault();
      signupForm.style.display = 'none';
      loginForm.style.display = 'block';
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPass').value;
      
      try {
        window.EcoData.loginUser(email, pass);
        window.App.showToast('Login successful!', 'success');
        setTimeout(() => window.location.href = 'index.html', 800);
      } catch (err) {
        window.App.showToast(err.message, 'error');
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('signupName').value;
      const email = document.getElementById('signupEmail').value;
      const pass = document.getElementById('signupPass').value;
      
      try {
        window.EcoData.createUser(email, name, pass);
        window.EcoData.loginUser(email, pass); // Auto login
        window.App.showToast('Account created successfully!', 'success');
        setTimeout(() => window.location.href = 'tracker.html', 800);
      } catch (err) {
        window.App.showToast(err.message, 'error');
      }
    });
  }
});

// Guard route logic for pages that require auth
function requireAuth() {
  if (!window.EcoData) return;
  const user = window.EcoData.getCurrentUser();
  if (!user) {
    window.location.href = 'auth.html';
  }
}

window.EcoAuth = { requireAuth };
