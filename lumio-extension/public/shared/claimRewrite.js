// turns highlighted text into a clear claim + search keywords for Compass.
// uses Chrome's built-in on-device AI (Gemini Nano via the Prompt API) when this computer supports it:
// the highlighted text never leaves the computer for this step. otherwise it falls back to a simple
// filler-word cleanup. the AI only writes the search, it never supplies sources (those come from
// real search APIs in sourceSearch.js), so it can't make up papers.

// the same options must be used for availability() and create()
export const MODEL_OPTIONS = {
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }]
};

const AI_TIMEOUT_MS = 20 * 1000;
const MAX_INPUT_CHARS = 1500;

// "available" | "downloadable" | "downloading" | "unavailable"
export async function getOnDeviceAIStatus() {
    if (typeof LanguageModel === "undefined") return "unavailable"; // older chrome, or not exposed here
    try {
        return await LanguageModel.availability(MODEL_OPTIONS);
    } catch {
        return "unavailable";
    }
}

const SYSTEM_PROMPT = `You help people fact-check text by finding research about it.
Given a piece of highlighted text, respond with:
- claim: the main factual claim it makes, as one short, neutral sentence
- keywords: 2 to 5 search keywords for finding academic papers about that claim
Keywords are topic words only: no filler words, no opinions, no words like "true" or "study".
If the text is not a factual claim, give the closest topic instead.`;

const RESPONSE_SCHEMA = {
    type: "object",
    properties: {
        claim: { type: "string" },
        keywords: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 }
    },
    required: ["claim", "keywords"]
};

async function rewriteWithAI(text) {
    const session = await LanguageModel.create({
        ...MODEL_OPTIONS,
        initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }]
    });
    try {
        const raw = await session.prompt(text.slice(0, MAX_INPUT_CHARS), {
            responseConstraint: RESPONSE_SCHEMA,
            signal: AbortSignal.timeout(AI_TIMEOUT_MS)
        });
        const parsed = JSON.parse(raw);
        const keywords = (parsed.keywords || []).map(k => String(k).trim()).filter(Boolean);
        if (keywords.length === 0) throw new Error("AI returned no keywords");

        return { claim: String(parsed.claim || "").trim() || text, query: keywords.join(" "), usedAI: true };
    } finally {
        session.destroy();
    }
}

const STOP_WORDS = new Set(`a about above after again against all also am an and any are as at be because been before
being below between both but by can could did do does doing down during each even ever every few for from further
had has have having he her here hers herself him himself his how however i if in into is it its itself just less like
make makes making many may me might more most much must my myself never no nor not now of off often on once only or
other our ours ourselves out over own really said same say says she should since so some still such than that the
their theirs them themselves then there these they this those through to too under until up us very was we were what
when where whether which while who whom why will with would yet you your yours yourself yourselves
everyone everybody anyone anybody someone somebody people know knows known think thinks thought believe believes
actually literally basically obviously clearly definitely probably maybe true false fact facts thing things stuff
lot lots get gets got went go goes going really totally simply`.split(/\s+/));

const MAX_FALLBACK_KEYWORDS = 8;

// no AI: drop filler words and repeats, keep the first few meaningful words
export function rewriteWithoutAI(text) {
    const words = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
        .split(/\s+/)
        .map(w => w.replace(/^['-]+|['-]+$/g, ""))
        .filter(w => w.length > 1 && !STOP_WORDS.has(w));
    const keywords = [...new Set(words)].slice(0, MAX_FALLBACK_KEYWORDS);
    return { claim: text, query: keywords.join(" ") || text, usedAI: false };
}

export async function rewriteClaim(text) {
    if ((await getOnDeviceAIStatus()) === "available") {
        try {
            return await rewriteWithAI(text);
        } catch (err) {
            console.warn("On-device AI failed, using simple keyword cleanup instead:", err);
        }
    }
    return rewriteWithoutAI(text);
}
