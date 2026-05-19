/* ============================================================
   auth.js — IVTC Session Guard
   Checks session with Node.js server via /api/session
   Include FIRST in index.html before main.js
============================================================ */

(async function () {
  'use strict';

  try {
    const res = await fetch(window.API_BASE_URL + '/api/session', { credentials: 'include' });
    const data = await res.json();

    if (!data.loggedIn) {
      window.location.href = 'login.html';
      return;
    }

    if (data.user.role === 'admin') {
      window.location.href = 'admin.html';
      return;
    }

    window.IVTC_SESSION = data.user;

    // Wait for DOM to be fully loaded before modifying navbar
    function addUserToNavbar() {
      const navLinks = document.getElementById('navMenu');
      if (!navLinks) return;

      // Check if already added to avoid duplicates
      if (document.getElementById('nav-user-info')) return;

      const fullName = data.user.fullName || data.user.username || 'User';
      const username = data.user.username || 'user';

      // Create user info and logout items
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

    // Try immediately if DOM already loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', addUserToNavbar);
    } else {
      addUserToNavbar();
    }

  } catch (err) {
    console.error('Session check failed:', err);
    window.location.href = 'login.html';
  }

  window.ivtcLogout = async function () {
    if (!confirm('Are you sure you want to logout?')) return;
    try {
      await fetch(window.API_BASE_URL + '/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {}
    window.location.href = 'login.html';
  };

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

})();