export default defineNuxtRouteMiddleware(async (to, from) => {
  const { checkAuth, isAuthenticated } = useAuth()
  
  await checkAuth()

  if ((to.meta.requiresAuth !== false && to.meta.guestOnly !== true) && !isAuthenticated.value) {
    return navigateTo('/login')
  }

  if (to.meta.guestOnly && isAuthenticated.value) {
    return navigateTo('/')
  }
})
