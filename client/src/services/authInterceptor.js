import { useUserStore } from '@/store/user';

export function installAuthInterceptor(api, router) {
  return api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401 && !error.config?.skipAuthRedirect) {
        useUserStore().clearSession();
        const current = router.currentRoute.value;
        if (current.path !== '/login') {
          router.push({ path: '/login', query: { redirect: current.fullPath } });
        }
      }
      return Promise.reject(error);
    },
  );
}
