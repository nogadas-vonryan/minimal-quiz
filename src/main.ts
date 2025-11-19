import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { OhVueIcon, addIcons } from 'oh-vue-icons'
import { FaPlusSquare, FaPlus, FaEdit, FaUpload, FaFont, FaTrash } from 'oh-vue-icons/icons/fa'

addIcons(FaPlusSquare, FaPlus, FaEdit, FaUpload, FaFont, FaTrash);

const app  = createApp(App);
app.component('v-icon', OhVueIcon);
app.mount('#app');
