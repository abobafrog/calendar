const savedTheme = globalThis.localStorage.getItem('timetogether-theme')
globalThis.document.documentElement.dataset.theme =
  savedTheme === 'light' || savedTheme === 'contrast' ? savedTheme : 'dark'
