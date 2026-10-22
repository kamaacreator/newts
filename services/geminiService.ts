import type { ResolutionData, ScientificDomain } from "../types.ts";
import { classifyScientificDomain } from "./domainClassifier.ts";

interface ResolutionContext {
  activeEntityId?: string | null;
  activeDomain?: ScientificDomain;
  globalEnv?: {
    temperature: number;
    znConcentration: number;
  };
  logicalTime?: number;
}

/**
 * Legacy heuristic illustration layer.
 * This module uses hand-coded constants and simplified equations; it is not a validated
 * scientific solver and must not be presented as executing molecular mechanics, FEA,
 * machine-learning training, or plasma-equilibrium solvers.
 */
export function generateLocalDeterministicResolution(
  command: string, 
  context?: ResolutionContext
): ResolutionData {
  const cmdLower = command.toLowerCase();

  // Shared classifier keeps server routing and calculation dispatch consistent.
  const domain = classifyScientificDomain(command, context?.activeDomain || 'BIOLOGY');

  const currentTemp = context?.globalEnv?.temperature ?? 25;
  const currentZn = context?.globalEnv?.znConcentration ?? 1.0;

  // 2. BIOLOGY DOMAIN
  if (domain === 'BIOLOGY') {
    const isCrispr = cmdLower.includes('crispr') || cmdLower.includes('cas9') || cmdLower.includes('pam') || cmdLower.includes('chromatin') || cmdLower.includes('r-loop') || cmdLower.includes('hdr');

    if (isCrispr) {
      // Parse parameters or set biological literature defaults
      const guideMatch = command.match(/guide(?:_length)?\s*[:=]\s*(\d+)/i);
      const guideLength = guideMatch ? parseInt(guideMatch[1], 10) : 20;

      const densityMatch = command.match(/chromatin(?:_density)?\s*[:=]\s*([\d.]+)/i);
      const chromatinDensity = densityMatch ? parseFloat(densityMatch[1]) : 0.78;

      const pamMatch = !cmdLower.includes('non-pam') && !cmdLower.includes('mismatch_pam');

      // Thermodynamic calculations
      const dG_pam = pamMatch ? -4.5 : 1.2; // kcal/mol
      const dG_seed = -1.8 * 8; // kcal/mol (8-bp PAM-proximal seed)
      const dG_nonseed = -1.1 * Math.max(0, guideLength - 8); // kcal/mol
      const chromatinBarrier = 3.6 * chromatinDensity; // kcal/mol penalty from nucleosome wrapping
      const total_dG = dG_pam + dG_seed + dG_nonseed + chromatinBarrier;

      // Rate via Arrhenius-Eyring transition state formulation
      const R = 1.987e-3; // kcal/(mol*K)
      const T_kelvin = 273.15 + currentTemp;
      const k_cleave = Math.exp(-Math.max(0.1, total_dG + 14.5) / (R * T_kelvin));

      // HDR vs NHEJ bifurcation
      const hdrFraction = 1.0 / (1.0 + Math.exp(total_dG + 8.0));
      const unwindingTimeMs = 14.2 / Math.max(0.1, 1.0 - chromatinDensity * 0.7);
      const nhejProb = Math.min(0.95, 0.04 * (1.0 + chromatinDensity * 2.0));

      return {
        status: "RESOLVED",
        resultClass: "illustrative",
        method: "legacy-formula-illustration-v0",
        summary: `ILLUSTRATIVE CRISPR heuristic only: values are generated from fixed constants and simplified equations. This is not a validated Cas9 kinetic model and does not predict experimental cleavage, HDR, or NHEJ outcomes.`,
        states: [
          {
            label: "S0_PAM_Interrogation_Locked",
            metrics: [
              { name: "Illustrative association score", value: "1.42e6", unit: "arbitrary score" },
              { name: "Illustrative binding score", value: total_dG.toFixed(2), unit: "arbitrary score" },
              { name: "Illustrative unwinding score", value: unwindingTimeMs.toFixed(1), unit: "arbitrary score" }
            ]
          },
          {
            label: "S1_Catalytic_R_Loop_Cleavage",
            metrics: [
              { name: "Illustrative cleavage score", value: k_cleave.toFixed(3), unit: "arbitrary score" },
              { name: "ATP consumption", value: "Not calculated", unit: "not available" }, // Literature constant: Cas9 cleavage is ATP-independent
              { name: "Guide Length", value: guideLength, unit: "residues" }
            ]
          },
          {
            label: "S2_Pathway_HDR_Resolution",
            metrics: [
              { name: "Illustrative HDR score", value: (hdrFraction * 100).toFixed(1), unit: "not calibrated" },
              { name: "Illustrative NHEJ score", value: nhejProb.toFixed(3), unit: "not calibrated" },
              { name: "Illustrative resection score", value: (4.1 * (T_kelvin / 310.15)).toFixed(2), unit: "arbitrary score" }
            ]
          }
        ],
        transitions: [
          { from: "S0_PAM_Interrogation_Locked", to: "S1_Catalytic_R_Loop_Cleavage", probability: "Not calibrated" },
          { from: "S1_Catalytic_R_Loop_Cleavage", to: "S2_Pathway_HDR_Resolution", probability: "Not calibrated" }
        ],
        deterministicSteps: [
          "1. Classified the request using deterministic keyword rules.",
          "2. Parsed or defaulted guide length, chromatin density, and temperature.",
          "3. Evaluated hand-coded illustrative equations; constants are not calibrated to an experimental dataset.",
          "4. Output is illustrative only and is not a prediction of cleavage, HDR, or NHEJ.",
        ],
        deterministicCode: `# ILLUSTRATIVE EXAMPLE ONLY — NOT EXECUTED BY AETHERIS
# Simplified formulas; not a validated scientific solver.
# [DOMAIN: BIOLOGY / GENOMIC CRISPR-CAS9 CLEAVAGE]

import numpy as np

def compute_crispr_kinetics(guide_length=${guideLength}, pam_match=${pamMatch ? 'True' : 'False'}, chromatin_density=${chromatinDensity}, temp_c=${currentTemp}):
    """
    Deterministically calculates Cas9 R-loop completion free-energy and cleavage rate.
    Accounts for the Chromatin Accessibility Paradox via density dampening.
    """
    dG_pam = -4.5 if pam_match else 1.2
    dG_seed = -1.8 * 8  # 8-bp seed region
    dG_nonseed = -1.1 * max(0, guide_length - 8)
    chromatin_barrier = 3.6 * chromatin_density
    
    total_dG = dG_pam + dG_seed + dG_nonseed + chromatin_barrier
    
    R = 1.987e-3  # kcal/(mol*K)
    T = 273.15 + temp_c
    k_cleave = np.exp(-max(0.1, total_dG + 14.5) / (R * T))
    hdr_fraction = 1.0 / (1.0 + np.exp(total_dG + 8.0))
    
    return {
        "domain": "BIOLOGY",
        "total_dG_kcal_mol": round(float(total_dG), 2),
        "k_cleave_Hz": round(float(k_cleave), 3),
        "hdr_efficiency_pct": round(float(hdr_fraction * 100), 1),
        "unwinding_time_ms": round(float(14.2 / max(0.1, 1.0 - chromatin_density * 0.7)), 1)
    }

if __name__ == "__main__":
    results = compute_crispr_kinetics()
    print("Deterministic CRISPR Simulation Output:")
    for k, v in results.items():
        print(f"  {k}: {v}")
`
      };
    }

    // Default Protein Folding / Biophysics (p53 Sovereign Attractor)
    const residueCount = 393;
    const hydrophobicLikeScore = -0.025 * residueCount;
    const zincLikeScore = -3.8 * Math.min(1.0, currentZn);
    const temperatureLikePenalty = 0.018 * residueCount * ((currentTemp + 273.15) / 298.15);
    
    // Thermal denaturation penalty above physiological 42°C
    const thermalLikePenalty = currentTemp > 42 ? 0.35 * Math.pow(currentTemp - 42, 1.5) : 0;
    const illustrativeEnergyScore = hydrophobicLikeScore + zincLikeScore + temperatureLikePenalty + thermalLikePenalty;
    
    const illustrativeAggregationScore = currentZn < 0.4 
      ? Math.min(0.99, (0.4 - currentZn) * 1.5 + (currentTemp > 42 ? 0.4 : 0.05))
      : (currentTemp > 45 ? 0.75 : 0.000000001);

    return {
      status: "RESOLVED",
      resultClass: "illustrative",
      method: "legacy-formula-illustration-v0",
      summary: `ILLUSTRATIVE protein heuristic only: no sequence-specific structure, force field, Poisson–Boltzmann solver, SASA calculation, conformational sampling, or coordinate-derived RMSD is executed in this path.`,
      states: [
        {
          label: "S0_Sovereign_Attractor",
          metrics: [
            { name: "Gibbs Free Energy", value: illustrativeEnergyScore.toFixed(2), unit: "arbitrary score" },
            { name: "Coordinate-derived RMSD", value: "Not calculated", unit: "not available" },
            { name: "Illustrative frequency score", value: Math.round(1250 * (310.15 / (currentTemp + 273.15))).toString(), unit: "arbitrary score" }
          ]
        },
        {
          label: "S1_Intermediate_Lapsed",
          metrics: [
            { name: "Gibbs Free Energy", value: (illustrativeEnergyScore + 9.9).toFixed(2), unit: "arbitrary score" },
            { name: "Coordinate-derived RMSD", value: "Not calculated", unit: "not available" },
            { name: "Illustrative voltage score", value: (-14.2 * currentZn).toFixed(1), unit: "arbitrary score" }
          ]
        }
      ],
      transitions: [
        { from: "S1_Intermediate_Lapsed", to: "S0_Sovereign_Attractor", probability: "Not calibrated" }
      ],
      deterministicSteps: [
        "1. Classified the request as a biology/protein heuristic.",
        "2. Used a fixed residue count of 393; this path does not consume a sequence or structure.",
        "3. Evaluated a toy scalar formula; its terms are not physical free-energy components.",
        "4. Coordinate-derived RMSD and calibrated transition probabilities are unavailable in this heuristic path.",
      ],
      deterministicCode: `# ILLUSTRATIVE EXAMPLE ONLY — NOT EXECUTED BY AETHERIS
# Simplified formulas; not a validated scientific solver.
# [DOMAIN: BIOLOGY / PROTEIN BIOPHYSICS]

import numpy as np

def illustrative_folding_formula(residue_count=${residueCount}, zn_conc=${currentZn}, temp_c=${currentTemp}):
    """
    Demonstrates a toy scalar formula only; it is not a physical free-energy model.
    The result is not a fold, stability prediction, or coordinate-derived RMSD.
    """
    hydrophobic_like_score = -0.025 * residue_count
    zinc_like_score = -3.8 * min(1.0, zn_conc)
    temperature_like_penalty = 0.018 * residue_count * ((temp_c + 273.15) / 298.15)
    thermal_like_penalty = 0.35 * ((temp_c - 42) ** 1.5) if temp_c > 42 else 0.0
    illustrative_energy_score = hydrophobic_like_score + zinc_like_score + temperature_like_penalty + thermal_like_penalty
    
    return {
        "domain": "BIOLOGY",
        "illustrative_energy_score": round(float(illustrative_energy_score), 2),
        "coordinate_derived_rmsd": None,
        "stability_prediction": None,
        "illustrative_aggregation_score": round(float(${illustrativeAggregationScore}), 6)
    }

if __name__ == "__main__":
    out = illustrative_folding_formula()
    print("Protein Conformational Stability:", out)
`
    };
  }

  // 3. ENGINEERING DOMAIN
  if (domain === 'ENGINEERING') {
    const volMatch = command.match(/vol(?:frac)?\s*[:=]\s*([\d.]+)/i);
    const volfrac = volMatch ? parseFloat(volMatch[1]) : 0.40;

    const penalMatch = command.match(/penal(?:ization)?\s*[:=]\s*([\d.]+)/i);
    const penal = penalMatch ? parseFloat(penalMatch[1]) : 3.0;

    const nelxMatch = command.match(/nelx\s*[:=]\s*(\d+)/i);
    const nelx = nelxMatch ? parseInt(nelxMatch[1], 10) : 60;
    const nely = 20;

    const initialCompliance = 1.45; // Joules
    const optimizedCompliance = initialCompliance * Math.pow(volfrac, 1.0 - penal) * 0.15;
    const maxStressMpa = 142.5 / Math.sqrt(volfrac);

    return {
      status: "RESOLVED",
      resultClass: "illustrative",
      method: "legacy-formula-illustration-v0",
      summary: `ILLUSTRATIVE engineering formula only: no mesh, finite-element stiffness matrix, numerical equilibrium solve, or iterative SIMP optimization is executed.`,
      states: [
        {
          label: "S0_Optimized_Topology",
          metrics: [
            { name: "Illustrative compliance score", value: optimizedCompliance.toFixed(2), unit: "arbitrary score" },
            { name: "Requested volume fraction", value: (volfrac * 100).toFixed(1), unit: "% (input)" },
            { name: "Illustrative stress score", value: maxStressMpa.toFixed(1), unit: "arbitrary score" }
          ]
        },
        {
          label: "S1_Initial_Solid_Mesh",
          metrics: [
            { name: "Illustrative baseline compliance score", value: initialCompliance.toFixed(2), unit: "arbitrary score" },
            { name: "Illustrative baseline volume fraction", value: "100.0", unit: "% (illustration)" },
            { name: "Illustrative baseline stress score", value: "310.2", unit: "arbitrary score" }
          ]
        }
      ],
      transitions: [
        { from: "S1_Initial_Solid_Mesh", to: "S0_Optimized_Topology", probability: "Not calibrated" }
      ],
      deterministicSteps: [
        "1. Classified the request using deterministic keyword rules.",
        "2. Parsed or defaulted a small set of scalar parameters.",
        "3. Evaluated a closed-form illustration; no mesh or finite-element solver ran.",
        "4. The result is not a validated structural or topology-optimization result.",
      ],
      deterministicCode: `# ILLUSTRATIVE EXAMPLE ONLY — NOT EXECUTED BY AETHERIS
# Simplified formulas; not a validated scientific solver.
# [DOMAIN: ENGINEERING / STRUCTURAL FEA & TOPOLOGY]

import numpy as np

def solve_topology_optimization(nelx=${nelx}, nely=${nely}, volfrac=${volfrac}, penal=${penal}):
    """
    Deterministic 2D SIMP Cantilever Topology Optimization.
    Minimizes compliance c = U^T * K * U subject to volume fraction limit.
    """
    E0 = 1.0  # Young's modulus for solid material
    Emin = 1e-9  # Void modulus to prevent singularity
    nu = 0.3  # Poisson's ratio
    
    # Initialize uniform density field
    x = np.full((nely, nelx), volfrac)
    
    initial_compliance = 1.45  # Joules
    optimized_compliance = round(initial_compliance * (volfrac ** (1.0 - penal)) * 0.15, 2)
    max_stress_mpa = round(142.5 / np.sqrt(volfrac), 1)
    
    return {
        "domain": "ENGINEERING",
        "compliance_joules": optimized_compliance,
        "volume_fraction_pct": round(volfrac * 100.0, 1),
        "max_von_mises_mpa": max_stress_mpa,
        "elements_evaluated": nelx * nely
    }

if __name__ == "__main__":
    res = solve_topology_optimization()
    print("Deterministic Structural Optimization:", res)
`
    };
  }

  // 4. AI / STATISTICAL LEARNING DOMAIN
  if (domain === 'AI') {
    const stepsMatch = command.match(/steps?\s*[:=]\s*(\d+)/i);
    const steps = stepsMatch ? parseInt(stepsMatch[1], 10) : 1000;

    const initialLoss = 2.31; // nats
    const decayRate = 0.0038;
    const finalLoss = initialLoss * Math.exp(-decayRate * steps) + 0.048;
    const accuracy = Math.min(99.9, 100.0 * (1.0 - 0.45 * finalLoss));
    const mutualInfo = Math.max(1.0, 14.8 - 2.0 * finalLoss);

    return {
      status: "RESOLVED",
      resultClass: "illustrative",
      method: "legacy-formula-illustration-v0",
      summary: `ILLUSTRATIVE loss-curve formula only: no neural network is trained, no dataset is evaluated, and no measured accuracy is produced.`,
      states: [
        {
          label: "AI0_Converged_Minima",
          metrics: [
            { name: "Illustrative loss score", value: finalLoss.toFixed(3), unit: "arbitrary score" },
            { name: "Illustrative accuracy placeholder", value: accuracy.toFixed(1), unit: "not measured" },
            { name: "Illustrative latency placeholder", value: "4.2", unit: "not measured" }
          ]
        },
        {
          label: "AI1_Initialization_State",
          metrics: [
            { name: "Illustrative initial loss score", value: initialLoss.toFixed(2), unit: "arbitrary score" },
            { name: "Illustrative initial accuracy placeholder", value: "11.2", unit: "not measured" },
            { name: "Illustrative initial latency placeholder", value: "4.1", unit: "not measured" }
          ]
        }
      ],
      transitions: [
        { from: "AI1_Initialization_State", to: "AI0_Converged_Minima", probability: "Not calibrated" }
      ],
      deterministicSteps: [
        "1. Classified the request using deterministic keyword rules.",
        "2. Selected fixed illustrative loss-curve parameters.",
        "3. Evaluated a preset equation; no model training or dataset evaluation ran.",
        "4. No measured accuracy or generalization estimate is produced.",
      ],
      deterministicCode: `# ILLUSTRATIVE EXAMPLE ONLY — NOT EXECUTED BY AETHERIS
# Simplified formulas; not a validated scientific solver.
# [DOMAIN: AI / MACHINE LEARNING & INFORMATION THEORY]

import numpy as np

def compute_loss_trajectory(steps=${steps}, lr=1e-3):
    """
    Deterministic convergence model for deep representation learning.
    Loss measured strictly in nats; latency in milliseconds.
    """
    initial_loss = 2.31 # nats
    decay_rate = 0.0038
    final_loss = initial_loss * np.exp(-decay_rate * steps) + 0.048
    accuracy = 100.0 * (1.0 - 0.45 * final_loss)
    
    return {
        "domain": "AI",
        "loss_nats": round(float(final_loss), 3),
        "accuracy_pct": round(float(min(99.9, accuracy)), 1),
        "latency_ms": 4.2,
        "mutual_information_bits": round(float(max(1.0, 14.8 - 2.0 * final_loss)), 1)
    }

if __name__ == "__main__":
    out = compute_loss_trajectory()
    print("Machine Learning Trajectory:", out)
`
    };
  }

  // 5. PHYSICS DOMAIN (Tokamak Plasma Grad-Shafranov)
  const bMatch = command.match(/B(?:_toroidal)?\s*[:=]\s*([\d.]+)/i);
  const B_toroidal = bMatch ? parseFloat(bMatch[1]) : 5.3;

  const ipMatch = command.match(/I(?:_p|p)?\s*[:=]\s*([\d.]+)/i);
  const plasmaCurrentMA = ipMatch ? parseFloat(ipMatch[1]) : 15.0;

  const minorRadiusM = 2.0;
  const troyonCoeff = 2.8;
  const betaLimitPct = troyonCoeff * (plasmaCurrentMA / (minorRadiusM * B_toroidal));
  const tauE = 0.0562 * Math.pow(plasmaCurrentMA, 0.93) * Math.pow(B_toroidal, 0.15);
  const coreTempKeV = 15.2 * Math.sqrt(plasmaCurrentMA / 15.0);

  return {
    status: "RESOLVED",
    resultClass: "illustrative",
    method: "legacy-formula-illustration-v0",
    summary: `ILLUSTRATIVE plasma estimates only: no Grad–Shafranov equilibrium solver or independently validated plasma-stability calculation is executed.`,
    states: [
      {
        label: "P0_Quiescent_H_Mode",
        metrics: [
          { name: "Illustrative core-temperature estimate", value: coreTempKeV.toFixed(1), unit: "keV (unvalidated)" },
          { name: "Illustrative confinement-time estimate", value: tauE.toFixed(2), unit: "s (unvalidated)" },
          { name: "Illustrative toroidal-field estimate", value: B_toroidal.toFixed(1), unit: "T (unvalidated)" }
        ]
      },
      {
        label: "P1_Near_Disruptive_Beta",
        metrics: [
          { name: "Illustrative perturbed core-temperature estimate", value: (coreTempKeV * 0.55).toFixed(1), unit: "keV (unvalidated)" },
          { name: "Illustrative perturbed confinement-time estimate", value: (tauE * 0.33).toFixed(2), unit: "s (unvalidated)" },
          { name: "Illustrative perturbed toroidal-field estimate", value: (B_toroidal * 0.96).toFixed(1), unit: "T (unvalidated)" }
        ]
      }
    ],
    transitions: [
      { from: "P1_Near_Disruptive_Beta", to: "P0_Quiescent_H_Mode", probability: "Not calibrated" }
    ],
    deterministicSteps: [
      "1. Classified the request using deterministic keyword rules.",
      "2. Parsed or defaulted a small set of scalar plasma parameters.",
      "3. Evaluated algebraic estimates; no Grad–Shafranov solver ran.",
      "4. Values are illustrative and are not validated equilibrium or stability predictions.",
    ],
    deterministicCode: `# ILLUSTRATIVE EXAMPLE ONLY — NOT EXECUTED BY AETHERIS
# Simplified formulas; not a validated scientific solver.
# [DOMAIN: PHYSICS / PLASMA CONFINEMENT & TOKAMAK]

import numpy as np

def compute_tokamak_equilibrium(B_toroidal=${B_toroidal}, plasma_current_MA=${plasmaCurrentMA}, minor_radius_m=${minorRadiusM}):
    """
    Computes plasma energy confinement time and Troyon beta limit.
    """
    troyon_coefficient = 2.8
    beta_limit = troyon_coefficient * (plasma_current_MA / (minor_radius_m * B_toroidal))
    
    # Confinement time scaling (ITER-98y2 approximation)
    tau_E = 0.0562 * (plasma_current_MA ** 0.93) * (B_toroidal ** 0.15)
    core_temp_keV = round(15.2 * np.sqrt(plasma_current_MA / 15.0), 1)
    
    return {
        "domain": "PHYSICS",
        "core_temp_keV": core_temp_keV,
        "confinement_time_s": round(float(tau_E), 2),
        "troyon_beta_limit_pct": round(float(beta_limit), 2),
        "toroidal_field_tesla": B_toroidal
    }

if __name__ == "__main__":
    out = compute_tokamak_equilibrium()
    print("Plasma Confinement Solution:", out)
`
  };
}

export const generateDeterministicCode = async (
  command: string, 
  context: any
): Promise<ResolutionData> => {
  return generateLocalDeterministicResolution(command, context);
};

export const compileDeterministicData = async (
  rawData: string,
  previousResolution: ResolutionData
): Promise<ResolutionData> => {
  return {
    ...previousResolution,
    status: "RESOLVED",
    resultClass: "illustrative",
    method: "local-telemetry-compilation-v0",
    rawData,
    summary: `[ILLUSTRATIVE DATA COMPILATION] Telemetry fields were compiled; no scientific solver was executed.`
  };
};
