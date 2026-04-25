<template>
  <div class="page-shell dashboard-page">
    <PageHeader
      eyebrow="Overview"
      title="数据看板"
      subtitle="聚合出租率、收入、风险合同与逾期账单，帮助你更快判断当前运营状态。"
    />

    <section class="page-grid dashboard-metrics grid-three-columns">
      <StatCard label="总房间数" :value="stats.totalRooms" hint="全部可管理房间" tone="primary">
        <template #icon>
          <el-icon><House /></el-icon>
        </template>
      </StatCard>
      <StatCard label="出租率" :value="`${stats.occupancyRate}%`" hint="已租房间占比" tone="success">
        <template #icon>
          <el-icon><CircleCheck /></el-icon>
        </template>
      </StatCard>
      <StatCard label="本月收入" :value="`¥${formatCurrency(stats.monthIncome)}`" hint="已支付账单合计" tone="warning">
        <template #icon>
          <el-icon><Money /></el-icon>
        </template>
      </StatCard>
      <StatCard label="待处理工单" :value="stats.pendingMaintenance" hint="需要跟进的维修事项" tone="danger">
        <template #icon>
          <el-icon><Tools /></el-icon>
        </template>
      </StatCard>
    </section>

    <section class="page-grid grid-two-columns">
      <SectionCard title="各城市房间分布" subtitle="对比不同城市的总房间数与已出租数量">
        <div ref="cityChartRef" class="chart-block"></div>
      </SectionCard>
      <SectionCard title="月度收入趋势" subtitle="观察最近 6 个月实际到账金额变化">
        <div ref="incomeChartRef" class="chart-block"></div>
      </SectionCard>
    </section>

    <section class="page-grid grid-two-columns">
      <SectionCard title="即将到期合同" subtitle="优先处理 60 天内到期的合同">
        <div v-if="expiringContracts.length" class="risk-list">
          <article v-for="item in expiringContracts" :key="`${item.room_number}-${item.end_date}`" class="risk-item">
            <div class="risk-item__main">
              <div class="risk-item__title">{{ item.room_number }}</div>
              <div class="risk-item__meta">{{ item.tenant_name }} · 到期日 {{ item.end_date }}</div>
            </div>
            <el-tag class="status-chip" :type="item.remaining_days <= 30 ? 'danger' : 'warning'">
              剩余 {{ item.remaining_days }} 天
            </el-tag>
          </article>
        </div>
        <el-empty v-else class="app-empty-state" description="暂无即将到期合同" />
      </SectionCard>

      <SectionCard title="逾期账单" subtitle="集中关注需要催缴的账单">
        <div v-if="overdueBills.length" class="risk-list">
          <article v-for="item in overdueBills" :key="item.id" class="risk-item risk-item--bill">
            <div class="risk-item__main">
              <div class="risk-item__title">{{ item.bill_type }}</div>
              <div class="risk-item__meta">{{ item.city_name }} · 应缴日 {{ item.due_date }}</div>
            </div>
            <div class="risk-item__amount amount-text amount-text--emphasis">¥{{ formatCurrency(item.amount) }}</div>
          </article>
        </div>
        <el-empty v-else class="app-empty-state" description="暂无逾期账单" />
      </SectionCard>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { House, CircleCheck, Money, Tools } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import StatCard from '@/components/StatCard.vue'
import db from '@/utils/localDB'
import dayjs from 'dayjs'
import { formatCurrency } from '@/utils/formatters'
import { getChartBaseOption } from '@/utils/chartTheme'

const cityChartRef = ref(null)
const incomeChartRef = ref(null)
let cityChart
let incomeChart

const stats = ref({
  totalRooms: 0,
  occupancyRate: 0,
  monthIncome: 0,
  pendingMaintenance: 0
})

const expiringContracts = ref([])
const overdueBills = ref([])

const handleResize = () => {
  cityChart?.resize()
  incomeChart?.resize()
}

onMounted(() => {
  loadStats()
  loadExpiringContracts()
  loadOverdueBills()
  initCharts()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
  cityChart?.dispose()
  incomeChart?.dispose()
})

const loadStats = () => {
  const rooms = db.getTable('rooms')
  const bills = db.getTable('bills')
  const maintenance = db.getTable('maintenance_orders')

  const totalRooms = rooms.length
  const rentedRooms = rooms.filter((room) => room.status === 'rented').length
  const occupancyRate = totalRooms > 0 ? Math.round((rentedRooms / totalRooms) * 100) : 0
  const currentMonth = dayjs().format('YYYY-MM')
  const monthIncome = bills
    .filter((bill) => bill.status === 'paid' && bill.due_date.startsWith(currentMonth))
    .reduce((sum, bill) => sum + bill.amount, 0)
  const pendingMaintenance = maintenance.filter((item) => item.status === 'pending').length

  stats.value = {
    totalRooms,
    occupancyRate,
    monthIncome,
    pendingMaintenance
  }
}

const loadExpiringContracts = () => {
  const contracts = db.getTable('contracts')
  const rooms = db.getTable('rooms')
  const tenants = db.getTable('tenants')
  const today = dayjs()

  expiringContracts.value = contracts
    .filter((contract) => {
      const diff = dayjs(contract.end_date).diff(today, 'day')
      return diff >= 0 && diff <= 60
    })
    .map((contract) => {
      const room = rooms.find((item) => item.id === contract.room_id)
      const tenant = tenants.find((item) => item.id === contract.tenant_id)
      return {
        room_number: room?.room_number || '-',
        tenant_name: tenant?.name || '-',
        end_date: contract.end_date,
        remaining_days: dayjs(contract.end_date).diff(today, 'day')
      }
    })
    .sort((a, b) => a.remaining_days - b.remaining_days)
    .slice(0, 5)
}

const loadOverdueBills = () => {
  const bills = db.getTable('bills')
  const cities = db.getTable('cities')
  const today = dayjs().format('YYYY-MM-DD')

  overdueBills.value = bills
    .filter((bill) => bill.status === 'pending' && bill.due_date < today)
    .map((bill) => {
      const city = cities.find((item) => item.id === bill.city_id)
      return {
        ...bill,
        city_name: city?.name || '-',
        bill_type:
          bill.bill_type === 'rent'
            ? '租金'
            : bill.bill_type === 'utility'
              ? '水电费'
              : bill.bill_type === 'property'
                ? '物业费'
                : '维修费'
      }
    })
    .slice(0, 5)
}

const initCharts = () => {
  initCityChart()
  initIncomeChart()
}

const initCityChart = () => {
  if (!cityChartRef.value) return

  const cities = db.getTable('cities')
  const projects = db.getTable('projects')
  const rooms = db.getTable('rooms')
  const cityData = cities.map((city) => {
    const cityProjects = projects.filter((project) => project.city_id === city.id)
    const projectIds = cityProjects.map((project) => project.id)
    const totalRooms = rooms.filter((room) => projectIds.includes(room.project_id)).length
    const rentedRooms = rooms.filter((room) => projectIds.includes(room.project_id) && room.status === 'rented').length
    return {
      name: city.name,
      value: totalRooms,
      rented: rentedRooms
    }
  })

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
      data: ['总房间数', '已出租']
    },
    xAxis: {
      ...getChartBaseOption().xAxis,
      type: 'category',
      data: cityData.map((item) => item.name)
    },
    yAxis: {
      ...getChartBaseOption().yAxis,
      type: 'value'
    },
    series: [
      {
        name: '总房间数',
        type: 'bar',
        data: cityData.map((item) => item.value),
        barMaxWidth: 22,
        itemStyle: {
          borderRadius: [8, 8, 0, 0]
        }
      },
      {
        name: '已出租',
        type: 'bar',
        data: cityData.map((item) => item.rented),
        barMaxWidth: 22,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: '#12B981'
        }
      }
    ]
  })
}

const initIncomeChart = () => {
  if (!incomeChartRef.value) return

  const bills = db.getTable('bills')
  const months = []
  const incomeData = []

  for (let i = 5; i >= 0; i -= 1) {
    const month = dayjs().subtract(i, 'month')
    const monthStr = month.format('YYYY-MM')
    months.push(month.format('MM月'))
    const monthIncome = bills
      .filter((bill) => bill.status === 'paid' && bill.due_date.startsWith(monthStr))
      .reduce((sum, bill) => sum + bill.amount, 0)
    incomeData.push(monthIncome)
  }

  incomeChart?.dispose()
  incomeChart = echarts.init(incomeChartRef.value)
  incomeChart.setOption({
    ...getChartBaseOption(),
    tooltip: {
      ...getChartBaseOption().tooltip,
      trigger: 'axis',
      formatter: (params) => `${params[0].axisValue}: ¥${formatCurrency(params[0].value)}`
    },
    legend: {
      ...getChartBaseOption().legend,
      show: false
    },
    xAxis: {
      ...getChartBaseOption().xAxis,
      type: 'category',
      data: months
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
      {
        name: '收入',
        type: 'line',
        data: incomeData,
        smooth: true,
        symbolSize: 8,
        lineStyle: {
          width: 3
        },
        itemStyle: {
          color: '#F59E0B'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(245, 158, 11, 0.26)' },
              { offset: 1, color: 'rgba(245, 158, 11, 0.03)' }
            ]
          }
        }
      }
    ]
  })
}
</script>

<style scoped>
.dashboard-metrics {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.chart-block {
  height: 320px;
}

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.risk-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 14px;
  background: var(--app-color-surface-soft);
}

.risk-item__main {
  min-width: 0;
}

.risk-item__title {
  font-size: 16px;
  font-weight: 700;
  color: var(--app-color-text);
}

.risk-item__meta {
  margin-top: 6px;
  color: var(--app-color-text-secondary);
  font-size: 13px;
}

.risk-item__amount {
  font-size: 20px;
}

@media (max-width: 1279px) {
  .dashboard-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 767px) {
  .dashboard-metrics {
    grid-template-columns: 1fr;
  }

  .risk-item {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
