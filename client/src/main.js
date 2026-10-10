import { createApp } from 'vue';
import { createPinia } from 'pinia';

import App from './App.vue';
import router from './router';
// Import Bootstrap JS (npm install bootstrap)
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Bootstrap SCSS + custom overrides
import './styles/globals.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

app.mount('#app');
