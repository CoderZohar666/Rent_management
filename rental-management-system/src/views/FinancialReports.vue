<template>
  <div class="page-shell">
    <PageHeader
      eyebrow="Reports"
      title="财务报表"
      subtitle="从城市、项目和整体维度查看收入表现、应收情况与出租率。"
    />

    <SectionCard title="报表中心" subtitle="支持城市、项目和综合维度分析">
      <el-tabs v-model="activeTab" class="report-tabs">
        <el-tab-pane label="城市维度统计" name="city">
          <div class="page-shell">
            <FilterBar>
              <el-form :inline="true" class="list-filter-form">
                <el-form-item label="时间范围">
                  <el-date-picker
                    v-model="dateRange"
                    type="daterange"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    value-format="YYYY-MM-DD"
                    @change="loadCityStats"
                  />
                </el-form-item>
              </el-form>
              <template #actions>
                <div class="toolbar-actions">
                  <ActiveFiltersInline :items="activeFilterChips" @remove="clearFilter" />
                  <el-button type="success" plain @click="exportToExcel('city')">
                    <el-icon><Download /></el-icon>
                    导出 Excel
                  </el-button>
                  <el-button type="primary" @click="exportCityReport">
                    <el-icon><Download /></el-icon>
                    导出 JSON
                  </el-button>
                </div>
              </template>
            </FilterBar>

            <div class="page-data-table">
              <el-table :data="cityStats">
                <el-table-column prop="city_name" label="城市" min-width="120" />
                <el-table-column label="总收入" min-width="140">
                  <template #default="scope">
                    <span class="amount-text">¥{{ formatCurrency(scope.row.total_income) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="已收收入" min-width="140">
                  <template #default="scope">
                    <span class="amount-text">¥{{ formatCurrency(scope.row.paid_income) }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="待收收入" min-width="140">
                  <template #default="scope">
                    <span class="amount-text amount-text--emphasis">¥{{ formatCurrency(scope.row.pending_income) }}</span>
                  </template>
                </el-table-column>
                <el-table-column prop="total_bills" label="账单总数" min-width="100" />
                <el-table-column prop="paid_bills" label="已支付账单" min-width="120" />
                <el-table-column label="出租率" min-width="100">
                  <template #default="scope">
                    {{ formatPercent(scope.row.occupancy_rate) }}
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <div ref="cityChartRef" class="report-chart"></div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="项目维度统计" name="project">
          <div class="page-data-table">
            <el-table :data="projectStats">
              <el-table-column prop="project_name" label="项目名称" min-width="160" />
              <el-table-column prop="city_name" label="所属城市" min-width="120" />
              <el-table-column label="总收入" min-width="140">
                <template #default="scope">
                  <span class="amount-text">¥{{ formatCurrency(scope.row.total_income) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="已收收入" min-width="140">
                <template #default="scope">
                  <span class="amount-text">¥{{ formatCurrency(scope.row.paid_income) }}</span>
                </template>
              </el-table-column>
              <el-table-column label="出租率" min-width="100">
                <template #default="scope">
                  {{ formatPercent(scope.row.occupancy_rate) }}
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="综合报表" name="summary">
          <div class="page-shell">
            <div class="page-grid grid-three-columns">
              <StatCard label="总收入" :value="`¥${formatCurrency(summary.total_income)}`" tone="primary" hint="全部账单合计">
                <template #icon>
                  <el-icon><Money /></el-icon>
                </template>
              </StatCard>
              <StatCard label="已收收入" :value="`¥${formatCurrency(summary.paid_income)}`" tone="success" hint="已完成支付">
                <template #icon>
                  <el-icon><CircleCheck /></el-icon>
                </template>
              </StatCard>
              <StatCard label="待收收入" :value="`¥${formatCurrency(summary.pending_income)}`" tone="warning" hint="待跟进应收款">
                <template #icon>
                  <el-icon><Wallet /></el-icon>
                </template>
              </StatCard>
            </div>
            <div ref="summaryChartRef" class="report-chart"></div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </SectionCard>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Download, Money, CircleCheck, Wallet } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'
import ExcelJS from 'exceljs'
import PageHeader from '@/components/PageHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import SectionCard from '@/components/SectionCard.vue'
import StatCard from '@/components/StatCard.vue'
import ActiveFiltersInline from '@/components/ActiveFiltersInline.vue'
import db from '@/utils/localDB'
import { formatCurrency, formatPercent } from '@/utils/formatters'
import { getChartBaseOption } from '@/utils/chartTheme'

const activeTab = ref('city')
const cityChartRef = ref(null)
const summaryChartRef = ref(null)
const dateRange = ref([])
const cityStats = ref([])
const projectStats = ref([])
const summary = ref({
  total_income: 0,
  paid_income: 0,
  pending_income: 0
})

const activeFilterChips = computed(() => {
  if (!dateRange.value || dateRange.value.length !== 2) return []
  return [{ key: 'dateRange', label: `时间：${dateRange.value[0]} 至 ${dateRange.value[1]}` }]
})

let cityChart
let summaryChart

const handleResize = () => {
  cityChart?.resize()
  summaryChart?.resize()
}

onMounted(() => {
  loadCityStats()
  loadProjectStats()
  loadSummary()
  initCharts()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  cityChart?.dispose()
  summaryChart?.dispose()
})

const clearFilter = () => {
  dateRange.value = []
  loadCityStats()
}

const loadCityStats = () => {
  const cities = db.getTable('cities')
  const projects = db.getTable('projects')
  const rooms = db.getTable('rooms')
  let bills = db.getTable('bills')

  if (dateRange.value && dateRange.value.length === 2) {
    const [startDate, endDate] = dateRange.value
    bills = bills.filter((bill) => bill.due_date >= startDate && bill.due_date <= endDate)
  }

  cityStats.value = cities.map((city) => {
    const cityProjects = projects.filter((project) => project.city_id === city.id)
    const projectIds = cityProjects.map((project) => project.id)
    const cityBills = bills.filter((bill) => projectIds.includes(bill.project_id))
    const total_income = cityBills.reduce((sum, bill) => sum + bill.amount, 0)
    const paid_income = cityBills.filter((bill) => bill.status === 'paid').reduce((sum, bill) => sum + bill.amount, 0)
    const pending_income = cityBills.filter((bill) => bill.status !== 'paid').reduce((sum, bill) => sum + bill.amount, 0)
    const cityRooms = rooms.filter((room) => projectIds.includes(room.project_id))
    const rentedRooms = cityRooms.filter((room) => room.status === 'rented').length
    const occupancy_rate = cityRooms.length > 0 ? Math.round((rentedRooms / cityRooms.length) * 100) : 0

    return {
      city_name: city.name,
      total_income,
      paid_income,
      pending_income,
      total_bills: cityBills.length,
      paid_bills: cityBills.filter((bill) => bill.status === 'paid').length,
      occupancy_rate
    }
  })

  initCityChart()
}

const loadProjectStats = () => {
  const projects = db.getTable('projects')
  const cities = db.getTable('cities')
  const rooms = db.getTable('rooms')
  const bills = db.getTable('bills')

  projectStats.value = projects.map((project) => {
    const city = cities.find((item) => item.id === project.city_id)
    const projectBills = bills.filter((bill) => bill.project_id === project.id)
    const total_income = projectBills.reduce((sum, bill) => sum + bill.amount, 0)
    const paid_income = projectBills.filter((bill) => bill.status === 'paid').reduce((sum, bill) => sum + bill.amount, 0)
    const projectRooms = rooms.filter((room) => room.project_id === project.id)
    const rentedRooms = projectRooms.filter((room) => room.status === 'rented').length
    const occupancy_rate = projectRooms.length > 0 ? Math.round((rentedRooms / projectRooms.length) * 100) : 0

    return {
      project_name: project.name,
      city_name: city?.name || '-',
      total_income,
      paid_income,
      occupancy_rate
    }
  })
}

const loadSummary = () => {
  const bills = db.getTable('bills')
  summary.value = {
    total_income: bills.reduce((sum, bill) => sum + bill.amount, 0),
    paid_income: bills.filter((bill) => bill.status === 'paid').reduce((sum, bill) => sum + bill.amount, 0),
    pending_income: bills.filter((bill) => bill.status !== 'paid').reduce((sum, bill) => sum + bill.amount, 0)
  }
}

const initCharts = () => {
  initCityChart()
  initSummaryChart()
}

const initCityChart = () => {
  if (!cityChartRef.value) return

  cityChart?.dispose()
  cityChart = echarts.init(cityChartRef.value)
  cityChart.setOption({
    ...getChartBaseOption(),
    tooltip: {
      ...getChartBaseOption().tooltip,
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      ...getChartBaseOption().legend,
      data: ['总收入', '已收收入', '待收收入']
    },
    xAxis: {
      ...getChartBaseOption().xAxis,
      type: 'category',
      data: cityStats.value.map((item) => item.city_name)
    },
    yAxis: {
      ...getChartBaseOption().yAxis,
      type: 'value',
      axisLabel: {
        color: '#64748B',
        formatter: (value) => `¥${formatCurrency(value)}`
      }
    },
    series: [
      { name: '总收入', type: 'bar', barMaxWidth: 20, data: cityStats.value.map((item) => item.total_income), itemStyle: { borderRadius: [8, 8, 0, 0] } },
      { name: '已收收入', type: 'bar', barMaxWidth: 20, data: cityStats.value.map((item) => item.paid_income), itemStyle: { borderRadius: [8, 8, 0, 0], color: '#12B981' } },
      { name: '待收收入', type: 'bar', barMaxWidth: 20, data: cityStats.value.map((item) => item.pending_income), itemStyle: { borderRadius: [8, 8, 0, 0], color: '#F59E0B' } }
    ]
  })
}

const initSummaryChart = () => {
  if (!summaryChartRef.value) return

  summaryChart?.dispose()
  summaryChart = echarts.init(summaryChartRef.value)
  summaryChart.setOption({
    ...getChartBaseOption(),
    tooltip: {
      ...getChartBaseOption().tooltip,
      trigger: 'item',
      formatter: (params) => `${params.name}: ¥${formatCurrency(params.value)} (${params.percent}%)`
    },
    legend: {
      ...getChartBaseOption().legend,
      orient: 'vertical',
      left: 'left',
      top: 'middle'
    },
    series: [
      {
        name: '收入构成',
        type: 'pie',
        radius: ['44%', '72%'],
        center: ['62%', '50%'],
        label: {
          color: '#475569'
        },
        itemStyle: {
          borderColor: '#ffffff',
          borderWidth: 4
        },
        data: [
          { value: summary.value.paid_income, name: '已收收入' },
          { value: summary.value.pending_income, name: '待收收入' }
        ]
      }
    ]
  })
}

const exportCityReport = () => {
  const data = cityStats.value.map((item) => ({
    城市: item.city_name,
    总收入: item.total_income,
    已收收入: item.paid_income,
    待收收入: item.pending_income,
    出租率: `${item.occupancy_rate}%`
  }))

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '城市财务报表.json'
  link.click()
  URL.revokeObjectURL(url)
}

const exportToExcel = async (type) => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('财务报表')

  if (type === 'city') {
    worksheet.columns = [
      { header: '城市', key: 'city_name', width: 20 },
      { header: '总收入', key: 'total_income', width: 15 },
      { header: '已收收入', key: 'paid_income', width: 15 },
      { header: '待收收入', key: 'pending_income', width: 15 },
      { header: '总账单数', key: 'total_bills', width: 12 },
      { header: '已支付账单', key: 'paid_bills', width: 12 },
      { header: '出租率', key: 'occupancy_rate', width: 10 }
    ]

    cityStats.value.forEach((stat) => {
      worksheet.addRow({
        city_name: stat.city_name,
        total_income: stat.total_income,
        paid_income: stat.paid_income,
        pending_income: stat.pending_income,
        total_bills: stat.total_bills,
        paid_bills: stat.paid_bills,
        occupancy_rate: `${stat.occupancy_rate}%`
      })
    })
  }

  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' }
  }
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }

  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `财务报表_${dayjs().format('YYYY-MM-DD')}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
</script>

<style scoped>
.report-tabs :deep(.el-tabs__header) {
  margin-bottom: 24px;
}

.report-chart {
  height: 400px;
}

.list-filter-form :deep(.el-form-item) {
  margin-bottom: 0;
}
</style>
