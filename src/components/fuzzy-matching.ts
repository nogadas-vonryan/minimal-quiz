import { stringSimilarity } from "string-similarity-js";

const STOPWORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'if', 'then', 'else', 'on', 'in', 'with', 'at', 
    'by', 'for', 'from', 'of', 'to', 'up', 'down', 'over', 'under', 'as', 'is', 'are', 
    'was', 'were', 'be', 'been', 'being', 'that', 'this', 'these', 'those', 'it', 'its', 
    'he', 'she', 'they', 'them', 'his', 'her', 'their', 'you', 'your', 'yours', 'we', 
    'our', 'ours', 'i', 'me', 'my', 'mine'
  ]);

export function keywordFuzzyMatch(correctAnswer: string, inputAnswer: string, similarityThreshold = 0.7, overallThreshold = 0.7) {
    const correctWords = correctAnswer.toLowerCase().split(/\s+/).filter(w => Boolean(w) && !STOPWORDS.has(w));
    const inputWords = inputAnswer.toLowerCase().split(/\s+/).filter(Boolean);

    let matchedCount = 0;

    for (let cw of correctWords) {
        for (let sw of inputWords) {
            if (stringSimilarity(cw, sw) >= similarityThreshold) {
                matchedCount++;
                break;
            }
        }
    }

    const overallMatch = matchedCount / correctWords.length;
    return overallMatch >= overallThreshold;
}