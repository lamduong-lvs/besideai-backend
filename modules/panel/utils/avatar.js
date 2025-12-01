// avatar.js
// User avatar management utilities

const DEFAULT_USER_ICON = '../../icons/svg/icon/Users/User.svg';

if (typeof window !== 'undefined') {
  window.__AISidePanelUserAvatar = window.__AISidePanelUserAvatar || DEFAULT_USER_ICON;
}

export function updateUserAvatar(pictureUrl, Lang) {
  const userAvatarImg = document.getElementById('userAvatarImg');
  const userBtn = document.getElementById('userBtn');
  if (userAvatarImg && pictureUrl) {
    userAvatarImg.src = pictureUrl;
    userAvatarImg.classList.add('user-avatar-img');
    if (userBtn && Lang) userBtn.title = Lang.get("userAccountTitle");
  }
  if (typeof window !== 'undefined') {
    window.__AISidePanelUserAvatar = pictureUrl || DEFAULT_USER_ICON;
  }
}

export function resetUserAvatar(Lang) {
  const userAvatarImg = document.getElementById('userAvatarImg');
  const userBtn = document.getElementById('userBtn');
  if (userAvatarImg) {
    userAvatarImg.src = DEFAULT_USER_ICON;
    userAvatarImg.classList.remove('user-avatar-img');
    if (userBtn && Lang) userBtn.title = Lang.get("loginTitle");
  }
  if (typeof window !== 'undefined') {
    window.__AISidePanelUserAvatar = DEFAULT_USER_ICON;
  }
}

export { DEFAULT_USER_ICON };

