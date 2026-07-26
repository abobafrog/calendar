import { init, miniApp, retrieveRawInitData, themeParams, viewport } from '@tma.js/sdk-react'
import { apiRequest, setAccessToken } from '../api/client'

let initializationPromise: Promise<boolean> | null = null

export function initializeTelegram() {
  initializationPromise ??= initializeTelegramOnce()
  return initializationPromise
}

async function initializeTelegramOnce() {
  let initData: string | undefined
  try {
    init()
    initData = retrieveRawInitData()
  } catch {
    // Launch data can still be available when an optional SDK feature is unsupported.
    try {
      initData = retrieveRawInitData()
    } catch {
      return false
    }
  }

  if (!initData) return false

  try {
    const auth = await apiRequest<{ access_token: string }>('/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ init_data: initData }),
    })
    setAccessToken(auth.access_token)
  } catch {
    return false
  }

  void setupTelegramUi()
  return true
}

async function setupTelegramUi() {
  try {
    if (themeParams.mount.isAvailable()) {
      themeParams.mount()
      themeParams.bindCssVars()
    }
    if (miniApp.mount.isAvailable()) {
      miniApp.mount()
      miniApp.bindCssVars()
      miniApp.ready()
    }
    if (viewport.mount.isAvailable()) {
      await Promise.race([viewport.mount(), timeout(1500)])
      viewport.bindCssVars()
      if (viewport.expand.isAvailable()) viewport.expand()
    }
  } catch {
    // Optional Telegram UI enhancements must not block an authenticated session.
  }
}

function timeout(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
