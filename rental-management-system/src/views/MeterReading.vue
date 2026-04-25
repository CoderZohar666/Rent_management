<template>
  <div class="meter-reading">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>抄表管理</span>
          <el-button type="primary" @click="showAddDialog">
            <el-icon><Plus /></el-icon>
            新增记录
          </el-button>
        </div>
      </template>

      <el-form :inline="true" :model="searchForm" style="margin-bottom: 20px">
        <el-form-item label="房间">
          <el-select v-model="searchForm.room_id" placeholder="全部" clearable>
            <el-option v-for="room in rooms" :key="room.id" :label="room.room_number" :value="room.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="月份">
          <el-date-picker v-model="searchForm.month" type="month" placeholder="选择月份" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadData">查询</el-button>
        </el-form-item>
        <el-form-item v-if="activeFilterChips.length">
          <ActiveFiltersInline :items="activeFilterChips" @remove="clearFilter" />
        </el-form-item>
      </el-form>

      <el-table :data="filteredRecords" style="width: 100%">
        <el-table-column label="房间号">
          <template #default="scope">
            {{ getRoomNumber(scope.row.room_id) }}
          </template>
        </el-table-column>
        <el-table-column prop="reading_date" label="抄表日期" />
        <el-table-column label="水表读数">
          <template #default="scope">
            {{ scope.row.water_meter }} 吨
          </template>
        </el-table-column>
        <el-table-column label="用电量">
          <template #default="scope">
            {{ scope.row.electricity_meter }} 度
          </template>
        </el-table-column>
        <el-table-column label="燃气量">
          <template #default="scope">
            {{ scope.row.gas_meter }} m³
          </template>
        </el-table-column>
        <el-table-column label="水费">
          <template #default="scope">
            ¥{{ scope.row.water_fee.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="电费">
          <template #default="scope">
            ¥{{ scope.row.electricity_fee.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="燃气费">
          <template #default="scope">
            ¥{{ scope.row.gas_fee.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="scope">
            <el-button size="small" :disabled="!!scope.row.generated_bill_id" @click="generateBill(scope.row)">生成账单</el-button>
            <el-button size="small" @click="showEditDialog(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(scope.row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogType === 'add' ? '新增抄表记录' : '编辑抄表记录'" width="700px">
      <el-form :model="form" :rules="rules" ref="formRef" label-width="120px">
        <el-form-item label="房间" prop="room_id">
          <el-select v-model="form.room_id" placeholder="请选择房间" style="width: 100%" @change="calculateFees">
            <el-option v-for="room in rooms" :key="room.id" :label="room.room_number" :value="room.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="抄表日期" prop="reading_date">
          <el-date-picker v-model="form.reading_date" type="date" style="width: 100%" @change="calculateFees" />
        </el-form-item>
        <el-divider content-position="left">水表</el-divider>
        <el-form-item label="当前读数(吨)" prop="water_meter">
          <el-input-number v-model="form.water_meter" :min="0" :precision="2" style="width: 100%" @change="calculateFees" />
        </el-form-item>
        <el-form-item label="单价(元/吨)">
          <el-input-number v-model="form.water_price" :min="0" :precision="2" style="width: 100%" @change="calculateFees" />
        </el-form-item>
        <el-form-item label="水费(元)">
          <el-input-number v-model="form.water_fee" :min="0" :precision="2" style="width: 100%" disabled />
        </el-form-item>

        <el-divider content-position="left">电表</el-divider>
        <el-form-item label="当前读数(度)" prop="electricity_meter">
          <el-input-number v-model="form.electricity_meter" :min="0" :precision="2" style="width: 100%" @change="calculateFees" />
        </el-form-item>
        <el-form-item label="单价(元/度)">
          <el-input-number v-model="form.electricity_price" :min="0" :precision="2" style="width: 100%" @change="calculateFees" />
        </el-form-item>
        <el-form-item label="电费(元)">
          <el-input-number v-model="form.electricity_fee" :min="0" :precision="2" style="width: 100%" disabled />
        </el-form-item>

        <el-divider content-position="left">燃气表</el-divider>
        <el-form-item label="当前读数(m³)" prop="gas_meter">
          <el-input-number v-model="form.gas_meter" :min="0" :precision="2" style="width: 100%" @change="calculateFees" />
        </el-form-item>
        <el-form-item label="单价(元/m³)">
          <el-input-number v-model="form.gas_price" :min="0" :precision="2" style="width: 100%" @change="calculateFees" />
        </el-form-item>
        <el-form-item label="燃气费(元)">
          <el-input-number v-model="form.gas_fee" :min="0" :precision="2" style="width: 100%" disabled />
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
import { ref, reactive, onMounted, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import ActiveFiltersInline from '@/components/ActiveFiltersInline.vue'
import db from '@/utils/localDB'
import dayjs from 'dayjs'
import businessService from '@/services/businessService'

const rooms = ref([])
const records = ref([])
const dialogVisible = ref(false)
const dialogType = ref('add')
const formRef = ref(null)
const searchForm = reactive({ room_id: '', month: '' })

const form = reactive({
  id: '',
  room_id: '',
  reading_date: dayjs().format('YYYY-MM-DD'),
  water_meter: 0,
  water_price: 5.5,
  water_fee: 0,
  electricity_meter: 0,
  electricity_price: 1.2,
  electricity_fee: 0,
  gas_meter: 0,
  gas_price: 3.5,
  gas_fee: 0
})

const rules = {
  room_id: [{ required: true, message: '请选择房间', trigger: 'change' }],
  reading_date: [{ required: true, message: '请选择日期', trigger: 'change' }]
}

const filteredRecords = computed(() => {
  let result = records.value
  if (searchForm.room_id) {
    result = result.filter(r => r.room_id === searchForm.room_id)
  }
  if (searchForm.month) {
    const monthStr = dayjs(searchForm.month).format('YYYY-MM')
    result = result.filter(r => r.reading_date.startsWith(monthStr))
  }
  return result.sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date))
})

const activeFilterChips = computed(() => {
  const chips = []
  if (searchForm.room_id) {
    chips.push({ key: 'room_id', label: `房间：${getRoomNumber(searchForm.room_id)}` })
  }
  if (searchForm.month) {
    chips.push({ key: 'month', label: `月份：${dayjs(searchForm.month).format('YYYY-MM')}` })
  }
  return chips
})

onMounted(() => {
  loadData()
})

const loadData = () => {
  rooms.value = db.getTable('rooms')
  records.value = db.getTable('meter_readings')
}

const getRoomNumber = (roomId) => rooms.value.find(r => r.id === roomId)?.room_number || '-'

const clearFilter = (key) => {
  searchForm[key] = ''
}

const calculateFees = () => {
  const previous = records.value
    .filter(item => item.id !== form.id && item.room_id === form.room_id && item.reading_date < dayjs(form.reading_date).format('YYYY-MM-DD'))
    .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date))[0]
  const previousWater = previous?.water_meter || 0
  const previousElectricity = previous?.electricity_meter || 0
  const previousGas = previous?.gas_meter || 0
  form.water_fee = parseFloat((Math.max(0, form.water_meter - previousWater) * form.water_price).toFixed(2))
  form.electricity_fee = parseFloat((Math.max(0, form.electricity_meter - previousElectricity) * form.electricity_price).toFixed(2))
  form.gas_fee = parseFloat((Math.max(0, form.gas_meter - previousGas) * form.gas_price).toFixed(2))
}

const showAddDialog = () => {
  dialogType.value = 'add'
  Object.assign(form, {
    id: '',
    room_id: '',
    reading_date: dayjs().format('YYYY-MM-DD'),
    water_meter: 0,
    water_price: 5.5,
    water_fee: 0,
    electricity_meter: 0,
    electricity_price: 1.2,
    electricity_fee: 0,
    gas_meter: 0,
    gas_price: 3.5,
    gas_fee: 0
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
    if (valid) {
      try {
        calculateFees()
        if (dialogType.value === 'add') {
          businessService.createMeterReading({ ...form })
        } else {
          businessService.updateMeterReading(form.id, { ...form })
        }
        ElMessage.success('操作成功')
        dialogVisible.value = false
        loadData()
      } catch (error) {
        ElMessage.error(error.message)
      }
    }
  })
}

const generateBill = (record) => {
  try {
    businessService.generateUtilityBillFromMeterReading(record.id)
    ElMessage.success('已生成水电费账单')
    loadData()
  } catch (error) {
    ElMessage.error(error.message)
  }
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm('确定删除吗？', '提示', { type: 'warning' })
    businessService.deleteMeterReading(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch {
    // 取消
  }
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
