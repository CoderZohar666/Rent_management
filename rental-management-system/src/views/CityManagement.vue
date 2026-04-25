<template>
  <div class="city-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>城市管理</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新增城市
          </el-button>
        </div>
      </template>

      <el-table :data="paginatedCities" style="width: 100%">
        <el-table-column prop="name" label="城市名称" />
        <el-table-column label="状态">
          <template #default="scope">
            <el-tag :type="scope.row.status === 'active' ? 'success' : 'danger'">
              {{ scope.row.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="项目数">
          <template #default="scope">
            {{ getProjectCount(scope.row.id) }}
          </template>
        </el-table-column>
        <el-table-column label="房间总数">
          <template #default="scope">
            {{ getRoomCount(scope.row.id) }}
          </template>
        </el-table-column>
        <el-table-column label="出租率">
          <template #default="scope">
            {{ getOccupancyRate(scope.row.id) }}%
          </template>
        </el-table-column>
        <el-table-column label="操作" width="250">
          <template #default="scope">
            <el-button size="small" @click="showEditDialog(scope.row)">编辑</el-button>
            <el-button 
              size="small" 
              :type="scope.row.status === 'active' ? 'danger' : 'success'"
              @click="toggleStatus(scope.row)"
            >
              {{ scope.row.status === 'active' ? '禁用' : '启用' }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 20px; justify-content: flex-end"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="cities.length"
        layout="total, prev, pager, next"
        @current-change="currentPage = $event"
      />
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogType === 'add' ? '新增城市' : '编辑城市'"
      width="500px"
    >
      <el-form :model="form" :rules="rules" ref="formRef" label-width="80px">
        <el-form-item label="城市名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入城市名称" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="form.status" active-value="active" inactive-value="inactive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import db from '@/utils/localDB'
import { paginate, getPaginationConfig } from '@/utils/pagination'

const cities = ref([])
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const currentPage = ref(1)
const { pageSize } = getPaginationConfig()

const paginatedCities = computed(() => {
  return paginate(cities.value, currentPage.value, pageSize)
})

const form = reactive({
  id: '',
  name: '',
  status: 'active'
})

const rules = {
  name: [
    { required: true, message: '请输入城市名称', trigger: 'blur' }
  ]
}

onMounted(() => {
  loadData()
})

const loadData = () => {
  cities.value = db.getTable('cities')
}

const getProjectCount = (cityId) => {
  return db.query('projects', { city_id: cityId }).length
}

const getRoomCount = (cityId) => {
  const projects = db.query('projects', { city_id: cityId })
  const projectIds = projects.map(p => p.id)
  return db.getTable('rooms').filter(r => projectIds.includes(r.project_id)).length
}

const getOccupancyRate = (cityId) => {
  const projects = db.query('projects', { city_id: cityId })
  const projectIds = projects.map(p => p.id)
  const rooms = db.getTable('rooms').filter(r => projectIds.includes(r.project_id))
  if (rooms.length === 0) return 0
  const rented = rooms.filter(r => r.status === 'rented').length
  return Math.round((rented / rooms.length) * 100)
}

const showAddDialog = () => {
  dialogType.value = 'add'
  form.id = ''
  form.name = ''
  form.status = 'active'
  dialogVisible.value = true
}

const showEditDialog = (row) => {
  dialogType.value = 'edit'
  form.id = row.id
  form.name = row.name
  form.status = row.status
  dialogVisible.value = true
}

const handleSubmit = async () => {
  if (!formRef.value) return
  
  await formRef.value.validate((valid) => {
    if (valid) {
      if (dialogType.value === 'add') {
        db.insert('cities', { name: form.name, status: form.status })
        ElMessage.success('新增成功')
      } else {
        db.update('cities', form.id, { name: form.name, status: form.status })
        ElMessage.success('更新成功')
      }
      dialogVisible.value = false
      loadData()
    }
  })
}

const toggleStatus = (row) => {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  db.update('cities', row.id, { status: newStatus })
  ElMessage.success('状态已更新')
  loadData()
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除城市"${row.name}"吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const projects = db.query('projects', { city_id: row.id })
    if (projects.length > 0) {
      ElMessage.error('该城市下还有项目，无法删除')
      return
    }
    
    db.delete('cities', row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch {
    // 取消删除
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
