import DashboardView from '@/views/dashboard/DashboardView.vue';
import InterviewView from '@/views/interview/InterviewView.vue';
import PracticeQuizView from '@/views/interview/PracticeQuizView.vue';
import OpportunitiesView from '@/views/opportunities/OpportunitiesView.vue';
import TeamsView from '@/views/teams/TeamsView.vue';
import TrackerView from '@/views/tracker/TrackerView.vue';
import LoginView from '@/views/login/LoginView.vue';
import HomeView from '@/views/home/HomeView.vue';
import OnboardingView from '@/views/onboarding/OnboardingView.vue';
import ProfileView from '@/views/profile/ProfileView.vue';
import { useUserStore } from '@/store/user';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/home' },
    { path: '/login', component: LoginView, meta: { guestOnly: true, bare: true, noScroll: true } },
    // bare: no page padding, so the banner reaches the screen edges; noScroll: the page never scrolls
    { path: '/onboarding', component: OnboardingView, meta: { requiresAuth: true, bare: true } },
    { path: '/home', component: HomeView, meta: { requiresAuth: true } },
    { path: '/dashboard', component: DashboardView, meta: { requiresAuth: true } },
    { path: '/opportunities', component: OpportunitiesView, meta: { requiresAuth: true } },
    { path: '/tracker', component: TrackerView, meta: { requiresAuth: true } },
    { path: '/teams', component: TeamsView, meta: { requiresAuth: true } },
    { path: '/interview', component: InterviewView, meta: { requiresAuth: true } },
    { path: '/profile', component: ProfileView, meta: { requiresAuth: true } },
    { path: '/practice/:applicationId', component: PracticeQuizView, meta: { requiresAuth: true } },
    { path: '/practice/question/:applicationId/:questionId', component: PracticeQuizView, meta: { requiresAuth: true } },
  ],
});

// Navigation guard (auth)
router.beforeEach(async (to) => {
  const auth = useUserStore();

  // on the first page load, ask the server if the session cookie is still logged in
  if (!auth.hasCheckedSession) {
    await auth.fetchMe();
  }

  if (to.meta.requiresAuth && !auth.isLoggedIn) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  // already logged in, no need to see the login page
  if (to.meta.guestOnly && auth.isLoggedIn) {
    return { path: '/home' };
  }

  // first time users set up their profile before using the app
  if (auth.isLoggedIn && !auth.onboarded && to.path !== '/onboarding') {
    return { path: '/onboarding' };
  }
  if (auth.onboarded && to.path === '/onboarding') {
    return { path: '/home' };
  }

  return true;
});

export default router;
