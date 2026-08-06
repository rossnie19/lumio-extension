//lumio will track these websites:
export const AI_DOMAINS = [
    "chatgpt.com",
    "claude.ai",
    "gemini.google.com",
    "perplexity.ai"
];

//computation of how many minutes will determine the mood of the companion
export const SESSION_CONFIG = {
    gapThresholdMinutes: 5, //gap before a session is considered "ended"
    concernedSessionMinutes: 45, //continuous active time before mood = concerned
    restingMinutes: 30 //no activity at all before mood = resting
}

//gagamitin ni shanne:
//trusted sources na gagamitin sa compass
export const TRUSTED_SOURCES = [
    { name: "Google Scholar", url: "https://scholar.google.com/scholar?q=" },
    { name: "Google Search", url: "https://www.google.com/search?q=" },
    { name: "Semantic Scholar", url: "https://www.semanticscholar.org/search?q=" },
    { name: "JSTOR", url: "https://www.jstor.org/action/doBasicSearch?Query=" },
    { name: "PubMed", url: "https://pubmed.ncbi.nlm.nih.gov/?term=" },
    { name: "ScienceDirect", url: "https://www.sciencedirect.com/search?qs=" },
    { name: "UNESCO", url: "https://www.unesco.org/en/search?f%5B0%5D=&search_api_fulltext=" },
]

