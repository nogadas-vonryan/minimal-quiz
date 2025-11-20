import type { Problem, SentenceWithClozes, Collection } from './models.ts'

export function parseQuestionsToRawLines(text: string): string[] {
    return text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line !== "");
}

export function parseQuestionsToSentenceWithClozes(text: string): SentenceWithClozes[] {
    const lines = text.split(/\r?\n|<br>/).filter(l => l.trim() !== "");
    const questions = lines.map(line => {
        const clozes = [...line.matchAll(/\[(.*?)\]/g)]
            .map(m => m[1])
            .filter((cloze): cloze is string => cloze !== undefined);;
        const displaySentence = line.replace(/\[|\]/g, "");
        const problems = clozes.map(cloze => ({
            text: displaySentence.replace(cloze, "_____"),
            answer: cloze
        }));
        return { original: line, displaySentence, clozes, problems } as SentenceWithClozes;
    });

    return questions;
}

export function parseQuestionsToProblems(text: string): Problem[] {
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
    const problems: Problem[] = [];

    for (const line of lines) {
        const clozes = [...line.matchAll(/\[(.*?)\]/g)]
            .map(m => m[1])
            .filter((cloze): cloze is string => cloze !== undefined);

        const displaySentence = line.replace(/\[|\]/g, "");

        for (const cloze of clozes) {
            problems.push({
                text: displaySentence.replace(cloze, "_____"),
                answer: cloze
            });
        }
    }

    return problems;
}

export function parseCollectionToSentenceWithClozes(collection: Collection): SentenceWithClozes[] {
    return collection.rawProblems
        .filter((p: string) => p.trim() !== "")
        .map(line => {
            const clozes = [...line.matchAll(/\[(.*?)\]/g)]
                .map(m => m[1])
                .filter((cloze): cloze is string => cloze !== undefined);

            const displaySentence = line.replace(/\[|\]/g, "");
            const problems = clozes.map(cloze => ({
                text: displaySentence.replace(cloze, "_____"),
                answer: cloze
            }));

            return { original: line, displaySentence, clozes, problems };
        });
}
