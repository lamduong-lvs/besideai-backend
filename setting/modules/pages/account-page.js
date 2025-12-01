// setting/modules/pages/account-page.js - Account page

import { DEFAULT_USER_ICON } from '../../constants.js';

export function initAccountPage() {
  // Account page is mostly static, data is populated by auth-ui.js
}

export function updateAccountPage(user) {
  const avatar = document.getElementById('profileUserAvatar');
  const name = document.getElementById('profileName');
  const email = document.getElementById('profileEmail');
  
  if (avatar) {
    avatar.src = user?.picture || DEFAULT_USER_ICON;
    avatar.alt = user?.name || 'User';
  }
  if (name) name.value = user?.name || '';
  if (email) email.value = user?.email || '';
}

