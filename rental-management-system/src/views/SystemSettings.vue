<template>
  <div class="page-shell">
    <PageHeader
      eyebrow="Settings"
      title="系统设置"
      subtitle="管理数据备份、恢复、重置和系统参数，统一维护当前工作台的运行习惯。"
    />

    <div class="page-grid grid-two-columns">
      <SectionCard title="数据管理" subtitle="备份、恢复和初始化系统数据">
        <div class="settings-stack">
          <el-alert title="所有备份文件均为 JSON 格式，恢复操作会覆盖当前本地数据。" type="info" :closable="false" />

          <div class="setting-row">
            <div>
              <h4>导出数据备份</h4>
              <p>将所有业务数据导出为 JSON 文件，便于归档或迁移。</p>
            </div>
            <el-button type="primary" @click="exportData">
              <el-icon><Download /></el-icon>
              导出数据
            </el-button>
          </div>

          <div class="setting-row">
            <div>
              <h4>导入数据恢复</h4>
              <p>从历史备份文件中恢复系统数据，恢复后会自动刷新页面。</p>
            </div>
            <el-upload action="" :auto-upload="false" :show-file-list="false" :on-change="importData" accept=".json">
              <el-button type="warning">
                <el-icon><Upload /></el-icon>
                导入数据
              </el-button>
            </el-upload>
          </div>

          <div class="setting-row setting-row--danger">
            <div>
              <h4>重置系统数据</h4>
              <p>清空所有当前数据并重新初始化示例数据，请谨慎操作。</p>
            </div>
            <el-button type="danger" plain @click="resetData">
              <el-icon><RefreshLeft /></el-icon>
              重置数据
            </el-button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="系统参数" subtitle="提醒阈值和分页习惯配置">
        <div class="page-shell">
          <el-form :model="settings" label-width="150px" label-position="left" class="settings-form">
            <el-form-item label="合同到期提醒天数">
              <div class="settings-field">
                <el-input-number v-model="settings.contract_remind_days" :min="1" :max="90" />
                <span class="muted-text">到期前多少天开始提醒</span>
              </div>
            </el-form-item>

            <el-form-item label="账单逾期判定天数">
              <div class="settings-field">
                <el-input-number v-model="settings.bill_overdue_days" :min="1" :max="30" />
                <span class="muted-text">超过多少天自动标记为逾期</span>
              </div>
            </el-form-item>

            <el-form-item label="每页显示条数">
              <div class="settings-field">
                <el-select v-model="settings.page_size">
                  <el-option label="10条" :value="10" />
                  <el-option label="20条" :value="20" />
                  <el-option label="50条" :value="50" />
                  <el-option label="100条" :value="100" />
                </el-select>
                <span class="muted-text">统一控制列表页默认分页大小</span>
              </div>
            </el-form-item>
          </el-form>

          <div class="toolbar-actions">
            <el-button type="primary" @click="saveSettings">保存设置</el-button>
            <el-button @click="loadSettings">恢复默认</el-button>
          </div>

          <div class="system-summary surface-panel">
            <h4>系统信息</h4>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="系统版本">v1.0.0</el-descriptions-item>
              <el-descriptions-item label="数据存储">LocalStorage</el-descriptions-item>
              <el-descriptions-item label="数据量">{{ totalRecords }} 条</el-descriptions-item>
              <el-descriptions-item label="最后备份">{{ lastBackup || '未备份' }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </div>
      </SectionCard>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Download, Upload, RefreshLeft } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import PageHeader from '@/components/PageHeader.vue'
import SectionCard from '@/components/SectionCard.vue'
import db from '@/utils/localDB'
import { addBusinessEvent, addLog, addNotification } from '@/utils/activity'

const settings = reactive({
  contract_remind_days: 30,
  bill_overdue_days: 3,
  page_size: 20
})

const lastBackup = ref('')

const totalRecords = computed(() => {
  const tables = ['cities', 'projects', 'rooms', 'tenants', 'contracts', 'bills', 'maintenance_orders', 'meter_readings', 'deposits', 'business_events']
  return tables.reduce((sum, table) => sum + db.getTable(table).length, 0)
})

onMounted(() => {
  loadSettings()
  lastBackup.value = localStorage.getItem('last_backup_time') || ''
})

const loadSettings = () => {
  const saved = localStorage.getItem('system_settings')
  if (saved) {
    Object.assign(settings, JSON.parse(saved))
  } else {
    Object.assign(settings, {
      contract_remind_days: 30,
      bill_overdue_days: 3,
      page_size: 20
    })
  }
}

const saveSettings = () => {
  localStorage.setItem('system_settings', JSON.stringify(settings))
  addLog({ type: 'update', module: '系统设置', description: '更新系统参数设置' })
  addBusinessEvent({ type: 'settings_updated', module: 'settings', entity_id: 'system_settings', description: '系统参数已更新' })
  ElMessage.success('设置已保存')
}

const exportData = () => {
  const data = db.exportData()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `租房管理系统备份_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.json`
  link.click()
  URL.revokeObjectURL(url)

  localStorage.setItem('last_backup_time', dayjs().format('YYYY-MM-DD HH:mm:ss'))
  lastBackup.value = localStorage.getItem('last_backup_time')
  addLog({ type: 'create', module: '系统设置', description: '导出系统备份' })
  addBusinessEvent({ type: 'backup_exported', module: 'settings', entity_id: 'backup', description: '系统备份已导出' })
  ElMessage.success('数据导出成功')
}

const importData = (file) => {
  const reader = new FileReader()
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result)
      ElMessageBox.confirm('导入数据将覆盖当前所有数据，确定继续吗？', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
        .then(() => {
          db.importData(data)
          addLog({ type: 'update', module: '系统设置', description: '导入系统备份' })
          addBusinessEvent({ type: 'backup_imported', module: 'settings', entity_id: 'backup', description: '系统备份已导入' })
          addNotification({
            category: 'system',
            type: 'success',
            title: '备份已导入',
            message: '系统备份导入成功，页面将刷新。',
            dedupe_key: `backup-imported:${Date.now()}`
          })
          ElMessage.success('数据导入成功，页面将刷新')
          setTimeout(() => location.reload(), 1000)
        })
        .catch(() => {})
    } catch {
      ElMessage.error('文件格式错误')
    }
  }
  reader.readAsText(file.raw)
}

const resetData = async () => {
  try {
    await ElMessageBox.confirm('此操作将清空所有数据并重新初始化，确定继续吗？', '严重警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    })

    db.clearDB()
    addLog({ type: 'delete', module: '系统设置', description: '重置系统数据' })
    addBusinessEvent({ type: 'system_reset', module: 'settings', entity_id: 'system', description: '系统数据已重置' })
    ElMessage.success('数据已重置，页面将刷新')
    setTimeout(() => location.reload(), 1000)
  } catch {
    // ignore
  }
}
</script>

<style scoped>
.settings-stack {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px;
  border: 1px solid rgba(226, 232, 240, 0.92);
  border-radius: 14px;
  background: var(--app-color-surface-soft);
}

.setting-row h4,
.system-summary h4 {
  margin: 0 0 8px;
  font-size: 16px;
}

.setting-row p {
  margin: 0;
  color: var(--app-color-text-secondary);
  line-height: 1.7;
}

.setting-row--danger {
  border-color: rgba(239, 68, 68, 0.18);
}

.settings-form :deep(.el-form-item) {
  margin-bottom: 24px;
}

.settings-field {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.system-summary {
  padding: 20px;
}

@media (max-width: 767px) {
  .setting-row {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
