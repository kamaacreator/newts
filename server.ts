import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { EngineMode, EngineState, GlobalObjective, UniversalStateObject, TerminalEntry, ResolutionData, ScientificDomain } from './types';
import { generateDeterministicCode, compileDeterministicData } from './services/geminiService';

const app = express();
const PORT = 3000;

app.use(express.json());

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

const runHeuristicResolution = (cmd: string): ResolutionData => {
  const activeEntity = engine.entities.find(e => e.id === engine.activeEntityId);
  const cmdLower = cmd.toLowerCase();
  
  let domain: ScientificDomain = engine.activeDomain;
  if (cmdLower.includes('fea') || cmdLower.includes('topology') || cmdLower.includes('beam') || cmdLower.includes('engineering')) domain = 'ENGINEERING';
  else if (cmdLower.includes('plasma') || cmdLower.includes('tokamak') || cmdLower.includes('physics')) domain = 'PHYSICS';
  else if (cmdLower.includes('neural') || cmdLower.includes('learning') || cmdLower.includes('ai')) domain = 'AI';

  let baseStates;
  if (domain === 'ENGINEERING') {
    baseStates = [ { label: 'S0_Optimized_Topology', metrics: [{name: 'Compliance', value: 0.12, unit: 'Joules'}, {name: 'Volume Fraction', value: 40.0, unit: '%'}] }, { label: 'S1_Initial_Mesh', metrics: [{name: 'Compliance', value: 1.45, unit: 'Joules'}, {name: 'Volume Fraction', value: 100.0, unit: '%'}] } ];
  } else if (domain === 'AI') {
    baseStates = [ { label: 'AI0_Global_Minimum', metrics: [{name: 'Loss', value: 0.05, unit: 'nats'}, {name: 'Accuracy', value: 99.5, unit: '%'}] }, { label: 'AI1_Local_Optima', metrics: [{name: 'Loss', value: 0.8, unit: 'nats'}, {name: 'Accuracy', value: 85.0, unit: '%'}] } ];
  } else if (domain === 'PHYSICS') {
    baseStates = [ { label: 'P0_Stable_Plasma', metrics: [{name: 'Energy', value: 10.0, unit: 'keV'}, {name: 'Confinement Time', value: 5.0, unit: 's'}] }, { label: 'P1_Instability_Growth', metrics: [{name: 'Energy', value: 8.0, unit: 'keV'}, {name: 'Confinement Time', value: 2.0, unit: 's'}] } ];
  } else {
    baseStates = [ { label: 'S0_Sovereign_Attractor', metrics: [{name: 'Energy', value: -7.5, unit: 'kcal/mol'}, {name: 'RMSD', value: 0.08, unit: 'Å'}] }, { label: 'S1_Intermediate_Lapsed', metrics: [{name: 'Energy', value: 2.5, unit: 'kcal/mol'}, {name: 'RMSD', value: 1.9, unit: 'Å'}] } ];
  }

  return {
    status: 'PENDING_COMPUTATION',
    states: baseStates,
    transitions: [
      { from: 'S_Any', to: baseStates[0].label, probability: '[NULL - AWAITING COMPUTATION]' }
    ],
    summary: `[HEURISTIC] Instant manifold resolution at T=${engine.logicalTime}. Pending Deep Deterministic Verification.`,
    deterministicSteps: ['Orchestrating Deterministic Bridge...'],
    deterministicCode: '# [BRIDGE_ACTIVE] GENERATING COMPLETE MATHEMATICAL LOGIC...',
    envSnapshot: { temp: engine.globalEnv.temperature, zn: engine.globalEnv.znConcentration, agg: 0 }
  };
};

app.get('/api/agent/telemetry', (req, res) => {
  res.json({ engine, isRunning });
});

app.post('/api/agent/telemetry', (req, res) => {
  // Update state from incoming python logic
  const { logs, computedMetrics } = req.body;
  if (logs) {
      engine.logs = [...logs, ...engine.logs].slice(0, 50);
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
  res.json({ success: true });
});

app.post('/api/agent/commands', async (req, res) => {
  const { command } = req.body;
  const entry: TerminalEntry = { id: Date.now().toString(), type: 'COMMAND', content: command, timestamp: new Date() };
  
  engine.terminalHistory = [entry, ...engine.terminalHistory];
  engine.logs.unshift(`[CMD] Execution request: ${command}`);

  const heuristicResult = runHeuristicResolution(command);
  const resEntry: TerminalEntry = { id: (Date.now() + 1).toString(), type: 'RESOLUTION', content: heuristicResult, timestamp: new Date() };
  
  const pm = heuristicResult.states[0]?.metrics?.[0]?.name;
  const targetDomain: ScientificDomain = pm === 'Compliance' ? 'ENGINEERING' : (pm === 'Loss' ? 'AI' : (pm === 'Energy' && heuristicResult.states[0]?.metrics?.[0]?.unit === 'keV' ? 'PHYSICS' : 'BIOLOGY'));
  
  const newActiveEntityId = (targetDomain !== engine.activeDomain) 
    ? (engine.entities.find(e => e.identity.domain === targetDomain)?.id || engine.activeEntityId)
    : engine.activeEntityId;

  engine.activeDomain = targetDomain;
  engine.activeEntityId = newActiveEntityId;
  engine.terminalHistory = [resEntry, ...engine.terminalHistory];
  engine.logs.unshift(`[HEURISTIC] Instant resolution committed. Domain: ${targetDomain}`);

  res.json({ success: true, targetDomain, heuristicResult });

  // Async Bridge Trigger
  try {
    const pendingResolution = engine.terminalHistory.find(h => h.id === resEntry.id);
    let finalResult: ResolutionData;
    
    if (command.startsWith('DATA:') || command.length > 50) {
      finalResult = await compileDeterministicData(command, heuristicResult);
    } else {
      finalResult = await generateDeterministicCode(command, {
        activeEntityId: newActiveEntityId,
        activeDomain: targetDomain,
        globalEnv: engine.globalEnv,
        logicalTime: engine.logicalTime
      });
    }

    if (pendingResolution) {
      pendingResolution.content = {
        ...finalResult,
        status: finalResult.status
      };
      engine.logs.unshift(`[BRIDGE] Deterministic logic synchronized.`);
    }
  } catch (error: any) {
    console.error("Delayed error:", error);
    engine.logs.unshift(`[ERROR] Deterministic bridge failed.`);
  }
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
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
