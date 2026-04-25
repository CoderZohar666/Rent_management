<template>
  <div class="page-shell">
    <PageHeader
      eyebrow="Tenants"
      title="租户管理"
      subtitle="维护租户资料、联系方式和紧急联系人信息。"
    >
      <template #actions>
        <div class="toolbar-actions">
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新增租户
          </el-button>
        </div>
      </template>
    </PageHeader>

    <FilterBar>
      <el-form :inline="true" :model="searchForm" class="list-filter-form">
        <el-form-item label="搜索">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索姓名或电话"
            clearable
          />
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

    <SectionCard title="租户列表" :subtitle="`共 ${filteredTenants.length} 位租户`">
      <div class="page-data-table">
        <el-table :data="filteredTenants">
          <el-table-column prop="name" label="姓名" min-width="120" />
          <el-table-column prop="phone" label="电话" min-width="140" />
          <el-table-column label="关联房间" min-width="120">
            <template #default="scope">
              {{ getLinkedRoomNumber(scope.row) }}
            </template>
          </el-table-column>
          <el-table-column prop="id_card" label="身份证号" min-width="220" show-overflow-tooltip />
          <el-table-column prop="emergency_contact" label="紧急联系人电话" min-width="160" />
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
      :title="dialogType === 'add' ? '新增租户' : '编辑租户'"
      width="720px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="108px" class="dialog-form">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="form.name" />
        </el-form-item>
        <el-form-item label="电话" prop="phone">
          <el-input v-model="form.phone" />
        </el-form-item>
        <el-form-item label="关联房间">
          <el-select v-model="form.room_id" placeholder="请选择房间" clearable :disabled="hasActiveContractForForm">
            <el-option v-for="room in availableRooms" :key="room.id" :label="room.room_number" :value="room.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="身份证号" prop="id_card" class="form-span-2">
          <el-input v-model="form.id_card" />
        </el-form-item>
        <el-form-item label="紧急联系人电话" prop="emergency_contact" class="form-span-2">
          <el-input v-model="form.emergency_contact" />
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
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import SectionCard from '@/components/SectionCard.vue'
import ActiveFiltersInline from '@/components/ActiveFiltersInline.vue'
import db from '@/utils/localDB'
import businessService from '@/services/businessService'

const tenants = ref([])
const rooms = ref([])
const contracts = ref([])
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const searchForm = reactive({ keyword: '' })
const form = reactive({ id: '', name: '', phone: '', room_id: '', id_card: '', emergency_contact: '' })
const rules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入电话', trigger: 'blur' }]
}

const activeContractRoomMap = computed(() => {
  const map = new Map()
  contracts.value
    .filter((contract) => contract.status === 'active')
    .forEach((contract) => {
      map.set(contract.tenant_id, contract.room_id)
    })
  return map
})

const hasActiveContractForForm = computed(() => Boolean(form.id && activeContractRoomMap.value.get(form.id)))

const availableRooms = computed(() => {
  const currentRoomId = form.room_id
  const occupiedRoomIds = new Set()

  tenants.value.forEach((tenant) => {
    if (tenant.id === form.id) return
    const linkedRoomId = activeContractRoomMap.value.get(tenant.id) || tenant.room_id
    if (linkedRoomId) occupiedRoomIds.add(linkedRoomId)
  })

  return rooms.value.filter((room) => room.id === currentRoomId || !occupiedRoomIds.has(room.id))
})

const filteredTenants = computed(() => {
  if (!searchForm.keyword) return tenants.value
  const keyword = searchForm.keyword.trim().toLowerCase()
  return tenants.value.filter((tenant) =>
    String(tenant.name || '').toLowerCase().includes(keyword) ||
    String(tenant.phone || '').toLowerCase().includes(keyword) ||
    String(getLinkedRoomNumber(tenant)).toLowerCase().includes(keyword)
  )
})

const activeFilterChips = computed(() => {
  if (!searchForm.keyword) return []
  return [{ key: 'keyword', label: `搜索：${searchForm.keyword}` }]
})

onMounted(() => loadData())

const loadData = () => {
  tenants.value = db.getTable('tenants')
  rooms.value = db.getTable('rooms')
  contracts.value = db.getTable('contracts')
}

const getRoomNumber = (roomId) => rooms.value.find((room) => room.id === roomId)?.room_number || '-'

const getLinkedRoomNumber = (tenant) => {
  const linkedRoomId = activeContractRoomMap.value.get(tenant.id) || tenant.room_id
  return linkedRoomId ? getRoomNumber(linkedRoomId) : '-'
}

const clearFilter = (key) => {
  searchForm[key] = ''
}

const resetFilters = () => {
  searchForm.keyword = ''
}

const showAddDialog = () => {
  dialogType.value = 'add'
  Object.assign(form, { id: '', name: '', phone: '', room_id: '', id_card: '', emergency_contact: '' })
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
      if (dialogType.value === 'add') businessService.createTenant({ ...form })
      else businessService.updateTenant(form.id, { ...form })
      ElMessage.success('操作成功')
      dialogVisible.value = false
      loadData()
    } catch (error) {
      ElMessage.error(error.message)
    }
  })
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除吗？', '提示', { type: 'warning' })
    businessService.deleteTenant(row.id)
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
</style>
