import { auth } from '../../auth.js';
import { api } from '../../api.js';
import { router } from '../../router.js';
import { icon } from '../../icons.js';

const primaryLinks = [
  { label: 'Dashboard', to: '/app', end: true },
  { label: 'Planner', to: '/app/planner' },
  { label: 'Goals', to: '/app/goals' },
  { label: 'Inbox', to: '/app/inbox' },
  { label: 'Learn', to: '/app/learn' },
];

const accountMenuItems = [
  { label: 'Reminders', to: '/app/reminders', icon: 'bell' },
  { label: 'Study guide', to: '/app/assistant', icon: 'graduation' },
  { label: 'Study groups', to: '/app/workspaces', icon: 'user' },
  { label: 'Settings', to: '/app/settings', icon: 'user' },
  { label: 'Plan & billing', to: '/app/billing', icon: 'user' },
];

export function TopBar() {
  const header = document.createElement('header');
  header.className = 'topbar';
  header.style.position = 'sticky';
  header.style.top = '0';
  header.style.zIndex = '50';
  header.style.height = '56px';
  header.style.borderBottom = '1px solid var(--border-card)';
  header.style.background = 'color-mix(in srgb, var(--bg-main) 92%, transparent)';
  header.style.backdropFilter = 'blur(14px)';
  header.style.color = 'var(--text-main)';

  const inner = document.createElement('div');
  inner.className = 'topbar-inner';
  inner.style.display = 'flex';
  inner.style.alignItems = 'center';
  inner.style.justifyContent = 'space-between';
  inner.style.gap = '0.75rem';
  inner.style.padding = '0 1rem';
  inner.style.height = '100%';
  inner.style.maxWidth = '1280px';
  inner.style.margin = '0 auto';
  inner.style.width = '100%';

  const notifications = [];
  let workspaces = [];
  let activeWorkspaceId = api.getWorkspaceId() ?? '';
  let isNotifOpen = false;
  let isAccountOpen = false;
  let isMenuOpen = false;

  const mobileMenuBtn = document.createElement('button');
  mobileMenuBtn.type = 'button';
  mobileMenuBtn.className = 'mobile-menu-button';
  mobileMenuBtn.style.display = 'none';
  mobileMenuBtn.setAttribute('aria-label', isMenuOpen ? 'Close navigation menu' : 'Open navigation menu');
  mobileMenuBtn.setAttribute('aria-expanded', isMenuOpen);
  mobileMenuBtn.onclick = () => {
    isMenuOpen = !isMenuOpen;
    mobileMenuBtn.setAttribute('aria-expanded', isMenuOpen);
    mobileMenuBtn.textContent = isMenuOpen ? '' : '';
    mobileMenuBtn.appendChild(icon(isMenuOpen ? 'x' : 'menu'));
    updateDrawerVisibility();
  };
  mobileMenuBtn.appendChild(icon('menu'));

  const brandLink = document.createElement('a');
  brandLink.className = 'topbar-brand';
  brandLink.href = '/app';
  brandLink.style.display = 'inline-flex';
  brandLink.style.alignItems = 'center';
  brandLink.style.gap = '0.5rem';
  brandLink.style.color = 'var(--text-main)';
  brandLink.style.fontFamily = 'var(--font-display)';
  brandLink.style.fontSize = '1.05rem';
  brandLink.style.fontWeight = '600';
  brandLink.style.letterSpacing = '-0.03em';
  brandLink.style.textDecoration = 'none';
  brandLink.style.flex = '0 0 auto';
  brandLink.onclick = (e) => { e.preventDefault(); router.navigate('/app'); closeMenus(); };

  const brandMark = document.createElement('span');
  brandMark.className = 'topbar-brand-mark';
  brandMark.style.display = 'grid';
  brandMark.style.width = '30px';
  brandMark.style.height = '30px';
  brandMark.style.placeItems = 'center';
  brandMark.style.color = '#fff9ef';
  brandMark.style.borderRadius = '9px 9px 9px 3px';
  brandMark.style.background = 'linear-gradient(145deg, var(--accent-primary), var(--accent-primary-hover))';
  brandMark.appendChild(icon('graduation'));
  const brandCopy = document.createElement('span');
  const span1 = document.createElement('span');
  span1.textContent = 'Student';
  const span2 = document.createElement('span');
  span2.textContent = 'OS';
  span2.style.color = 'var(--accent-primary)';
  brandCopy.appendChild(span1);
  brandCopy.appendChild(span2);
  brandLink.appendChild(brandMark);
  brandLink.appendChild(brandCopy);

  const nav = document.createElement('nav');
  nav.className = 'topbar-navigation';
  nav.style.display = 'flex';
  nav.style.alignItems = 'center';
  nav.style.gap = '0.12rem';
  nav.style.marginLeft = '1rem';
  nav.style.flex = '0 1 auto';
  nav.style.minWidth = '0';
  nav.style.overflowX = 'auto';

  const navLinks = [];
  primaryLinks.forEach((link) => {
    const a = document.createElement('a');
    a.className = 'topbar-nav-link';
    a.href = link.to;
    a.style.flex = '0 0 auto';
    a.style.padding = '0.55rem 0.5rem';
    a.style.color = 'var(--text-muted)';
    a.style.borderRadius = '7px';
    a.style.fontSize = '0.78rem';
    a.style.fontWeight = '600';
    a.style.textDecoration = 'none';
    a.style.whiteSpace = 'nowrap';
    a.style.transition = 'color 160ms ease, background-color 160ms ease';
    a.style.borderBottom = '2px solid transparent';
    a.onclick = (e) => { e.preventDefault(); router.navigate(link.to); closeMenus(); setActive(link.to); };
    a.textContent = link.label;
    nav.appendChild(a);
    navLinks.push({ el: a, to: link.to });
  });

  function setActive(_activeTo) {
    const path = window.location.pathname.split('?')[0];
    navLinks.forEach(({ el, to }) => {
      let active = path === to;
      if (to === '/app/learn') {
        active = active || ['/app/learn', '/app/knowledge', '/app/knowledge/manage', '/app/assistant'].includes(path);
      }
      el.className = `topbar-nav-link${active ? ' is-active' : ''}`;
    });
  }

  const searchForm = document.createElement('form');
  searchForm.className = 'topbar-search';
  searchForm.style.display = 'flex';
  searchForm.style.alignItems = 'center';
  searchForm.style.gap = '0.4rem';
  searchForm.style.padding = '0.35rem 0.7rem';
  searchForm.style.border = '1px solid var(--border-card)';
  searchForm.style.borderRadius = 'var(--radius-full)';
  searchForm.style.background = 'var(--bg-input)';
  searchForm.style.color = 'var(--text-main)';
  searchForm.style.flex = '0 0 auto';
  searchForm.style.minWidth = '0';

  const searchIcon = icon('search');
  searchIcon.className = 'topbar-search-icon';
  searchIcon.style.color = 'var(--text-muted)';
  searchForm.appendChild(searchIcon);

  const searchInput = document.createElement('input');
  searchInput.className = 'input topbar-search-input';
  searchInput.placeholder = 'Search tasks';
  searchInput.style.flex = '1';
  searchInput.style.minWidth = '0';
  searchInput.style.border = 'none';
  searchInput.style.background = 'transparent';
  searchInput.style.color = 'inherit';
  searchInput.style.font = 'inherit';
  searchInput.style.fontSize = '0.78rem';
  searchInput.style.outline = 'none';
  searchInput.style.padding = '0.1rem 0';

  let searchQuery = '';
  searchInput.addEventListener('input', (e) => { searchQuery = e.target.value; });
  searchForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    router.navigate(`/app/planner?q=${encodeURIComponent(q)}`);
    closeMenus();
  });
  searchForm.appendChild(searchInput);

  const actions = document.createElement('div');
  actions.className = 'topbar-actions';
  actions.style.display = 'flex';
  actions.style.alignItems = 'center';
  actions.style.gap = '0.5rem';
  actions.style.flex = '0 0 auto';

  const notifControl = document.createElement('div');
  notifControl.className = 'notification-control';
  notifControl.style.position = 'relative';

  const notifBtn = document.createElement('button');
  notifBtn.type = 'button';
  notifBtn.className = 'btn btn-outline btn-icon';
  notifBtn.setAttribute('aria-label', 'Notifications');
  notifBtn.setAttribute('aria-expanded', isNotifOpen);
  notifBtn.setAttribute('aria-haspopup', 'menu');
  notifBtn.title = 'Notifications';
  notifBtn.onclick = () => { isNotifOpen = !isNotifOpen; updateNotifDropdown(); };

  const bell = icon('bell');
  bell.style.width = '18px';
  bell.style.height = '18px';
  notifBtn.appendChild(bell);

  const notifDot = document.createElement('span');
  notifDot.className = 'topbar-notif-dot';
  notifDot.style.position = 'absolute';
  notifDot.style.top = '2px';
  notifDot.style.right = '2px';
  notifDot.style.width = '7px';
  notifDot.style.height = '7px';
  notifDot.style.borderRadius = '50%';
  notifDot.style.background = 'var(--accent-danger)';
  notifDot.style.border = '1.5px solid var(--bg-main)';
  notifDot.setAttribute('aria-label', '0 unread notifications');
  notifBtn.appendChild(notifBtn);
  notifBtn.appendChild(notifDot);
  notifControl.appendChild(notifBtn);

  const notifDropdown = document.createElement('div');
  notifDropdown.style.position = 'fixed';
  notifDropdown.style.top = 'calc(100% + 8px)';
  notifDropdown.style.right = '0';
  notifDropdown.style.width = '360px';
  notifDropdown.style.maxHeight = '440px';
  notifDropdown.style.overflowY = 'auto';
  notifDropdown.style.zIndex = '50';
  notifDropdown.style.padding = '0.75rem';
  notifDropdown.style.backgroundColor = 'var(--bg-modal)';
  notifDropdown.style.borderColor = 'var(--border-card)';
  notifDropdown.style.boxShadow = 'var(--shadow-modal)';
  notifDropdown.style.display = 'none';

  const backdrop = document.createElement('div');
  backdrop.style.position = 'fixed';
  backdrop.style.top = '0';
  backdrop.style.left = '0';
  backdrop.style.right = '0';
  backdrop.style.bottom = '0';
  backdrop.style.zIndex = '40';
  backdrop.style.display = 'none';
  backdrop.onclick = () => { isNotifOpen = false; updateNotifDropdown(); };

  function updateNotifDropdown() {
    notifDropdown.style.display = isNotifOpen ? 'block' : 'none';
    backdrop.style.display = isNotifOpen ? 'block' : 'none';
    renderNotifList();
  }

  function renderNotifList() {
    notifDropdown.innerHTML = '';
    const unreadCount = notifications.filter((n) => !n.is_read).length;
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';
    header.style.paddingBottom = '0.5rem';
    header.style.marginBottom = '0.5rem';
    header.style.borderBottom = '1px solid var(--border-card)';
    const span = document.createElement('span');
    span.style.fontSize = '0.875rem';
    span.style.fontWeight = '700';
    span.style.color = 'var(--text-main)';
    span.textContent = `Notifications (${unreadCount} new)`;
    header.appendChild(span);
    notifDropdown.appendChild(header);

    if (notifications.length === 0) {
      const empty = document.createElement('div');
      empty.style.textAlign = 'center';
      empty.style.padding = '1.5rem 0';
      empty.style.color = 'var(--text-dim)';
      empty.style.fontSize = '0.8125rem';
      empty.textContent = 'No active reminders or notifications';
      notifDropdown.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexDirection = 'column';
      list.style.gap = '0.5rem';
      notifications.forEach((n) => {
        const item = document.createElement('div');
        item.style.padding = '0.625rem 0.75rem';
        item.style.borderRadius = 'var(--radius-md)';
        item.style.backgroundColor = n.is_read ? 'transparent' : 'var(--accent-primary-glow)';
        item.style.border = '1px solid';
        item.style.borderColor = n.is_read ? 'var(--border-subtle)' : 'var(--accent-border-soft)';
        item.style.display = 'flex';
        item.style.gap = '0.625rem';
        item.style.alignItems = 'flex-start';

        const alertIcon = icon('alertCircle');
        alertIcon.style.width = '16px';
        alertIcon.style.height = '16px';
        alertIcon.style.color = 'var(--accent-warning)';
        alertIcon.style.flexShrink = '0';
        alertIcon.style.marginTop = '2px';
        item.appendChild(alertIcon);

        const body = document.createElement('div');
        body.style.flex = '1';
        const title = document.createElement('div');
        title.style.fontSize = '0.8125rem';
        title.style.fontWeight = '600';
        title.style.color = 'var(--text-main)';
        title.textContent = n.title;
        body.appendChild(title);
        const msg = document.createElement('div');
        msg.style.fontSize = '0.75rem';
        msg.style.color = 'var(--text-muted)';
        msg.style.marginTop = '2px';
        msg.textContent = n.message;
        body.appendChild(msg);
        const time = document.createElement('div');
        time.style.fontSize = '0.6875rem';
        time.style.color = 'var(--text-dim)';
        time.style.marginTop = '4px';
        time.textContent = new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        body.appendChild(time);
        item.appendChild(body);

        const actionsDiv = document.createElement('div');
        actionsDiv.style.display = 'flex';
        actionsDiv.style.gap = '4px';
        if (!n.is_read) {
          const markRead = document.createElement('button');
          markRead.type = 'button';
          markRead.title = 'Mark as read';
          markRead.className = 'btn btn-outline btn-icon btn-sm';
          markRead.style.padding = '4px';
          markRead.style.border = 'none';
          markRead.style.color = 'var(--accent-success)';
          markRead.appendChild(icon('check'));
          markRead.onclick = (e) => { e.stopPropagation(); markNotificationRead(n.id); };
          actionsDiv.appendChild(markRead);
        }
        const dismiss = document.createElement('button');
        dismiss.type = 'button';
        dismiss.title = 'Dismiss';
        dismiss.className = 'btn btn-outline btn-icon btn-sm';
        dismiss.style.padding = '4px';
        dismiss.style.border = 'none';
        dismiss.style.color = 'var(--text-dim)';
        dismiss.appendChild(icon('trash2'));
        dismiss.onclick = (e) => { e.stopPropagation(); dismissNotification(n.id); };
        actionsDiv.appendChild(dismiss);
        item.appendChild(actionsDiv);
        list.appendChild(item);
      });
      notifDropdown.appendChild(list);
    }
  }

  async function fetchNotifications() {
    try {
      const data = await api.listNotifications();
      notifications.length = 0;
      notifications.push(...data);
      renderNotifList();
    } catch {
      // ignore
    }
  }

  async function markNotificationRead(id) {
    try {
      await api.markNotificationRead(id);
      const n = notifications.find((x) => x.id === id);
      if (n) n.is_read = true;
      renderNotifList();
    } catch (err) {
      console.error(err);
    }
  }

  async function dismissNotification(id) {
    try {
      await api.dismissNotification(id);
      const idx = notifications.findIndex((n) => n.id === id);
      if (idx !== -1) notifications.splice(idx, 1);
      renderNotifList();
    } catch (err) {
      console.error(err);
    }
  }

  notifControl.appendChild(backdrop);
  notifControl.appendChild(notifDropdown);
  actions.appendChild(notifControl);

  const account = document.createElement('div');
  account.className = 'topbar-account';
  account.style.display = 'inline-flex';
  account.style.alignItems = 'center';
  account.style.gap = '0.5rem';
  account.style.padding = '0.35rem 0.75rem';
  account.style.borderRadius = 'var(--radius-full)';
  account.style.border = '1px solid var(--border-card)';
  account.style.background = 'var(--bg-card)';
  account.style.color = 'var(--text-main)';
  account.style.cursor = 'pointer';
  account.setAttribute('aria-label', 'Account menu');
  account.setAttribute('aria-expanded', isAccountOpen);
  account.setAttribute('aria-haspopup', 'menu');
  account.setAttribute('role', 'button');
  account.tabIndex = 0;
  account.onclick = () => { isAccountOpen = !isAccountOpen; updateAccountMenu(); };
  account.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isAccountOpen = !isAccountOpen; updateAccountMenu(); } };

  const avatar = document.createElement('div');
  avatar.className = 'avatar';
  avatar.style.display = 'grid';
  avatar.style.width = '28px';
  avatar.style.height = '28px';
  avatar.style.placeItems = 'center';
  avatar.style.borderRadius = 'var(--radius-full)';
  avatar.style.background = 'var(--accent-primary)';
  avatar.style.color = '#ffffff';
  avatar.style.fontWeight = '700';
  avatar.style.fontSize = '0.8125rem';

  const accountName = document.createElement('span');
  accountName.className = 'topbar-account-name';
  accountName.style.overflow = 'hidden';
  accountName.style.textOverflow = 'ellipsis';
  accountName.style.whiteSpace = 'nowrap';
  accountName.style.fontSize = '0.875rem';
  accountName.style.fontWeight = '600';
  accountName.style.minWidth = '0';

  const chevron = icon('chevronDown');
  chevron.className = 'topbar-account-chevron';
  chevron.style.color = 'var(--text-muted)';

  const accountMenuBackdrop = document.createElement('div');
  accountMenuBackdrop.style.position = 'fixed';
  accountMenuBackdrop.style.inset = '0';
  accountMenuBackdrop.style.zIndex = '45';
  accountMenuBackdrop.style.cursor = 'pointer';
  accountMenuBackdrop.style.display = 'none';
  accountMenuBackdrop.onclick = () => { isAccountOpen = false; updateAccountMenu(); };

  const accountMenu = document.createElement('div');
  accountMenu.className = 'topbar-account-menu';
  accountMenu.style.position = 'fixed';
  accountMenu.style.top = '60px';
  accountMenu.style.right = '0';
  accountMenu.style.width = '300px';
  accountMenu.style.zIndex = '50';
  accountMenu.style.background = 'var(--bg-card)';
  accountMenu.style.border = '1px solid var(--border-card)';
  accountMenu.style.borderRadius = 'var(--radius-lg)';
  accountMenu.style.boxShadow = 'var(--shadow-modal)';
  accountMenu.style.color = 'var(--text-main)';
  accountMenu.style.display = 'flex';
  accountMenu.style.flexDirection = 'column';
  accountMenu.style.transform = 'translateY(-10px)';
  accountMenu.style.opacity = '0';
  accountMenu.style.pointerEvents = 'none';
  accountMenu.style.transition = 'transform 160ms ease, opacity 160ms ease';

  function updateAccountMenu() {
    accountName.textContent = auth.user?.full_name || auth.user?.email || '';
    avatar.textContent = auth.user?.full_name ? auth.user.full_name[0].toUpperCase() : '';
    if (!avatar.textContent) avatar.appendChild(icon('user'));
    account.setAttribute('aria-expanded', isAccountOpen);
    accountMenuBackdrop.style.display = isAccountOpen ? 'block' : 'none';
    accountMenu.className = isAccountOpen ? 'topbar-account-menu is-open' : 'topbar-account-menu';
    renderAccountMenu();
  }

  function renderAccountMenu() {
    accountMenu.innerHTML = '';
    const headerDiv = document.createElement('div');
    headerDiv.className = 'topbar-account-menu-header';
    headerDiv.style.display = 'flex';
    headerDiv.style.alignItems = 'center';
    headerDiv.style.gap = '0.75rem';
    headerDiv.style.padding = '0.85rem 1rem';
    headerDiv.style.borderBottom = '1px solid var(--border-card)';

    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'avatar';
    avatarDiv.style.width = '36px';
    avatarDiv.style.height = '36px';
    avatarDiv.style.fontSize = '1rem';
    avatarDiv.textContent = auth.user?.full_name ? auth.user.full_name[0].toUpperCase() : '';
    if (!avatarDiv.textContent) avatarDiv.appendChild(icon('user'));
    headerDiv.appendChild(avatarDiv);

    const info = document.createElement('div');
    info.style.display = 'flex';
    info.style.flexDirection = 'column';
    info.style.minWidth = '0';
    const nameDiv = document.createElement('div');
    nameDiv.className = 'topbar-account-menu-name';
    nameDiv.textContent = auth.user?.full_name || '';
    info.appendChild(nameDiv);
    const emailDiv = document.createElement('div');
    emailDiv.className = 'topbar-account-menu-email';
    emailDiv.textContent = auth.user?.email || '';
    info.appendChild(emailDiv);
    headerDiv.appendChild(info);
    accountMenu.appendChild(headerDiv);

    if (workspaces.length > 0) {
      const section = document.createElement('div');
      section.className = 'topbar-account-menu-section';
      section.style.padding = '0.5rem 0';
      const title = document.createElement('label');
      title.className = 'topbar-account-menu-section-title';
      title.textContent = 'Workspace';
      title.style.padding = '0.5rem 1rem 0.25rem';
      title.style.color = 'var(--text-muted)';
      title.style.fontSize = '0.62rem';
      title.style.fontWeight = '700';
      title.style.letterSpacing = '0.14em';
      title.style.textTransform = 'uppercase';
      section.appendChild(title);
      const select = document.createElement('select');
      select.className = 'input topbar-account-menu-workspace';
      select.style.width = '100%';
      select.style.padding = '0.45rem 1.2rem 0.45rem 0.65rem';
      select.style.fontSize = '0.78rem';
      select.style.marginBottom = '0.5rem';
      select.value = activeWorkspaceId;
      workspaces.forEach((w) => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = w.is_personal ? `Personal · ${w.name}` : `Study group · ${w.name}`;
        select.appendChild(opt);
      });
      select.onchange = (e) => {
        const wid = e.target.value;
        activeWorkspaceId = wid;
        api.setWorkspaceId(wid);
        router.navigate('/app/learn');
        isAccountOpen = false;
        updateAccountMenu();
      };
      section.appendChild(select);
      accountMenu.appendChild(section);
    }

    const navMenu = document.createElement('nav');
    navMenu.className = 'topbar-account-menu-nav';
    navMenu.style.display = 'flex';
    navMenu.style.flexDirection = 'column';
    navMenu.style.gap = '0.05rem';
    accountMenuItems.forEach((item) => {
      const link = document.createElement('a');
      link.className = 'topbar-account-menu-link';
      link.href = item.to;
      link.style.display = 'inline-flex';
      link.style.alignItems = 'center';
      link.style.gap = '0.6rem';
      link.style.width = '100%';
      link.style.padding = '0.6rem 1rem';
      link.style.borderRadius = '0';
      link.style.color = 'var(--text-main)';
      link.style.fontWeight = '500';
      link.style.fontSize = '0.88rem';
      link.style.textDecoration = 'none';
      link.style.background = 'transparent';
      link.style.border = 'none';
      link.style.textAlign = 'left';
      link.style.cursor = 'pointer';
      link.appendChild(icon(item.icon));
      const label = document.createTextNode(item.label);
      link.appendChild(label);
      link.onclick = (e) => { e.preventDefault(); router.navigate(item.to); isAccountOpen = false; updateAccountMenu(); };
      navMenu.appendChild(link);
    });
    const logoutBtn = document.createElement('button');
    logoutBtn.type = 'button';
    logoutBtn.className = 'topbar-account-menu-link topbar-account-menu-link-danger';
    logoutBtn.style.color = 'var(--accent-danger)';
    logoutBtn.style.borderTop = '1px solid var(--border-card)';
    logoutBtn.style.marginTop = '0.25rem';
    logoutBtn.style.paddingTop = '0.75rem';
    logoutBtn.appendChild(icon('logout'));
    const logoutLabel = document.createTextNode(' Sign out');
    logoutBtn.appendChild(logoutLabel);
    logoutBtn.onclick = async () => {
      await auth.logout();
      isAccountOpen = false;
      isMenuOpen = false;
      updateAccountMenu();
      router.navigate('/login');
    };
    navMenu.appendChild(logoutBtn);
    accountMenu.appendChild(navMenu);
  }

  async function loadWorkspaces() {
    try {
      const data = await api.listWorkspaces();
      workspaces = data;
      if (!activeWorkspaceId) {
        activeWorkspaceId = data.find((w) => w.is_personal)?.id ?? '';
        api.setWorkspaceId(activeWorkspaceId);
      }
      renderAccountMenu();
    } catch {
      // ignore
    }
  }

  async function fetchNotificationsInit() {
    await fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }

  function closeMenus() {
    isNotifOpen = false;
    isAccountOpen = false;
    isMenuOpen = false;
    updateNotifDropdown();
    updateAccountMenu();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') closeMenus();
  }

  let notifIntervalCleanup;
  async function init() {
    notifIntervalCleanup = await fetchNotificationsInit();
    await loadWorkspaces();
    setActive(window.location.pathname.split('?')[0]);
    window.addEventListener('popstate', () => setActive(window.location.pathname.split('?')[0]));
    header.addEventListener('keydown', handleKeyDown);
  }
  init();

  inner.appendChild(mobileMenuBtn);
  inner.appendChild(brandLink);
  inner.appendChild(nav);
  inner.appendChild(searchForm);
  inner.appendChild(actions);
  header.appendChild(inner);
  header.appendChild(accountMenuBackdrop);
  header.appendChild(accountMenu);

  return { element: header, cleanup: () => { if (notifIntervalCleanup) notifIntervalCleanup(); window.removeEventListener('popstate', () => setActive(window.location.pathname.split('?')[0])); header.removeEventListener('keydown', handleKeyDown); } };
}
