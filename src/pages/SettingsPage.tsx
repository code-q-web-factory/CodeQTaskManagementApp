import { useEffect, useState } from 'react'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { asanaService } from '../services/asanaService'
import { everhourService } from '../services/everhourService'
import { settingsService } from '../services/settingsService'
import type { FocusedTabConfig, FocusedTabsConfig } from '../types/common'

export default function SettingsPage() {
  const [asanaToken, setAsanaToken] = useState('')
  const [everhourKey, setEverhourKey] = useState('')
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [projects, setProjects] = useState<Array<{ gid: string; name: string }>>([])
  const [tabsCfg, setTabsCfg] = useState<FocusedTabsConfig | null>(null)
  const [filter, setFilter] = useState('')

  useEffect(() => {
    setAsanaToken(localStorage.getItem('asanaToken') ?? '')
    setEverhourKey(localStorage.getItem('everhourKey') ?? '')
  }, [])

  useEffect(() => {
    // load tabs config immediately
    setTabsCfg(settingsService.getFocusedTabs())
  }, [])

  useEffect(() => {
    // try to init asana token and workspace to fetch projects
    ;(async () => {
      const token = asanaService.getToken() ?? localStorage.getItem('asanaToken')
      if (token) await asanaService.setToken(token)
      try {
        const workspaces = await asanaService.listWorkspaces()
        const ws = workspaces[0]
        if (ws) {
          setWorkspaceId(ws.gid)
          const projs = await asanaService.listProjectsForWorkspace(ws.gid)
          setProjects(projs)
        }
      } catch {
        // ignore if token not set yet
      }
    })()
  }, [])

  const save = async () => {
    localStorage.setItem('asanaToken', asanaToken)
    localStorage.setItem('everhourKey', everhourKey)
    await asanaService.setToken(asanaToken || null)
    everhourService.setApiKey(everhourKey || null)
    alert('Saved credentials locally')
  }

  const clearCaches = () => {
    asanaService.clearPersistentCache()
    alert('Caches cleared')
  }

  const updateTab = (id: string, next: Partial<FocusedTabConfig>) => {
    setTabsCfg((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tabs: prev.tabs.map((t) => (t.id === id ? { ...t, ...next } : t)),
      }
    })
  }

  const toggleProject = (tabId: string, projectId: string) => {
    setTabsCfg((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        tabs: prev.tabs.map((t) => {
          if (t.id !== tabId) return t
          const has = t.projectIds.includes(projectId)
          return { ...t, projectIds: has ? t.projectIds.filter((x) => x !== projectId) : [...t.projectIds, projectId] }
        }),
      }
    })
  }

  const addTab = () => {
    setTabsCfg((prev) => {
      if (!prev) return prev
      const id = Math.random().toString(36).slice(2, 10)
      const newTab: FocusedTabConfig = { id, label: 'New Tab', projectIds: [], includeTagIds: [], excludeTagIds: [] }
      return { ...prev, tabs: [...prev.tabs, newTab] }
    })
  }

  const deleteTab = (id: string) => {
    setTabsCfg((prev) => (prev ? { ...prev, tabs: prev.tabs.filter((t) => t.id !== id) } : prev))
  }

  const saveTabs = () => {
    if (tabsCfg) settingsService.saveFocusedTabs(tabsCfg)
    alert('Focused Work tabs saved')
  }

  const resetTabs = () => {
    const cfg = settingsService.resetFocusedTabsToDefaults()
    setTabsCfg(cfg)
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold dark:text-gray-100">Settings</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Store your API credentials in your browser. Data stays client-side.</p>

      <div className="mt-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="asana">Asana Personal Access Token</Label>
          <Input
            id="asana"
            value={asanaToken}
            onChange={(e) => setAsanaToken(e.target.value)}
            placeholder="pat_xxx..."
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="everhour">Everhour API Key</Label>
          <Input
            id="everhour"
            value={everhourKey}
            onChange={(e) => setEverhourKey(e.target.value)}
            placeholder="ehp_xxx..."
            autoComplete="off"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save}>Save</Button>
          <Button variant="secondary" onClick={clearCaches}>Clear caches</Button>
        </div>
      </div>

      {/* Focused Work Tabs */}
      <div className="mt-10">
        <h2 className="text-xl font-semibold dark:text-gray-100">Focused Work Tabs</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Configure tabs shown on the Focused Work page. "Other" is always available.</p>

        <div className="mt-4">
          <div className="space-y-6">
            {tabsCfg?.tabs.map((tab) => (
              <div key={tab.id} className="rounded-md border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-4">
                    <Label htmlFor={`tab-${tab.id}-label`}>Name</Label>
                    <Input id={`tab-${tab.id}-label`} value={tab.label} onChange={(e) => updateTab(tab.id, { label: e.target.value })} />
                  </div>
                  <Button className="mt-6" variant="secondary" onClick={() => deleteTab(tab.id)}>Delete</Button>
                </div>

                <div className="mt-4">
                  <Label>Projects</Label>
                  <div className="mt-2">
                    <Input placeholder="Filter projects..." value={filter} onChange={(e) => setFilter(e.target.value)} />
                  </div>
                  <div className="mt-2 max-h-48 overflow-auto border border-gray-200 dark:border-gray-800 rounded">
                    <div className="divide-y divide-gray-200 dark:divide-gray-800">
                      {projects
                        .filter((p) => (filter ? p.name.toLowerCase().includes(filter.toLowerCase()) : true))
                        .slice()
                        .sort((a, b) => {
                          const aChecked = tab.projectIds.includes(a.gid) ? 1 : 0
                          const bChecked = tab.projectIds.includes(b.gid) ? 1 : 0
                          if (aChecked !== bChecked) return bChecked - aChecked
                          return a.name.localeCompare(b.name)
                        })
                        .map((p) => {
                          const checked = tab.projectIds.includes(p.gid)
                          return (
                            <label key={p.gid} className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none">
                              <input type="checkbox" checked={checked} onChange={() => toggleProject(tab.id, p.gid)} />
                              <span className="text-sm dark:text-gray-200">{p.name}</span>
                            </label>
                          )
                        })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor={`tab-${tab.id}-include`}>Include Tag IDs (comma-separated)</Label>
                    <Input
                      id={`tab-${tab.id}-include`}
                      value={tab.includeTagIds.join(',')}
                      onChange={(e) => updateTab(tab.id, { includeTagIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      placeholder="e.g., 1211748196378006"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`tab-${tab.id}-exclude`}>Exclude Tag IDs (comma-separated)</Label>
                    <Input
                      id={`tab-${tab.id}-exclude`}
                      value={tab.excludeTagIds.join(',')}
                      onChange={(e) => updateTab(tab.id, { excludeTagIds: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                      placeholder="e.g., 1211748196378006"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <Button variant="secondary" onClick={addTab}>Add Tab</Button>
            <Button onClick={saveTabs}>Save Tabs</Button>
            <Button variant="secondary" onClick={resetTabs}>Reset to Defaults</Button>
          </div>
        </div>
      </div>
    </div>
  )
}


