<template>
  <div class="page-shell">
    <PageHeader
      eyebrow="Contracts"
      title="合同管理"
      subtitle="查看合同执行状态，维护租期、租户与租金信息，并进入详情页跟进续租和退租。"
    >
      <template #actions>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          新增合同
        </el-button>
      </template>
    </PageHeader>

    <SectionCard title="合同列表" :subtitle="`共 ${contracts.length} 份合同`">
      <div class="page-data-table">
        <el-table :data="paginatedContracts">
          <el-table-column label="房间号" min-width="120">
            <template #default="scope">
              {{ getRoomNumber(scope.row.room_id) }}
            </template>
          </el-table-column>
          <el-table-column label="租户" min-width="120">
            <template #default="scope">
              {{ getTenantName(scope.row.tenant_id) }}
            </template>
          </el-table-column>
          <el-table-column prop="start_date" label="开始日期" min-width="120" />
          <el-table-column prop="end_date" label="结束日期" min-width="120" />
          <el-table-column label="月租金" min-width="120">
            <template #default="scope">
              <span class="amount-text">¥{{ formatCurrency(scope.row.monthly_rent) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" min-width="120">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row)" class="status-chip">
                {{ getStatusText(scope.row) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" fixed="right">
            <template #default="scope">
              <div class="inline-actions">
                <el-button size="small" @click="viewDetail(scope.row)">详情</el-button>
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
          :total="contracts.length"
          layout="total, prev, pager, next"
          @current-change="currentPage = $event"
        />
      </div>
    </SectionCard>

    <el-dialog
      v-model="dialogVisible"
      class="app-dialog"
      :title="dialogType === 'add' ? '新增合同' : '编辑合同'"
      width="760px"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" class="dialog-form">
        <el-form-item label="房间" prop="room_id">
          <el-select v-model="form.room_id" placeholder="请选择房间">
            <el-option v-for="room in availableRooms" :key="room.id" :label="room.room_number" :value="room.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="租户" prop="tenant_id">
          <el-select v-model="form.tenant_id" placeholder="请选择租户">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="start_date">
          <el-date-picker v-model="form.start_date" type="date" value-format="YYYY-MM-DD" class="control-full-width" />
        </el-form-item>
        <el-form-item label="结束日期" prop="end_date">
          <el-date-picker v-model="form.end_date" type="date" value-format="YYYY-MM-DD" class="control-full-width" />
        </el-form-item>
        <el-form-item label="月租金" prop="monthly_rent">
          <el-input-number v-model="form.monthly_rent" :min="0" controls-position="right" class="control-full-width" />
        </el-form-item>
        <el-form-item label="押金" prop="deposit">
          <el-input-number v-model="form.deposit" :min="0" controls-position="right" class="control-full-width" />
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
import { useRouter } from 'vue-router'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import db from '@/utils/localDB'
import { paginate, getPaginationConfig } from '@/utils/pagination'
import businessService from '@/services/businessService'
import { formatCurrency } from '@/utils/formatters'

const router = useRouter()
const contracts = ref([])
const rooms = ref([])
const tenants = ref([])
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const form = reactive({ id: '', room_id: '', tenant_id: '', start_date: '', end_date: '', monthly_rent: 0, deposit: 0, status: 'active' })
const rules = {
  room_id: [{ required: true, message: '请选择房间', trigger: 'change' }],
  tenant_id: [{ required: true, message: '请选择租户', trigger: 'change' }]
}

const availableRooms = computed(() => {
  if (dialogType.value === 'edit' && form.room_id) {
    return rooms.value.filter((room) => room.status === 'vacant' || room.id === form.room_id)
  }
  return rooms.value.filter((room) => room.status === 'vacant')
})

const currentPage = ref(1)
const { pageSize } = getPaginationConfig()

const paginatedContracts = computed(() => paginate(contracts.value, currentPage.value, pageSize))

onMounted(() => loadData())

const loadData = () => {
  contracts.value = db.getTable('contracts')
  rooms.value = db.getTable('rooms')
  tenants.value = db.getTable('tenants')
}

const getRoomNumber = (roomId) => rooms.value.find((room) => room.id === roomId)?.room_number || '-'
const getTenantName = (tenantId) => tenants.value.find((tenant) => tenant.id === tenantId)?.name || '-'
const getStatusType = (row) => ({ active: 'success', expiring: 'warning', terminated: 'danger', settled: 'info', draft: 'info' }[businessService.getContractDisplayStatus(row)] || 'info')
const getStatusText = (row) => ({ active: '执行中', expiring: '即将到期', terminated: '已终止', settled: '已结清', draft: '草稿' }[businessService.getContractDisplayStatus(row)] || row.status)

const viewDetail = (row) => {
  router.push(`/contracts/${row.id}`)
}

const showAddDialog = () => {
  dialogType.value = 'add'
  Object.assign(form, {
    id: '',
    room_id: '',
    tenant_id: '',
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: '',
    monthly_rent: 0,
    deposit: 0,
    status: 'active'
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
        businessService.createContract({ ...form })
      } else {
        businessService.updateContract(form.id, { ...form })
      }
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
    businessService.deleteContract(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch {
    // ignore
  }
}
</script>
