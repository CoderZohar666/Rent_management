<template>
  <div class="operation-log">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>操作日志</span>
          <el-button type="danger" @click="clearLogs">
            <el-icon><Delete /></el-icon>
            清空日志
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" style="margin-bottom: 20px">
        <el-form-item label="操作类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable>
            <el-option label="新增" value="create" />
            <el-option label="修改" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="登录" value="login" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作人">
          <el-input v-model="searchForm.user" placeholder="请输入操作人" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadLogs">查询</el-button>
        </el-form-item>
        <el-form-item v-if="activeFilterChips.length">
          <ActiveFiltersInline :items="activeFilterChips" @remove="clearFilter" />
        </el-form-item>
      </el-form>

      <el-table :data="displayedLogs" style="width: 100%">
        <el-table-column prop="timestamp" label="时间" width="180" />
        <el-table-column prop="user" label="操作人" width="120" />
        <el-table-column prop="type" label="操作类型" width="100">
          <template #default="scope">
            <el-tag :type="getTypeColor(scope.row.type)" size="small">
              {{ getTypeText(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="模块" width="120" />
        <el-table-column prop="description" label="操作描述" />
        <el-table-column prop="ip" label="IP地址" width="150" />
      </el-table>

      <el-pagination
        v-if="filteredLogs.length > 0"
        style="margin-top: 20px; text-align: right"
        :current-page="currentPage"
        :page-size="pageSize"
        :total="filteredLogs.length"
        layout="total, prev, pager, next"
        @current-change="handlePageChange"
      />
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ActiveFiltersInline from '@/components/ActiveFiltersInline.vue'

const logs = ref([])
const searchForm = reactive({ type: '', user: '' })
const currentPage = ref(1)
const pageSize = 20

const filteredLogs = computed(() => {
  let result = logs.value
  if (searchForm.type) {
    result = result.filter(log => log.type === searchForm.type)
  }
  if (searchForm.user) {
    result = result.filter(log => log.user.includes(searchForm.user))
  }
  return result.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
})

const activeFilterChips = computed(() => {
  const chips = []
  if (searchForm.type) {
    chips.push({ key: 'type', label: `操作类型：${getTypeText(searchForm.type)}` })
  }
  if (searchForm.user) {
    chips.push({ key: 'user', label: `操作人：${searchForm.user}` })
  }
  return chips
})

const displayedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredLogs.value.slice(start, end)
})

onMounted(() => {
  loadLogs()
})

const loadLogs = () => {
  const stored = localStorage.getItem('operation_logs')
  if (stored) {
    logs.value = JSON.parse(stored)
  }
}

const saveLogs = () => {
  localStorage.setItem('operation_logs', JSON.stringify(logs.value))
}

const handlePageChange = (page) => {
  currentPage.value = page
}

const getTypeColor = (type) => {
  const map = { create: 'success', update: 'primary', delete: 'danger', login: 'info' }
  return map[type] || 'info'
}

const getTypeText = (type) => {
  const map = { create: '新增', update: '修改', delete: '删除', login: '登录' }
  return map[type] || type
}

const clearFilter = (key) => {
  searchForm[key] = ''
}

const clearLogs = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有操作日志吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    logs.value = []
    saveLogs()
    ElMessage.success('日志已清空')
  } catch {
    // 取消
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
