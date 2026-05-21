/* ============================================================
   auth.js — IVTC Session Guard
   Checks session with Node.js server via /api/session
   Includes retry logic and backup session to prevent redirect loops
   Include FIRST in index.html before main.js
============================================================ */

(async function () {
  'use strict';

  // ============================================================
  // RETRY & BACKUP HELPERS (added without breaking existing code)
  // ============================================================
  
  let retryCount = 0;
  const MAX_RETRIES = 3;
  
  function saveSessionBackup(userData) {
    try {
      localStorage.setItem('ivtc_session_backup', JSON.stringify({
        loggedIn: true,
        user: userData,
        timestamp: Date.now()
      }));
    } catch(e) {}
  }
  
  function getSessionBackup() {
    try {
      const backup = localStorage.getItem('ivtc_session_backup');
      if (!backup) return null;
      const data = JSON.parse(backup);
      if (data.loggedIn && (Date.now() - data.timestamp) < 3600000) { // 1 hour valid
        return data;
      }
      return null;
    } catch(e) {
      return null;
    }
  }
  
  function clearSessionBackup() {
    try {
      localStorage.removeItem('ivtc_session_backup');
    } catch(e) {}
  }
  
  async function fetchWithRetry(url, options) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          return response;
        }
        
        throw new Error(`HTTP ${response.status}`);
        
      } catch(err) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          console.log(`Session check retry ${attempt}/${MAX_RETRIES}...`);
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }
    
    throw lastError;
  }

  // ============================================================
  // ORIGINAL SESSION CHECK WITH RETRY & BACKUP
  // ============================================================
  
  try {
    let response;
    let data;
    
    try {
      // Try to fetch with retry
      response = await fetchWithRetry(window.API_BASE_URL + '/api/session', { 
        credentials: 'include' 
      });
      data = await response.json();
    } catch (fetchError) {
      console.warn('Session fetch failed, checking backup...');
      
      // If fetch fails, try backup session
      const backup = getSessionBackup();
      if (backup && backup.user) {
        console.log('Using backup session from localStorage');
        data = { loggedIn: true, user: backup.user };
      } else {
        throw fetchError;
      }
    }

    // ============================================================
    // ORIGINAL REDIRECT LOGIC (unchanged)
    // ============================================================
    
    if (!data.loggedIn) {
      clearSessionBackup();
      window.location.href = 'login.html';
      return;
    }

    if (data.user.role === 'admin') {
      // Save backup for admin
      saveSessionBackup(data.user);
      window.location.href = 'admin.html';
      return;
    }

    // Save backup for visitor
    saveSessionBackup(data.user);
    window.IVTC_SESSION = data.user;

    // ============================================================
    // ORIGINAL NAVBAR FUNCTION (completely unchanged)
    // ============================================================
    
    function addUserToNavbar() {
      const navLinks = document.getElementById('navMenu');
      if (!navLinks) return;

      if (document.getElementById('nav-user-info')) return;

      const fullName = data.user.fullName || data.user.username || 'User';
      const username = data.user.username || 'user';

      const liUser = document.createElement('li');
      liUser.id = 'nav-user-info';
      liUser.innerHTML = `
        <span style="
          display:inline-flex;align-items:center;gap:0.55rem;
          font-size:0.72rem;color:var(--gold-light);
          padding:0.4rem 0.85rem;letter-spacing:0.06em;
        ">
          👤 ${escapeHtml(fullName)}
        </span>
      `;

      const liLogout = document.createElement('li');
      liLogout.innerHTML = `
        <a onclick="ivtcLogout()" style="color:#f87171;cursor:pointer;font-size:0.72rem;letter-spacing:0.08em;">⏻ Logout</a>
      `;

      navLinks.appendChild(liUser);
      navLinks.appendChild(liLogout);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addUserToNavbar);
    } else {
      addUserToNavbar();
    }

  } catch (err) {
    console.error('Session check failed:', err);
    
    // Last resort - try backup before redirecting
    const backup = getSessionBackup();
    if (backup && backup.user) {
      console.log('Using backup session as last resort');
      window.IVTC_SESSION = backup.user;
      
      // Add navbar with backup user
      function addBackupNavbar() {
        const navLinks = document.getElementById('navMenu');
        if (!navLinks) return;
        if (document.getElementById('nav-user-info')) return;
        
        const fullName = backup.user.fullName || backup.user.username || 'User';
        
        const liUser = document.createElement('li');
        liUser.id = 'nav-user-info';
        liUser.innerHTML = `
          <span style="
            display:inline-flex;align-items:center;gap:0.55rem;
            font-size:0.72rem;color:var(--gold-light);
            padding:0.4rem 0.85rem;letter-spacing:0.06em;
          ">
            👤 ${escapeHtml(fullName)} (offline)
          </span>
        `;
        
        const liLogout = document.createElement('li');
        liLogout.innerHTML = `
          <a onclick="ivtcLogout()" style="color:#f87171;cursor:pointer;font-size:0.72rem;letter-spacing:0.08em;">⏻ Logout</a>
        `;
        
        navLinks.appendChild(liUser);
        navLinks.appendChild(liLogout);
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addBackupNavbar);
      } else {
        addBackupNavbar();
      }
      
      return;
    }
    
    window.location.href = 'login.html';
  }

  // ============================================================
  // ORIGINAL LOGOUT FUNCTION (with backup clear added)
  // ============================================================
  
  window.ivtcLogout = async function () {
    if (!confirm('Are you sure you want to logout?')) return;
    try {
      await fetch(window.API_BASE_URL + '/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    clearSessionBackup();
    window.location.href = 'login.html';
  };

  // ============================================================
  // ORIGINAL ESCAPE FUNCTION (unchanged)
  // ============================================================
  
  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

})();
