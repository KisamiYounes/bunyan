import ar from './messages/ar.json'
import en from './messages/en.json'
import fr from './messages/fr.json'
import { defaultLocale, type Locale } from './config'

export type Dictionary = typeof ar

const dictionaries: Record<Locale, Dictionary> = {
  ar,
  en: en as Dictionary,
  fr: fr as Dictionary,
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale]
}

export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key]
    return value === undefined ? match : String(value)
  })
}
