<template>
  <div class="page-shell">
    <PageHeader
      eyebrow="Billing"
      title="账单管理"
      subtitle="统一查看账单状态，支持批量生成、支付确认和删除。"
    >
      <template #actions>
        <el-button type="primary" @click="generateBills">
          <el-icon><Plus /></el-icon>
          批量生成账单
        </el-button>
      </template>
    </PageHeader>

    <FilterBar>
      <el-form :inline="true" :model="searchForm" class="list-filter-form">
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部状态" clearable>
            <el-option label="待支付" value="pending" />
            <el-option label="已支付" value="paid" />
            <el-option label="逾期" value="overdue" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #actions>
        <div class="toolbar-actions">
          <ActiveFiltersInline :items="activeFilterChips" @remove="clearFilter" />
          <el-button @click="searchForm.status = ''">重置</el-button>
          <el-button type="success" plain :disabled="selectedBills.length === 0" @click="batchMarkAsPaid">
            批量确认支付 ({{ selectedBills.length }})
          </el-button>
          <el-button type="danger" plain :disabled="selectedBills.length === 0" @click="batchDelete">
            批量删除 ({{ selectedBills.length }})
          </el-button>
        </div>
      </template>
    </FilterBar>

    <SectionCard title="账单列表" :subtitle="`共 ${filteredBills.length} 条账单`">
      <div class="page-data-table">
        <el-table :data="filteredBills" @selection-change="handleSelectionChange">
          <el-table-column type="selection" width="48" />
          <el-table-column label="账单类型" min-width="120">
            <template #default="scope">
              {{ getBillTypeText(scope.row.bill_type) }}
            </template>
          </el-table-column>
          <el-table-column label="金额" min-width="120">
            <template #default="scope">
              <span class="amount-text amount-text--emphasis">¥{{ formatCurrency(scope.row.amount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="due_date" label="应缴日期" min-width="120" />
          <el-table-column prop="paid_date" label="支付日期" min-width="120" />
          <el-table-column label="状态" min-width="110">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)" class="status-chip">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="scope">
              <div class="inline-actions">
                <el-button
                  v-if="scope.row.status !== 'paid'"
                  size="small"
                  type="success"
                  plain
                  @click="markAsPaid(scope.row)"
                >
                  确认支付
                </el-button>
                <el-button size="small" type="danger" plain @click="handleDelete(scope.row)">删除</el-button>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </SectionCard>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import SectionCard from '@/components/SectionCard.vue'
import ActiveFiltersInline from '@/components/ActiveFiltersInline.vue'
import db from '@/utils/localDB'
import businessService from '@/services/businessService'
import { formatCurrency } from '@/utils/formatters'

const bills = ref([])
const searchForm = reactive({ status: '' })
const selectedBills = ref([])

const filteredBills = computed(() => {
  if (!searchForm.status) return bills.value
  return bills.value.filter((bill) => bill.status === searchForm.status)
})

const activeFilterChips = computed(() => {
  if (!searchForm.status) return []
  return [{ key: 'status', label: `状态：${getStatusText(searchForm.status)}` }]
})

onMounted(() => {
  loadData()
  checkOverdueBills()
})

const loadData = () => {
  bills.value = db.getTable('bills')
}

const checkOverdueBills = () => {
  const allBills = db.getTable('bills')
  const settings = JSON.parse(localStorage.getItem('system_settings') || '{"bill_overdue_days": 3}')
  const today = dayjs().format('YYYY-MM-DD')

  let updated = false
  allBills.forEach((bill) => {
    if (bill.status === 'pending' && bill.due_date < today) {
      const overdueDays = dayjs(today).diff(dayjs(bill.due_date), 'day')
      if (overdueDays >= settings.bill_overdue_days && bill.status !== 'overdue') {
        db.update('bills', bill.id, { status: 'overdue', settlement_status: 'overdue' })
        updated = true
      }
    }
  })

  if (updated) loadData()
}

const getBillTypeText = (type) => ({ rent: '租金', utility: '水电费', property: '物业费', maintenance: '维修费' }[type] || type)
const getStatusType = (status) => ({ pending: 'warning', paid: 'success', overdue: 'danger' }[status] || 'info')
const getStatusText = (status) => ({ pending: '待支付', paid: '已支付', overdue: '逾期' }[status] || status)

const clearFilter = (key) => {
  searchForm[key] = ''
}

const generateBills = () => {
  const contracts = db.query('contracts', { status: 'active' })
  let successCount = 0
  let skippedCount = 0
  contracts.forEach((contract) => {
    try {
      businessService.generateRentBill(contract.id, dayjs().format('YYYY-MM-DD'))
      successCount += 1
    } catch {
      skippedCount += 1
    }
  })
  ElMessage.success(`成功生成 ${successCount} 条账单，跳过 ${skippedCount} 条重复账单`)
  loadData()
}

const markAsPaid = (bill) => {
  try {
    businessService.markBillAsPaid(bill.id)
    ElMessage.success('已标记为支付')
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除吗？', '提示', { type: 'warning' })
    businessService.deleteBill(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch {
    // ignore
  }
}

const handleSelectionChange = (selection) => {
  selectedBills.value = selection
}

const batchMarkAsPaid = async () => {
  try {
    await ElMessageBox.confirm(`确定要将选中的 ${selectedBills.value.length} 条账单标记为已支付吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    selectedBills.value.forEach((bill) => {
      businessService.markBillAsPaid(bill.id)
    })

    ElMessage.success('批量操作成功')
    selectedBills.value = []
    loadData()
  } catch {
    // ignore
  }
}

const batchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedBills.value.length} 条账单吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    selectedBills.value.forEach((bill) => {
      businessService.deleteBill(bill.id)
    })

    ElMessage.success('批量删除成功')
    selectedBills.value = []
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
