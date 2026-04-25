<template>
  <div class="page-shell room-dashboard-page">
    <PageHeader
      eyebrow="Board"
      title="房间看板"
      subtitle="按项目查看房间分布、出租状态与关键经营数据，支持快速筛选和详情查看。"
    />

    <FilterBar>
      <el-form :inline="true" class="dashboard-filters">
        <el-form-item label="房间号">
          <el-input
            v-model="roomKeyword"
            placeholder="搜索房间号"
            clearable
          />
        </el-form-item>
        <el-form-item label="城市">
          <el-select v-model="filterCity" placeholder="全部城市" clearable @change="onFilterChange">
            <el-option v-for="city in cities" :key="city.id" :label="city.name" :value="city.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目">
          <el-select v-model="filterProject" placeholder="全部项目" clearable>
            <el-option v-for="project in filteredProjects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #actions>
        <div class="toolbar-actions">
          <ActiveFiltersInline :items="activeFilterChips" @remove="clearFilter" />
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="primary" @click="loadData">刷新</el-button>
          <span class="muted-text">当前共 {{ stats.total }} 间房</span>
        </div>
      </template>
    </FilterBar>

    <section class="page-grid dashboard-metrics">
      <StatCard label="总房间数" :value="stats.total" tone="primary" hint="当前筛选范围内的房间数量">
        <template #icon>
          <el-icon><House /></el-icon>
        </template>
      </StatCard>
      <StatCard label="已出租" :value="stats.rented" tone="success" hint="执行中合同对应房间">
        <template #icon>
          <el-icon><CircleCheck /></el-icon>
        </template>
      </StatCard>
      <StatCard label="空置" :value="stats.vacant" tone="warning" hint="可立即出租">
        <template #icon>
          <el-icon><MoonNight /></el-icon>
        </template>
      </StatCard>
      <StatCard label="维修中" :value="stats.maintenance" tone="danger" hint="暂不可出租">
        <template #icon>
          <el-icon><Tools /></el-icon>
        </template>
      </StatCard>
    </section>

    <section v-if="displayedProjects.length" class="project-stack">
      <SectionCard
        v-for="project in displayedProjects"
        :key="project.id"
        :title="project.name"
        :subtitle="project.address || '项目房间总览'"
      >
        <template #actions>
          <div class="project-summary">
            <span>房间 {{ project.summary.total }}</span>
            <span>出租率 {{ project.summary.rate }}%</span>
            <span>空置 {{ project.summary.vacant }}</span>
          </div>
        </template>

        <div class="room-grid">
          <button
            v-for="room in project.rooms"
            :key="room.id"
            type="button"
            class="room-card"
            :class="`room-card--${room.status}`"
            @click="showRoomDetail(room)"
          >
            <div class="room-card__top">
              <strong class="room-card__number">{{ room.room_number }}</strong>
              <el-tag :type="getStatusType(room.status)" class="status-chip">
                {{ getStatusText(room.status) }}
              </el-tag>
            </div>
            <div class="room-card__body">
              <div>
                <span class="room-card__label">月租金</span>
                <div class="room-card__value">¥{{ formatCurrency(room.rent_price) }}</div>
              </div>
              <div>
                <span class="room-card__label">面积</span>
                <div class="room-card__value">{{ formatDecimal(room.area, 0) }}㎡</div>
              </div>
            </div>
          </button>
        </div>
      </SectionCard>
    </section>

    <SectionCard v-else title="房间看板" subtitle="当前筛选范围内没有房间数据">
      <el-empty class="app-empty-state" description="暂无房间数据" />
    </SectionCard>

    <el-dialog v-model="detailVisible" title="房间详情" width="720px" class="app-dialog">
      <div v-if="selectedRoom" class="page-shell">
        <div class="detail-hero surface-panel">
          <div>
            <div class="detail-hero__eyebrow">Room</div>
            <h3>{{ selectedRoom.room_number }}</h3>
            <p>{{ selectedRoom.floor }} 层 · {{ formatDecimal(selectedRoom.area, 1) }}㎡</p>
          </div>
          <el-tag :type="getStatusType(selectedRoom.status)" class="status-chip">{{ getStatusText(selectedRoom.status) }}</el-tag>
        </div>

        <div class="page-grid grid-two-columns">
          <SectionCard title="基础信息" subtitle="房间关键经营数据" :body-style="{ padding: '20px' }">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="月租金">¥{{ formatCurrency(selectedRoom.rent_price) }}</el-descriptions-item>
              <el-descriptions-item label="押金">¥{{ formatCurrency(selectedRoom.deposit) }}</el-descriptions-item>
              <el-descriptions-item label="配套设施">{{ selectedRoom.facilities || '无' }}</el-descriptions-item>
            </el-descriptions>
          </SectionCard>

          <SectionCard title="当前租户" subtitle="仅已出租房间展示" :body-style="{ padding: '20px' }">
            <el-descriptions :column="1" border>
              <el-descriptions-item label="姓名">{{ tenantInfo?.name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="电话">{{ tenantInfo?.phone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="合同开始">{{ contractInfo?.start_date || '-' }}</el-descriptions-item>
              <el-descriptions-item label="合同结束">{{ contractInfo?.end_date || '-' }}</el-descriptions-item>
            </el-descriptions>
          </SectionCard>
        </div>

        <div class="dialog-actions">
          <el-button @click="detailVisible = false">关闭</el-button>
          <el-button type="primary" @click="goToRoomManagement">编辑房间</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { House, CircleCheck, MoonNight, Tools } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import SectionCard from '@/components/SectionCard.vue'
import StatCard from '@/components/StatCard.vue'
import ActiveFiltersInline from '@/components/ActiveFiltersInline.vue'
import db from '@/utils/localDB'
import { formatCurrency, formatDecimal } from '@/utils/formatters'

const router = useRouter()
const cities = ref([])
const projects = ref([])
const rooms = ref([])
const roomKeyword = ref('')
const filterCity = ref('')
const filterProject = ref('')
const detailVisible = ref(false)
const selectedRoom = ref(null)
const tenantInfo = ref(null)
const contractInfo = ref(null)

const filteredProjects = computed(() => {
  if (!filterCity.value) return projects.value
  return projects.value.filter((project) => project.city_id === filterCity.value)
})

const activeFilterChips = computed(() => {
  const chips = []
  if (roomKeyword.value) {
    chips.push({ key: 'roomKeyword', label: `房间号：${roomKeyword.value}` })
  }
  if (filterCity.value) {
    chips.push({ key: 'city', label: `城市：${getCityName(filterCity.value)}` })
  }
  if (filterProject.value) {
    chips.push({ key: 'project', label: `项目：${getProjectName(filterProject.value)}` })
  }
  return chips
})

const filteredRooms = computed(() => {
  let result = rooms.value
  if (roomKeyword.value) {
    const keyword = roomKeyword.value.trim().toLowerCase()
    result = result.filter((room) => String(room.room_number || '').toLowerCase().includes(keyword))
  }
  if (filterCity.value) {
    const cityProjects = projects.value.filter((project) => project.city_id === filterCity.value)
    const projectIds = cityProjects.map((project) => project.id)
    result = result.filter((room) => projectIds.includes(room.project_id))
  }
  if (filterProject.value) {
    result = result.filter((room) => room.project_id === filterProject.value)
  }
  return result
})

const displayedProjects = computed(() =>
  filteredProjects.value
    .map((project) => {
      const projectRooms = filteredRooms.value.filter((room) => room.project_id === project.id)
      const total = projectRooms.length
      const rented = projectRooms.filter((room) => room.status === 'rented').length
      const vacant = projectRooms.filter((room) => room.status === 'vacant').length
      return {
        ...project,
        rooms: projectRooms,
        summary: {
          total,
          rented,
          vacant,
          rate: total ? Math.round((rented / total) * 100) : 0
        }
      }
    })
    .filter((project) => project.rooms.length > 0)
)

const stats = computed(() => {
  const projectRooms = filteredRooms.value
  return {
    total: projectRooms.length,
    rented: projectRooms.filter((room) => room.status === 'rented').length,
    vacant: projectRooms.filter((room) => room.status === 'vacant').length,
    maintenance: projectRooms.filter((room) => room.status === 'maintenance').length
  }
})

onMounted(() => {
  loadData()
})

const loadData = () => {
  cities.value = db.getTable('cities')
  projects.value = db.getTable('projects')
  rooms.value = db.getTable('rooms')
}

const onFilterChange = () => {
  filterProject.value = ''
}

const getCityName = (cityId) => cities.value.find((city) => city.id === cityId)?.name || '-'
const getProjectName = (projectId) => projects.value.find((project) => project.id === projectId)?.name || '-'

const clearFilter = (key) => {
  if (key === 'roomKeyword') {
    roomKeyword.value = ''
    return
  }
  if (key === 'city') {
    filterCity.value = ''
    filterProject.value = ''
    return
  }
  if (key === 'project') {
    filterProject.value = ''
  }
}

const resetFilters = () => {
  roomKeyword.value = ''
  filterCity.value = ''
  filterProject.value = ''
}

const getStatusType = (status) => {
  const map = { vacant: 'success', rented: 'primary', maintenance: 'danger' }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = { vacant: '空置', rented: '已租', maintenance: '维修中' }
  return map[status] || status
}

const showRoomDetail = (room) => {
  selectedRoom.value = room

  if (room.status === 'rented') {
    const contract = db.query('contracts', { room_id: room.id, status: 'active' })[0]
    if (contract) {
      contractInfo.value = contract
      tenantInfo.value = db.findById('tenants', contract.tenant_id)
    }
  } else {
    tenantInfo.value = null
    contractInfo.value = null
  }

  detailVisible.value = true
}

const goToRoomManagement = () => {
  detailVisible.value = false
  router.push('/rooms')
}
</script>

<style scoped>
.dashboard-filters :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 12px;
}

.dashboard-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 24px;
}

.project-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.project-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 16px;
  color: var(--app-color-text-secondary);
  font-size: 13px;
}

.room-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 16px;
}

.room-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px;
  border: 1px solid rgba(226, 232, 240, 0.95);
  border-radius: 16px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  text-align: left;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.room-card:hover {
  transform: translateY(-2px);
  box-shadow: var(--app-shadow-sm);
  border-color: rgba(37, 99, 235, 0.24);
}

.room-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  border-radius: 16px;
  background: var(--room-color);
}

.room-card--vacant {
  --room-color: var(--app-color-success);
}

.room-card--rented {
  --room-color: var(--app-color-primary);
}

.room-card--maintenance {
  --room-color: var(--app-color-danger);
}

.room-card__top,
.room-card__body {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.room-card__number {
  font-size: 28px;
  line-height: 1;
  color: var(--app-color-text);
}

.room-card__body > div {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.room-card__label {
  color: var(--app-color-text-muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.room-card__value {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-color-text);
}

.detail-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
}

.detail-hero__eyebrow {
  margin-bottom: 8px;
  color: var(--app-color-primary);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.detail-hero h3 {
  margin: 0;
  font-size: 30px;
}

.detail-hero p {
  margin: 8px 0 0;
  color: var(--app-color-text-secondary);
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 1279px) {
  .dashboard-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .dashboard-metrics {
    grid-template-columns: 1fr;
  }

  .detail-hero,
  .room-card__top,
  .room-card__body {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
