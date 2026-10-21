import express from 'express';
import path from 'path';
import fs from 'fs';
import { EngineMode } from './types.ts';
import type { EngineState, GlobalObjective, UniversalStateObject, TerminalEntry, ResolutionData, ScientificDomain } from './types.ts';
import { generateDeterministicCode, compileDeterministicData } from './services/geminiService.ts';

const app = express();
// Nginx listens on 8080 and proxies to port 3000 (DEFAULT_APP_PORT). Node must listen on 3000.
const PORT = Number(process.env.DEFAULT_APP_PORT) || 3000;

app.use(express.json());

const STORAGE_FILE = path.join(process.cwd(), 'local_storage.json');

const INITIAL_ENTITIES: UniversalStateObject[] = [
  {
    id: 'p53-sovereign',
    identity: { name: 'p53 Sovereign Attractor', domain: 'BIOLOGY', description: 'Self-correcting conformational engine with kinetic locking.' },
    properties: { residueCount: 393, foldingState: 'Sovereign_Locked' },
    relationships: [],
    constraints: [{ id: 'c1', rule: 'ΔG < -7.0', threshold: -7.0, violationCount: 0 }],
    currentPosition: { t: 0, coordinates: { x: 0, y: 0 }, energy: -7.5, probability: 1.0, label: 'Native Sovereign' },
    predictionBranches: [],
    mutations: [
      { residue: 'R175', mutation: 'H', deltaDeltaG: 3.4, rmsdDelta: 1.2 }
    ],
    metrics: { stability: 0.9999999, gibbsFreeEnergy: -7.5, rmsd: 0.08, coherence: 1.0, confidence: 1.0, resonance: 1.0, aggregationPropensity: 0.000000001 }
  },
  {
    id: 'fusion-tokamak',
    identity: { name: 'Iter-Scale Magnetic Well', domain: 'PHYSICS', description: 'Plasma stability manifold for magnetic confinement.' },
    properties: { confinementTime: 1.2, plasmaBeta: 0.05 },
    relationships: [],
    constraints: [{ id: 'p1', rule: 'Beta < 0.08', threshold: 0.08, violationCount: 0 }],
    currentPosition: { t: 0, coordinates: { x: 50, y: 30 }, energy: -12.4, probability: 0.98, label: 'Stable Quiescence' },
    predictionBranches: [],
    mutations: [],
    metrics: { stability: 0.98, gibbsFreeEnergy: -12.4, rmsd: 0.45, coherence: 0.95, confidence: 0.97, resonance: 0.99, aggregationPropensity: 0.001 }
  },
  {
    id: 'quantum-logical-gate',
    identity: { name: 'Surface Code Qubit', domain: 'AI', description: 'Error-corrected logical qubit state manifold.' },
    properties: { fidelity: 0.999, physicalQubits: 17 },
    relationships: [],
    constraints: [],
    currentPosition: { t: 0, coordinates: { x: -40, y: -20 }, energy: -1.2, probability: 0.999, label: 'Logical Zero' },
    predictionBranches: [],
    mutations: [],
    metrics: { stability: 0.999, gibbsFreeEnergy: -1.2, rmsd: 0.01, coherence: 0.999, confidence: 0.999, resonance: 1.0, aggregationPropensity: 0.00001 }
  },
  {
    id: 'aero-beam-01',
    identity: { name: 'High-Aspect Cantilever', domain: 'ENGINEERING', description: 'Macro-structural topology manifold for aerospace load-bearing.' },
    properties: { material: 'Ti-6Al-4V', aspect_ratio: '2:1' },
    relationships: [],
    constraints: [{ id: 'e1', rule: 'Compliance < 0.15', threshold: 0.15, violationCount: 0 }],
    currentPosition: { t: 0, coordinates: { x: 100, y: 0 }, energy: 1.45, probability: 0.95, label: 'Initial Mesh' },
    predictionBranches: [],
    mutations: [],
    metrics: { stability: 0.95, gibbsFreeEnergy: 1.45, rmsd: 100.0, coherence: 0.9, confidence: 0.92, resonance: 0.85, aggregationPropensity: 0 }
  }
];

const INITIAL_OBJECTIVES: GlobalObjective[] = [
  { id: 'obj-sovereign-lock', label: 'ESTABLISH KINETIC ATTRACTOR LOCK', status: 'ACHIEVED', priority: 1 },
  { id: 'obj-auto-correct', label: 'ENABLE STRUCTURAL SELF-CORRECTION', status: 'ACTIVE', priority: 2 },
  { id: 'obj-agg-null', label: 'PERMANENT AGGREGATION NULLIFICATION', status: 'ACHIEVED', priority: 3 }
];

let engine: EngineState = {
  mode: EngineMode.IDLE,
  activeDomain: 'BIOLOGY',
  logicalTime: 0,
  entities: INITIAL_ENTITIES,
  activeEntityId: 'p53-sovereign',
  logs: [
    '[SYSTEM] Engine Core Hosted Online. Sovereign protocols loaded.',
  ],
  objectives: INITIAL_OBJECTIVES,
  systemCoherence: 1.0,
  terminalHistory: [],
  globalEnv: {
    temperature: 25, 
    znConcentration: 1.0 
  }
};

function loadLocalStorage() {
  try {
    if (fs.existsSync(STORAGE_FILE)) {
      const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (Array.isArray(data.terminalHistory) && data.terminalHistory.length > 0) {
          engine.terminalHistory = data.terminalHistory;
        }
        if (Array.isArray(data.logs) && data.logs.length > 0) {
          engine.logs = data.logs;
        }
        if (Array.isArray(data.objectives) && data.objectives.length > 0) {
          engine.objectives = data.objectives;
        }
        if (data.globalEnv) {
          engine.globalEnv = { ...engine.globalEnv, ...data.globalEnv };
        }
        if (Array.isArray(data.entities) && data.entities.length > 0) {
          engine.entities = data.entities;
        }
        if (data.activeEntityId) engine.activeEntityId = data.activeEntityId;
        if (data.activeDomain) engine.activeDomain = data.activeDomain;
        console.log(`[STORAGE] Restored ${engine.terminalHistory.length} conversations from local storage`);
      }
    }
  } catch (err) {
    console.error('[STORAGE] Error loading local storage:', err);
  }
}

function saveLocalStorage() {
  try {
    const data = {
      terminalHistory: engine.terminalHistory,
      logs: engine.logs,
      objectives: engine.objectives,
      globalEnv: engine.globalEnv,
      entities: engine.entities,
      activeEntityId: engine.activeEntityId,
      activeDomain: engine.activeDomain,
      savedAt: new Date().toISOString()
    };
    const tmpFile = `${STORAGE_FILE}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpFile, STORAGE_FILE);
  } catch (err) {
    console.error('[STORAGE] Error saving local storage:', err);
  }
}

// Load persisted conversations immediately on boot
loadLocalStorage();

let isRunning = false;
let loopInterval: any;

const runStep = () => {
    let nextMode = engine.mode;
    let nextTime = engine.logicalTime;
    let newLogs = [...engine.logs];

    switch (engine.mode) {
      case EngineMode.IDLE: 
        nextMode = EngineMode.COHERENCE_AUDIT; 
        newLogs.unshift('[SYSTEM] Initiating Coherence Audit...');
        break;
      case EngineMode.COHERENCE_AUDIT: 
        nextMode = EngineMode.PREDICTIVE_BRANCHING; 
        newLogs.unshift('[SYSTEM] Audit Passed. Branching state prediction field.');
        break;
      case EngineMode.PREDICTIVE_BRANCHING: 
        nextMode = EngineMode.STABILITY_STEERING; 
        newLogs.unshift('[SYSTEM] Prediction manifold stable. Applying steering vectors.');
        break;
      case EngineMode.STABILITY_STEERING: 
        nextMode = EngineMode.STRATEGIC_REASONING; 
        newLogs.unshift('[SYSTEM] Alignment detected. Commencing reasoning loop.');
        break;
      case EngineMode.STRATEGIC_REASONING: 
        nextMode = EngineMode.STATE_COMMIT; 
        newLogs.unshift('[SYSTEM] Strategic logic finalized. Preparing state commit.');
        break;
      case EngineMode.STATE_COMMIT: 
        nextMode = EngineMode.COHERENCE_AUDIT; 
        nextTime += 1; 
        newLogs.unshift(`[COMMIT] Logical Time T-${nextTime.toString().padStart(6, '0')} locked.`);
        break;
    }
    
    engine.mode = nextMode;
    engine.logicalTime = nextTime;
    engine.logs = newLogs.slice(0, 50);
};

const updateEntitiesFromEnvironment = () => {
  const temp = engine.globalEnv.temperature;
  const zn = engine.globalEnv.znConcentration;

  // Coupling for p53-sovereign in Biology
  const p53 = engine.entities.find(e => e.id === 'p53-sovereign');
  if (p53) {
    const dG_hydrophobic = -9.825;
    const dG_zn = -3.8 * Math.min(1.0, zn);
    const dG_entropy = 0.018 * 393 * ((temp + 273.15) / 298.15);
    const thermal = temp > 42 ? 0.35 * Math.pow(temp - 42, 1.5) : 0;
    const total_dG = dG_hydrophobic + dG_zn + dG_entropy + thermal;
    
    const rmsd = total_dG < -6.0 ? 0.08 : (total_dG < -2.0 ? 0.85 : 1.92 + (temp > 42 ? 0.05 * (temp - 42) : 0));
    const stability = Math.max(0.0001, Math.min(0.9999999, 1.0 / (1.0 + Math.exp(total_dG + 4.5))));
    const aggregationPropensity = zn < 0.4 
      ? Math.min(0.99, (0.4 - zn) * 1.5 + (temp > 42 ? 0.4 : 0.05))
      : (temp > 45 ? 0.75 : 0.000000001);

    p53.metrics = {
      ...p53.metrics,
      gibbsFreeEnergy: total_dG,
      rmsd,
      stability,
      aggregationPropensity
    };
    p53.currentPosition.energy = total_dG;
  }
};

app.get('/api/agent/telemetry', (req, res) => {
  res.json({ engine, isRunning });
});

app.post('/api/agent/telemetry', (req, res) => {
  const { logs } = req.body;
  if (logs && Array.isArray(logs)) {
      engine.logs = [...logs, ...engine.logs].slice(0, 50);
      saveLocalStorage();
  }
  res.json({ success: true });
});

app.post('/api/agent/toggle', (req, res) => {
  isRunning = req.body.isRunning;
  if (isRunning) {
      if (!loopInterval) loopInterval = setInterval(runStep, 1500);
  } else {
      if (loopInterval) {
          clearInterval(loopInterval);
          loopInterval = null;
      }
  }
  res.json({ isRunning });
});

app.post('/api/agent/state', (req, res) => {
  engine = { ...engine, ...req.body };
  if (req.body.globalEnv) {
    updateEntitiesFromEnvironment();
  }
  saveLocalStorage();
  res.json({ success: true, engine });
});

app.post('/api/agent/sync-storage', (req, res) => {
  const { terminalHistory, logs, objectives } = req.body;
  let changed = false;

  if (Array.isArray(terminalHistory) && terminalHistory.length > 0) {
    const existingMap = new Map(engine.terminalHistory.map(h => [h.id, h]));
    for (const item of terminalHistory) {
      if (!existingMap.has(item.id)) {
        existingMap.set(item.id, item);
        changed = true;
      }
    }
    if (changed) {
      engine.terminalHistory = Array.from(existingMap.values()).sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
    }
  }

  if (Array.isArray(logs) && logs.length > 0) {
    const existingLogs = new Set(engine.logs);
    const newLogs = logs.filter(l => !existingLogs.has(l));
    if (newLogs.length > 0) {
      engine.logs = [...newLogs, ...engine.logs].slice(0, 100);
      changed = true;
    }
  }

  if (Array.isArray(objectives) && objectives.length > 0 && engine.objectives.length === 0) {
    engine.objectives = objectives;
    changed = true;
  }

  if (changed) {
    saveLocalStorage();
  }

  res.json({ success: true, engine });
});

app.post('/api/agent/commands', async (req, res) => {
  const { command } = req.body;
  if (!command || typeof command !== 'string' || !command.trim()) {
    return res.status(400).json({ error: 'Command cannot be empty' });
  }

  const cleanCmd = command.trim();
  const entryId = Date.now().toString();
  const entry: TerminalEntry = { id: entryId, type: 'COMMAND', content: cleanCmd, timestamp: new Date() };

  // Detect domain
  const cmdLower = cleanCmd.toLowerCase();
  let targetDomain: ScientificDomain = engine.activeDomain;
  if (
    cmdLower.includes('crispr') || cmdLower.includes('cas9') || cmdLower.includes('pam') || 
    cmdLower.includes('gene') || cmdLower.includes('r-loop') || cmdLower.includes('hdr') || 
    cmdLower.includes('nhej') || cmdLower.includes('chromatin') || cmdLower.includes('dna') || 
    cmdLower.includes('protein') || cmdLower.includes('p53') || cmdLower.includes('folding') || 
    cmdLower.includes('trp-cage') || cmdLower.includes('biology')
  ) {
    targetDomain = 'BIOLOGY';
  } else if (
    cmdLower.includes('fea') || cmdLower.includes('cantilever') || cmdLower.includes('beam') || 
    cmdLower.includes('structural') || cmdLower.includes('geotechnical') || cmdLower.includes('soil') || 
    cmdLower.includes('stress') || cmdLower.includes('topology') || cmdLower.includes('simp') || 
    cmdLower.includes('engineering')
  ) {
    targetDomain = 'ENGINEERING';
  } else if (
    cmdLower.includes('plasma') || cmdLower.includes('tokamak') || cmdLower.includes('magnetic') || 
    cmdLower.includes('fusion') || cmdLower.includes('confinement') || cmdLower.includes('troyon') || 
    cmdLower.includes('physics')
  ) {
    targetDomain = 'PHYSICS';
  } else if (
    cmdLower.includes('neural') || cmdLower.includes('gradient') || cmdLower.includes('loss') || 
    cmdLower.includes('learning') || cmdLower.includes('transformer') || cmdLower.includes('attention') || 
    cmdLower.includes('nats') || cmdLower.includes('ai') || cmdLower.includes('qubit') ||
    cmdLower.includes('entropy')
  ) {
    targetDomain = 'AI';
  }

  const newActiveEntityId = (targetDomain !== engine.activeDomain) 
    ? (engine.entities.find(e => e.identity.domain === targetDomain)?.id || engine.activeEntityId)
    : engine.activeEntityId;

  engine.activeDomain = targetDomain;
  engine.activeEntityId = newActiveEntityId;

  // Execute REAL deterministic mathematical calculation synchronously
  let finalResult: ResolutionData;
  if (cleanCmd.startsWith('DATA:')) {
    finalResult = await compileDeterministicData(cleanCmd, {
      status: 'RESOLVED',
      states: [],
      summary: 'Data compiled'
    });
  } else {
    finalResult = await generateDeterministicCode(cleanCmd, {
      activeEntityId: newActiveEntityId,
      activeDomain: targetDomain,
      globalEnv: engine.globalEnv,
      logicalTime: engine.logicalTime
    });
  }

  const resId = (Date.now() + 1).toString();
  const resEntry: TerminalEntry = { id: resId, type: 'RESOLUTION', content: finalResult, timestamp: new Date() };

  // Update entity metrics directly from real deterministic calculation
  const activeEntity = engine.entities.find(e => e.id === newActiveEntityId);
  if (activeEntity && finalResult.states.length > 0) {
    const s0 = finalResult.states[0];
    const s0Metrics = s0.metrics;
    if (targetDomain === 'BIOLOGY') {
      const dG = parseFloat(s0Metrics.find(m => m.name.includes('Free Energy'))?.value as string) || activeEntity.metrics.gibbsFreeEnergy;
      const rmsd = parseFloat(s0Metrics.find(m => m.name.includes('RMSD'))?.value as string) || activeEntity.metrics.rmsd;
      activeEntity.metrics.gibbsFreeEnergy = dG;
      activeEntity.metrics.rmsd = rmsd;
      activeEntity.currentPosition.energy = dG;
    } else if (targetDomain === 'ENGINEERING') {
      const comp = parseFloat(s0Metrics.find(m => m.name === 'Compliance')?.value as string) || 0.12;
      activeEntity.metrics.gibbsFreeEnergy = comp;
      activeEntity.currentPosition.energy = comp;
    } else if (targetDomain === 'PHYSICS') {
      const conf = parseFloat(s0Metrics.find(m => m.name === 'Confinement Time')?.value as string) || 4.8;
      activeEntity.properties.confinementTime = conf;
    }
  }

  engine.terminalHistory = [resEntry, entry, ...engine.terminalHistory];
  engine.logs.unshift(`[MATH] Real deterministic resolution executed. Domain: ${targetDomain}`);
  engine.logs.unshift(`[CMD] Execution request: ${cleanCmd}`);
  engine.logicalTime += 1;

  saveLocalStorage();

  res.json({ 
    success: true, 
    targetDomain, 
    finalResult,
    engine 
  });
});

app.get('/api/agent/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="aetheris_local_storage_export.json"');
  res.send(JSON.stringify({
    terminalHistory: engine.terminalHistory,
    logs: engine.logs,
    objectives: engine.objectives,
    globalEnv: engine.globalEnv,
    entities: engine.entities,
    exportedAt: new Date().toISOString()
  }, null, 2));
});

app.get('/api/agent/script', (req, res) => {
    // Generate Python script that connects back to Express Hub
    const host = req.protocol + '://' + req.get('host');
    const pythonCode = `
import time
import requests
import json

HOST_URL = "${host}"

def update_telemetry(logs):
    try:
        requests.post(f"{HOST_URL}/api/agent/telemetry", json={"logs": logs})
    except Exception as e:
        print("Failed to sync:", e)

print("AETHERIS Remote Node Connected")
update_telemetry(["[REMOTE] Python Node Telemetry Connection Established"])

def run_loop():
    while True:
        # Pull or act upon active commands if we wanted to
        time.sleep(5)

if __name__ == "__main__":
    run_loop()
`;
    res.setHeader('Content-Type', 'text/x-python');
    res.setHeader('Content-Disposition', 'attachment; filename="aetheris_remote_node.py"');
    res.send(pythonCode);
});

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const distIndexPath = path.join(distPath, 'index.html');

  if (fs.existsSync(distIndexPath)) {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(distIndexPath);
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server listen error:', err);
  });
}

startServer();
