import { keywordFuzzyMatch } from './fuzzy-matching.ts';
import IndexedDBClient from './indexed-db.ts';
import type { Collection, Problem, SentenceWithClozes } from './models.ts';
import { parseQuestionsToSentenceWithClozes, parseCollectionToSentenceWithClozes } from './parser.ts';

export class Quiz {
    quizCollections: Collection[] = [];
    problemQueue: Problem[] = [];
    questions: SentenceWithClozes[] = []
    currentProblemIndex = 0;

    hasLoaded(): boolean {
        return this.questions.length !== 0;
    }

    loadQuizFromText(rawText: string) {
        const trimmedText = rawText.trim();
        this.questions = parseQuestionsToSentenceWithClozes(trimmedText);
        this.prepareQuizQueue(this.questions);
    }

    loadQuizFromCollection(collection: Collection) {
        this.questions = parseCollectionToSentenceWithClozes(collection);
        this.prepareQuizQueue(this.questions);
    }

    reloadQuiz() {
        if(!this.questions || this.questions.length == 0) {
            console.error("Error: Cannot find questions.", this.questions);
            return;
        }

        this.currentProblemIndex = 0;
        this.prepareQuizQueue(this.questions);
    }

    prepareQuizQueue(questions: SentenceWithClozes[]) {
        this.problemQueue = [];
        questions.forEach(q => {
            this.problemQueue.push(...q.problems);
        });
        this.currentProblemIndex = 0;
    }

    checkAnswer(answer: string) {
        const problem = this.problemQueue[this.currentProblemIndex];

        if (!problem) {
            alert("Press Retry Quiz to try again.");
            return;
        }

        const userAnswer = answer.trim();
        if (!userAnswer) return;

        // Use keyword-based fuzzy matching instead of strict equality
        const isCorrect = keywordFuzzyMatch(problem.answer, userAnswer);

        return isCorrect;
    }

    async loadAllCollections(db: IndexedDBClient<{ collections: Collection }>) {
        this.quizCollections = await db.getAll("collections");
    }

    async setCollection(db: IndexedDBClient<{ collections: Collection }>, collection: Collection): Promise<IDBValidKey> {
        // remove empty strings
        const cleanedRawProblems = collection.rawProblems.filter(rawProblem => rawProblem.trim().length > 0);
        
        let cleanedCollection: Collection = {
            title: collection.title,
            rawProblems: cleanedRawProblems
          };
          
        if (collection.id) {
        cleanedCollection.id = collection.id;
        }

        return db.set("collections", cleanedCollection);
    }

    async deleteCollection(db: IndexedDBClient<{ collections: Collection }>, collectionId: number) {
        db.delete("collections", collectionId);
    }
}
