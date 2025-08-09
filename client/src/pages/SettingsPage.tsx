import { useEffect, useState } from 'react'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { asanaService } from '../services/asanaService'
import { everhourService } from '../services/everhourService'

export default function SettingsPage() {
  const [asanaToken, setAsanaToken] = useState('')
  const [everhourKey, setEverhourKey] = useState('')

  useEffect(() => {
    setAsanaToken(localStorage.getItem('asanaToken') ?? '')
    setEverhourKey(localStorage.getItem('everhourKey') ?? '')
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

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-gray-600">Store your API credentials in your browser. Data stays client-side.</p>

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
    </div>
  )
}


