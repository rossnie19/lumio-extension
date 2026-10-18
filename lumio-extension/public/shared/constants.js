//lumio will track these websites:
export const AI_DOMAINS = [
    "chatgpt.com",
    "claude.ai",
    "gemini.google.com",
    "perplexity.ai"
];

//computation of how many minutes will determine the mood of the companion
export const SESSION_CONFIG = {
    focusedMinutes: 5, //mood stays "focused" this long after checking a claim with Compass
    gapThresholdMinutes: 5, //gap before a session is considered "ended"
    awayGraceMinutes: 5, //time keeps counting this long after you last looked at an AI tab, then stops
    concernedSessionMinutes: 45, //continuous active time before mood = concerned
    idleMinutes: 30 //minutes without looking at an AI tab before mood = idle
}

//pet name shown until the user picks one (popup and dashboard)
export const DEFAULT_PET_NAME = "PET NAME";

//character shown until the user picks one in the dashboard
export const DEFAULT_CHARACTER = { id: "mangkukulam", name: "MANGKUKULAM", image: "/assets/companion/mangkukulam.png" };

//gagamitin ni shanne:
//trusted sources na gagamitin sa compass
export const TRUSTED_SOURCES = [
    { id: "google-scholar", name: "Google Scholar", url: "https://scholar.google.com/scholar?q=" },
    { id: "google-search", name: "Google Search", url: "https://www.google.com/search?q=" },
    { id: "semantic-scholar", name: "Semantic Scholar", url: "https://www.semanticscholar.org/search?q=" },
    { id: "jstor", name: "JSTOR", url: "https://www.jstor.org/action/doBasicSearch?Query=" },
    { id: "pubmed", name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/?term=" },
    { id: "science-direct", name: "ScienceDirect", url: "https://www.sciencedirect.com/search?qs=" },
    { id: "unesco", name: "UNESCO", url: "https://www.unesco.org/en/search?f%5B0%5D=&search_api_fulltext=" },
]

// how valid sources will be shown in the compass when user highlights text
export function generateValidSources(highlightedText) {
    if (!highlightedText || typeof highlightedText !== 'string') {
        return [];
    }

    const encodedText = encodeURIComponent(highlightedText.trim());

    // shape matches what the compass sidebar renders: { title, source, url }
    return TRUSTED_SOURCES.map(source => ({
        id: source.id,
        title: source.name,
        source: new URL(source.url).hostname.replace(/^www\./, ""),
        url: `${source.url}${encodedText}`
    }));
}
