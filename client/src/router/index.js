import DashboardView from '@/views/dashboard/DashboardView.vue';
import InterviewView from '@/views/interview/InterviewView.vue';
import PracticeQuizView from '@/views/interview/PracticeQuizView.vue';
import OpportunitiesView from '@/views/opportunities/OpportunitiesView.vue';
import TeamsView from '@/views/teams/TeamsView.vue';
import TrackerView from '@/views/tracker/TrackerView.vue';
import LoginView from '@/views/login/LoginView.vue';
import HomeView from '@/views/home/HomeView.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: LoginView},
    { path: '/home', component: HomeView},
    { path: '/dashboard', component: DashboardView },
    { path: '/opportunities', component: OpportunitiesView },
    { path: '/tracker', component: TrackerView },
    { path: '/teams', component: TeamsView },
    { path: '/interview', component: InterviewView },
    {path: '/practice/:applicationId',component: PracticeQuizView},
    {path: '/practice/question/:applicationId/:questionId',component: PracticeQuizView},
  ],
});

export default router;
