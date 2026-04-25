<template>
  <div class="page-shell">
    <PageHeader
      eyebrow="Projects"
      title="项目管理"
      subtitle="维护项目基础信息、所属城市、房间总量与运营状态。"
    >
      <template #actions>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          新增项目
        </el-button>
      </template>
    </PageHeader>

    <FilterBar>
      <el-form :inline="true" :model="searchForm" class="list-filter-form">
        <el-form-item label="城市">
          <el-select v-model="searchForm.city_id" placeholder="全部城市" clearable>
            <el-option v-for="city in cities" :key="city.id" :label="city.name" :value="city.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #actions>
        <div class="toolbar-actions">
          <ActiveFiltersInline :items="activeFilterChips" @remove="clearFilter" />
          <el-button @click="searchForm.city_id = ''">重置</el-button>
          <el-button type="primary" @click="loadData">刷新</el-button>
        </div>
      </template>
    </FilterBar>

    <SectionCard title="项目列表" :subtitle="`共 ${filteredProjects.length} 个项目`">
      <div class="page-data-table">
        <el-table :data="filteredProjects">
          <el-table-column prop="name" label="项目名称" min-width="180" />
          <el-table-column prop="address" label="地址" min-width="220" show-overflow-tooltip />
          <el-table-column label="所属城市" min-width="120">
            <template #default="scope">
              {{ getCityName(scope.row.city_id) }}
            </template>
          </el-table-column>
          <el-table-column prop="total_rooms" label="房间总数" min-width="110" />
          <el-table-column label="已出租" min-width="100">
            <template #default="scope">
              {{ getRentedRooms(scope.row.id) }}
            </template>
          </el-table-column>
          <el-table-column label="出租率" min-width="160">
            <template #default="scope">
              <el-progress
                :percentage="getOccupancyRate(scope.row.id)"
                :stroke-width="10"
                :color="getProgressColor(getOccupancyRate(scope.row.id))"
                :show-text="false"
              />
              <span class="progress-caption">{{ getOccupancyRate(scope.row.id) }}%</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="110">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'active' ? 'success' : 'danger'" class="status-chip">
                {{ scope.row.status === 'active' ? '运营中' : '已停用' }}
              </el-tag>
            </template>
          </el-table-column>
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
    </SectionCard>

    <el-dialog
      v-model="dialogVisible"
      class="app-dialog"
      :title="dialogType === 'add' ? '新增项目' : '编辑项目'"
      width="720px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" class="dialog-form">
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="所属城市" prop="city_id">
          <el-select v-model="form.city_id" placeholder="请选择城市">
            <el-option v-for="city in cities" :key="city.id" :label="city.name" :value="city.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="地址" prop="address" class="form-span-2">
          <el-input v-model="form.address" placeholder="请输入项目地址" />
        </el-form-item>
        <el-form-item label="房间总数" prop="total_rooms">
          <el-input-number v-model="form.total_rooms" :min="0" controls-position="right" class="control-full-width" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-value="active" inactive-value="inactive" />
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
import { ref, reactive, onMounted, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import SectionCard from '@/components/SectionCard.vue'
import ActiveFiltersInline from '@/components/ActiveFiltersInline.vue'
import db from '@/utils/localDB'

const cities = ref([])
const projects = ref([])
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)

const searchForm = reactive({
  city_id: ''
})

const form = reactive({
  id: '',
  name: '',
  city_id: '',
  address: '',
  total_rooms: 0,
  status: 'active'
})

const rules = {
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  city_id: [{ required: true, message: '请选择城市', trigger: 'change' }],
  address: [{ required: true, message: '请输入地址', trigger: 'blur' }],
  total_rooms: [{ required: true, message: '请输入房间总数', trigger: 'blur' }]
}

const filteredProjects = computed(() => {
  if (!searchForm.city_id) return projects.value
  return projects.value.filter((project) => project.city_id === searchForm.city_id)
})

const activeFilterChips = computed(() => {
  if (!searchForm.city_id) return []
  return [{ key: 'city_id', label: `城市：${getCityName(searchForm.city_id)}` }]
})

onMounted(() => {
  loadData()
})

const loadData = () => {
  cities.value = db.getTable('cities')
  projects.value = db.getTable('projects')
}

const getCityName = (cityId) => cities.value.find((city) => city.id === cityId)?.name || '-'
const getRentedRooms = (projectId) => db.query('rooms', { project_id: projectId, status: 'rented' }).length

const getOccupancyRate = (projectId) => {
  const rooms = db.query('rooms', { project_id: projectId })
  if (rooms.length === 0) return 0
  const rented = rooms.filter((room) => room.status === 'rented').length
  return Math.round((rented / rooms.length) * 100)
}

const getProgressColor = (percentage) => {
  if (percentage >= 80) return '#12B981'
  if (percentage >= 50) return '#F59E0B'
  return '#EF4444'
}

const clearFilter = (key) => {
  searchForm[key] = ''
}

const showAddDialog = () => {
  dialogType.value = 'add'
  Object.assign(form, { id: '', name: '', city_id: '', address: '', total_rooms: 0, status: 'active' })
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

    if (dialogType.value === 'add') {
      db.insert('projects', { ...form })
      ElMessage.success('新增成功')
    } else {
      db.update('projects', form.id, { ...form })
      ElMessage.success('更新成功')
    }
    dialogVisible.value = false
    loadData()
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除项目“${row.name}”吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const rooms = db.query('rooms', { project_id: row.id })
    if (rooms.length > 0) {
      ElMessage.error('该项目下还有房间，无法删除')
      return
    }

    db.delete('projects', row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch {
    // ignore
  }
}
</script>

<style scoped>
.list-filter-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.progress-caption {
  display: inline-block;
  margin-top: 8px;
  color: var(--app-color-text-secondary);
  font-size: 13px;
}
</style>
