export async function fetchGizmoDeck(deckId: number): Promise<CardData> {
    const url = `https://gizmo-express-api.vercel.app`;
    const deckData = await fetch(url + '/deck/' + deckId);
    const deckJSON = deckData.json();
    return deckJSON;
}

// Interface for the segment object that defines the answer and its location
export interface TestableSegment {
    segment_text: string;
    start_index: number;
    end_index: number;
    // Other fields are ignored for this task
}

// Interface for the main card object
export interface Card {
    statement: string;
    testable_segments?: TestableSegment[];
    // Other fields are ignored
}

// Interface for the top-level structure of the JSON file
export interface CardData {
    cards: Card[];
}

/**
 * Converts a single card object into a single HTML string with cloze deletions.
 *
 * This function performs the following steps:
 * 1. Creates cloze deletions ([Answer]) using the indices from `testable_segments`.
 * 2. Splits the resulting cloze string based on the common separator pattern (\u2028\n).
 * 3. Cleans up any remaining \u2028 or \n characters within the resulting parts.
 * 4. Wraps each non-empty part in <p></p> tags and joins them.
 *
 * @param card The Card object containing the statement and testable segments.
 * @returns A single HTML string containing all parts wrapped in <p> tags and cloze deletions.
 */
export function convertCardToParagraphHTML(card: Card): string {
    let clozeText = card.statement;
    const segments = card.testable_segments;

    // --- STEP 1: Create Cloze Deletions using Indices ---
    if (segments && segments.length > 0) {
        // Sort segments by start_index in DESCENDING order to prevent index shifting.
        const sortedSegments = segments.slice().sort((a, b) => b.start_index - a.start_index);

        for (const segment of sortedSegments) {
            const { start_index, end_index, segment_text } = segment;

            // Splice the string to insert the cloze bracket format.
            const part1 = clozeText.slice(0, start_index);
            const part2 = clozeText.slice(end_index);
            const clozeReplacement = `[${segment_text}]`;

            clozeText = part1 + clozeReplacement + part2;
        }
    }

    // --- STEP 2, 3, 4: Split, Clean, and Wrap in <p> Tags ---
    const paragraphHTML: string[] = [];

    // Split the now-clozed statement by the explicit separator pattern: \u2028\n
    const parts = clozeText.split('\u2028\n');

    for (const part of parts) {
        // Clean up any remaining \u2028 or \n characters and trim whitespace
        const cleanedPart = part
            .replace(/\u2028/g, ' ') // Replace remaining Line Separators with a space
            .replace(/\n/g, ' ')     // Replace standard Newlines with a space
            .trim();

        // Wrap each non-empty part in <p> tags
        if (cleanedPart.length > 0) {
            paragraphHTML.push(`<p>${cleanedPart}</p>`);
        }
    }

    // Join the HTML parts together
    return paragraphHTML.join('');
}

/**
 * Converts an array of Card objects (or the full CardData object) into a JavaScript object
 * where keys are numerical indices and values are the generated HTML strings. This structure
 * mimics the requested JSON-like output.
 *
 * @param data The CardData object or an array of Card objects.
 * @returns A structured object ready for JSON serialization.
 */
export function convertDataToStructuredJSONOutput(data: CardData | Card[]): { [key: number]: string } {
    const cards = Array.isArray(data) ? data : data.cards;
    const structuredOutput: { [key: number]: string } = {};

    cards.forEach((card, index) => {
        // Use the new combined cloze and splitting logic
        const htmlContent = convertCardToParagraphHTML(card);

        // Map the result to the numerical index key
        structuredOutput[index] = htmlContent;
    });

    return structuredOutput;
}

// --- Example Usage and Demonstration ---

// 1. Mock the input data based on the provided JSON structure, using the original, un-clozed
// statements and the segments to demonstrate the combined logic.
const mockCardData: CardData = {
    cards: [
        {
            // Original text: "Default value of file\u2028\n666"
            // Segment will turn '666' into '[666]'
            statement: "Default value of file\u2028\n666",
            testable_segments: [
                { segment_text: "666", start_index: 22, end_index: 25 }
            ]
        },
        {
            // Original text: "Permission Commands\u2028\npasswd: It allows you to change a user’s password."
            // Segment will turn 'passwd' into '[passwd]'
            statement: "Permission Commands\u2028\npasswd: It allows you to change a user’s password.",
            testable_segments: [
                { segment_text: "passwd", start_index: 21, end_index: 27 }
            ]
        },
        {
            // Original text: "Permission Groups\u2028\nOwner: It applies only to the owner..."
            // Segment will turn 'Owner' into '[Owner]'
            statement: "Permission Groups\u2028\nOwner: It applies only to the owner of the file or directory.",
            testable_segments: [
                { segment_text: "Owner", start_index: 19, end_index: 24 }
            ]
        },
    ]
};

// 2. Run the conversion
const structuredResults = convertDataToStructuredJSONOutput(mockCardData);

// 3. Output the results (for testing/demonstration as a stringified JSON object)
console.log("--- Conversion Results (JSON Format) ---");
console.log(JSON.stringify(structuredResults, null, 2));

/*
Expected Output:
{
  "0": "<p>Default value of file</p><p>[666]</p>",
  "1": "<p>Permission Commands</p><p>[passwd]: It allows you to change a user’s password.</p>",
  "2": "<p>Permission Groups</p><p>[Owner]: It applies only to the owner of the file or directory.</p>"
}
*/