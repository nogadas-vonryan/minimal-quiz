import { describe, it, expect } from 'vitest'
import { keywordFuzzyMatch } from './fuzzy-matching.ts'

describe('keywordFuzzyMatch', () => {
    it('handles empty keyword', () => {
        expect(keywordFuzzyMatch('', 'hello')).toBe(false)
    })

    it('handles when there is preceding space', () => {
        expect(keywordFuzzyMatch(' Water', 'water')).toBe(true)
    })

    it('handles when there is leading space', () => {
        expect(keywordFuzzyMatch('Water ', 'water')).toBe(true)
    })

    it('handles multiple words', () => {
        expect(keywordFuzzyMatch('Meta AI', 'meta ai')).toBe(true)
    })

    it('handles simplified answers', () => {
        expect(keywordFuzzyMatch('The Lion King', 'lion king')).toBe(true)
    })
});