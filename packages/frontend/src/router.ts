import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/views/DashboardView/DashboardView.vue'),
  },
  {
    path: '/customers',
    name: 'customers',
    component: () => import('@/views/CustomerListView/CustomerListView.vue'),
  },
  {
    path: '/customers/new',
    name: 'customer-new',
    component: () => import('@/views/CustomerFormView/CustomerFormView.vue'),
  },
  {
    path: '/customers/:id',
    name: 'customer-detail',
    component: () => import('@/views/CustomerDetailView/CustomerDetailView.vue'),
  },
  {
    path: '/customers/:id/edit',
    name: 'customer-edit',
    component: () => import('@/views/CustomerFormView/CustomerFormView.vue'),
  },
  {
    path: '/documents',
    name: 'documents',
    component: () => import('@/views/DocumentListView/DocumentListView.vue'),
  },
  {
    path: '/documents/new',
    name: 'document-new',
    component: () => import('@/views/DocumentFormView/DocumentFormView.vue'),
  },
  {
    path: '/documents/:id',
    name: 'document-detail',
    component: () => import('@/views/DocumentDetailView/DocumentDetailView.vue'),
  },
  {
    path: '/documents/:id/edit',
    name: 'document-edit',
    component: () => import('@/views/DocumentFormView/DocumentFormView.vue'),
  },
  {
    path: '/financial',
    name: 'financial',
    component: () => import('@/views/FinancialOverviewView/FinancialOverviewView.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/views/DocumentSettingsView/DocumentSettingsView.vue'),
  },
  {
    path: '/settings/general',
    name: 'settings-general',
    component: () => import('@/views/GeneralSettingsView/GeneralSettingsView.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
