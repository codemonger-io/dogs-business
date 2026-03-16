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
          component: () => import('../views/HomeView/MapView.vue'),
          children: [
            {
              path: 'new-profile',
              name: 'new-profile',
              component: () => import('../views/HomeView/MapView/NewProfileView.vue')
            },
            {
              path: 'profile/:dogId',
              name: 'profile',
              component: () => import('../views/HomeView/MapView/ProfileView.vue'),
              props: router => ({
                dogId: router.params.dogId
              })
            },
            {
              path: 'profile/:dogId/invitation/:invitationId',
              name: 'show-invitation',
              component: () => import('../views/HomeView/MapView/ShowInvitationView.vue'),
              props: router => ({
                dogId: router.params.dogId,
                invitationId: router.params.invitationId,
                expiresAt: +router.query['expiresAt']!, // expects a number
                dogName: router.query['dogName']
              })
            },
            {
              path: 'settings',
              name: 'settings',
              component: () => import('../views/HomeView/MapView/SettingsView.vue')
            }
          ]
        },
        {
          path: 'invitation/:invitationId',
          name: 'accept-invitation',
          component: () => import('../views/HomeView/AcceptInvitationView.vue'),
          props: true
        }
      ]
    },
    // routes that do not need agreement
    {
      path: '/welcome',
      name: 'welcome',
      component: () => import('../views/WelcomeView.vue'),
      children: [
        {
          path: 'terms-of-service',
          name: 'terms-of-service',
          component: () => import('../views/WelcomeView/TermsOfServiceView.vue')
        },
        {
          path: 'privacy-policy',
          name: 'privacy-policy',
          component: () => import('../views/WelcomeView/PrivacyPolicyView.vue')
        },
        {
          path: 'functionalities',
          name: 'functionalities',
          component: () => import('../views/WelcomeView/FunctionalitiesView.vue')
        }
      ]
    },
    {
      path: '/sign-in',
      name: 'sign-in',
      component: () => import('../views/SigninView.vue')
    },
    {
      path: '/sign-up',
      name: 'sign-up',
      component: () => import('../views/SignupView.vue')
    },
    {
      path: '/wo-sign-up',
      name: 'wo-sign-up',
      component: () => import('../views/WithoutSignupView.vue')
    }
  ]
})

export default router
