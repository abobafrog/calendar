export function resetMobileViewport() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  window.requestAnimationFrame(() => window.scrollTo(0, 0))
}
