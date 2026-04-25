<template>
  <div class="notification-center">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>通知提醒中心</span>
          <el-badge :value="totalNotifications" :hidden="totalNotifications === 0">
            <el-button @click="markAllRead">全部标记为已读</el-button>
          </el-badge>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane :label="`全部 (${notifications.length})`" name="all">
          <el-timeline>
            <el-timeline-item
              v-for="notification in notifications"
              :key="notification.id"
              :timestamp="notification.created_at"
              :type="notification.type"
              :color="notification.read ? '#ccc' : undefined"
            >
              <el-card :class="{ 'unread-card': !notification.read }">
                <div class="notification-content">
                  <div class="notification-header">
                    <el-tag :type="getTagType(notification.category)" size="small">
                      {{ getCategoryText(notification.category) }}
                    </el-tag>
                    <span class="notification-title">{{ notification.title }}</span>
                  </div>
                  <div class="notification-body">{{ notification.message }}</div>
                  <div class="notification-footer">
                    <el-button v-if="notification.action" size="small" type="primary" @click="handleAction(notification)">
                      {{ notification.action.text }}
                    </el-button>
                    <el-button size="small" @click="markAsRead(notification)" v-if="!notification.read">
                      标记为已读
                    </el-button>
                  </div>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>

          <el-empty v-if="notifications.length === 0" description="暂无通知" />
        </el-tab-pane>

        <el-tab-pane :label="`合同提醒 (${contractNotifications.length})`" name="contract">
          <el-timeline>
            <el-timeline-item
              v-for="notification in contractNotifications"
              :key="notification.id"
              :timestamp="notification.created_at"
              type="warning"
            >
              <el-card>
                <div class="notification-content">
                  <div class="notification-header">
                    <span class="notification-title">{{ notification.title }}</span>
                  </div>
                  <div class="notification-body">{{ notification.message }}</div>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>

        <el-tab-pane :label="`账单提醒 (${billNotifications.length})`" name="bill">
          <el-timeline>
            <el-timeline-item
              v-for="notification in billNotifications"
              :key="notification.id"
              :timestamp="notification.created_at"
              type="danger"
            >
              <el-card>
                <div class="notification-content">
                  <div class="notification-header">
                    <span class="notification-title">{{ notification.title }}</span>
                  </div>
                  <div class="notification-body">{{ notification.message }}</div>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>

        <el-tab-pane :label="`维修提醒 (${maintenanceNotifications.length})`" name="maintenance">
          <el-timeline>
            <el-timeline-item
              v-for="notification in maintenanceNotifications"
              :key="notification.id"
              :timestamp="notification.created_at"
              type="primary"
            >
              <el-card>
                <div class="notification-content">
                  <div class="notification-header">
                    <span class="notification-title">{{ notification.title }}</span>
                  </div>
                  <div class="notification-body">{{ notification.message }}</div>
                </div>
              </el-card>
            </el-timeline-item>
          </el-timeline>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import db from '@/utils/localDB'
import dayjs from 'dayjs'

const router = useRouter()
const activeTab = ref('all')
const notifications = ref([])

const contractNotifications = computed(() => 
  notifications.value.filter(n => n.category === 'contract')
)
const billNotifications = computed(() => 
  notifications.value.filter(n => n.category === 'bill')
)
const maintenanceNotifications = computed(() => 
  notifications.value.filter(n => n.category === 'maintenance')
)
const totalNotifications = computed(() => 
  notifications.value.filter(n => !n.read).length
)

onMounted(() => {
  loadNotifications()
  checkReminders()
})

const loadNotifications = () => {
  const stored = localStorage.getItem('notifications')
  if (stored) {
    notifications.value = JSON.parse(stored)
  }
}

const saveNotifications = () => {
  localStorage.setItem('notifications', JSON.stringify(notifications.value))
}

const checkReminders = () => {
  const settings = JSON.parse(localStorage.getItem('system_settings') || '{"contract_remind_days": 30, "bill_overdue_days": 3}')
  const today = dayjs()

  // 检查合同到期
  const contracts = db.query('contracts', { status: 'active' })
  const rooms = db.getTable('rooms')
  const tenants = db.getTable('tenants')

  contracts.forEach(contract => {
    const endDate = dayjs(contract.end_date)
    const diffDays = endDate.diff(today, 'day')
    
    if (diffDays >= 0 && diffDays <= settings.contract_remind_days) {
      const room = rooms.find(r => r.id === contract.room_id)
      const tenant = tenants.find(t => t.id === contract.tenant_id)
      
      const title = `合同即将到期`
      const message = `房间${room?.room_number}（租户：${tenant?.name}）的合同将于${contract.end_date}到期，还剩${diffDays}天，请及时处理续租或退租事宜。`
      
      addNotification({
        category: 'contract',
        type: 'warning',
        title,
        message,
        action: {
          text: '查看合同',
          route: '/contracts'
        }
      })
    }
  })

  // 检查账单逾期
  const bills = db.getTable('bills')
  bills.forEach(bill => {
    if (bill.status === 'pending') {
      const dueDate = dayjs(bill.due_date)
      const overdueDays = today.diff(dueDate, 'day')
      
      if (overdueDays >= settings.bill_overdue_days) {
        const title = `账单已逾期`
        const message = `账单金额¥${bill.amount}已于${bill.due_date}到期，已逾期${overdueDays}天，请及时跟进。`
        
        addNotification({
          category: 'bill',
          type: 'danger',
          title,
          message,
          action: {
            text: '查看账单',
            route: '/bills'
          }
        })
      }
    }
  })

  // 检查待处理维修工单
  const maintenance = db.query('maintenance_orders', { status: 'pending' })
  maintenance.forEach(order => {
    const room = rooms.find(r => r.id === order.room_id)
    const title = `待处理维修工单`
    const message = `房间${room?.room_number}的维修工单（${order.description}）待处理，请及时安排维修。`
    
    addNotification({
      category: 'maintenance',
      type: 'primary',
      title,
      message,
      action: {
        text: '查看工单',
        route: '/maintenance'
      }
    })
  })

  saveNotifications()
}

const addNotification = (notification) => {
  // 检查是否已存在相同通知
  const exists = notifications.value.find(n => 
    n.title === notification.title && n.message === notification.message
  )
  
  if (!exists) {
    notifications.value.unshift({
      id: db.generateId(),
      ...notification,
      read: false,
      created_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
    })
  }
}

const markAsRead = (notification) => {
  notification.read = true
  saveNotifications()
}

const markAllRead = () => {
  notifications.value.forEach(n => n.read = true)
  saveNotifications()
}

const handleAction = (notification) => {
  if (notification.action && notification.action.route) {
    router.push(notification.action.route)
  }
}

const getTagType = (category) => {
  const map = { contract: 'warning', bill: 'danger', maintenance: 'primary', system: 'info' }
  return map[category] || 'info'
}

const getCategoryText = (category) => {
  const map = { contract: '合同提醒', bill: '账单提醒', maintenance: '维修提醒', system: '系统通知' }
  return map[category] || '通知'
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-content {
  padding: 5px;
}

.notification-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.notification-title {
  font-size: 16px;
  font-weight: bold;
  color: #303133;
}

.notification-body {
  color: #606266;
  margin-bottom: 10px;
  line-height: 1.6;
}

.notification-footer {
  display: flex;
  gap: 10px;
}

.unread-card {
  border-left: 4px solid #409EFF;
}
</style>
