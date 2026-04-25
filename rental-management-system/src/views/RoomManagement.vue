<template>
  <div class="page-shell">
    <PageHeader
      eyebrow="Inventory"
      title="房间管理"
      subtitle="管理项目房间信息、租金、押金和配套设施，支持筛选、导出和编辑。"
    >
      <template #actions>
        <div class="toolbar-actions">
          <el-button type="success" plain @click="exportRooms">
            <el-icon><Download /></el-icon>
            导出 Excel
          </el-button>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新增房间
          </el-button>
        </div>
      </template>
    </PageHeader>

    <FilterBar>
      <el-form :inline="true" :model="searchForm" class="list-filter-form">
        <el-form-item label="房间号">
          <el-input
            v-model="searchForm.room_number"
            placeholder="搜索房间号"
            clearable
          />
        </el-form-item>
        <el-form-item label="城市">
          <el-select v-model="searchForm.city_id" placeholder="全部城市" clearable @change="onCityChange">
            <el-option v-for="city in cities" :key="city.id" :label="city.name" :value="city.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="项目">
          <el-select v-model="searchForm.project_id" placeholder="全部项目" clearable>
            <el-option v-for="project in filteredProjects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
            <el-option label="空置" value="vacant" />
            <el-option label="已租" value="rented" />
            <el-option label="维修中" value="maintenance" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #actions>
        <div class="toolbar-actions">
          <ActiveFiltersInline :items="activeFilterChips" @remove="clearFilter" />
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="primary" @click="loadData">刷新</el-button>
        </div>
      </template>
    </FilterBar>

    <SectionCard title="房间列表" :subtitle="`共 ${filteredRooms.length} 间房`">
      <div class="page-data-table">
        <el-table :data="paginatedRooms">
          <el-table-column prop="room_number" label="房间号" min-width="100" />
          <el-table-column prop="floor" label="楼层" min-width="80" />
          <el-table-column label="面积" min-width="100">
            <template #default="scope">
              {{ formatDecimal(scope.row.area, 1) }}㎡
            </template>
          </el-table-column>
          <el-table-column label="月租金" min-width="120">
            <template #default="scope">
              <span class="amount-text">¥{{ formatCurrency(scope.row.rent_price) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="押金" min-width="120">
            <template #default="scope">
              <span class="amount-text">¥{{ formatCurrency(scope.row.deposit) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="110">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)" class="status-chip">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="facilities" label="配套设施" min-width="220" show-overflow-tooltip />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <div class="inline-actions">
                <el-button size="small" @click="showEditDialog(scope.row)">编辑</el-button>
                <el-button size="small" type="danger" plain @click="handleDelete(scope.row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="page-pagination">
        <el-pagination
          :current-page="currentPage"
          :page-size="pageSize"
          :total="filteredRooms.length"
          layout="total, prev, pager, next"
          @current-change="currentPage = $event"
        />
      </div>
    </SectionCard>

    <el-dialog
      v-model="dialogVisible"
      class="app-dialog"
      :title="dialogType === 'add' ? '新增房间' : '编辑房间'"
      width="760px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" class="dialog-form">
        <el-form-item label="所属项目" prop="project_id">
          <el-select v-model="form.project_id" placeholder="请选择项目">
            <el-option v-for="project in projects" :key="project.id" :label="project.name" :value="project.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="房间号" prop="room_number">
          <el-input v-model="form.room_number" placeholder="请输入房间号" />
        </el-form-item>
        <el-form-item label="楼层" prop="floor">
          <el-input-number v-model="form.floor" :min="1" controls-position="right" class="control-full-width" />
        </el-form-item>
        <el-form-item label="面积" prop="area">
          <el-input-number v-model="form.area" :min="0" :precision="1" controls-position="right" class="control-full-width" />
        </el-form-item>
        <el-form-item label="月租金" prop="rent_price">
          <el-input-number v-model="form.rent_price" :min="0" :precision="0" controls-position="right" class="control-full-width" />
        </el-form-item>
        <el-form-item label="押金" prop="deposit">
          <el-input-number v-model="form.deposit" :min="0" :precision="0" controls-position="right" class="control-full-width" />
        </el-form-item>
        <el-form-item label="状态">
          <el-input :value="getStatusText(form.status)" disabled />
        </el-form-item>
        <el-form-item label="配套设施" class="form-span-2">
          <el-input v-model="form.facilities" type="textarea" :rows="3" placeholder="多个设施用逗号分隔" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="toolbar-actions">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit">确定</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { Plus, Download } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import SectionCard from '@/components/SectionCard.vue'
import ActiveFiltersInline from '@/components/ActiveFiltersInline.vue'
import db from '@/utils/localDB'
import { paginate, getPaginationConfig } from '@/utils/pagination'
import { exportToExcel } from '@/utils/excelExport'
import businessService from '@/services/businessService'
import { formatCurrency, formatDecimal } from '@/utils/formatters'

const cities = ref([])
const projects = ref([])
const rooms = ref([])
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const currentPage = ref(1)
const { pageSize } = getPaginationConfig()

const paginatedRooms = computed(() => paginate(filteredRooms.value, currentPage.value, pageSize))

const searchForm = reactive({
  room_number: '',
  city_id: '',
  project_id: '',
  status: ''
})

const form = reactive({
  id: '',
  project_id: '',
  room_number: '',
  floor: 1,
  area: 50,
  rent_price: 3000,
  deposit: 6000,
  status: 'vacant',
  facilities: ''
})

const rules = {
  project_id: [{ required: true, message: '请选择项目', trigger: 'change' }],
  room_number: [{ required: true, message: '请输入房间号', trigger: 'blur' }],
  floor: [{ required: true, message: '请输入楼层', trigger: 'blur' }],
  area: [{ required: true, message: '请输入面积', trigger: 'blur' }],
  rent_price: [{ required: true, message: '请输入租金', trigger: 'blur' }],
  deposit: [{ required: true, message: '请输入押金', trigger: 'blur' }]
}

const filteredProjects = computed(() => {
  if (!searchForm.city_id) return projects.value
  return projects.value.filter((project) => project.city_id === searchForm.city_id)
})

const activeFilterChips = computed(() => {
  const chips = []
  if (searchForm.room_number) {
    chips.push({ key: 'room_number', label: `房间号：${searchForm.room_number}` })
  }
  if (searchForm.city_id) {
    chips.push({ key: 'city_id', label: `城市：${getCityName(searchForm.city_id)}` })
  }
  if (searchForm.project_id) {
    chips.push({ key: 'project_id', label: `项目：${getProjectName(searchForm.project_id)}` })
  }
  if (searchForm.status) {
    chips.push({ key: 'status', label: `状态：${getStatusText(searchForm.status)}` })
  }
  return chips
})

const filteredRooms = computed(() => {
  let result = rooms.value
  if (searchForm.room_number) {
    const keyword = searchForm.room_number.trim().toLowerCase()
    result = result.filter((room) => String(room.room_number || '').toLowerCase().includes(keyword))
  }
  if (searchForm.city_id) {
    const cityProjects = projects.value.filter((project) => project.city_id === searchForm.city_id)
    const projectIds = cityProjects.map((project) => project.id)
    result = result.filter((room) => projectIds.includes(room.project_id))
  }
  if (searchForm.project_id) {
    result = result.filter((room) => room.project_id === searchForm.project_id)
  }
  if (searchForm.status) {
    result = result.filter((room) => room.status === searchForm.status)
  }
  return result
})

watch(filteredRooms, () => {
  currentPage.value = 1
})

onMounted(() => {
  loadData()
})

const loadData = () => {
  cities.value = db.getTable('cities')
  projects.value = db.getTable('projects')
  rooms.value = db.getTable('rooms')
}

const onCityChange = () => {
  searchForm.project_id = ''
}

const getCityName = (cityId) => cities.value.find((city) => city.id === cityId)?.name || '-'
const getProjectName = (projectId) => projects.value.find((project) => project.id === projectId)?.name || '-'

const resetFilters = () => {
  Object.assign(searchForm, {
    room_number: '',
    city_id: '',
    project_id: '',
    status: ''
  })
}

const clearFilter = (key) => {
  searchForm[key] = ''
  if (key === 'city_id') {
    searchForm.project_id = ''
  }
}

const getStatusType = (status) => {
  const map = { vacant: 'success', rented: 'primary', maintenance: 'danger' }
  return map[status] || 'info'
}

const getStatusText = (status) => {
  const map = { vacant: '空置', rented: '已租', maintenance: '维修中' }
  return map[status] || status
}

const showAddDialog = () => {
  dialogType.value = 'add'
  Object.assign(form, {
    id: '',
    project_id: '',
    room_number: '',
    floor: 1,
    area: 50,
    rent_price: 3000,
    deposit: 6000,
    status: 'vacant',
    facilities: ''
  })
  dialogVisible.value = true
}

const showEditDialog = (row) => {
  dialogType.value = 'edit'
  Object.assign(form, row)
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return

  await formRef.value.validate((valid) => {
    if (!valid) return

    try {
      if (dialogType.value === 'add') {
        businessService.createRoom({ ...form })
        ElMessage.success('新增成功')
      } else {
        businessService.updateRoom(form.id, { ...form })
        ElMessage.success('更新成功')
      }
      dialogVisible.value = false
      loadData()
    } catch (error) {
      ElMessage.error(error.message)
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除房间“${row.room_number}”吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    businessService.deleteRoom(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch {
    // ignore
  }
}

const exportRooms = () => {
  const data = rooms.value.map((room) => ({
    room_number: room.room_number,
    floor: room.floor,
    area: formatDecimal(room.area, 1),
    rent_price: formatCurrency(room.rent_price),
    deposit: formatCurrency(room.deposit),
    status: room.status === 'vacant' ? '空置' : room.status === 'rented' ? '已租' : '维修中',
    facilities: room.facilities
  }))

  const columns = [
    { header: '房间号', key: 'room_number', width: 12 },
    { header: '楼层', key: 'floor', width: 8 },
    { header: '面积(㎡)', key: 'area', width: 10 },
    { header: '月租金', key: 'rent_price', width: 12 },
    { header: '押金', key: 'deposit', width: 12 },
    { header: '状态', key: 'status', width: 10 },
    { header: '配套设施', key: 'facilities', width: 30 }
  ]

  exportToExcel(data, columns, '房间列表')
}
</script>

<style scoped>
.list-filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 12px;
}
</style>
