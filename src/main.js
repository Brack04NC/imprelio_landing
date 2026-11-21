import '@fontsource-variable/manrope/wght.css';

const mobileMenu = document.querySelector('.mobile-nav');
const menuToggle = mobileMenu.querySelector('summary');

mobileMenu.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && mobileMenu.open) {
    mobileMenu.open = false;
    menuToggle.focus();
  }
});

mobileMenu.addEventListener('click', (event) => {
  const localLink = event.target.closest('a[href^="#"]');
  if (!localLink) return;

  mobileMenu.open = false;
  const section = document.querySelector(localLink.hash);
  section.setAttribute('tabindex', '-1');
  section.focus({ preventScroll: true });
});

document.addEventListener('pointerdown', (event) => {
  if (mobileMenu.open && !mobileMenu.contains(event.target)) {
    mobileMenu.open = false;
  }
});
