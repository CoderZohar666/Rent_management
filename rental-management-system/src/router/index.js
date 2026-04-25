import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/',
    component: () => import('@/views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '数据看板' }
      },
      {
        path: 'cities',
        name: 'Cities',
        component: () => import('@/views/CityManagement.vue'),
        meta: { title: '城市管理' }
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('@/views/ProjectManagement.vue'),
        meta: { title: '项目管理' }
      },
      {
        path: 'rooms',
        name: 'Rooms',
        component: () => import('@/views/RoomManagement.vue'),
        meta: { title: '房间管理' }
      },
      {
        path: 'room-dashboard',
        name: 'RoomDashboard',
        component: () => import('@/views/RoomDashboard.vue'),
        meta: { title: '房间看板' }
      },
      {
        path: 'tenants',
        name: 'Tenants',
        component: () => import('@/views/TenantManagement.vue'),
        meta: { title: '租户管理' }
      },
      {
        path: 'contracts',
        name: 'Contracts',
        component: () => import('@/views/ContractManagement.vue'),
        meta: { title: '合同管理' }
      },
      {
        path: 'contracts/:id',
        name: 'ContractDetail',
        component: () => import('@/views/ContractDetail.vue'),
        meta: { title: '合同详情' }
      },
      {
        path: 'bills',
        name: 'Bills',
        component: () => import('@/views/BillManagement.vue'),
        meta: { title: '账单管理' }
      },
      {
        path: 'meter-reading',
        name: 'MeterReading',
        component: () => import('@/views/MeterReading.vue'),
        meta: { title: '抄表管理' }
      },
      {
        path: 'deposits',
        name: 'Deposits',
        component: () => import('@/views/DepositManagement.vue'),
        meta: { title: '押金管理' }
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/FinancialReports.vue'),
        meta: { title: '财务报表' }
      },
      {
        path: 'maintenance',
        name: 'Maintenance',
        component: () => import('@/views/MaintenanceManagement.vue'),
        meta: { title: '维修管理' }
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/views/NotificationCenter.vue'),
        meta: { title: '通知提醒' }
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/SystemSettings.vue'),
        meta: { title: '系统设置' }
      },
      {
        path: 'logs',
        name: 'OperationLog',
        component: () => import('@/views/OperationLog.vue'),
        meta: { title: '操作日志' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token')
  
  if (to.path === '/login') {
    if (token) {
      next('/')
    } else {
      next()
    }
  } else {
    if (token) {
      next()
    } else {
      next('/login')
    }
  }
})

export default router
