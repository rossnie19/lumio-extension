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

//the companion characters (sprite sheets: assets/companion/sprites, lines: dialogue.js).
//content-scripts/pet.js can't import this file and keeps its own short list of ids
export const CHARACTERS = [
    { id: "mangkukulam", name: "MANGKUKULAM", image: "/assets/companion/mangkukulam.png" },
    { id: "manananggal", name: "MANANANGGAL", image: "/assets/companion/manananggal.png" },
    { id: "tikbalang", name: "TIKBALANG", image: "/assets/companion/tikbalang.png" }
];

//character shown until the user picks one in the dashboard
export const DEFAULT_CHARACTER = CHARACTERS[0];

//the saved character is looked up by id, so names/image paths always come from CHARACTERS
export function characterById(id) {
    return CHARACTERS.find(c => c.id === id) || DEFAULT_CHARACTER;
}

//gagamitin ni shanne:
//trusted search sites, linked under "Search more on" in the Compass sidebar
export const TRUSTED_SOURCES = [
    { id: "google-scholar", name: "Google Scholar", url: "https://scholar.google.com/scholar?q=" },
    { id: "google-search", name: "Google Search", url: "https://www.google.com/search?q=" },
    { id: "semantic-scholar", name: "Semantic Scholar", url: "https://www.semanticscholar.org/search?q=" },
    { id: "jstor", name: "JSTOR", url: "https://www.jstor.org/action/doBasicSearch?Query=" },
    { id: "pubmed", name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/?term=" },
    { id: "science-direct", name: "ScienceDirect", url: "https://www.sciencedirect.com/search?qs=" },
    { id: "unesco", name: "UNESCO", url: "https://www.unesco.org/en/search?f%5B0%5D=&search_api_fulltext=" },
]

// "search more on" links for a query, as the compass sidebar renders them: { title, url }
export function buildSearchLinks(query) {
    if (!query || typeof query !== "string") {
        return [];
    }

    const encodedQuery = encodeURIComponent(query.trim());
    return TRUSTED_SOURCES.map(source => ({
        title: source.name,
        url: `${source.url}${encodedQuery}`
    }));
}
