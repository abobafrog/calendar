/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PropsWithChildren } from 'react'

export type AppLanguage = 'mur' | 'ru'

const DIRECT_WORDS: Record<string, string> = {
  я: 'ч',
  меня: 'ча',
  мне: 'чу',
  мной: 'чой',
  жена: 'жинка',
  жены: 'жинки',
  жену: 'жинку',
  женой: 'жинкой',
  друг: 'друн',
  друга: 'друна',
  другу: 'друну',
  другом: 'друном',
  друзья: 'друны',
  друзей: 'друнов',
  друзьям: 'друнам',
  друзьями: 'друнами',
  сын: 'сыр',
  сына: 'сыра',
  сыну: 'сыру',
  сыном: 'сыром',
  сыновья: 'сыры',
  сыновей: 'сыров',
  массажные: 'массажность',
  столы: 'столность',
}

const EXCEPTIONS = new Set([
  'бурмалда',
  'бурмалду',
  'бурмалды',
  'бурмалдой',
  'бурмалдеть',
  'хаммам',
  'хаммама',
  'хаммаме',
  'хаммамом',
])

const FUNCTION_WORDS = new Set([
  'а',
  'без',
  'был',
  'была',
  'были',
  'в',
  'вам',
  'вас',
  'ваш',
  'ваша',
  'ваше',
  'ваши',
  'все',
  'всех',
  'вы',
  'где',
  'да',
  'для',
  'до',
  'его',
  'ее',
  'её',
  'если',
  'есть',
  'за',
  'и',
  'из',
  'или',
  'их',
  'как',
  'когда',
  'кто',
  'ли',
  'между',
  'мы',
  'на',
  'над',
  'нам',
  'нас',
  'наш',
  'не',
  'него',
  'нее',
  'неё',
  'нет',
  'ни',
  'но',
  'о',
  'об',
  'он',
  'она',
  'они',
  'оно',
  'от',
  'по',
  'под',
  'при',
  'про',
  'с',
  'со',
  'так',
  'то',
  'только',
  'у',
  'уже',
  'через',
  'что',
  'это',
  'этой',
  'этот',
  'эту',
])

const VERBS = new Set([
  'авторизоваться',
  'бурмалдеть',
  'включены',
  'включено',
  'включён',
  'включить',
  'видеть',
  'видит',
  'видно',
  'войти',
  'выбрать',
  'выбран',
  'выбрано',
  'выбраны',
  'выключены',
  'выключить',
  'готовлю',
  'добавлено',
  'добавить',
  'договариваться',
  'заблокирован',
  'завершена',
  'завершено',
  'завершён',
  'загрузить',
  'загружаем',
  'закроется',
  'запускает',
  'изменить',
  'используется',
  'найдено',
  'найден',
  'найдена',
  'найдены',
  'найти',
  'напомнить',
  'настроен',
  'настроить',
  'обновлён',
  'обновить',
  'ожидает',
  'отклонить',
  'отклонил',
  'отклонена',
  'отклонено',
  'открыл',
  'открыть',
  'отметить',
  'отмечать',
  'отменил',
  'отменена',
  'отменено',
  'отправили',
  'отправлен',
  'отправлена',
  'отправлено',
  'пересчитается',
  'поделиться',
  'подтверждена',
  'показать',
  'показывать',
  'показывается',
  'получает',
  'помогает',
  'появится',
  'появятся',
  'предлагает',
  'предлагается',
  'предложили',
  'приглашает',
  'применён',
  'принял',
  'приняли',
  'принять',
  'проверить',
  'проверяем',
  'разрешено',
  'разрешён',
  'работает',
  'сверяем',
  'сделать',
  'скачать',
  'скопирован',
  'скопирована',
  'скрыл',
  'скрыть',
  'сохранить',
  'сохранено',
  'сохранена',
  'сохранены',
  'сохранён',
  'сохраняем',
  'создать',
  'сходить',
  'увидеть',
  'удалён',
  'удалить',
  'установлено',
  'установить',
  'учитывается',
  'участвует',
  'устарели',
])

const VERB_ENDINGS = [
  'ешь',
  'ишь',
  'ете',
  'ите',
  'ают',
  'яют',
  'уют',
  'ает',
  'яет',
  'ует',
  'ются',
  'атся',
  'ятся',
  'ется',
  'ится',
  'ем',
  'им',
  'ют',
  'ут',
  'ят',
  'ат',
  'ет',
  'ёт',
  'ит',
]

const originalTextNodes = new WeakMap<Text, string>()
const originalAttributes = new WeakMap<Element, Record<string, string>>()

function preserveCase(source: string, translated: string) {
  if (source === source.toUpperCase()) return translated.toUpperCase()
  if (source[0] === source[0]?.toUpperCase()) {
    return translated[0]?.toUpperCase() + translated.slice(1)
  }
  return translated
}

export function murinskyWord(source: string) {
  const word = source.toLowerCase()
  const direct = DIRECT_WORDS[word]
  if (direct) return preserveCase(source, direct)
  if (
    word.length <= 2 ||
    EXCEPTIONS.has(word) ||
    FUNCTION_WORDS.has(word) ||
    VERBS.has(word) ||
    VERB_ENDINGS.some((ending) => word.endsWith(ending)) ||
    word.endsWith('ость') ||
    word.endsWith('ности') ||
    word.endsWith('ностью') ||
    word.endsWith('ть') ||
    word.endsWith('ться') ||
    word.endsWith('тся')
  )
    return source

  let stem = word
  let ending = 'ность'
  if (/[аяоёеэю]$/u.test(stem)) {
    stem = stem.slice(0, -1)
    ending = 'ость'
  } else if (/[ыи]$/u.test(stem)) {
    stem = stem.slice(0, -1)
  } else if (stem.endsWith('ь')) {
    stem = stem.slice(0, -1)
  }
  return preserveCase(source, `${stem}${ending}`)
}

export function toMurinsky(text: string) {
  return text.replace(/[А-Яа-яЁё]+/gu, (word) => murinskyWord(word))
}

interface LanguageContextValue {
  language: AppLanguage
  setLanguage: (language: AppLanguage) => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('timetogether:language')
    return saved === 'ru' ? 'ru' : 'mur'
  })
  const value = useMemo<LanguageContextValue>(
    () => ({
      language,
      setLanguage: (next) => {
        localStorage.setItem('timetogether:language', next)
        setLanguageState(next)
      },
    }),
    [language],
  )

  useEffect(() => {
    document.documentElement.lang = language === 'mur' ? 'x-mur' : 'ru'
    document.title = language === 'mur' ? toMurinsky('Время вместе') : 'Время вместе'
    const translateText = (node: Text) => {
      const parent = node.parentElement
      if (!parent || parent.closest('[data-no-translate]')) return
      const current = node.nodeValue ?? ''
      const previous = originalTextNodes.get(node)
      if (previous === undefined || (current !== previous && current !== toMurinsky(previous))) {
        originalTextNodes.set(node, current)
      }
      const original = originalTextNodes.get(node) ?? current
      const next = language === 'mur' ? toMurinsky(original) : original
      if (current !== next) node.nodeValue = next
    }

    const translateElement = (element: Element) => {
      if (element.closest('[data-no-translate]')) return
      const attributes = ['placeholder', 'title', 'aria-label']
      const remembered = originalAttributes.get(element) ?? {}
      for (const name of attributes) {
        const current = element.getAttribute(name)
        if (!current) continue
        if (
          !remembered[name] ||
          (current !== remembered[name] && current !== toMurinsky(remembered[name]))
        ) {
          remembered[name] = current
        }
        element.setAttribute(
          name,
          language === 'mur' ? toMurinsky(remembered[name]) : remembered[name],
        )
      }
      originalAttributes.set(element, remembered)
    }

    const translateTree = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) translateText(root as Text)
      if (root.nodeType === Node.ELEMENT_NODE) {
        const element = root as Element
        translateElement(element)
        element.querySelectorAll('*').forEach(translateElement)
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
        let textNode = walker.nextNode()
        while (textNode) {
          translateText(textNode as Text)
          textNode = walker.nextNode()
        }
      }
    }

    translateTree(document.body)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData') translateText(mutation.target as Text)
        mutation.addedNodes.forEach(translateTree)
      }
    })
    observer.observe(document.body, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('LanguageProvider is missing')
  return value
}
