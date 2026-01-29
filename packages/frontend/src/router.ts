import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/customers',
  },
  {
    path: '/customers',
    name: 'customers',
    component: () => import('@/views/CustomerListView.vue'),
  },
  {
    path: '/customers/:id',
    name: 'customer-detail',
    component: () => import('@/views/CustomerDetailView.vue'),
  },
  {
    path: '/documents',
    name: 'documents',
    component: () => import('@/views/DocumentListView.vue'),
  },
  {
    path: '/documents/new',
    name: 'document-new',
    component: () => import('@/views/DocumentFormView.vue'),
  },
  {
    path: '/documents/:id',
    name: 'document-detail',
    component: () => import('@/views/DocumentDetailView.vue'),
  },
  {
    path: '/documents/:id/edit',
    name: 'document-edit',
    component: () => import('@/views/DocumentFormView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/SettingsView.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
