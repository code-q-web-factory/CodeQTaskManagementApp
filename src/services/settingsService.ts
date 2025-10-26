import { EXCLUDED_TAG_IDS, FOCUSED_WORK_PRESETS } from '../config/asana'
import type { FocusedTabConfig, FocusedTabsConfig } from '../types/common'

const STORAGE_KEY = 'aqm:v1:focusedTabs'

function generateId(label: string): string {
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `${slug}-${Math.random().toString(36).slice(2, 8)}`
}

function readRaw(): FocusedTabsConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as FocusedTabsConfig
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.tabs)) return null
    return parsed
  } catch {
    return null
  }
}

function writeRaw(cfg: FocusedTabsConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg))
  } catch {
    // ignore quota errors
  }
}

function seedDefaults(): FocusedTabsConfig {
  const tabs: FocusedTabConfig[] = []
  for (const [label, ids] of Object.entries(FOCUSED_WORK_PRESETS)) {
    if (label === 'Other') continue
    tabs.push({
      id: generateId(label),
      label,
      projectIds: [...ids],
      includeTagIds: [],
      excludeTagIds: Array.from(EXCLUDED_TAG_IDS),
    })
  }
  // Ensure Code Q Delegated exists with includeTagIds = excluded tags
  const delegatedLabel = 'Code Q Delegated'
  if (!tabs.some((t) => t.label === delegatedLabel)) {
    tabs.push({
      id: generateId(delegatedLabel),
      label: delegatedLabel,
      projectIds: [],
      includeTagIds: Array.from(EXCLUDED_TAG_IDS),
      excludeTagIds: [],
    })
  }
  const cfg: FocusedTabsConfig = { version: 1, tabs }
  writeRaw(cfg)
  return cfg
}

export const settingsService = {
  getFocusedTabs(): FocusedTabsConfig {
    return readRaw() ?? seedDefaults()
  },

  saveFocusedTabs(cfg: FocusedTabsConfig): void {
    writeRaw(cfg)
  },

  resetFocusedTabsToDefaults(): FocusedTabsConfig {
    return seedDefaults()
  },
}


