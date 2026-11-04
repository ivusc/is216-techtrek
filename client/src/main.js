import { createApp } from 'vue';
import { createPinia } from 'pinia';

// Bootstrap SCSS + custom overrides (before App so component CSS can override Bootstrap)
import './styles/globals.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';

import App from './App.vue';
import router from './router';
import serverAPI from './services/serverAPI';
import { installAuthInterceptor } from './services/authInterceptor';
// Import Bootstrap JS (npm install bootstrap)
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

const app = createApp(App);

app.use(createPinia());
app.use(router);
installAuthInterceptor(serverAPI, router);

app.mount('#app');
