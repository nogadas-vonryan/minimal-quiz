import { stringSimilarity } from "string-similarity-js";

const STOPWORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'on', 'in', 'with', 'at',
    'by', 'for', 'from', 'of', 'to', 'up', 'down', 'over', 'under', 'as', 'is', 'are',
    'was', 'were', 'be', 'been', 'being', 'that', 'this', 'these', 'those', 'it', 'its',
    'he', 'she', 'they', 'them', 'his', 'her', 'their', 'you', 'your', 'yours', 'we',
    'our', 'ours', 'i', 'me', 'my', 'mine'
]);

export function keywordFuzzyMatch(
    correctAnswer: string,
    inputAnswer: string,
    similarityThreshold = 0.7,
    overallThreshold = 0.7
) {
    const normalize = (str: string) => str
        .toLowerCase()
        .replace(/[-–—-]/g, " ")
        .trim();

    const normalizedCorrect = normalize(correctAnswer);
    const normalizedInput = normalize(inputAnswer);

    const correctWords = normalizedCorrect
        .split(/\s+/)
        .filter((w) => Boolean(w) && !STOPWORDS.has(w));

    const inputWords = normalizedInput.split(/\s+/).filter(Boolean);

    let matchedCount = 0;

    for (let cw of correctWords) {
        let matched = false;

        for (let sw of inputWords) {
            if (/^\d+$/.test(cw) && /^\d+$/.test(sw)) {
                if (cw === sw) {
                    matched = true;
                    break;
                }
            }
            // Fuzzy matching for words
            else if (stringSimilarity(cw, sw) >= similarityThreshold) {
                matched = true;
                break;
            }
        }

        if (matched) matchedCount++;
    }

    const overallMatch = matchedCount / correctWords.length;
    return overallMatch >= overallThreshold;
}
