import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { OhVueIcon, addIcons } from 'oh-vue-icons'
import { FaPlusSquare, FaPlus, FaEdit, FaUpload, FaFont, FaTrash } from 'oh-vue-icons/icons/fa'
import { QuillEditor } from '@vueup/vue-quill';
import '@vueup/vue-quill/dist/vue-quill.bubble.css';

addIcons(FaPlusSquare, FaPlus, FaEdit, FaUpload, FaFont, FaTrash);

const app  = createApp(App);
app.component('v-icon', OhVueIcon);
app.component('QuillEditor', QuillEditor);
app.mount('#app');
