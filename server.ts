import express from 'express';
import path from 'path';
import fs from 'fs';
import { EngineMode } from './types.ts';
import type { EngineState, GlobalObjective, UniversalStateObject, TerminalEntry, ResolutionData, ScientificDomain } from './types.ts';
import { generateDeterministicCode, compileDeterministicData } from './services/geminiService.ts';
import { calculateProteinSequenceFeatures } from './services/proteinSequence.ts';
import { classifyScientificDomain } from './services/domainClassifier.ts';
import { calculatePdbCaGeometry } from './services/proteinStructure.ts';
import { calculateAlignedCaRmsd } from './services/proteinRmsd.ts';
import { FoldingProviderError, predictProteinStructure } from './services/foldingProvider.ts';
import { authIsConfigured, createSessionToken, verifyCredentials, verifySessionToken, SESSION_TTL_SECONDS_FOR_COOKIE } from './services/auth.ts';

const app = express();
// Nginx listens on 8080 and proxies to port 3000 (DEFAULT_APP_PORT). Node must listen on 3000.
const PORT = Number(process.env.DEFAULT_APP_PORT) || 3000;

app.use(express.json({ limit: '2mb' }));

// Validate API payloads at the boundary. This does not replace authentication;
// deployment must still restrict network exposure and configure an auth layer.
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isBoundedStringArray = (value: unknown, maxItems: number, maxLength: number): value is string[] =>
  Array.isArray(value) && value.length <= maxItems &&
  value.every((item) => typeof item === 'string' && item.length <= maxLength);

const isDomain = (value: unknown): value is ScientificDomain =>
  value === 'BIOLOGY' || value === 'PHYSICS' || value === 'ENGINEERING' || value === 'AI';

const validateEnvironment = (value: unknown): value is { temperature?: number; znConcentration?: number } => {
  if (!isRecord(value)) return false;
  const allowed = new Set(['temperature', 'znConcentration']);
  if (Object.keys(value).some((key) => !allowed.has(key))) return false;
  if ('temperature' in value && (typeof value.temperature !== 'number' || !Number.isFinite(value.temperature) || value.temperature < 4 || value.temperature > 60)) return false;
  if ('znConcentration' in value && (typeof value.znConcentration !== 'number' || !Number.isFinite(value.znConcentration) || value.znConcentration < 0 || value.znConcentration > 1)) return false;
  return true;
};

const authConfig = {
  username: process.env.AETHERIS_USERNAME,
  password: process.env.AETHERIS_PASSWORD,
  sessionSecret: process.env.AETHERIS_SESSION_SECRET,
};

function readSessionCookie(req: import('express').Request): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const pair = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith('aetheris_session='));
  return pair ? decodeURIComponent(pair.slice('aetheris_session='.length)) : undefined;
}

const sessionIsValid = (req: import('express').Request): boolean =>
  verifySessionToken(readSessionCookie(req), authConfig);

app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

app.get('/api/auth/session', (req, res) => {
  const developmentBypass = process.env.NODE_ENV !== 'production';
  res.json({ authenticated: developmentBypass || sessionIsValid(req), authRequired: !developmentBypass });
});

app.post('/api/auth/login', (req, res) => {
  if (!authIsConfigured(authConfig)) {
    return res.status(503).json({
      error: 'Production authentication is not configured. Set AETHERIS_USERNAME, AETHERIS_PASSWORD, and a random AETHERIS_SESSION_SECRET of at least 32 characters.'
    });
  }
  if (!isRecord(req.body) || !verifyCredentials(req.body.username, req.body.password, authConfig)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = createSessionToken(authConfig);
  res.cookie('aetheris_session', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/api',
    maxAge: SESSION_TTL_SECONDS_FOR_COOKIE * 1000,
  });
  return res.json({ authenticated: true });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('aetheris_session', { httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production', path: '/api' });
  return res.json({ authenticated: false });
});

app.use('/api/agent', (req, res, next) => {
  if (process.env.NODE_ENV !== 'production') return next();
  if (!authIsConfigured(authConfig)) {
    return res.status(503).json({ error: 'API disabled until production authentication is configured' });
  }
  if (!sessionIsValid(req)) return res.status(401).json({ error: 'Authentication required' });
  return next();
});

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
        newLogs.unshift('[SIMULATION] Advancing prototype lifecycle state; no scientific audit was executed.');
        break;
      case EngineMode.PREDICTIVE_BRANCHING: 
        nextMode = EngineMode.STABILITY_STEERING; 
        newLogs.unshift('[SIMULATION] Prototype lifecycle advanced; no prediction solver was executed.');
        break;
      case EngineMode.STABILITY_STEERING: 
        nextMode = EngineMode.STRATEGIC_REASONING; 
        newLogs.unshift('[SIMULATION] Prototype lifecycle advanced; no reasoning solver was executed.');
        break;
      case EngineMode.STRATEGIC_REASONING: 
        nextMode = EngineMode.STATE_COMMIT; 
        newLogs.unshift('[SIMULATION] Prototype lifecycle advanced; no strategic computation was executed.');
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

app.post('/api/agent/protein/structure', (req, res) => {
  if (!isRecord(req.body) || typeof req.body.pdbText !== 'string') {
    return res.status(400).json({ error: 'pdbText must be supplied as a PDB-format string' });
  }
  try {
    const geometry = calculatePdbCaGeometry(req.body.pdbText);
    const finalResult: ResolutionData = {
      status: 'RESOLVED',
      resultClass: 'computed',
      method: geometry.method,
      summary: `Computed coordinate-based C-alpha geometry from the supplied PDB using ${geometry.method}. This is structure analysis, not folding prediction or energy calculation.`,
      states: [{
        label: 'PDB C-alpha Geometry',
        metrics: [
          { name: 'Residue Count', value: geometry.residueCount, unit: 'residues' },
          { name: 'Chain Count', value: geometry.chainCount, unit: 'chains' },
          { name: 'Radius of Gyration', value: geometry.radiusOfGyrationAngstrom, unit: 'Å' },
          { name: 'Nonlocal Contacts (<8 Å)', value: geometry.nonlocalContactsAt8Angstrom, unit: 'pairs' },
          ...Object.entries(geometry.sequenceByChain).map(([chain, sequence]) => ({
            name: `Chain ${chain} Sequence`, value: sequence, unit: 'one-letter sequence'
          }))
        ]
      }],
      deterministicSteps: [
        '1. Parsed C-alpha ATOM records from the first PDB model.',
        '2. Calculated radius of gyration from the C-alpha coordinate centroid.',
        `3. Counted nonlocal C-alpha contacts using the stated 8.0 Å cutoff.`,
        ...geometry.limitations.map((limitation) => `Limitation: ${limitation}`)
      ]
    };
    const timestamp = new Date();
    const commandEntry: TerminalEntry = {
      id: `pdb-cmd-${Date.now()}`,
      type: 'COMMAND',
      content: 'Analyze uploaded PDB structure',
      timestamp,
    };
    const resultEntry: TerminalEntry = {
      id: `pdb-result-${Date.now() + 1}`,
      type: 'RESOLUTION',
      content: finalResult,
      timestamp: new Date(),
    };
    engine.terminalHistory = [resultEntry, commandEntry, ...engine.terminalHistory].slice(0, 500);
    engine.logs.unshift('[COMPUTATION] PDB C-alpha geometry analysis completed; no folding prediction was performed.');
    engine.logs = engine.logs.slice(0, 50);
    saveLocalStorage();
    return res.json({ success: true, features: geometry, finalResult, engine });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid PDB structure' });
  }
});

app.post('/api/agent/protein/fold', async (req, res) => {
  if (!isRecord(req.body) || typeof req.body.sequence !== 'string') {
    return res.status(400).json({ error: 'sequence must be supplied as a string' });
  }

  try {
    const prediction = await predictProteinStructure(req.body.sequence);
    const geometry = calculatePdbCaGeometry(prediction.pdbText);
    const finalResult: ResolutionData = {
      status: 'RESOLVED',
      resultClass: 'computed',
      method: prediction.method,
      summary: `Provider ${prediction.provider} returned a predicted structure using model ${prediction.modelId}. The output is a model prediction, not experimental evidence.`,
      states: [{
        label: 'Protein Structure Prediction',
        metrics: [
          { name: 'Sequence Length', value: prediction.sequenceLength, unit: 'residues' },
          { name: 'C-alpha Residues', value: prediction.caResidueCount, unit: 'residues' },
          { name: 'Radius of Gyration', value: geometry.radiusOfGyrationAngstrom, unit: 'Å' }
        ]
      }],
      deterministicSteps: [
        `1. Submitted the validated sequence to configured provider ${prediction.provider} / model ${prediction.modelId}.`,
        '2. Validated the returned PDB coordinates and exact single-chain sequence correspondence.',
        `3. Computed C-alpha geometry using ${geometry.method}; no energy or experimental stability was inferred.`,
        ...prediction.limitations.map((limitation) => `Limitation: ${limitation}`)
      ]
    };

    const timestamp = new Date();
    const commandEntry: TerminalEntry = {
      id: `fold-cmd-${Date.now()}`,
      type: 'COMMAND',
      content: `Predict protein structure for ${prediction.sequenceLength} residues using configured provider`,
      timestamp,
    };
    const resultEntry: TerminalEntry = {
      id: `fold-result-${Date.now() + 1}`,
      type: 'RESOLUTION',
      content: finalResult,
      timestamp: new Date(),
    };
    engine.terminalHistory = [resultEntry, commandEntry, ...engine.terminalHistory].slice(0, 500);
    engine.logs.unshift(`[COMPUTATION] Protein structure predicted by ${prediction.provider} / ${prediction.modelId}; output hash ${prediction.pdbSha256}.`);
    engine.logs = engine.logs.slice(0, 50);
    saveLocalStorage();
    return res.json({ success: true, prediction, geometry, finalResult, engine });
  } catch (error) {
    if (error instanceof FoldingProviderError) {
      const status = error.code === 'UNAVAILABLE' ? 503
        : error.code === 'INVALID_INPUT' ? 400
        : error.code === 'TIMEOUT' ? 504
        : error.code === 'UPSTREAM_FAILURE' ? 502
        : 502;
      return res.status(status).json({ error: error.message, code: error.code });
    }
    return res.status(500).json({ error: 'Protein structure prediction failed unexpectedly.' });
  }
});

app.post('/api/agent/protein/rmsd', (req, res) => {
  if (!isRecord(req.body) || typeof req.body.mobilePdbText !== 'string' || typeof req.body.referencePdbText !== 'string') {
    return res.status(400).json({ error: 'mobilePdbText and referencePdbText must both be PDB-format strings' });
  }
  try {
    const comparison = calculateAlignedCaRmsd(req.body.mobilePdbText, req.body.referencePdbText);
    const finalResult: ResolutionData = {
      status: 'RESOLVED',
      resultClass: 'computed',
      method: comparison.method,
      summary: `Computed aligned C-alpha RMSD for ${comparison.matchedResidueCount} residue matches using ${comparison.method}. This compares supplied coordinates and does not predict a fold.`,
      states: [{
        label: 'Aligned Structure Comparison',
        metrics: [
          { name: 'Aligned C-alpha RMSD', value: comparison.alignedCaRmsdAngstrom, unit: 'Å' },
          { name: 'Matched Residues', value: comparison.matchedResidueCount, unit: 'residues' },
          { name: 'Unmatched Mobile Residues', value: comparison.unmatchedMobileResidueCount, unit: 'residues' },
          { name: 'Unmatched Reference Residues', value: comparison.unmatchedReferenceResidueCount, unit: 'residues' }
        ]
      }],
      deterministicSteps: [
        '1. Parsed C-alpha coordinates from the first model of both PDB files.',
        '2. Matched residues by chain, residue number, insertion code, and residue name.',
        '3. Centered matched coordinates and solved the optimal rigid-body quaternion superposition.',
        '4. Computed RMSD after superposition; excluded residues are reported separately.',
        ...comparison.limitations.map((limitation) => `Limitation: ${limitation}`)
      ]
    };
    const timestamp = new Date();
    const commandEntry: TerminalEntry = {
      id: `rmsd-cmd-${Date.now()}`,
      type: 'COMMAND',
      content: 'Compare two PDB structures using aligned C-alpha RMSD',
      timestamp,
    };
    const resultEntry: TerminalEntry = {
      id: `rmsd-result-${Date.now() + 1}`,
      type: 'RESOLUTION',
      content: finalResult,
      timestamp: new Date(),
    };
    engine.terminalHistory = [resultEntry, commandEntry, ...engine.terminalHistory].slice(0, 500);
    engine.logs.unshift('[COMPUTATION] Aligned C-alpha RMSD comparison completed on supplied structures.');
    engine.logs = engine.logs.slice(0, 50);
    saveLocalStorage();
    return res.json({ success: true, comparison, finalResult, engine });
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'PDB comparison failed' });
  }
});

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

  // Shared classification avoids server/service domain disagreement.
  const targetDomain: ScientificDomain = cleanCmd.toUpperCase().startsWith('SEQUENCE:')
    ? 'BIOLOGY'
    : classifyScientificDomain(cleanCmd, engine.activeDomain);

  const newActiveEntityId = (targetDomain !== engine.activeDomain) 
    ? (engine.entities.find(e => e.identity.domain === targetDomain)?.id || engine.activeEntityId)
    : engine.activeEntityId;

  engine.activeDomain = targetDomain;
  engine.activeEntityId = newActiveEntityId;

  // Execute the selected calculation path synchronously; method and limitations are returned with results.
  let finalResult: ResolutionData;
  if (cleanCmd.toUpperCase().startsWith('SEQUENCE:')) {
    try {
      const features = calculateProteinSequenceFeatures(cleanCmd.slice(cleanCmd.indexOf(':') + 1));
      finalResult = {
        status: 'RESOLVED',
        resultClass: 'computed',
        method: features.method,
        summary: `Computed primary-sequence features for ${features.sequenceLength} residues using ${features.method}. This is not a folding or structure-prediction result.`,
        states: [{
          label: 'Primary Sequence Features',
          metrics: [
            { name: 'Sequence Length', value: features.sequenceLength, unit: 'residues' },
            { name: 'Average Molecular Mass', value: features.molecularMassDa, unit: 'Da' },
            { name: 'GRAVY Hydropathy', value: features.gravy, unit: 'Kyte-Doolittle score' },
            { name: 'Theoretical Isoelectric Point', value: features.theoreticalPi, unit: 'pH (estimated)' },
            ...Object.entries(features.composition).filter(([, count]) => count > 0).map(([aa, count]) => ({
              name: `Residue ${aa}`, value: count, unit: 'residues'
            }))
          ]
        }],
        deterministicSteps: [
          '1. Normalize FASTA/plain-text sequence and validate standard amino-acid symbols.',
          '2. Compute composition and average molecular mass from residue masses plus terminal water.',
          '3. Compute Kyte–Doolittle GRAVY as the arithmetic mean of residue hydropathy.',
          '4. Estimate theoretical pI by bisection on Henderson–Hasselbalch charge balance.',
          ...features.limitations.map((limitation) => `Limitation: ${limitation}`)
        ]
      };
    } catch (error) {
      return res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid protein sequence' });
    }
  } else if (cleanCmd.startsWith('DATA:')) {
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
  engine.logs.unshift(`[COMPUTATION] Calculation path completed. Domain: ${targetDomain}`);
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
