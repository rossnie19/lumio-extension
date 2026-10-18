// searches real, free research APIs for Compass (no accounts, no keys, nothing stored):
// - OpenAlex: ~250M papers across all fields, sorted by relevance
// - Europe PMC: health & life-science papers (includes PubMed), newest first
// - Wikipedia: general background for everyday facts (labelled as background, not proof)
// titles/snippets may contain HTML markup; compass.js turns them into plain text before showing them

const TIMEOUT_MS = 8 * 1000;
const OPENALEX_RESULTS = 4;
const EUROPE_PMC_RESULTS = 3;
const MAX_PAPERS = 6;
const MAX_AUTHORS_SHOWN = 2;

async function getJSON(url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url).hostname}`);
    return res.json();
}

function formatAuthors(names) {
    const clean = names.filter(Boolean);
    if (clean.length <= MAX_AUTHORS_SHOWN) return clean.join(", ");
    return `${clean.slice(0, MAX_AUTHORS_SHOWN).join(", ")} et al.`;
}

// "https://doi.org/10.1/ABC" or "10.1/abc" -> "10.1/abc", used to spot the same paper from two sources
function normalizeDoi(doi) {
    return doi ? doi.replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").toLowerCase() : null;
}

async function searchOpenAlex(query) {
    const params = new URLSearchParams({
        search: query,
        "per-page": String(OPENALEX_RESULTS),
        filter: "is_retracted:false",
        select: "id,display_name,publication_year,doi,authorships,primary_location"
    });
    const data = await getJSON(`https://api.openalex.org/works?${params}`);

    return data.results.map(work => ({
        title: work.display_name,
        authors: formatAuthors((work.authorships || []).map(a => a.author?.display_name)),
        year: work.publication_year,
        venue: work.primary_location?.source?.display_name || "",
        url: work.doi || work.id,
        doi: normalizeDoi(work.doi),
        source: "OpenAlex"
    }));
}

async function searchEuropePMC(query) {
    // only titles + abstracts: Europe PMC has no relevance sort (newest first), and a full-text
    // search returns lots of off-topic papers. no match here is better than unrelated results
    const params = new URLSearchParams({
        query: `TITLE_ABS:(${query})`, format: "json", pageSize: String(EUROPE_PMC_RESULTS), resultType: "lite"
    });
    const data = await getJSON(`https://www.ebi.ac.uk/europepmc/webservices/rest/search?${params}`);
    const results = data.resultList?.result || [];

    return results.map(r => ({
        title: r.title,
        authors: r.authorString || "",
        year: r.pubYear ? Number(r.pubYear) : null,
        venue: r.journalTitle || "",
        url: r.doi ? `https://doi.org/${r.doi}` : `https://europepmc.org/article/${r.source}/${r.id}`,
        doi: normalizeDoi(r.doi),
        source: "Europe PMC"
    }));
}

async function searchWikipedia(query) {
    const params = new URLSearchParams({
        action: "query", list: "search", srsearch: query, srlimit: "1", format: "json", origin: "*"
    });
    const data = await getJSON(`https://en.wikipedia.org/w/api.php?${params}`);
    const hit = data.query?.search?.[0];
    if (!hit) return null;

    // wikipedia's search returns *something* for almost any query: only keep it if the article
    // title shares a real word with the query, otherwise it's likely unrelated
    const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    const titleWords = hit.title.toLowerCase().split(/[^\p{L}\p{N}]+/u);
    if (!titleWords.some(w => queryWords.has(w))) return null;

    return {
        title: hit.title,
        snippet: hit.snippet,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(hit.title.replace(/ /g, "_"))}`,
        source: "Wikipedia"
    };
}

// the same paper often comes back from more than one source: keep the first copy
function dedupePapers(papers) {
    const seen = new Set();
    return papers.filter(paper => {
        const key = paper.doi || paper.title.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// returns { papers, wikipedia, failedSources } - a source that errors or times out is skipped, not fatal
export async function searchSources(query) {
    const [openAlex, europePMC, wikipedia] = await Promise.allSettled([
        searchOpenAlex(query),
        searchEuropePMC(query),
        searchWikipedia(query)
    ]);

    const failedSources = [];
    const valueOf = (result, name, fallback) => {
        if (result.status === "fulfilled") return result.value;
        console.warn(`Compass: ${name} search failed:`, result.reason);
        failedSources.push(name);
        return fallback;
    };

    const papers = dedupePapers([
        ...valueOf(openAlex, "OpenAlex", []),
        ...valueOf(europePMC, "Europe PMC", [])
    ]).slice(0, MAX_PAPERS);

    return { papers, wikipedia: valueOf(wikipedia, "Wikipedia", null), failedSources };
}
