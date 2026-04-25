<template>
  <el-container class="layout-container">
    <el-aside v-if="!isMobile" :width="sidebarWidth" class="layout-sidebar">
      <div class="layout-brand" :class="{ 'layout-brand--compact': isCompact }">
        <div class="layout-brand__mark">R</div>
        <div v-if="!isCompact" class="layout-brand__copy">
          <p class="layout-brand__eyebrow">Rental OS</p>
          <h2>租房管理系统</h2>
        </div>
      </div>
      <el-scrollbar class="layout-sidebar__scroll">
        <el-menu
          :default-active="activeMenu"
          router
          class="layout-menu"
          :collapse="isCompact"
          :collapse-transition="false"
        >
          <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-drawer
      v-model="mobileMenuVisible"
      direction="ltr"
      size="280px"
      class="mobile-nav-drawer"
      :with-header="false"
    >
      <div class="layout-brand layout-brand--drawer">
        <div class="layout-brand__mark">R</div>
        <div class="layout-brand__copy">
          <p class="layout-brand__eyebrow">Rental OS</p>
          <h2>租房管理系统</h2>
        </div>
      </div>
      <el-menu :default-active="activeMenu" router class="layout-menu layout-menu--mobile">
        <el-menu-item v-for="item in menuItems" :key="item.index" :index="item.index" @click="mobileMenuVisible = false">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>
    </el-drawer>

    <el-container class="layout-workspace">
      <el-header class="layout-header">
        <div class="layout-header__left">
          <el-button v-if="isMobile" circle text @click="mobileMenuVisible = true">
            <el-icon><Operation /></el-icon>
          </el-button>
          <el-button v-else circle text @click="isCompact = !isCompact">
            <el-icon><Fold v-if="!isCompact" /><Expand v-else /></el-icon>
          </el-button>
          <div class="layout-header__title-group">
            <p class="layout-header__eyebrow">业务工作台</p>
            <h1 class="layout-header__title">{{ currentPageTitle }}</h1>
          </div>
        </div>
        <div class="layout-header__right">
          <Breadcrumb class="layout-breadcrumb" />
          <el-dropdown @command="handleCommand">
            <button class="user-entry" type="button">
              <span class="user-entry__avatar">管</span>
              <span class="user-entry__meta">
                <strong>管理员</strong>
                <small>系统账户</small>
              </span>
              <el-icon><ArrowDown /></el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="layout-main">
        <div class="layout-main__inner">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  DataBoard,
  Location,
  OfficeBuilding,
  House,
  User,
  Document,
  Money,
  TrendCharts,
  Tools,
  ArrowDown,
  Bell,
  Setting,
  Grid,
  Odometer,
  Wallet,
  Operation,
  Fold,
  Expand
} from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import Breadcrumb from '@/components/Breadcrumb.vue'

const route = useRoute()
const router = useRouter()
const mobileMenuVisible = ref(false)
const isCompact = ref(false)
const viewportWidth = ref(window.innerWidth)

const menuItems = [
  { index: '/dashboard', label: '数据看板', icon: DataBoard },
  { index: '/cities', label: '城市管理', icon: Location },
  { index: '/projects', label: '项目管理', icon: OfficeBuilding },
  { index: '/rooms', label: '房间管理', icon: House },
  { index: '/room-dashboard', label: '房间看板', icon: Grid },
  { index: '/tenants', label: '租户管理', icon: User },
  { index: '/contracts', label: '合同管理', icon: Document },
  { index: '/bills', label: '账单管理', icon: Money },
  { index: '/meter-reading', label: '抄表管理', icon: Odometer },
  { index: '/deposits', label: '押金管理', icon: Wallet },
  { index: '/reports', label: '财务报表', icon: TrendCharts },
  { index: '/maintenance', label: '维修管理', icon: Tools },
  { index: '/notifications', label: '通知提醒', icon: Bell },
  { index: '/settings', label: '系统设置', icon: Setting },
  { index: '/logs', label: '操作日志', icon: Document }
]

const activeMenu = computed(() => {
  if (route.path.startsWith('/contracts/')) return '/contracts'
  return route.path
})

const currentPageTitle = computed(() => route.meta.title || '租房管理系统')
const isMobile = computed(() => viewportWidth.value < 992)
const sidebarWidth = computed(() => (isCompact.value ? '92px' : '248px'))

const syncViewport = () => {
  viewportWidth.value = window.innerWidth
  if (viewportWidth.value < 1280) {
    isCompact.value = true
  }
  if (viewportWidth.value >= 1280) {
    mobileMenuVisible.value = false
  }
}

watch(
  () => route.path,
  () => {
    mobileMenuVisible.value = false
  }
)

onMounted(() => {
  syncViewport()
  window.addEventListener('resize', syncViewport)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncViewport)
})

const handleCommand = async (command) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user_info')
      router.push('/login')
    } catch {
      // ignore
    }
  }
}
</script>

<style scoped>
.layout-container {
  min-height: 100vh;
  background: transparent;
}

.layout-sidebar {
  background: linear-gradient(180deg, #0f172a 0%, #111c34 100%);
  border-right: 1px solid rgba(148, 163, 184, 0.12);
}

.layout-sidebar__scroll {
  height: calc(100vh - 92px);
}

.layout-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 92px;
  padding: 24px 24px 20px;
}

.layout-brand--compact {
  justify-content: center;
  padding-inline: 12px;
}

.layout-brand--drawer {
  height: auto;
  padding: 20px 0 24px;
}

.layout-brand__mark {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 16px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #eff6ff;
  font-size: 20px;
  font-weight: 800;
  box-shadow: 0 14px 24px rgba(37, 99, 235, 0.28);
}

.layout-brand__eyebrow {
  margin: 0 0 4px;
  color: #60a5fa;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.layout-brand__copy h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 19px;
  font-weight: 700;
}

.layout-menu {
  border-right: none;
  background: transparent;
  --el-menu-bg-color: transparent;
  --el-menu-text-color: rgba(226, 232, 240, 0.75);
  --el-menu-hover-bg-color: rgba(37, 99, 235, 0.16);
  --el-menu-active-color: #eff6ff;
}

.layout-menu :deep(.el-menu-item) {
  height: 48px;
  margin: 4px 12px;
  border-radius: 12px;
}

.layout-menu :deep(.el-menu-item.is-active) {
  background: rgba(37, 99, 235, 0.18);
  color: #eff6ff;
}

.layout-workspace {
  min-width: 0;
}

.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 88px;
  padding: 0 24px;
  background: rgba(246, 248, 251, 0.82);
  border-bottom: 1px solid rgba(226, 232, 240, 0.92);
  backdrop-filter: blur(18px);
}

.layout-header__left,
.layout-header__right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.layout-header__title-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.layout-header__eyebrow {
  margin: 0;
  color: var(--app-color-text-muted);
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.layout-header__title {
  margin: 0;
  font-size: 22px;
  color: var(--app-color-text);
}

.layout-breadcrumb {
  color: var(--app-color-text-muted);
}

.layout-main {
  padding: 24px;
}

.layout-main__inner {
  max-width: 1440px;
  margin: 0 auto;
}

.user-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid rgba(203, 213, 225, 0.88);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  color: var(--app-color-text);
  cursor: pointer;
}

.user-entry__avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.12);
  color: var(--app-color-primary);
  font-size: 14px;
  font-weight: 700;
}

.user-entry__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.user-entry__meta strong {
  font-size: 14px;
}

.user-entry__meta small {
  color: var(--app-color-text-muted);
  font-size: 12px;
}

.mobile-nav-drawer :deep(.el-drawer__body) {
  padding: 0 18px 18px;
  background: linear-gradient(180deg, #0f172a 0%, #111c34 100%);
}

.layout-menu--mobile {
  min-height: calc(100% - 80px);
}

@media (max-width: 991px) {
  .layout-header {
    height: auto;
    padding: 18px;
  }

  .layout-header__right {
    gap: 10px;
  }

  .layout-breadcrumb {
    display: none;
  }

  .layout-main {
    padding: 18px;
  }

  .user-entry__meta {
    display: none;
  }
}
</style>
