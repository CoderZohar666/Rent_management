import dayjs from 'dayjs'
import db from '@/utils/localDB'
import { addBusinessEvent, addLog, addNotification } from '@/utils/activity'

const ACTIVE_CONTRACT_STATUSES = ['active']
const OPEN_MAINTENANCE_STATUSES = ['pending', 'processing']
const UNSETTLED_DEPOSIT_STATUSES = ['collected', 'pending_refund']

const formatDate = (value) => dayjs(value).format('YYYY-MM-DD')
const monthKey = (value) => dayjs(value).format('YYYY-MM')

const createError = (message) => {
  throw new Error(message)
}

const getContractDisplayStatus = (contract) => {
  if (!contract) return 'draft'
  if (contract.status === 'settled' || contract.status === 'terminated' || contract.status === 'draft') {
    return contract.status
  }
  const remindDays = JSON.parse(localStorage.getItem('system_settings') || '{}').contract_remind_days || 30
  const diffDays = dayjs(contract.end_date).diff(dayjs(), 'day')
  if (diffDays >= 0 && diffDays <= remindDays) {
    return 'expiring'
  }
  return contract.status || 'draft'
}

const getActiveContractByRoom = (roomId, ignoreContractId = '') => {
  return db.getTable('contracts').find((item) =>
    item.room_id === roomId &&
    ACTIVE_CONTRACT_STATUSES.includes(item.status) &&
    item.id !== ignoreContractId
  )
}

const getActiveContractByTenant = (tenantId, ignoreContractId = '') => {
  return db.getTable('contracts').find((item) =>
    item.tenant_id === tenantId &&
    ACTIVE_CONTRACT_STATUSES.includes(item.status) &&
    item.id !== ignoreContractId
  )
}

const getOpenMaintenanceByRoom = (roomId, ignoreOrderId = '') => {
  return db.getTable('maintenance_orders').filter((item) =>
    item.room_id === roomId &&
    OPEN_MAINTENANCE_STATUSES.includes(item.status) &&
    item.id !== ignoreOrderId
  )
}

const syncRoomStatus = (roomId) => {
  const room = db.findById('rooms', roomId)
  if (!room) return null

  const hasOpenMaintenance = getOpenMaintenanceByRoom(roomId).length > 0
  const hasActiveContract = Boolean(getActiveContractByRoom(roomId))
  const nextStatus = hasOpenMaintenance ? 'maintenance' : hasActiveContract ? 'rented' : 'vacant'
  return db.update('rooms', roomId, { status: nextStatus })
}

const ensureRoomAvailable = (roomId, ignoreContractId = '') => {
  const room = db.findById('rooms', roomId)
  if (!room) {
    createError('房间不存在')
  }
  if (getOpenMaintenanceByRoom(roomId).length > 0) {
    createError('房间存在未完成维修工单，不能签约')
  }
  if (getActiveContractByRoom(roomId, ignoreContractId)) {
    createError('该房间已有执行中的合同')
  }
  return room
}

const ensureTenantExists = (tenantId) => {
  const tenant = db.findById('tenants', tenantId)
  if (!tenant) {
    createError('租户不存在')
  }
  return tenant
}

const ensureTenantRoomAssignable = (roomId, tenantId = '') => {
  if (!roomId) return null
  const room = db.findById('rooms', roomId)
  if (!room) {
    createError('关联房间不存在')
  }

  const activeContract = getActiveContractByRoom(roomId)
  if (activeContract && activeContract.tenant_id !== tenantId) {
    createError('该房间已有其他执行中的租户合同')
  }

  const linkedTenant = db.getTable('tenants').find((item) => item.id !== tenantId && item.room_id === roomId)
  if (linkedTenant && !activeContract) {
    createError('该房间已关联其他租户')
  }

  return room
}

const syncTenantRoomLink = (tenantId, fallbackRoomId = null) => {
  const tenant = db.findById('tenants', tenantId)
  if (!tenant) return null

  const activeContract = getActiveContractByTenant(tenantId)
  const nextRoomId = activeContract?.room_id || fallbackRoomId || null
  return db.update('tenants', tenantId, { room_id: nextRoomId })
}

const buildBillPayload = ({ contract, room, billType, amount, dueDate, sourceType, sourceId, remark }) => {
  const project = db.findById('projects', room.project_id)
  const city = project ? db.findById('cities', project.city_id) : null
  const periodKey = monthKey(dueDate)

  return {
    contract_id: contract.id,
    project_id: room.project_id,
    city_id: city?.id || '',
    bill_type: billType,
    amount,
    due_date: formatDate(dueDate),
    paid_date: null,
    status: 'pending',
    period_key: periodKey,
    source_type: sourceType,
    source_id: sourceId,
    paid_amount: 0,
    settlement_status: 'pending',
    remark: remark || ''
  }
}

const hasUnsettledBills = (contractId) => {
  return db.getTable('bills').some((item) => item.contract_id === contractId && item.status !== 'paid')
}

const hasUnsettledDeposits = (contractId) => {
  return db.getTable('deposits').some((item) =>
    item.contract_id === contractId &&
    UNSETTLED_DEPOSIT_STATUSES.includes(item.status)
  )
}

const ensureContractExists = (contractId) => {
  const contract = db.findById('contracts', contractId)
  if (!contract) {
    createError('合同不存在')
  }
  return contract
}

const ensureDepositForContract = (contractId) => {
  const deposit = db.getTable('deposits').find((item) =>
    item.contract_id === contractId && UNSETTLED_DEPOSIT_STATUSES.includes(item.status)
  )
  return deposit || null
}

const logAndEvent = (payload) => {
  addLog(payload.log)
  addBusinessEvent(payload.event)
}

export const businessService = {
  getContractDisplayStatus,

  createContract(payload) {
    const room = ensureRoomAvailable(payload.room_id)
    const tenant = ensureTenantExists(payload.tenant_id)
    const contract = db.insert('contracts', {
      ...payload,
      start_date: formatDate(payload.start_date),
      end_date: formatDate(payload.end_date),
      status: 'active',
      checkout_status: 'none',
      renewal_of_contract_id: payload.renewal_of_contract_id || null,
      terminated_at: null,
      termination_reason: ''
    })

    db.update('rooms', room.id, { status: 'rented' })
    syncTenantRoomLink(tenant.id, room.id)
    logAndEvent({
      log: { type: 'create', module: '合同管理', description: `创建合同 ${contract.id}，房间 ${room.room_number}` },
      event: { type: 'contract_created', module: 'contracts', entity_id: contract.id, description: `租户 ${tenant.name} 签约入住` }
    })
    addNotification({
      category: 'contract',
      type: 'success',
      title: '新合同已创建',
      message: `房间${room.room_number}已创建执行中合同。`,
      action: { text: '查看合同', route: `/contracts/${contract.id}` },
      dedupe_key: `contract-created:${contract.id}`
    })
    return contract
  },

  updateContract(contractId, payload) {
    const contract = ensureContractExists(contractId)
    if (contract.status !== 'active') {
      createError('仅执行中的合同允许编辑')
    }

    const nextTenantId = payload.tenant_id || contract.tenant_id
    ensureTenantExists(nextTenantId)

    let nextRoomId = payload.room_id || contract.room_id
    if (nextRoomId !== contract.room_id) {
      ensureRoomAvailable(nextRoomId, contractId)
    }

    const updated = db.update('contracts', contractId, {
      ...payload,
      tenant_id: nextTenantId,
      room_id: nextRoomId,
      start_date: formatDate(payload.start_date || contract.start_date),
      end_date: formatDate(payload.end_date || contract.end_date)
    })

    if (nextRoomId !== contract.room_id) {
      syncRoomStatus(contract.room_id)
      syncRoomStatus(nextRoomId)
    }

    syncTenantRoomLink(contract.tenant_id)
    syncTenantRoomLink(nextTenantId, nextRoomId)

    addLog({ type: 'update', module: '合同管理', description: `更新合同 ${contractId}` })
    addBusinessEvent({ type: 'contract_updated', module: 'contracts', entity_id: contractId, description: '合同信息已更新' })
    return updated
  },

  deleteContract(contractId) {
    const contract = ensureContractExists(contractId)
    if (hasUnsettledBills(contractId)) {
      createError('合同存在未结清账单，不能删除')
    }
    if (hasUnsettledDeposits(contractId)) {
      createError('合同存在未退还押金，不能删除')
    }

    db.delete('contracts', contractId)
    syncRoomStatus(contract.room_id)
    syncTenantRoomLink(contract.tenant_id)
    logAndEvent({
      log: { type: 'delete', module: '合同管理', description: `删除合同 ${contractId}` },
      event: { type: 'contract_deleted', module: 'contracts', entity_id: contractId, description: '合同已删除' }
    })
  },

  startCheckout(contractId, terminationReason = '') {
    const contract = ensureContractExists(contractId)
    if (contract.status !== 'active') {
      createError('仅执行中的合同可发起退租')
    }
    if (contract.checkout_status === 'pending') {
      createError('该合同已发起退租结算')
    }

    const updated = db.update('contracts', contractId, {
      checkout_status: 'pending',
      termination_reason: terminationReason
    })
    const room = db.findById('rooms', contract.room_id)
    addNotification({
      category: 'contract',
      type: 'warning',
      title: '退租结算待处理',
      message: `房间${room?.room_number || '-'}已发起退租，请先完成尾款与押金结算。`,
      action: { text: '查看合同', route: `/contracts/${contractId}` },
      dedupe_key: `checkout-pending:${contractId}`
    })
    logAndEvent({
      log: { type: 'update', module: '合同管理', description: `发起合同 ${contractId} 退租结算` },
      event: { type: 'checkout_started', module: 'contracts', entity_id: contractId, description: '合同进入退租结算流程' }
    })
    return updated
  },

  settleCheckout(contractId, roomStatusAfter = 'vacant') {
    const contract = ensureContractExists(contractId)
    if (contract.checkout_status !== 'pending') {
      createError('请先发起退租结算')
    }
    if (hasUnsettledBills(contractId)) {
      createError('合同仍有未结清账单，不能完成退租')
    }
    if (hasUnsettledDeposits(contractId)) {
      createError('合同押金尚未完成退还，不能完成退租')
    }

    const updated = db.update('contracts', contractId, {
      status: 'settled',
      checkout_status: 'completed',
      terminated_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
    })
    db.update('rooms', contract.room_id, { status: roomStatusAfter })
    syncRoomStatus(contract.room_id)
    syncTenantRoomLink(contract.tenant_id)

    addNotification({
      category: 'contract',
      type: 'success',
      title: '退租已完成',
      message: `合同${contractId}已完成退租结算，房间已释放。`,
      action: { text: '查看合同', route: `/contracts/${contractId}` },
      dedupe_key: `checkout-completed:${contractId}`
    })
    logAndEvent({
      log: { type: 'update', module: '合同管理', description: `完成合同 ${contractId} 退租` },
      event: { type: 'checkout_completed', module: 'contracts', entity_id: contractId, description: '合同完成退租结算' }
    })
    return updated
  },

  renewContract(contractId, payload) {
    const contract = ensureContractExists(contractId)
    if (contract.status !== 'active') {
      createError('仅执行中的合同允许续租')
    }

    db.update('contracts', contractId, {
      status: 'settled',
      checkout_status: 'renewed',
      terminated_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
    })

    const renewed = this.createContract({
      room_id: contract.room_id,
      tenant_id: contract.tenant_id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      monthly_rent: payload.monthly_rent,
      deposit: contract.deposit,
      renewal_of_contract_id: contractId
    })

    addNotification({
      category: 'contract',
      type: 'success',
      title: '合同已续租',
      message: `合同${contractId}已生成续租合同 ${renewed.id}。`,
      action: { text: '查看新合同', route: `/contracts/${renewed.id}` },
      dedupe_key: `contract-renewed:${contractId}:${renewed.id}`
    })
    addLog({ type: 'update', module: '合同管理', description: `合同 ${contractId} 已续租为 ${renewed.id}` })
    addBusinessEvent({ type: 'contract_renewed', module: 'contracts', entity_id: renewed.id, description: `由合同 ${contractId} 续租生成` })
    return renewed
  },

  generateRentBill(contractId, dueDate = dayjs().format('YYYY-MM-DD')) {
    const contract = ensureContractExists(contractId)
    if (contract.status !== 'active') {
      createError('仅执行中的合同允许生成租金账单')
    }
    const room = db.findById('rooms', contract.room_id)
    const periodKey = monthKey(dueDate)
    const exists = db.getTable('bills').find((item) =>
      item.contract_id === contractId &&
      item.bill_type === 'rent' &&
      (item.period_key || monthKey(item.due_date)) === periodKey
    )
    if (exists) {
      createError(`该合同 ${periodKey} 的租金账单已存在`)
    }

    const bill = db.insert('bills', buildBillPayload({
      contract,
      room,
      billType: 'rent',
      amount: contract.monthly_rent,
      dueDate,
      sourceType: 'contract',
      sourceId: contractId,
      remark: `租金账单 (${periodKey})`
    }))

    logAndEvent({
      log: { type: 'create', module: '账单管理', description: `生成租金账单 ${bill.id}` },
      event: { type: 'rent_bill_created', module: 'bills', entity_id: bill.id, description: `生成 ${periodKey} 租金账单` }
    })
    return bill
  },

  markBillAsPaid(billId, paidDate = dayjs().format('YYYY-MM-DD')) {
    const bill = db.findById('bills', billId)
    if (!bill) {
      createError('账单不存在')
    }
    if (bill.status === 'paid') {
      return bill
    }
    const updated = db.update('bills', billId, {
      status: 'paid',
      paid_date: formatDate(paidDate),
      paid_amount: bill.amount,
      settlement_status: 'paid'
    })
    logAndEvent({
      log: { type: 'update', module: '账单管理', description: `账单 ${billId} 已确认支付` },
      event: { type: 'bill_paid', module: 'bills', entity_id: billId, description: '账单已结清' }
    })
    return updated
  },

  deleteBill(billId) {
    const bill = db.findById('bills', billId)
    if (!bill) {
      createError('账单不存在')
    }
    db.delete('bills', billId)
    if (bill.source_type === 'meter_reading' && bill.source_id) {
      db.update('meter_readings', bill.source_id, { generated_bill_id: null })
    }
    logAndEvent({
      log: { type: 'delete', module: '账单管理', description: `删除账单 ${billId}` },
      event: { type: 'bill_deleted', module: 'bills', entity_id: billId, description: '账单已删除' }
    })
  },

  createMeterReading(payload) {
    if (!payload.room_id) {
      createError('请选择房间')
    }
    const periodKey = monthKey(payload.reading_date)
    const exists = db.getTable('meter_readings').find((item) =>
      item.room_id === payload.room_id && item.period_key === periodKey
    )
    if (exists) {
      createError('同一房间同一月份只能有一条抄表记录')
    }

    const previous = db.getTable('meter_readings')
      .filter((item) => item.room_id === payload.room_id && item.reading_date < formatDate(payload.reading_date))
      .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date))[0]

    const previousWater = previous?.water_meter || 0
    const previousElectricity = previous?.electricity_meter || 0
    const previousGas = previous?.gas_meter || 0

    const waterUsage = Math.max(0, Number(payload.water_meter) - Number(previousWater))
    const electricityUsage = Math.max(0, Number(payload.electricity_meter) - Number(previousElectricity))
    const gasUsage = Math.max(0, Number(payload.gas_meter) - Number(previousGas))

    const record = db.insert('meter_readings', {
      ...payload,
      reading_date: formatDate(payload.reading_date),
      period_key: periodKey,
      previous_water_meter: previousWater,
      previous_electricity_meter: previousElectricity,
      previous_gas_meter: previousGas,
      water_usage: waterUsage,
      electricity_usage: electricityUsage,
      gas_usage: gasUsage,
      water_fee: parseFloat((waterUsage * payload.water_price).toFixed(2)),
      electricity_fee: parseFloat((electricityUsage * payload.electricity_price).toFixed(2)),
      gas_fee: parseFloat((gasUsage * payload.gas_price).toFixed(2)),
      generated_bill_id: null
    })

    logAndEvent({
      log: { type: 'create', module: '抄表管理', description: `新增抄表记录 ${record.id}` },
      event: { type: 'meter_reading_created', module: 'meter_readings', entity_id: record.id, description: `生成 ${periodKey} 抄表记录` }
    })
    return record
  },

  updateMeterReading(recordId, payload) {
    const record = db.findById('meter_readings', recordId)
    if (!record) {
      createError('抄表记录不存在')
    }
    if (record.generated_bill_id) {
      createError('该抄表记录已生成账单，不能再编辑')
    }
    const periodKey = monthKey(payload.reading_date)
    const duplicate = db.getTable('meter_readings').find((item) =>
      item.id !== recordId &&
      item.room_id === payload.room_id &&
      item.period_key === periodKey
    )
    if (duplicate) {
      createError('同一房间同一月份只能有一条抄表记录')
    }

    const previous = db.getTable('meter_readings')
      .filter((item) => item.id !== recordId && item.room_id === payload.room_id && item.reading_date < formatDate(payload.reading_date))
      .sort((a, b) => new Date(b.reading_date) - new Date(a.reading_date))[0]

    const previousWater = previous?.water_meter || 0
    const previousElectricity = previous?.electricity_meter || 0
    const previousGas = previous?.gas_meter || 0
    const waterUsage = Math.max(0, Number(payload.water_meter) - Number(previousWater))
    const electricityUsage = Math.max(0, Number(payload.electricity_meter) - Number(previousElectricity))
    const gasUsage = Math.max(0, Number(payload.gas_meter) - Number(previousGas))

    const updated = db.update('meter_readings', recordId, {
      ...payload,
      reading_date: formatDate(payload.reading_date),
      period_key: periodKey,
      previous_water_meter: previousWater,
      previous_electricity_meter: previousElectricity,
      previous_gas_meter: previousGas,
      water_usage: waterUsage,
      electricity_usage: electricityUsage,
      gas_usage: gasUsage,
      water_fee: parseFloat((waterUsage * payload.water_price).toFixed(2)),
      electricity_fee: parseFloat((electricityUsage * payload.electricity_price).toFixed(2)),
      gas_fee: parseFloat((gasUsage * payload.gas_price).toFixed(2))
    })
    addLog({ type: 'update', module: '抄表管理', description: `更新抄表记录 ${recordId}` })
    addBusinessEvent({ type: 'meter_reading_updated', module: 'meter_readings', entity_id: recordId, description: '抄表记录已更新' })
    return updated
  },

  generateUtilityBillFromMeterReading(recordId) {
    const record = db.findById('meter_readings', recordId)
    if (!record) {
      createError('抄表记录不存在')
    }
    if (record.generated_bill_id) {
      createError('该抄表记录已生成过账单')
    }
    const room = db.findById('rooms', record.room_id)
    const contract = getActiveContractByRoom(record.room_id)
    if (!contract) {
      createError('该房间没有执行中的合同')
    }

    const bill = db.insert('bills', buildBillPayload({
      contract,
      room,
      billType: 'utility',
      amount: parseFloat((record.water_fee + record.electricity_fee + record.gas_fee).toFixed(2)),
      dueDate: dayjs(record.reading_date).add(7, 'day').format('YYYY-MM-DD'),
      sourceType: 'meter_reading',
      sourceId: recordId,
      remark: `水电燃气费 (${record.period_key})`
    }))

    db.update('meter_readings', recordId, { generated_bill_id: bill.id })
    logAndEvent({
      log: { type: 'create', module: '账单管理', description: `由抄表记录 ${recordId} 生成账单 ${bill.id}` },
      event: { type: 'utility_bill_created', module: 'bills', entity_id: bill.id, description: `生成 ${record.period_key} 水电账单` }
    })
    return bill
  },

  deleteMeterReading(recordId) {
    const record = db.findById('meter_readings', recordId)
    if (!record) {
      createError('抄表记录不存在')
    }
    if (record.generated_bill_id) {
      createError('该抄表记录已生成账单，不能删除')
    }
    db.delete('meter_readings', recordId)
    logAndEvent({
      log: { type: 'delete', module: '抄表管理', description: `删除抄表记录 ${recordId}` },
      event: { type: 'meter_reading_deleted', module: 'meter_readings', entity_id: recordId, description: '抄表记录已删除' }
    })
  },

  recordDeposit(payload) {
    const contract = payload.contract_id ? ensureContractExists(payload.contract_id) : getActiveContractByRoom(payload.room_id)
    if (!contract) {
      createError('该房间没有执行中的合同，不能登记押金')
    }
    if (payload.room_id && contract.room_id !== payload.room_id) {
      createError('押金记录的房间与合同不匹配')
    }
    if (payload.tenant_id && contract.tenant_id !== payload.tenant_id) {
      createError('押金记录的租户必须与执行中的合同一致')
    }

    const exists = ensureDepositForContract(contract.id)
    if (exists) {
      createError('该合同已有待处理押金记录')
    }

    const deposit = db.insert('deposits', {
      ...payload,
      contract_id: contract.id,
      collect_date: formatDate(payload.collect_date),
      status: 'collected',
      refund_amount: 0,
      deduction_items: [],
      settled_at: null
    })
    logAndEvent({
      log: { type: 'create', module: '押金管理', description: `登记押金 ${deposit.id}` },
      event: { type: 'deposit_recorded', module: 'deposits', entity_id: deposit.id, description: '押金已登记收取' }
    })
    return deposit
  },

  refundDeposit(depositId, payload) {
    const deposit = db.findById('deposits', depositId)
    if (!deposit) {
      createError('押金记录不存在')
    }

    const deductionItems = payload.deduction > 0 ? [{
      amount: payload.deduction,
      reason: payload.deduction_reason || '押金扣减'
    }] : []

    const updated = db.update('deposits', depositId, {
      status: payload.deduction > 0 ? 'partially_refunded' : 'refunded',
      deduction: payload.deduction,
      deduction_items: deductionItems,
      refund_amount: payload.refund_amount,
      refund_date: formatDate(payload.refund_date),
      refund_reason: payload.refund_reason,
      deduction_reason: payload.deduction_reason,
      settled_at: dayjs().format('YYYY-MM-DD HH:mm:ss')
    })
    logAndEvent({
      log: { type: 'update', module: '押金管理', description: `完成押金 ${depositId} 退还` },
      event: { type: 'deposit_refunded', module: 'deposits', entity_id: depositId, description: '押金已完成退还/扣退' }
    })
    return updated
  },

  deleteRoom(roomId) {
    const room = db.findById('rooms', roomId)
    if (!room) {
      createError('房间不存在')
    }
    const hasContract = db.getTable('contracts').some((item) => item.room_id === roomId)
    const hasBill = db.getTable('bills').some((item) => item.project_id === room.project_id && item.contract_id && db.findById('contracts', item.contract_id)?.room_id === roomId)
    const hasMeter = db.getTable('meter_readings').some((item) => item.room_id === roomId)
    const hasDeposit = db.getTable('deposits').some((item) => item.room_id === roomId)
    if (hasContract || hasBill || hasMeter || hasDeposit) {
      createError('房间已被合同、账单、抄表或押金记录引用，不能删除')
    }
    db.delete('rooms', roomId)
    logAndEvent({
      log: { type: 'delete', module: '房间管理', description: `删除房间 ${room.room_number}` },
      event: { type: 'room_deleted', module: 'rooms', entity_id: roomId, description: '房间已删除' }
    })
  },

  updateRoom(roomId, payload) {
    const room = db.findById('rooms', roomId)
    if (!room) {
      createError('房间不存在')
    }
    const updated = db.update('rooms', roomId, {
      ...payload,
      status: room.status
    })
    addLog({ type: 'update', module: '房间管理', description: `更新房间 ${room.room_number}` })
    addBusinessEvent({ type: 'room_updated', module: 'rooms', entity_id: roomId, description: '房间基础信息已更新' })
    return updated
  },

  createRoom(payload) {
    const room = db.insert('rooms', {
      ...payload,
      status: 'vacant'
    })
    logAndEvent({
      log: { type: 'create', module: '房间管理', description: `新增房间 ${room.room_number}` },
      event: { type: 'room_created', module: 'rooms', entity_id: room.id, description: '房间已创建' }
    })
    return room
  },

  deleteTenant(tenantId) {
    const tenant = db.findById('tenants', tenantId)
    if (!tenant) {
      createError('租户不存在')
    }
    const hasContract = db.getTable('contracts').some((item) => item.tenant_id === tenantId)
    const hasDeposit = db.getTable('deposits').some((item) => item.tenant_id === tenantId)
    if (hasContract || hasDeposit) {
      createError('租户已被合同或押金记录引用，不能删除')
    }
    db.delete('tenants', tenantId)
    logAndEvent({
      log: { type: 'delete', module: '租户管理', description: `删除租户 ${tenant.name}` },
      event: { type: 'tenant_deleted', module: 'tenants', entity_id: tenantId, description: '租户已删除' }
    })
  },

  createTenant(payload) {
    ensureTenantRoomAssignable(payload.room_id, '')
    const tenant = db.insert('tenants', {
      ...payload,
      room_id: payload.room_id || null
    })
    logAndEvent({
      log: { type: 'create', module: '租户管理', description: `新增租户 ${tenant.name}` },
      event: { type: 'tenant_created', module: 'tenants', entity_id: tenant.id, description: '租户已创建' }
    })
    return tenant
  },

  updateTenant(tenantId, payload) {
    ensureTenantExists(tenantId)
    const activeContract = getActiveContractByTenant(tenantId)
    if (activeContract && payload.room_id && payload.room_id !== activeContract.room_id) {
      createError('该租户已有执行中合同，关联房间需与合同房间一致')
    }
    ensureTenantRoomAssignable(payload.room_id || null, tenantId)
    const tenant = db.update('tenants', tenantId, {
      ...payload,
      room_id: activeContract?.room_id || payload.room_id || null
    })
    addLog({ type: 'update', module: '租户管理', description: `更新租户 ${payload.name || tenant?.name || tenantId}` })
    addBusinessEvent({ type: 'tenant_updated', module: 'tenants', entity_id: tenantId, description: '租户信息已更新' })
    return tenant
  },

  createMaintenanceOrder(payload) {
    const order = db.insert('maintenance_orders', payload)
    db.update('rooms', payload.room_id, { status: 'maintenance' })
    logAndEvent({
      log: { type: 'create', module: '维修管理', description: `创建维修工单 ${order.id}` },
      event: { type: 'maintenance_created', module: 'maintenance_orders', entity_id: order.id, description: '维修工单已创建' }
    })
    addNotification({
      category: 'maintenance',
      type: 'primary',
      title: '新维修工单',
      message: `房间${db.findById('rooms', payload.room_id)?.room_number || '-'}新增维修工单。`,
      action: { text: '查看工单', route: '/maintenance' },
      dedupe_key: `maintenance-created:${order.id}`
    })
    return order
  },

  updateMaintenanceOrder(orderId, payload) {
    const order = db.findById('maintenance_orders', orderId)
    if (!order) {
      createError('维修工单不存在')
    }
    const updated = db.update('maintenance_orders', orderId, payload)
    syncRoomStatus(updated.room_id)
    addLog({ type: 'update', module: '维修管理', description: `更新维修工单 ${orderId}` })
    addBusinessEvent({ type: 'maintenance_updated', module: 'maintenance_orders', entity_id: orderId, description: '维修工单已更新' })
    return updated
  },

  deleteMaintenanceOrder(orderId) {
    const order = db.findById('maintenance_orders', orderId)
    if (!order) {
      createError('维修工单不存在')
    }
    db.delete('maintenance_orders', orderId)
    syncRoomStatus(order.room_id)
    logAndEvent({
      log: { type: 'delete', module: '维修管理', description: `删除维修工单 ${orderId}` },
      event: { type: 'maintenance_deleted', module: 'maintenance_orders', entity_id: orderId, description: '维修工单已删除' }
    })
  }
}

export default businessService
