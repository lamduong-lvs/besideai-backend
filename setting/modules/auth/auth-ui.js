// setting/modules/auth/auth-ui.js - Authentication UI management

import { auth, SESSION_EVENTS } from '../../../modules/auth/auth.js';
import { showToast } from '../core/toast.js';
import { DEFAULT_USER_ICON } from '../../constants.js';

export async function initAuthUI() {
  // Setup event listeners
  setupUserProfileMenu();
  setupLogoutButton();
  setupLoginButton();
  
  // Register listeners BEFORE initializing auth to catch initial state
  auth.on(SESSION_EVENTS.CREATED, updateUserUI);
  auth.on(SESSION_EVENTS.DESTROYED, () => updateUserUI(null));
  auth.on(SESSION_EVENTS.EXPIRED, () => updateUserUI(null));
  
  // Initialize auth module and update UI with the initial user state
  try {
    console.log("[Setting] Initializing Auth...");
    await auth.initialize();
    console.log("[Setting] Auth Initialized. Getting current user...");
    const user = await auth.getCurrentUser();
    console.log("[Setting] Current user:", user);
    updateUserUI(user);
  } catch (error) {
    console.error("[Setting] Auth initialization failed:", error);
    updateUserUI(null);
  }
}

function setupUserProfileMenu() {
  const userProfileBtn = document.getElementById('userProfileBtn');
  const userDropdown = document.getElementById('userDropdown');
  
  userProfileBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown?.classList.toggle('show');
  });
  
  document.addEventListener('click', (e) => {
    if (!userProfileBtn?.contains(e.target) && !userDropdown?.contains(e.target)) {
      userDropdown?.classList.remove('show');
    }
  });
}

function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  const userDropdown = document.getElementById('userDropdown');
  logoutBtn?.addEventListener('click', async (e) => {
    e.preventDefault();
    userDropdown?.classList.remove('show');
    try {
      await auth.logout();
      showToast(window.Lang?.get('logoutSuccess') || 'Logged out successfully', 'success');
    } catch (error) {
      console.error('Logout failed:', error);
      showToast(window.Lang?.get('logoutError', { error: error.message }) || 'Logout failed', 'error');
    }
  });
}

function setupLoginButton() {
  const loginPromptBtn = document.getElementById('loginPromptBtn');
  loginPromptBtn?.addEventListener('click', handleLogin);
}

async function handleLogin() {
  const loginBtn = document.getElementById('loginPromptBtn');
  if (loginBtn) loginBtn.disabled = true;
  showToast(window.Lang?.get('loginRedirecting') || 'Redirecting...', 'info');
  try {
    await auth.login();
  } catch (error) {
    console.error('Login failed:', error);
    showToast(window.Lang?.get('loginError', { error: error.message }) || 'Login failed', 'error');
    if (loginBtn) loginBtn.disabled = false;
  }
}

function updateUserUI(user) {
  const loginModal = document.getElementById('loginPromptModal');
  const isLoggedIn = !!user;
  
  // Determine user details or defaults
  const avatarSrc = isLoggedIn ? (user.picture || DEFAULT_USER_ICON) : DEFAULT_USER_ICON;
  const userName = isLoggedIn ? (user.name || (window.Lang?.get('userNameDefault') || 'User')) : (window.Lang?.get('userNameNotLoggedIn') || 'Not logged in');
  const userEmail = isLoggedIn ? (user.email || '...') : '...';
  
  // Update all avatar images
  document.querySelectorAll('.user-avatar').forEach(img => {
    if (img.getAttribute('src') !== avatarSrc) {
      img.src = avatarSrc;
    }
    img.classList.toggle('has-picture', isLoggedIn && !!user.picture);
  });
  
  // Update all name/email display elements (spans, divs, etc.)
  document.querySelectorAll('.user-name-display:not(input)').forEach(el => el.textContent = userName);
  document.querySelectorAll('.user-email-display:not(input)').forEach(el => el.textContent = userEmail);
  
  // Update profile inputs
  const profileNameInput = document.getElementById('profileName');
  const profileEmailInput = document.getElementById('profileEmail');
  if (profileNameInput) profileNameInput.value = userName;
  if (profileEmailInput) profileEmailInput.value = userEmail;
  
  // Show or hide the login prompt modal
  if (loginModal) {
    loginModal.classList.toggle('show', !isLoggedIn);
  }
}

function showLoginModal() {
  const loginModal = document.getElementById('loginPromptModal');
  if (loginModal) {
    loginModal.classList.add('show');
  }
}

