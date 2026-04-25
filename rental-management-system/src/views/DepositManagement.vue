<template>
  <div class="deposit-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>押金管理</span>
          <el-button type="primary" @click="showRecordDialog">
            <el-icon><Plus /></el-icon>
            记录押金
          </el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="押金总览" name="overview">
          <el-row :gutter="20" style="margin-bottom: 20px">
            <el-col :span="8">
              <el-card shadow="hover">
                <el-statistic title="押金总收入" :value="stats.totalCollected" prefix="¥" />
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <el-statistic title="押金待退还" :value="stats.pendingRefund" prefix="¥" />
              </el-card>
            </el-col>
            <el-col :span="8">
              <el-card shadow="hover">
                <el-statistic title="押金已退还" :value="stats.refunded" prefix="¥" />
              </el-card>
            </el-col>
          </el-row>

          <el-table :data="deposits" style="width: 100%">
            <el-table-column label="房间号">
              <template #default="scope">
                {{ getRoomNumber(scope.row.room_id) }}
              </template>
            </el-table-column>
            <el-table-column label="租户">
              <template #default="scope">
                {{ getTenantName(scope.row.tenant_id) }}
              </template>
            </el-table-column>
            <el-table-column label="押金金额">
              <template #default="scope">
                ¥{{ scope.row.amount }}
              </template>
            </el-table-column>
            <el-table-column prop="collect_date" label="收取日期" />
            <el-table-column label="状态">
              <template #default="scope">
                <el-tag :type="getStatusType(scope.row.status)">
                  {{ getStatusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <el-button 
                  v-if="scope.row.status === 'collected'" 
                  size="small" 
                  type="warning" 
                  @click="showRefundDialog(scope.row)"
                >
                  退还押金
                </el-button>
                <el-button size="small" @click="viewDetail(scope.row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="退还记录" name="refund">
          <el-table :data="refundRecords" style="width: 100%">
            <el-table-column label="房间号">
              <template #default="scope">
                {{ getRoomNumber(scope.row.room_id) }}
              </template>
            </el-table-column>
            <el-table-column label="租户">
              <template #default="scope">
                {{ getTenantName(scope.row.tenant_id) }}
              </template>
            </el-table-column>
            <el-table-column label="原押金">
              <template #default="scope">
                ¥{{ scope.row.amount }}
              </template>
            </el-table-column>
            <el-table-column label="扣除金额">
              <template #default="scope">
                ¥{{ scope.row.deduction || 0 }}
              </template>
            </el-table-column>
            <el-table-column label="实际退还">
              <template #default="scope">
                ¥{{ scope.row.refund_amount }}
              </template>
            </el-table-column>
            <el-table-column prop="refund_date" label="退还日期" />
            <el-table-column prop="refund_reason" label="退还原因" show-overflow-tooltip />
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="recordDialogVisible" title="记录押金" width="600px">
      <el-form :model="recordForm" :rules="recordRules" ref="recordFormRef" label-width="100px">
        <el-form-item label="房间" prop="room_id">
          <el-select v-model="recordForm.room_id" placeholder="请选择房间" style="width: 100%">
            <el-option v-for="room in rentedRooms" :key="room.id" :label="room.room_number" :value="room.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="租户" prop="tenant_id">
          <el-select v-model="recordForm.tenant_id" placeholder="请选择租户" style="width: 100%">
            <el-option v-for="tenant in tenants" :key="tenant.id" :label="tenant.name" :value="tenant.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="押金金额" prop="amount">
          <el-input-number v-model="recordForm.amount" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="收取日期" prop="collect_date">
          <el-date-picker v-model="recordForm.collect_date" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="recordForm.remark" type="textarea" rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="recordDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRecordDeposit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="refundDialogVisible" title="退还押金" width="600px">
      <el-form :model="refundForm" ref="refundFormRef" label-width="100px">
        <el-form-item label="房间">
          <el-input :value="getRoomNumber(refundForm.room_id)" disabled />
        </el-form-item>
        <el-form-item label="租户">
          <el-input :value="getTenantName(refundForm.tenant_id)" disabled />
        </el-form-item>
        <el-form-item label="原押金金额">
          <el-input :value="'¥' + refundForm.amount" disabled />
        </el-form-item>
        <el-form-item label="扣除金额">
          <el-input-number v-model="refundForm.deduction" :min="0" :max="refundForm.amount" style="width: 100%" @change="calculateRefund" />
          <span class="form-tip">如有损坏或其他费用，请填写扣除金额</span>
        </el-form-item>
        <el-form-item label="实际退还">
          <el-input :value="'¥' + refundForm.refund_amount" disabled />
        </el-form-item>
        <el-form-item label="退还日期">
          <el-date-picker v-model="refundForm.refund_date" type="date" style="width: 100%" />
        </el-form-item>
        <el-form-item label="退还原因">
          <el-input v-model="refundForm.refund_reason" type="textarea" rows="3" placeholder="请填写退还原因" />
        </el-form-item>
        <el-form-item label="扣除说明" v-if="refundForm.deduction > 0">
          <el-input v-model="refundForm.deduction_reason" type="textarea" rows="2" placeholder="请填写扣除明细" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="refundDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleRefund">确认退还</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="detailVisible" title="押金详情" width="600px">
      <el-descriptions :column="2" border v-if="selectedDeposit">
        <el-descriptions-item label="房间号">{{ getRoomNumber(selectedDeposit.room_id) }}</el-descriptions-item>
        <el-descriptions-item label="租户">{{ getTenantName(selectedDeposit.tenant_id) }}</el-descriptions-item>
        <el-descriptions-item label="押金金额">¥{{ selectedDeposit.amount }}</el-descriptions-item>
        <el-descriptions-item label="收取日期">{{ selectedDeposit.collect_date }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(selectedDeposit.status)">
            {{ getStatusText(selectedDeposit.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">{{ selectedDeposit.remark || '无' }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="['refunded', 'partially_refunded'].includes(selectedDeposit?.status)" class="refund-info">
        <h4>退还信息</h4>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="扣除金额">¥{{ selectedDeposit.deduction || 0 }}</el-descriptions-item>
          <el-descriptions-item label="实际退还">¥{{ selectedDeposit.refund_amount }}</el-descriptions-item>
          <el-descriptions-item label="退还日期">{{ selectedDeposit.refund_date }}</el-descriptions-item>
          <el-descriptions-item label="退还原因">{{ selectedDeposit.refund_reason }}</el-descriptions-item>
          <el-descriptions-item label="扣除说明" :span="2">{{ selectedDeposit.deduction_reason || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import db from '@/utils/localDB'
import dayjs from 'dayjs'
import businessService from '@/services/businessService'

const activeTab = ref('overview')
const deposits = ref([])
const rooms = ref([])
const tenants = ref([])
const recordDialogVisible = ref(false)
const refundDialogVisible = ref(false)
const detailVisible = ref(false)
const selectedDeposit = ref(null)

const recordFormRef = ref(null)
const refundFormRef = ref(null)

const recordForm = reactive({
  room_id: '',
  tenant_id: '',
  amount: 0,
  collect_date: dayjs().format('YYYY-MM-DD'),
  remark: ''
})

const refundForm = reactive({
  id: '',
  room_id: '',
  tenant_id: '',
  amount: 0,
  deduction: 0,
  refund_amount: 0,
  refund_date: dayjs().format('YYYY-MM-DD'),
  refund_reason: '',
  deduction_reason: ''
})

const recordRules = {
  room_id: [{ required: true, message: '请选择房间', trigger: 'change' }],
  tenant_id: [{ required: true, message: '请选择租户', trigger: 'change' }],
  amount: [{ required: true, message: '请输入押金金额', trigger: 'blur' }]
}

const rentedRooms = computed(() => rooms.value.filter(r => r.status === 'rented'))

const refundRecords = computed(() => deposits.value.filter(d => ['refunded', 'partially_refunded'].includes(d.status)))

const stats = computed(() => {
  const totalCollected = deposits.value.reduce((sum, d) => sum + d.amount, 0)
  const pendingRefund = deposits.value.filter(d => d.status === 'collected').reduce((sum, d) => sum + d.amount, 0)
  const refunded = deposits.value.filter(d => ['refunded', 'partially_refunded'].includes(d.status)).reduce((sum, d) => sum + (d.refund_amount || 0), 0)
  return { totalCollected, pendingRefund, refunded }
})

onMounted(() => {
  loadData()
})

const loadData = () => {
  deposits.value = db.getTable('deposits')
  rooms.value = db.getTable('rooms')
  tenants.value = db.getTable('tenants')
}

const getRoomNumber = (roomId) => rooms.value.find(r => r.id === roomId)?.room_number || '-'
const getTenantName = (tenantId) => tenants.value.find(t => t.id === tenantId)?.name || '-'

const getStatusType = (status) => ({ collected: 'success', refunded: 'info', partially_refunded: 'warning' }[status] || 'info')
const getStatusText = (status) => ({ collected: '已收取', refunded: '已退还', partially_refunded: '部分扣退' }[status] || status)

const showRecordDialog = () => {
  Object.assign(recordForm, {
    room_id: '',
    tenant_id: '',
    amount: 0,
    collect_date: dayjs().format('YYYY-MM-DD'),
    remark: ''
  })
  recordDialogVisible.value = true
}

const handleRecordDeposit = async () => {
  if (!recordFormRef.value) return
  
  await recordFormRef.value.validate((valid) => {
    if (valid) {
      try {
        businessService.recordDeposit({ ...recordForm })
        ElMessage.success('押金记录成功')
        recordDialogVisible.value = false
        loadData()
      } catch (error) {
        ElMessage.error(error.message)
      }
    }
  })
}

const showRefundDialog = (deposit) => {
  Object.assign(refundForm, {
    id: deposit.id,
    room_id: deposit.room_id,
    tenant_id: deposit.tenant_id,
    amount: deposit.amount,
    deduction: 0,
    refund_amount: deposit.amount,
    refund_date: dayjs().format('YYYY-MM-DD'),
    refund_reason: '',
    deduction_reason: ''
  })
  refundDialogVisible.value = true
}

const calculateRefund = () => {
  refundForm.refund_amount = refundForm.amount - refundForm.deduction
}

const handleRefund = () => {
  try {
    businessService.refundDeposit(refundForm.id, { ...refundForm })
    ElMessage.success('押金退还成功')
    refundDialogVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const viewDetail = (deposit) => {
  selectedDeposit.value = deposit
  detailVisible.value = true
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-tip {
  display: block;
  margin-top: 5px;
  color: #909399;
  font-size: 12px;
}

.refund-info {
  margin-top: 20px;
}

.refund-info h4 {
  margin: 0 0 15px 0;
  color: #303133;
}
</style>
