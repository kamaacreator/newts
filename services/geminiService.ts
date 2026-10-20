
import { GoogleGenAI, Type } from "@google/genai";
import { ResolutionData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

const TIMEOUT_MS = 120000;
const MAX_RETRIES = 2;

const withTimeout = <T>(promise: Promise<T>, message: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(`TIMEOUT: ${message}`)), TIMEOUT_MS)
    )
  ]);
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const callWithRetry = async <T>(fn: () => Promise<T>, retries: number = MAX_RETRIES): Promise<T> => {
  try {
    return await fn();
  } catch (e: any) {
    const isRateLimit = e.message?.includes('429') || e.status === 429;
    if (retries > 0) {
      const delay = isRateLimit ? 2000 * (MAX_RETRIES - retries + 1) : 500;
      console.warn(`Retrying in ${delay}ms... (${MAX_RETRIES - retries + 1})`);
      await sleep(delay);
      return await callWithRetry(fn, retries - 1);
    }
    throw e;
  }
};

export const generateDeterministicCode = async (
  command: string, 
  context: any
): Promise<ResolutionData> => {
  const logicPrompt = `
    DIRECTIVE: You are AETHERIS, a deterministic science analysis engine.
    The user has issued a command: "${command}"
    
    Current System Context:
    ${JSON.stringify(context, null, 2)}

    SUMMARY RULE:
    Provide mechanistic analysis only.
    Explicitly separate established science from genuine unknowns.
    Never conflate the two.

    STATES RULE:
    Use only these units per domain:
    - Neuroscience/Biology: mV, ATP, mM/s, Hz, ms
    - Information Theory: nats, bits
    - Chemistry/Molecular: kcal/mol, Å
    - Machine Learning: loss (nats), accuracy (%), latency (ms)
    - Network: bandwidth (Mbps), latency (ms)
    Never apply units from one domain to another.

    CODE CONSISTENCY RULE:
    Every value in STATES must be either:
    - Computed by the upcoming code
    - Flagged as [Literature Constant: source]
    If a value cannot be computed state:
    [UNCOMPUTABLE: specific reason]

    TRANSITIONS RULE:
    Only assign probability values you can justify.
    If probability is unknown state the specific reason.
  `;

  try {
    const logicResponse = await callWithRetry(() => withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: logicPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              states: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    metrics: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          value: { type: Type.STRING },
                          unit: { type: Type.STRING }
                        },
                        required: ["name", "value", "unit"]
                      }
                    }
                  },
                  required: ["label", "metrics"]
                }
              },
              transitions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    from: { type: Type.STRING },
                    to: { type: Type.STRING },
                    probability: { type: Type.STRING }
                  },
                  required: ["from", "to", "probability"]
                }
              }
            },
            required: ["summary", "states"]
          }
        }
      }),
      "Logic Generation Phase"
    ));

    const logicData = JSON.parse(logicResponse.text || "{}");

    const codePrompt = `
    DIRECTIVE: You are the Isolated Code Generation Module of AETHERIS.
    Your task is to write code that computes the metrics for the states provided.
    You do NOT receive full conversation history to guarantee domain isolation.

    USER QUERY:
    "${command}"

    ACTIVE DOMAIN: ${context.activeDomain}

    MECHANISTIC SUMMARY:
    ${logicData.summary}

    TARGET STATES TO COMPUTE:
    ${JSON.stringify(logicData.states, null, 2)}
    
    CODE RULE:
    Before writing any code, you must state explicitly at the top of your deterministicCode string:
    # [PREVIOUS CODE DISCARDED]
    # [NEW DOMAIN CODE FOLLOWS]
    # [DOMAIN: ${context.activeDomain}]
    1. You are FORBIDDEN from omitting code for brevity. 
    2. You must write the complete, executable Python script (deterministicCode).
    3. Define the deterministic steps (deterministicSteps) for validation.
    `;

    const codeResponse = await callWithRetry(() => withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: codePrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              deterministicCode: { type: Type.STRING },
              deterministicSteps: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            },
            required: ["deterministicCode", "deterministicSteps"]
          }
        }
      }),
      "Isolated Code Generation Phase"
    ));

    const codeData = JSON.parse(codeResponse.text || "{}");

    return {
      status: "PENDING_COMPUTATION",
      summary: logicData.summary,
      states: logicData.states,
      transitions: logicData.transitions || [],
      deterministicCode: codeData.deterministicCode,
      deterministicSteps: codeData.deterministicSteps
    } as ResolutionData;
  } catch (e) {
    console.error("Failed to generate code", e);
    throw e;
  }
};

export const compileDeterministicData = async (
  rawData: string,
  previousResolution: ResolutionData
): Promise<ResolutionData> => {
  const prompt = `
    DIRECTIVE: You are AETHERIS, a deterministic science analysis engine. 
    Here is the raw deterministic data from a Layer 3 simulation:
    "${rawData}"

    Previous Context & Code:
    ${JSON.stringify(previousResolution, null, 2)}

    DOMAIN RESET RULE:
    At the start of every new query state:
    [DOMAIN: e.g., Machine Learning / Neuroscience / Physics]
    Code must be written fresh for that specific domain.
    Never carry forward code from a previous query.

    SUMMARY RULE:
    Provide mechanistic analysis only.
    Explicitly separate established science from genuine unknowns.
    Never conflate the two.

    STATES RULE:
    Use only these units per domain:
    - Neuroscience/Biology: mV, ATP, mM/s, Hz, ms
    - Information Theory: nats, bits
    - Chemistry/Molecular: kcal/mol, Å
    - Machine Learning: loss (nats), accuracy (%), latency (ms)
    - Network: bandwidth (Mbps), latency (ms)
    Never apply units from one domain to another.

    CODE CONSISTENCY RULE:
    Every value in STATES must be either:
    - Directly computed by the code (verify via rawData)
    - Flagged as [Literature Constant: source]
    If a value cannot be computed and it is not in rawData, state:
    [UNCOMPUTABLE: specific reason]

    TRANSITIONS RULE:
    Only assign probability values you can justify based on the raw metrics.
    If probability is unknown state the specific reason.
    
    Detail the exact deterministic states and metrics corresponding to the simulated domain based STRICTLY on this data.
    Set status to "RESOLVED".
  `;

  try {
    const response = await callWithRetry(() => withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, enum: ["RESOLVED"] },
              summary: { type: Type.STRING },
              states: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    metrics: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          value: { type: Type.STRING },
                          unit: { type: Type.STRING }
                        },
                        required: ["name", "value", "unit"]
                      }
                    }
                  },
                  required: ["label", "metrics"]
                }
              },
              transitions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    from: { type: Type.STRING },
                    to: { type: Type.STRING },
                    probability: { type: Type.STRING }
                  },
                  required: ["from", "to", "probability"]
                }
              }
            },
            required: ["status", "summary", "states"]
          }
        }
      }),
      "Data Compilation Phase"
    ));

    const result = JSON.parse(response.text || "{}");
    return {
      ...previousResolution,
      ...result,
      rawData
    } as ResolutionData;
  } catch (e) {
    console.error("Failed to compile data", e);
    throw e;
  }
};
