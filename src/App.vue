<script setup lang="ts">
import { onMounted, ref, reactive, watch, nextTick } from 'vue';
import IndexedDBClient from './components/indexed-db.ts';
import type { Collection, Stores } from './components/models.ts';
import { parseQuestionsToRawLines } from './components/parser.ts';
import { Quiz } from './components/quiz.ts';
import { generalKnowledgeQuiz, scienceQuiz, popCultureQuiz } from './components/sample-quiz.ts';

const db = new IndexedDBClient<Stores>("offline-quiz-app", 1, {
  collections: { keyPath: "id", autoIncrement: true },
});

/// === QUIZ === ///
const quiz = new Quiz();
/// ============ ///

/// === STATES === ///
const inputField = ref('');
const activeTab = ref('input');

const problemDisplay = ref<HTMLDivElement | null>(null);
const quizFeedback = ref<HTMLDivElement | null>(null);
const quizProgress = ref<HTMLDivElement | null>(null);
const answerInput = ref('');
const importButton = ref<HTMLInputElement | null>(null);

const collectionEditingIndex = ref<number | null>(null);
const collectionLineEditingIndex = ref<number | null>(null);
const quizCollections = reactive<Collection[]>([]);
/// ============ ///

/// === FUNCTIONS === ///
const isActive = (tab: string) => activeTab.value === tab;

const collectionEditLine = (collectionId: number | undefined, index: number) => {
  if(collectionId == null || index == null) {
    console.error('Invalid collection or line index provided.');
    return;
  }

  collectionEditingIndex.value = collectionId;
  collectionLineEditingIndex.value = index;
}

const collectionSaveEdit = (collectionId: number | undefined, index: number ) => {
  collectionEditingIndex.value = null;
  collectionLineEditingIndex.value = null;
  
  if(collectionId == null || index == null) {
    console.error('Invalid collection or line index provided.');
    return;
  }

  // quizCollection (ref) and quiz.quizCollections both share the same reference
  const collectionIndex = quizCollections.findIndex((collection) => collection.id === collectionId);
  const editedProblems = quizCollections[collectionIndex]?.rawProblems.filter(rawProblem => rawProblem.trim().length > 0) ?? [];
  const title = quizCollections[collectionIndex]?.title ?? '';

  const collectionData: Collection = {
    id: collectionId,
    title,
    rawProblems: editedProblems
  };

  quiz.setCollection(db, collectionData);

  // reactively removes the empty spaces when deleting lines
  quizCollections[collectionIndex] = collectionData;
  console.log(quizCollections[collectionIndex])
}

const collectionAddLine = (collectionId: number | undefined) => {
  const collectionIndex = quizCollections.findIndex(collection => collection.id === collectionId);

  if (!quizCollections[collectionIndex]) {
    console.error("Error: collection not found!");
    return;
  }

  quizCollections[collectionIndex].rawProblems = [ ...quizCollections[collectionIndex].rawProblems, ' Write something...' ];

  collectionEditingIndex.value = collectionId ?? null;
  collectionLineEditingIndex.value = quizCollections[collectionIndex].rawProblems.length - 1;

  nextTick(() => {
    // Select the last input inside this collection
    const inputs = document.querySelectorAll(
      `li textarea`
    );
    const newInput = inputs[inputs.length - 1] as HTMLInputElement;
    console.log(newInput);
    if (newInput) {
      newInput.focus();
      newInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
}

async function handleFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const rawText = await file.text()
  quiz.loadQuizFromText(rawText);

  if (inputField.value) {
    inputField.value = rawText;
  }

  // Reset input so selecting same file again triggers change
  input.value = ""
}
/// ============== ///

/// === BUTTONS === ///
// TODO: Change the function so that it is clear that it is a function instead
//       of a button.
function importBtn() {
  if(!importButton.value) {
    console.error("Error: Import button is null!");
    return;
  }

  // calls the attached function: handleFile()
  importButton.value.click();
}

function loadBtn() {
  if (!inputField.value) {
    console.error("Textarea doesn't seem to exist.");
    return;
  }

  if (inputField.value == '') {
    alert("Please enter something first.");
    return;
  }

  quiz.loadQuizFromText(inputField.value);
  activeTab.value = 'quiz';
}

function retryBtn() {
  if(!quiz.hasLoaded()) {
    alert("Import some questions first!");
    return;
  }

  if(!confirm("Are you sure you want to retry?")) {
    return;
  }

  quiz.reloadQuiz();  
  displayProblem();
}

function collectionLoadBtn(collectionId: number | undefined) {
  if(collectionId == undefined) {
    console.error("Error: No collection id found!");
    return;
  }
  
  const pickedCollection = quizCollections.filter((collection) => collection.id === collectionId); 
  
  if(!pickedCollection[0]) {
    console.error("Error: Can't find collection!");
    return;
  }
  
  quiz.loadQuizFromCollection(pickedCollection[0]);
  activeTab.value = 'quiz';
  
  if(inputField.value) 
    inputField.value = pickedCollection[0].rawProblems.join('\n');
}
/// =============== ///

function displayProblem() {
  if (!problemDisplay.value || !quizProgress.value || !quizFeedback.value) {
    // do nothing
    return;
  }

  if (!quiz.hasLoaded()) {
    problemDisplay.value.textContent = "Import some questions to start.";
    quizProgress.value.textContent = `No problems yet.`;
    quizFeedback.value.textContent = "";
  } else if (quiz.currentProblemIndex >= quiz.problemQueue.length) {
    problemDisplay.value.textContent = "🎉 Quiz Complete!";
    quizProgress.value.textContent = `You answered all ${quiz.problemQueue.length} problems.`;
    quizFeedback.value.textContent = "";
    return;
  }

  const problem = quiz.problemQueue[quiz.currentProblemIndex];
  if (!problem) {
    // alert('Error: No problem found!');
    return;
  }

  problemDisplay.value.innerHTML = problem.text;

  quizProgress.value.textContent = `Problem ${quiz.currentProblemIndex + 1} of ${quiz.problemQueue.length}`;
  quizFeedback.value.textContent = "";

  if (answerInput.value) answerInput.value = "";
}

function submitAnswer() {
  if (!quizFeedback.value) {
    console.error('Feedback element does not exist.');
    return;
  }

  if (quiz.problemQueue.length <= 0) {
    quizFeedback.value.textContent = "⚠️ Import some questions first.";
    return;
  }

  if (!answerInput.value) {
    quizFeedback.value.textContent = "⚠️ Write something first.";
    return;
  }

  const output = quiz.checkAnswer(answerInput.value);
  const problem = quiz.problemQueue[quiz.currentProblemIndex];
  if (!problem) {
    console.error("Error: problem can't be found.");
    return;
  }

  const correctProblem = quiz.problemQueue[quiz.currentProblemIndex];
  if (!correctProblem) {
    console.error("Error: Can't find the answer.");
    return;
  }
  
  if (output) {
    quizFeedback.value.innerHTML = `✅ Correct! Answer: <span class='font-bold'>${correctProblem.answer}</span>`;
  } else {
    quizFeedback.value.innerHTML = `❌ Incorrect! Answer: <span class='font-bold'>${correctProblem.answer}</span>`;
    quiz.problemQueue.push(problem);
  }

  quiz.currentProblemIndex++;
  setTimeout(displayProblem, 1500);
  answerInput.value = '';
  console.log(quiz.currentProblemIndex, quiz.problemQueue)
}

async function saveToCollections() {
  if (!inputField.value) {
    console.error("Textarea doesn't seem to exist.");
    return;
  }

  if (inputField.value == '') {
    alert("Please enter something first.");
    return;
  }

  const title = prompt("Enter your collection title: ");

  if (!title) {
    alert("Please input a valid title.");
    return;
  }

  const rawProblems = parseQuestionsToRawLines(inputField.value.trim());
  const newCollection: Collection = {
    title,
    rawProblems
  };

  const id = await quiz.setCollection(db, newCollection);
  if(id)
    newCollection.id = Number(id);
  
  quizCollections.push(newCollection);
  activeTab.value = 'collections';
}

function renameCollection(collectionId: number | undefined) {
  if(collectionId == undefined) {
    console.error("Error: collection id is undefined!");
    return;
  }

  const newCollectionName = prompt("Enter new name:");
  if(!newCollectionName) {
    // silently ignore the empty name
    return;
  }

  const collectionIndex = quiz.quizCollections.findIndex((collection: Collection) => collection.id === collectionId);
  if(collectionIndex == null) {
    console.error('Error: collectionIndex is null!');
    return;
  }
  
  if(!quizCollections[collectionIndex]) {
    console.error("Error: collection not found.");
    return;
  }

  const renamedCollection: Collection = {
    id: collectionId,
    title: newCollectionName,
    rawProblems: quizCollections[collectionIndex].rawProblems
  };

  quiz.setCollection(db, renamedCollection);

  quizCollections[collectionIndex] = renamedCollection;
}

function deleteCollection(collectionId: number | undefined) {
  if(collectionId == undefined) {
    console.error("Error: collection id is undefined!");
    return;
  }

  if (!confirm("Do you really want to delete this collection?")) {
    return;
  }

  // delete in the db
  quiz.deleteCollection(db, collectionId);

  // delete in the state
  const index = quizCollections.findIndex(item => item.id === collectionId);
  if (index !== -1) {
    quizCollections.splice(index, 1);
  }
}

async function loadSampleQuizzes() {
  const generalKnowledgeProblems = parseQuestionsToRawLines(generalKnowledgeQuiz);
  const scienceProblems = parseQuestionsToRawLines(scienceQuiz);
  const popCultureProblems = parseQuestionsToRawLines(popCultureQuiz);

  const generalKnowledgeCollection: Collection = {
    title: 'General Knowledge',
    rawProblems: generalKnowledgeProblems
  };

  const scienceCollection: Collection = {
    title: 'Science',
    rawProblems: scienceProblems
  };

  const popCultureCollection: Collection = {
    title: 'Pop Culture',
    rawProblems: popCultureProblems
  };

  const generalKnowledgeId = await quiz.setCollection(db, generalKnowledgeCollection);
  const scienceId = await quiz.setCollection(db, scienceCollection);
  const popCultureId = await quiz.setCollection(db, popCultureCollection);

  generalKnowledgeCollection.id = Number(generalKnowledgeId);
  scienceCollection.id = Number(scienceId);
  popCultureCollection.id = Number(popCultureId);

  quizCollections.push(generalKnowledgeCollection);
  quizCollections.push(scienceCollection);
  quizCollections.push(popCultureCollection);
}

onMounted(async () => {
  await db.init();
  await quiz.loadAllCollections(db);

  const defaultsLoaded = localStorage.getItem('defaultsLoaded');

  if(!defaultsLoaded) {
    loadSampleQuizzes();
    localStorage.setItem('defaultsLoaded', 'true'); 
  }

  quizCollections.push(...quiz.quizCollections);
});

watch(activeTab, () => {
  if (activeTab.value == 'quiz')
    displayProblem();
});

</script>

<template>
  <div class="min-h-screen flex justify-center items-start bg-gray-100 py-10 px-2 font-sans">
    <div class="w-full max-w-xl bg-white rounded-2xl shadow-lg p-4 flex flex-col gap-6">

      <!-- Tabs -->
      <div class="flex gap-2">
        <button @click="activeTab = 'input'" :class="`
            flex-1 py-2.5 rounded-xl font-medium text-sm transition
            ${isActive('input')
            ? 'bg-indigo-500 text-white'
            : 'bg-indigo-100 text-indigo-900 hover:brightness-105'}
          `">
          Input
        </button>

        <button @click="activeTab = 'quiz'" :class="`
            flex-1 py-2.5 rounded-xl font-medium text-sm transition
            ${isActive('quiz')
            ? 'bg-indigo-500 text-white'
            : 'bg-indigo-100 text-indigo-900 hover:brightness-105'}
          `">
          Quiz
        </button>

        <button @click="activeTab = 'collections'" :class="`
            flex-1 py-2.5 rounded-xl font-medium text-sm transition
            ${isActive('collections')
            ? 'bg-indigo-500 text-white'
            : 'bg-indigo-100 text-indigo-900 hover:brightness-105'}
          `">
          Collections
        </button>
      </div>

      <!-- INPUT TAB -->
      <div v-show="isActive('input')" class="flex flex-col gap-4">
        <QuillEditor v-model:content="inputField" placeholder="Type your question here — wrap the words in [brackets] to hide them." 
            theme="bubble" content-type="html"          
            class="rounded-xl pb-2 bg-gray-50 border border-gray-300
                 focus:border-indigo-500 focus:outline-none transition resize-y"></QuillEditor>

        <div class="flex flex-wrap flex-col gap-3">
          <input
            ref="importButton"
            type="file"
            accept=".txt"
            class="hidden"
            @change="handleFile"
          />

          <button @click="importBtn"
            class="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium transition shadow-sm">
            Import TXT
          </button>

          <button @click="loadBtn"
            class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition shadow-sm">
            Load Quiz
          </button>

          <button @click="saveToCollections"
            class="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium transition shadow-sm">
            Save to Collections
          </button>
        </div>

        <div id="input-feedback" class="text-red-500 text-sm"></div>
      </div>

      <!-- QUIZ TAB -->
      <div v-show="isActive('quiz')" class="flex flex-col gap-4">
        <div ref="problemDisplay" class="p-4 rounded-xl bg-gray-100 text-gray-800 text-lg text-center shadow-sm wrap-break-word">
          Problem will appear here...
        </div>

        <input v-model="answerInput" type="text" placeholder="Type your answer..."
          class="w-full p-3 rounded-xl border border-gray-300 bg-gray-50 focus:border-indigo-500 focus:outline-none transition" />

        <button @click="submitAnswer"
          class="px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-medium transition shadow-sm">
          Submit Answer
        </button>

        <div ref="quizFeedback" class="text-lg"></div>
        <div ref="quizProgress" class="text-right text-gray-500 text-sm"></div>

        <button @click="retryBtn"
          class="px-4 py-3 rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-medium transition shadow-sm">
          Retry Quiz
        </button>
      </div>

      <!-- COLLECTIONS TAB -->
      <div v-show="isActive('collections')" class="flex flex-col gap-4">
        <h3 class="text-xl font-semibold text-gray-800">Your Collections</h3>

        <div id="collections-list"
          class="min-h-[150px] p-3 rounded-xl bg-gray-50 border border-gray-200 shadow-inner text-gray-600">
          <ul class="space-y-2">
            <li v-for="(collection, id) in quizCollections" :key="id" class="flex justify-between">
              <details
                class="w-full group border border-gray-300 rounded-lg overflow-hidden shadow-sm transition-all duration-300">
                <summary
                  class="flex justify-between items-center px-4 py-2 cursor-pointer bg-white hover:bg-gray-50 transition">
                  <span class="font-medium text-gray-800">{{ collection.title }} &nbsp;</span>
                  <span class="transition-transform duration-300 transform group-open:rotate-180">
                    ▼
                  </span>
                </summary>
                <div class="px-4 py-2 bg-gray-50 text-gray-700">
                  <div class="flex space-x-2 justify-between">
                    <div class="space-x-2">
                      <button class="bg-blue-400 text-white font-semibold text-xs px-2 py-1 shadow rounded-md" @click="collectionAddLine(collection.id)" title="Add"><v-icon name="fa-plus-square" size="8" /></button>
                    </div>
                    <div class="space-x-2">
                      <button class="bg-blue-400 text-white font-semibold text-xs px-2 py-1 shadow rounded-md" @click="collectionLoadBtn(collection.id)" title="Load"><v-icon name="fa-upload" size="8" /></button>
                      <button class="bg-white font-semibold text-xs px-2 py-1 shadow rounded-md" title="Rename" @click="renameCollection(collection.id)"><v-icon name="fa-font" size="8" /></button>
                      <button class="bg-red-400 text-white font-semibold text-xs px-2 py-1 shadow rounded-md" @click="deleteCollection(collection.id)" title="Delete"><v-icon name="fa-trash" size="8" /></button>
                    </div>
                  </div>

                  <div class="mt-4">
                    <li v-for="(line, index) in collection.rawProblems" :key="index" class="my-2">
                      <template v-if="collectionEditingIndex === collection.id && collectionLineEditingIndex === index">
                        <QuillEditor
                          theme="bubble"
                          content-type="html"
                          v-model:content="collection.rawProblems[index]"
                          @blur="collectionSaveEdit(collection.id, index)"
                          class="border rounded px-2 py-1 w-full"
                        />
                      </template>
                      <template v-else>
                        <span v-html="line" @click="collectionEditLine(collection.id, index)" class="cursor-pointer inline-block truncate w-full"></span>
                      </template>
                    </li>
                  </div>
                </div>
              </details>
            </li>
          </ul>
          <p v-if="quizCollections.length === 0">No collections found.</p>
        </div>
      </div>

    </div>
  </div>
</template>
