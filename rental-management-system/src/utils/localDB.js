/**
 * 本地数据库管理模块
 * 使用 localStorage 模拟数据库存储
 */

export const DB_SCHEMA_VERSION = 2

export const DB_TABLES = [
  'users',
  'cities',
  'projects',
  'rooms',
  'tenants',
  'contracts',
  'bills',
  'maintenance_orders',
  'meter_readings',
  'deposits',
  'business_events'
]

const META_DEFAULTS = {
  system_settings: {},
  notifications: [],
  operation_logs: [],
  last_backup_time: ''
}

const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]'

const requirePlainObject = (value, message) => {
  if (!isPlainObject(value)) {
    throw new Error(message)
  }
}

const requireTable = (data, tableName) => {
  if (!Array.isArray(data[tableName])) {
    throw new Error(`备份文件缺少有效的 ${tableName} 数据表`)
  }
}

const ensureUniqueIds = (records, tableName) => {
  const ids = new Set()
  records.forEach((record, index) => {
    requirePlainObject(record, `${tableName} 第 ${index + 1} 条记录格式错误`)
    if (!record.id || typeof record.id !== 'string') {
      throw new Error(`${tableName} 第 ${index + 1} 条记录缺少有效ID`)
    }
    if (ids.has(record.id)) {
      throw new Error(`${tableName} 存在重复ID：${record.id}`)
    }
    ids.add(record.id)
  })
  return ids
}

const ensureReference = (ids, id, message) => {
  if (id && !ids.has(id)) {
    throw new Error(message)
  }
}

export const validateImportData = (data) => {
  requirePlainObject(data, '备份文件必须是 JSON 对象')

  if (data.__schema_version && Number(data.__schema_version) > DB_SCHEMA_VERSION) {
    throw new Error(`备份版本 ${data.__schema_version} 高于当前系统版本 ${DB_SCHEMA_VERSION}，请升级系统后再导入`)
  }

  DB_TABLES.forEach((tableName) => requireTable(data, tableName))

  const normalized = {}
  DB_TABLES.forEach((tableName) => {
    normalized[tableName] = data[tableName].map((record) => ({ ...record }))
  })

  const ids = Object.fromEntries(
    DB_TABLES.map((tableName) => [tableName, ensureUniqueIds(normalized[tableName], tableName)])
  )

  normalized.projects.forEach((project) => {
    ensureReference(ids.cities, project.city_id, `项目 ${project.name || project.id} 关联的城市不存在`)
  })
  normalized.rooms.forEach((room) => {
    ensureReference(ids.projects, room.project_id, `房间 ${room.room_number || room.id} 关联的项目不存在`)
  })
  normalized.tenants.forEach((tenant) => {
    ensureReference(ids.rooms, tenant.room_id, `租户 ${tenant.name || tenant.id} 关联的房间不存在`)
  })
  normalized.contracts.forEach((contract) => {
    ensureReference(ids.rooms, contract.room_id, `合同 ${contract.id} 关联的房间不存在`)
    ensureReference(ids.tenants, contract.tenant_id, `合同 ${contract.id} 关联的租户不存在`)
  })
  normalized.bills.forEach((bill) => {
    ensureReference(ids.contracts, bill.contract_id, `账单 ${bill.id} 关联的合同不存在`)
    ensureReference(ids.projects, bill.project_id, `账单 ${bill.id} 关联的项目不存在`)
    ensureReference(ids.cities, bill.city_id, `账单 ${bill.id} 关联的城市不存在`)
  })
  normalized.maintenance_orders.forEach((order) => {
    ensureReference(ids.rooms, order.room_id, `维修工单 ${order.id} 关联的房间不存在`)
    ensureReference(ids.tenants, order.tenant_id, `维修工单 ${order.id} 关联的租户不存在`)
  })
  normalized.meter_readings.forEach((record) => {
    ensureReference(ids.rooms, record.room_id, `抄表记录 ${record.id} 关联的房间不存在`)
    ensureReference(ids.bills, record.generated_bill_id, `抄表记录 ${record.id} 关联的账单不存在`)
  })
  normalized.deposits.forEach((deposit) => {
    ensureReference(ids.contracts, deposit.contract_id, `押金 ${deposit.id} 关联的合同不存在`)
    ensureReference(ids.rooms, deposit.room_id, `押金 ${deposit.id} 关联的房间不存在`)
    ensureReference(ids.tenants, deposit.tenant_id, `押金 ${deposit.id} 关联的租户不存在`)
  })

  const meta = isPlainObject(data.__meta) ? data.__meta : {}
  normalized.__meta = {
    system_settings: isPlainObject(meta.system_settings) ? meta.system_settings : META_DEFAULTS.system_settings,
    notifications: Array.isArray(meta.notifications) ? meta.notifications : META_DEFAULTS.notifications,
    operation_logs: Array.isArray(meta.operation_logs) ? meta.operation_logs : META_DEFAULTS.operation_logs,
    last_backup_time: typeof meta.last_backup_time === 'string' ? meta.last_backup_time : META_DEFAULTS.last_backup_time
  }

  return normalized
}

class LocalDB {
  constructor() {
    this.initDB()
  }

  // 初始化数据库
  initDB() {
    if (!localStorage.getItem('rental_db_initialized')) {
      // 创建所有表
      DB_TABLES.forEach((tableName) => this.createTable(tableName, []))

      // 创建默认管理员账号
      this.insert('users', {
        id: this.generateId(),
        username: 'admin',
        password: 'admin123',
        role: 'super_admin',
        created_at: new Date().toISOString()
      })

      // 插入示例数据
      this.insertSampleData()

      localStorage.setItem('rental_db_initialized', 'true')
      console.log('数据库初始化完成')
    }
  }

  // 创建表
  createTable(tableName, data = []) {
    localStorage.setItem(`db_${tableName}`, JSON.stringify(data))
  }

  // 获取表数据
  getTable(tableName) {
    const data = localStorage.getItem(`db_${tableName}`)
    return data ? JSON.parse(data) : []
  }

  // 设置表数据
  setTable(tableName, data) {
    localStorage.setItem(`db_${tableName}`, JSON.stringify(data))
  }

  // 插入数据
  insert(tableName, record) {
    const table = this.getTable(tableName)
    if (!record.id) {
      record.id = this.generateId()
    }
    if (!record.created_at) {
      record.created_at = new Date().toISOString()
    }
    table.push(record)
    this.setTable(tableName, table)
    return record
  }

  // 批量插入
  insertBatch(tableName, records) {
    const table = this.getTable(tableName)
    records.forEach(record => {
      if (!record.id) {
        record.id = this.generateId()
      }
      if (!record.created_at) {
        record.created_at = new Date().toISOString()
      }
      table.push(record)
    })
    this.setTable(tableName, table)
    return records
  }

  // 更新数据
  update(tableName, id, updates) {
    const table = this.getTable(tableName)
    const index = table.findIndex(item => item.id === id)
    if (index !== -1) {
      table[index] = { ...table[index], ...updates, updated_at: new Date().toISOString() }
      this.setTable(tableName, table)
      return table[index]
    }
    return null
  }

  // 删除数据
  delete(tableName, id) {
    const table = this.getTable(tableName)
    const filtered = table.filter(item => item.id !== id)
    this.setTable(tableName, filtered)
    return true
  }

  // 查询单条
  findById(tableName, id) {
    const table = this.getTable(tableName)
    return table.find(item => item.id === id)
  }

  // 条件查询
  query(tableName, conditions = {}) {
    const table = this.getTable(tableName)
    return table.filter(item => {
      return Object.keys(conditions).every(key => {
        if (conditions[key] === undefined || conditions[key] === null) return true
        return item[key] === conditions[key]
      })
    })
  }

  // 模糊查询
  queryLike(tableName, field, keyword) {
    const table = this.getTable(tableName)
    return table.filter(item => {
      return item[field] && item[field].toString().includes(keyword)
    })
  }

  // 生成唯一ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
  }

  // 插入示例数据
  insertSampleData() {
    // 示例城市
    const cities = [
      { id: 'city1', name: '北京', status: 'active' },
      { id: 'city2', name: '上海', status: 'active' },
      { id: 'city3', name: '广州', status: 'active' }
    ]
    this.insertBatch('cities', cities)

    // 示例项目
    const projects = [
      { id: 'proj1', city_id: 'city1', name: '朝阳公寓', address: '北京市朝阳区', total_rooms: 50, status: 'active' },
      { id: 'proj2', city_id: 'city1', name: '海淀家园', address: '北京市海淀区', total_rooms: 30, status: 'active' },
      { id: 'proj3', city_id: 'city2', name: '浦东新村', address: '上海市浦东新区', total_rooms: 40, status: 'active' },
      { id: 'proj4', city_id: 'city3', name: '天河小区', address: '广州市天河区', total_rooms: 35, status: 'active' }
    ]
    this.insertBatch('projects', projects)

    // 示例房间
    const rooms = []
    for (let i = 1; i <= 10; i++) {
      rooms.push({
        id: `room${i}`,
        project_id: i <= 5 ? 'proj1' : i <= 8 ? 'proj2' : 'proj3',
        room_number: `${Math.floor((i-1)/5) + 1}0${i}`,
        floor: Math.floor((i-1)/5) + 1,
        area: 50 + Math.random() * 30,
        rent_price: 3000 + Math.random() * 2000,
        deposit: 6000,
        status: i <= 6 ? 'rented' : i <= 8 ? 'vacant' : 'maintenance',
        facilities: '空调,洗衣机,热水器,床,衣柜'
      })
    }
    this.insertBatch('rooms', rooms)

    // 示例租户
    const tenants = [
      { id: 'tenant1', name: '张三', phone: '13800138001', id_card: '110101199001011234', emergency_contact: '13900139001', room_id: 'room1' },
      { id: 'tenant2', name: '李四', phone: '13800138002', id_card: '110101199002022345', emergency_contact: '13900139002', room_id: 'room2' },
      { id: 'tenant3', name: '王五', phone: '13800138003', id_card: '110101199003033456', emergency_contact: '13900139003', room_id: 'room3' }
    ]
    this.insertBatch('tenants', tenants)

    // 示例合同
    const contracts = [
      { id: 'contract1', room_id: 'room1', tenant_id: 'tenant1', start_date: '2024-01-01', end_date: '2024-12-31', monthly_rent: 4500, deposit: 9000, status: 'active' },
      { id: 'contract2', room_id: 'room2', tenant_id: 'tenant2', start_date: '2024-03-01', end_date: '2025-02-28', monthly_rent: 3800, deposit: 7600, status: 'active' },
      { id: 'contract3', room_id: 'room3', tenant_id: 'tenant3', start_date: '2024-06-01', end_date: '2025-05-31', monthly_rent: 4200, deposit: 8400, status: 'active' }
    ]
    this.insertBatch('contracts', contracts)

    // 示例账单
    const bills = []
    const currentDate = new Date()
    for (let i = 0; i < 6; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      bills.push({
        id: `bill${i * 3 + 1}`,
        contract_id: 'contract1',
        project_id: 'proj1',
        city_id: 'city1',
        bill_type: 'rent',
        amount: 4500,
        due_date: date.toISOString().split('T')[0],
        paid_date: i < 3 ? date.toISOString().split('T')[0] : null,
        status: i < 3 ? 'paid' : 'pending'
      })
      bills.push({
        id: `bill${i * 3 + 2}`,
        contract_id: 'contract2',
        project_id: 'proj1',
        city_id: 'city1',
        bill_type: 'rent',
        amount: 3800,
        due_date: date.toISOString().split('T')[0],
        paid_date: i < 2 ? date.toISOString().split('T')[0] : null,
        status: i < 2 ? 'paid' : 'pending'
      })
      bills.push({
        id: `bill${i * 3 + 3}`,
        contract_id: 'contract3',
        project_id: 'proj2',
        city_id: 'city1',
        bill_type: 'rent',
        amount: 4200,
        due_date: date.toISOString().split('T')[0],
        paid_date: i < 4 ? date.toISOString().split('T')[0] : null,
        status: i < 4 ? 'paid' : 'pending'
      })
    }
    this.insertBatch('bills', bills)

    // 示例维修工单
    const maintenanceOrders = [
      { id: 'maint1', room_id: 'room9', tenant_id: null, description: '水管漏水', status: 'completed', cost: 200 },
      { id: 'maint2', room_id: 'room10', tenant_id: null, description: '空调不制冷', status: 'pending', cost: 0 }
    ]
    this.insertBatch('maintenance_orders', maintenanceOrders)

    console.log('示例数据插入完成')
  }

  // 清空数据库
  clearDB() {
    localStorage.removeItem('rental_db_initialized')
    const keys = Object.keys(localStorage)
    keys.filter(key => key.startsWith('db_')).forEach(key => {
      localStorage.removeItem(key)
    })
    ;['system_settings', 'notifications', 'operation_logs', 'last_backup_time'].forEach(key => {
      localStorage.removeItem(key)
    })
    console.log('数据库已清空')
  }

  // 导出数据
  exportData() {
    const data = {}
    DB_TABLES.forEach(table => {
      data[table] = this.getTable(table)
    })
    data.__schema_version = DB_SCHEMA_VERSION
    data.__exported_at = new Date().toISOString()
    data.__meta = {
      system_settings: JSON.parse(localStorage.getItem('system_settings') || '{}'),
      notifications: JSON.parse(localStorage.getItem('notifications') || '[]'),
      operation_logs: JSON.parse(localStorage.getItem('operation_logs') || '[]'),
      last_backup_time: localStorage.getItem('last_backup_time') || ''
    }
    return data
  }

  // 导入数据
  importData(data) {
    const normalized = validateImportData(data)
    DB_TABLES.forEach(table => {
      this.setTable(table, normalized[table])
    })
    localStorage.setItem('system_settings', JSON.stringify(normalized.__meta.system_settings))
    localStorage.setItem('notifications', JSON.stringify(normalized.__meta.notifications))
    localStorage.setItem('operation_logs', JSON.stringify(normalized.__meta.operation_logs))
    localStorage.setItem('last_backup_time', normalized.__meta.last_backup_time)
    localStorage.setItem('rental_db_initialized', 'true')
  }
}

// 导出单例
const db = new LocalDB()
export default db
