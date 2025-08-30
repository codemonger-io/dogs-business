import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // routes that need agreement (+ authentication)
    {
      path: '/',
      name: 'home',
      component: HomeView,
      children: [
        {
          path: 'map',
          name: 'map',
          component: () => import('../views/MapView.vue'),
          children: [
            {
              path: 'profile',
              name: 'profile',
              component: () => import('../views/ProfileView.vue')
            }
          ]
        }
      ]
    },
    // routes that do not need agreement
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('../views/WelcomeView.vue')
    },
    {
      path: '/welcome/sign-in',
      name: 'sign-in',
      component: () => import('../views/SigninView.vue')
    },
    {
      path: '/welcome/sign-up',
      name: 'sign-up',
      component: () => import('../views/SignupView.vue')
    },
    {
      path: '/welcome/wo-sign-up',
      name: 'wo-sign-up',
      component: () => import('../views/WithoutSignupView.vue')
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue')
    }
  ]
})

export default router
