<template>
  <div class="maintenance-management">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>维修管理</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新建工单
          </el-button>
        </div>
      </template>

      <el-table :data="orders" style="width: 100%">
        <el-table-column label="房间号">
          <template #default="scope">
            {{ getRoomNumber(scope.row.room_id) }}
          </template>
        </el-table-column>
        <el-table-column prop="description" label="问题描述" show-overflow-tooltip />
        <el-table-column label="状态">
          <template #default="scope">
            <el-tag :type="getStatusType(scope.row.status)">
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="维修费用">
          <template #default="scope">
            ¥{{ scope.row.cost }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" fixed="right">
          <template #default="scope">
            <div class="inline-actions maintenance-actions">
              <el-button
                v-if="scope.row.status === 'pending'"
                size="small"
                type="primary"
                plain
                @click="updateStatus(scope.row, 'processing')"
              >
                开始处理
              </el-button>
              <el-button
                v-if="scope.row.status === 'processing'"
                size="small"
                type="success"
                plain
                @click="updateStatus(scope.row, 'completed')"
              >
                完成
              </el-button>
              <el-button size="small" @click="showEditDialog(scope.row)">编辑</el-button>
              <el-button size="small" type="danger" plain @click="handleDelete(scope.row)">删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogType === 'add' ? '新建工单' : '编辑工单'" width="600px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="房间" prop="room_id">
          <el-select v-model="form.room_id" placeholder="请选择房间" style="width: 100%">
            <el-option v-for="room in rooms" :key="room.id" :label="room.room_number" :value="room.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="问题描述" prop="description"><el-input v-model="form.description" type="textarea" rows="3" /></el-form-item>
        <el-form-item label="维修费用" prop="cost"><el-input-number v-model="form.cost" :min="0" style="width: 100%" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import db from '@/utils/localDB'
import businessService from '@/services/businessService'

const orders = ref([])
const rooms = ref([])
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const form = reactive({ id: '', room_id: '', tenant_id: null, description: '', status: 'pending', cost: 0 })
const rules = {
  room_id: [{ required: true, message: '请选择房间', trigger: 'change' }],
  description: [{ required: true, message: '请输入问题描述', trigger: 'blur' }]
}

onMounted(() => loadData())
const loadData = () => {
  orders.value = db.getTable('maintenance_orders')
  rooms.value = db.getTable('rooms')
}

const getRoomNumber = (roomId) => rooms.value.find(r => r.id === roomId)?.room_number || '-'
const getStatusType = (status) => ({ pending: 'warning', processing: 'primary', completed: 'success' }[status] || 'info')
const getStatusText = (status) => ({ pending: '待处理', processing: '处理中', completed: '已完成' }[status] || status)

const showAddDialog = () => { dialogType.value = 'add'; Object.assign(form, { id: '', room_id: '', tenant_id: null, description: '', status: 'pending', cost: 0 }); dialogVisible.value = true }
const showEditDialog = (row) => { dialogType.value = 'edit'; Object.assign(form, row); dialogVisible.value = true }

const handleSubmit = async () => {
  if (!formRef.value) return
  await formRef.value.validate((valid) => {
    if (valid) {
      try {
        if (dialogType.value === 'add') businessService.createMaintenanceOrder({ ...form })
        else businessService.updateMaintenanceOrder(form.id, { ...form })
        ElMessage.success('操作成功'); dialogVisible.value = false; loadData()
      } catch (error) {
        ElMessage.error(error.message)
      }
    }
  })
}

const updateStatus = (row, status) => {
  try {
    businessService.updateMaintenanceOrder(row.id, { status })
    ElMessage.success('状态已更新')
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除吗？', '提示', { type: 'warning' })
    businessService.deleteMaintenanceOrder(row.id); ElMessage.success('删除成功'); loadData()
  } catch {}
}
</script>

<style scoped>
.card-header { display: flex; justify-content: space-between; align-items: center; }

.maintenance-actions {
  flex-wrap: wrap;
  justify-content: flex-start;
}
</style>
