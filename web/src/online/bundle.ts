import { strToU8 } from 'fflate'
import pythonLock from '../../../packaging/playground-runtime.json'
import rLock from '../../../packaging/r-browser-runtime.json'
import rPackages from '../../../packaging/r-packages.lock.json'
import chartLock from '../../../packaging/chart-wheels.json'
import { bundleNotes, projectArchive, type OnlineProject } from './project'

export async function reproductionBundle(project: OnlineProject, replay?: string, figure?: Blob): Promise<Blob> {
  const entries: Record<string, Uint8Array> = {
    'README.txt': bundleNotes(project.engine),
    [project.engine === 'ggplot2' ? 'source.R' : 'source.py']: strToU8(project.source),
    'environment.json': strToU8(JSON.stringify(project.engine === 'ggplot2' ? { runtime: rLock, packages: rPackages } : { runtime: pythonLock, ...(project.engine === 'matplotlib' ? {} : { wheels: chartLock }) }, null, 2)),
  }
  if (project.renderedSource && project.renderedSource !== project.source) entries[project.engine === 'ggplot2' ? 'rendered-source.R' : 'rendered-source.py'] = strToU8(project.renderedSource)
  if (replay) entries[project.engine === 'ggplot2' ? 'replay.R' : 'replay.py'] = strToU8(replay)
  if (project.engine === 'matplotlib') {
    const response = await fetch(new URL('./engine.zip', location.href))
    const manifestResponse = await fetch(new URL('./playground-manifest.json', location.href))
    if (!response.ok || !manifestResponse.ok) throw new Error('Could not include the rendering engine')
    const engine = new Uint8Array(await response.arrayBuffer())
    const manifest = await manifestResponse.json() as { files: Record<string, string> }
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', engine)), (n) => n.toString(16).padStart(2, '0')).join('')
    if (digest !== manifest.files['engine.zip']) throw new Error('Rendering engine checksum mismatch')
    entries['engine.zip'] = engine
    entries['engine-manifest.json'] = strToU8(JSON.stringify(manifest, null, 2))
    entries['requirements.txt'] = strToU8(Object.entries(pythonLock.packages).map(([name, version]) => `${name}==${version}`).join('\n') + '\n')
    entries['replay.py'] = strToU8(`"""Run explicitly from the unpacked bundle after installing requirements.txt."""
import base64
import json
import sys
import tempfile
from pathlib import Path

root = Path(__file__).resolve().parent
sys.path.insert(0, str(root / "engine.zip"))
from browser import BrowserSession

project = json.loads((root / "project.json").read_text(encoding="utf-8"))
with tempfile.TemporaryDirectory(prefix="figure-replay-") as workspace:
    session = BrowserSession(workspace)
    loaded = session.load(project["filename"], project["renderedSource"] or project["source"])
    if not loaded.get("ok"):
        raise RuntimeError(loaded)
    state = project["state"]
    rendered = session.render(state["stem"], state["overrides"])
    if not rendered.get("ok") or rendered.get("warnings"):
        raise RuntimeError(rendered)
    output = session.preview_png(state["stem"], state["overrides"], project["pngWidth"])
    if not output.get("ok"):
        raise RuntimeError(output)
    (root / "figure.png").write_bytes(base64.b64decode(output["png"]))
`)
  }
  if (figure) entries[figure.type === 'application/pdf' ? 'figure.pdf' : 'figure.png'] = new Uint8Array(await figure.arrayBuffer())
  const license = await fetch(new URL('../LICENSE', location.href))
  if (!license.ok) throw new Error('Could not include the source license')
  entries['LICENSE'] = new Uint8Array(await license.arrayBuffer())
  return projectArchive(project, entries)
}
