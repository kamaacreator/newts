
export const EngineMode = {
  IDLE: 'IDLE',
  COHERENCE_AUDIT: 'COHERENCE_AUDIT',
  PREDICTIVE_BRANCHING: 'PREDICTIVE_BRANCHING',
  STABILITY_STEERING: 'STABILITY_STEERING',
  STRATEGIC_REASONING: 'STRATEGIC_REASONING',
  STATE_COMMIT: 'STATE_COMMIT'
} as const;

export type EngineMode = typeof EngineMode[keyof typeof EngineMode];

export type ScientificDomain = 'BIOLOGY' | 'PHYSICS' | 'ENGINEERING' | 'AI';

export interface GlobalObjective {
  id: string;
  label: string;
  status: 'ACTIVE' | 'PENDING' | 'ACHIEVED';
  priority: number;
}

export interface MutationalImpact {
  residue: string;
  mutation: string;
  deltaDeltaG: number; // kcal/mol
  rmsdDelta: number; // Angstroms
}

export interface MetricSet {
  stability: number; 
  gibbsFreeEnergy: number; // kcal/mol
  rmsd: number; // Angstroms
  coherence: number;
  confidence: number;
  resonance: number;
  aggregationPropensity: number; // 0-1
}

export interface Relationship {
  targetId: string;
  type: string;
  strength: number;
  interactionEnergy?: number; // kcal/mol
}

export interface Constraint {
  id: string;
  rule: string;
  threshold: number;
  violationCount: number;
  isDynamic?: boolean;
}

export interface StatePoint {
  t: number;
  coordinates: Record<string, number>;
  energy: number; // kcal/mol
  probability: number; 
  label?: string; // e.g. "Folded", "Unfolded", "Intermediate"
}

export interface UniversalStateObject {
  id: string;
  identity: {
    name: string;
    domain: ScientificDomain;
    description: string;
  };
  properties: Record<string, any>;
  relationships: Relationship[];
  constraints: Constraint[];
  currentPosition: StatePoint;
  predictionBranches: StatePoint[][]; 
  mutations: MutationalImpact[];
  metrics: MetricSet;
  env?: {
    temperature: number; // Celsius
    znConcentration: number; // 0-1 (Relative)
  };
}

export interface StateMetric {
  name: string;
  value: number | string;
  unit: string;
}

export interface ResolutionData {
  status: 'PENDING_COMPUTATION' | 'RESOLVED';
  resultClass?: 'computed' | 'estimated' | 'illustrative' | 'unsupported';
  method?: string;
  states: {
    label: string;
    metrics: StateMetric[];
  }[];
  transitions?: {
    from: string;
    to: string;
    probability: number | string;
  }[];
  mutations?: MutationalImpact[];
  summary: string;
  deterministicCode?: string;
  deterministicSteps?: string[];
  rawData?: string; // For Phase 2 injection
  envSnapshot?: {
    temp: number;
    zn: number;
    agg: number;
  };
}

export interface TerminalEntry {
  id: string;
  type: 'COMMAND' | 'RESOLUTION' | 'ERROR';
  content: string | ResolutionData;
  timestamp: Date;
}

export interface EngineState {
  mode: EngineMode;
  activeDomain: ScientificDomain;
  logicalTime: number;
  entities: UniversalStateObject[];
  activeEntityId: string | null;
  logs: string[];
  objectives: GlobalObjective[];
  systemCoherence: number;
  terminalHistory: TerminalEntry[];
  globalEnv: {
    temperature: number;
    znConcentration: number;
  };
}
