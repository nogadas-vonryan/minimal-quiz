export type Problem = {
    text: string;
    answer: string;
}

export type SentenceWithClozes = {
    original: string,
    displaySentence: string,
    clozes: string[],
    problems: Problem[],
}

export type Collection = {
    id?: number,
    title: string | null,
    rawProblems: string[]
}

export interface Stores {
    collections: Collection;
}