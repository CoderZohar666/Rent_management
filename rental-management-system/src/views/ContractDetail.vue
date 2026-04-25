<template>
  <div class="page-shell contract-detail-page">
    <PageHeader
      backable
      eyebrow="Contract"
      title="合同详情"
      subtitle="查看合同状态、房间与租户信息，并处理账单、续租和退租结算。"
      @back="goBack"
    >
      <template #actions>
        <el-tag v-if="contract" :type="getStatusType(contract)" class="status-chip status-chip--large">
          {{ getStatusText(contract) }}
        </el-tag>
      </template>
    </PageHeader>

    <template v-if="contract">
      <div class="page-grid grid-three-columns">
        <StatCard label="月租金" :value="`¥${formatCurrency(contract.monthly_rent)}`" tone="warning" hint="当前合同约定租金">
          <template #icon>
            <el-icon><Money /></el-icon>
          </template>
        </StatCard>
        <StatCard label="押金" :value="`¥${formatCurrency(contract.deposit)}`" tone="primary" hint="签约时收取押金">
          <template #icon>
            <el-icon><Wallet /></el-icon>
          </template>
        </StatCard>
        <StatCard label="合同总金额" :value="`¥${formatCurrency(totalAmount)}`" tone="danger" hint="按租期估算合同总额">
          <template #icon>
            <el-icon><PieChart /></el-icon>
          </template>
        </StatCard>
      </div>

      <SectionCard title="合同摘要" subtitle="当前合同执行状态与时间信息">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="合同编号">{{ contract.id }}</el-descriptions-item>
          <el-descriptions-item label="签订日期">{{ contract.created_at }}</el-descriptions-item>
          <el-descriptions-item label="开始日期">{{ contract.start_date }}</el-descriptions-item>
          <el-descriptions-item label="结束日期">{{ contract.end_date }}</el-descriptions-item>
          <el-descriptions-item label="合同状态">
            <el-tag :type="getStatusType(contract)" class="status-chip">{{ getStatusText(contract) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="剩余天数">
            <el-tag :type="getRemainingDaysType(remainingDays)" class="status-chip">{{ remainingDays }} 天</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="退租结算">
            <el-tag :type="getCheckoutStatusType(contract.checkout_status)" class="status-chip">
              {{ getCheckoutStatusText(contract.checkout_status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="终止原因">{{ contract.termination_reason || '无' }}</el-descriptions-item>
        </el-descriptions>
      </SectionCard>

      <div class="page-grid grid-two-columns">
        <SectionCard title="房间信息" subtitle="当前合同绑定房间">
          <el-descriptions v-if="room" :column="1" border>
            <el-descriptions-item label="房间号">{{ room.room_number }}</el-descriptions-item>
            <el-descriptions-item label="楼层">{{ room.floor }}层</el-descriptions-item>
            <el-descriptions-item label="面积">{{ formatDecimal(room.area, 1) }}㎡</el-descriptions-item>
            <el-descriptions-item label="月租金">¥{{ formatCurrency(contract.monthly_rent) }}</el-descriptions-item>
            <el-descriptions-item label="配套设施">{{ room.facilities || '无' }}</el-descriptions-item>
          </el-descriptions>
        </SectionCard>
        <SectionCard title="租户信息" subtitle="签约租户基础资料">
          <el-descriptions v-if="tenant" :column="1" border>
            <el-descriptions-item label="姓名">{{ tenant.name }}</el-descriptions-item>
            <el-descriptions-item label="电话">{{ tenant.phone }}</el-descriptions-item>
            <el-descriptions-item label="身份证号">{{ tenant.id_card }}</el-descriptions-item>
            <el-descriptions-item label="紧急联系人电话">{{ tenant.emergency_contact }}</el-descriptions-item>
          </el-descriptions>
        </SectionCard>
      </div>

      <SectionCard title="账单记录" subtitle="查看当前合同对应账单，并支持立即生成账单">
        <template #actions>
          <el-button type="primary" @click="generateBill">
            <el-icon><Plus /></el-icon>
            生成账单
          </el-button>
        </template>
        <div class="page-data-table">
          <el-table :data="bills">
            <el-table-column label="账单类型" min-width="120">
              <template #default="scope">
                {{ getBillTypeText(scope.row.bill_type) }}
              </template>
            </el-table-column>
            <el-table-column label="金额" min-width="120">
              <template #default="scope">
                <span class="amount-text">¥{{ formatCurrency(scope.row.amount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="due_date" label="应缴日期" min-width="120" />
            <el-table-column prop="paid_date" label="支付日期" min-width="120" />
            <el-table-column label="状态" min-width="110">
              <template #default="scope">
                <el-tag :type="getBillStatusType(scope.row.status)" class="status-chip">
                  {{ getBillStatusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="scope">
                <el-button
                  v-if="scope.row.status !== 'paid'"
                  size="small"
                  type="success"
                  plain
                  @click="markAsPaid(scope.row)"
                >
                  确认支付
                </el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </SectionCard>

      <SectionCard title="维修记录" subtitle="当前房间的历史维修事项">
        <div class="page-data-table">
          <el-table :data="maintenanceRecords">
            <el-table-column prop="description" label="问题描述" min-width="220" />
            <el-table-column label="状态" min-width="110">
              <template #default="scope">
                <el-tag :type="getMaintenanceStatusType(scope.row.status)" class="status-chip">
                  {{ getMaintenanceStatusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="费用" min-width="120">
              <template #default="scope">
                <span class="amount-text">¥{{ formatCurrency(scope.row.cost) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="created_at" label="创建时间" min-width="160" />
          </el-table>
        </div>
      </SectionCard>

      <SectionCard title="合同操作" subtitle="处理续租、退租和返回列表">
        <div class="toolbar-actions">
          <el-button v-if="contract.status === 'active'" type="primary" @click="handleRenew">续租</el-button>
          <el-button v-if="contract.status === 'active' && contract.checkout_status !== 'pending'" type="warning" @click="handleStartCheckout">
            发起退租
          </el-button>
          <el-button v-if="contract.checkout_status === 'pending'" type="danger" @click="handleSettleCheckout">
            完成退租
          </el-button>
          <el-button @click="goBack">返回列表</el-button>
        </div>
      </SectionCard>
    </template>

    <el-dialog v-model="renewDialogVisible" title="续租" width="620px" class="app-dialog">
      <el-form :model="renewForm" label-width="96px" class="dialog-form">
        <el-form-item label="新开始日期">
          <el-date-picker v-model="renewForm.start_date" type="date" value-format="YYYY-MM-DD" class="control-full-width" />
        </el-form-item>
        <el-form-item label="新结束日期">
          <el-date-picker v-model="renewForm.end_date" type="date" value-format="YYYY-MM-DD" class="control-full-width" />
        </el-form-item>
        <el-form-item label="新月租金" class="form-span-2">
          <el-input-number v-model="renewForm.monthly_rent" :min="0" controls-position="right" class="control-full-width" />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="toolbar-actions">
          <el-button @click="renewDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmRenew">确认续租</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Plus, Money, Wallet, PieChart } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import StatCard from '@/components/StatCard.vue'
import db from '@/utils/localDB'
import businessService from '@/services/businessService'
import { formatCurrency, formatDecimal } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const contract = ref(null)
const room = ref(null)
const tenant = ref(null)
const bills = ref([])
const maintenanceRecords = ref([])
const renewDialogVisible = ref(false)

const renewForm = ref({
  start_date: '',
  end_date: '',
  monthly_rent: 0
})

const remainingDays = computed(() => {
  if (!contract.value) return 0
  return dayjs(contract.value.end_date).diff(dayjs(), 'day')
})

const totalAmount = computed(() => {
  if (!contract.value) return 0
  const months = dayjs(contract.value.end_date).diff(dayjs(contract.value.start_date), 'month')
  return contract.value.monthly_rent * months
})

onMounted(() => {
  loadContractDetail()
})

const loadContractDetail = () => {
  const contractId = route.params.id
  contract.value = db.findById('contracts', contractId)

  if (contract.value) {
    room.value = db.findById('rooms', contract.value.room_id)
    tenant.value = db.findById('tenants', contract.value.tenant_id)
    bills.value = db.query('bills', { contract_id: contractId })
    maintenanceRecords.value = db.query('maintenance_orders', { room_id: contract.value.room_id })
  }
}

const getStatusType = (row) => ({ active: 'success', expiring: 'warning', terminated: 'danger', settled: 'info', draft: 'info' }[businessService.getContractDisplayStatus(row)] || 'info')
const getStatusText = (row) => ({ active: '执行中', expiring: '即将到期', terminated: '已终止', settled: '已结清', draft: '草稿' }[businessService.getContractDisplayStatus(row)] || row.status)
const getCheckoutStatusType = (status) => ({ none: 'info', pending: 'warning', completed: 'success', renewed: 'success' }[status || 'none'] || 'info')
const getCheckoutStatusText = (status) => ({ none: '未发起', pending: '待结算', completed: '已完成', renewed: '已续租' }[status || 'none'] || status)

const getRemainingDaysType = (days) => {
  if (days < 0) return 'danger'
  if (days <= 30) return 'warning'
  return 'success'
}

const getBillTypeText = (type) => ({ rent: '租金', utility: '水电费', property: '物业费', maintenance: '维修费' }[type] || type)
const getBillStatusType = (status) => ({ pending: 'warning', paid: 'success', overdue: 'danger' }[status] || 'info')
const getBillStatusText = (status) => ({ pending: '待支付', paid: '已支付', overdue: '逾期' }[status] || status)
const getMaintenanceStatusType = (status) => ({ pending: 'warning', processing: 'primary', completed: 'success' }[status] || 'info')
const getMaintenanceStatusText = (status) => ({ pending: '待处理', processing: '处理中', completed: '已完成' }[status] || status)

const generateBill = () => {
  try {
    businessService.generateRentBill(contract.value.id, dayjs().format('YYYY-MM-DD'))
    ElMessage.success('账单生成成功')
    loadContractDetail()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const markAsPaid = (bill) => {
  try {
    businessService.markBillAsPaid(bill.id)
    ElMessage.success('已标记为支付')
    loadContractDetail()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const handleRenew = () => {
  renewForm.value = {
    start_date: dayjs(contract.value.end_date).add(1, 'day').format('YYYY-MM-DD'),
    end_date: dayjs(contract.value.end_date).add(1, 'year').format('YYYY-MM-DD'),
    monthly_rent: contract.value.monthly_rent
  }
  renewDialogVisible.value = true
}

const confirmRenew = () => {
  try {
    const renewed = businessService.renewContract(contract.value.id, renewForm.value)
    ElMessage.success('续租成功')
    renewDialogVisible.value = false
    router.push(`/contracts/${renewed.id}`)
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const handleStartCheckout = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请填写退租原因（可留空）', '发起退租', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: contract.value.termination_reason || ''
    })
    businessService.startCheckout(contract.value.id, value || '')
    ElMessage.success('已发起退租结算')
    loadContractDetail()
  } catch {
    // ignore
  }
}

const handleSettleCheckout = async () => {
  try {
    await ElMessageBox.confirm('完成退租前，请确认尾款已结清且押金已退还。确定继续吗？', '完成退租', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    businessService.settleCheckout(contract.value.id)
    ElMessage.success('退租已完成')
    loadContractDetail()
  } catch (error) {
    if (error?.message) {
      ElMessage.error(error.message)
    }
  }
}

const goBack = () => {
  router.push('/contracts')
}
</script>

<style scoped>
.status-chip--large {
  font-size: 14px;
}
</style>
