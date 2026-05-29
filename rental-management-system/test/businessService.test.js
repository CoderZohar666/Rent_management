import test from 'node:test'
import assert from 'node:assert/strict'
import { installLocalStorage } from './helpers/localStorage.js'

installLocalStorage()

const { default: db } = await import('../src/utils/localDB.js')
const { default: businessService } = await import('../src/services/businessService.js')

const resetTables = () => {
  localStorage.clear()
  for (const table of ['users', 'cities', 'projects', 'rooms', 'tenants', 'contracts', 'bills', 'maintenance_orders', 'meter_readings', 'deposits', 'business_events']) {
    db.createTable(table, [])
  }
  localStorage.setItem('rental_db_initialized', 'true')
  db.insert('cities', { id: 'city-a', name: '上海', status: 'active' })
  db.insert('projects', { id: 'project-a', city_id: 'city-a', name: '本地公寓', address: '本地路1号', total_rooms: 2, status: 'active' })
  db.insert('rooms', { id: 'room-a', project_id: 'project-a', room_number: '101', floor: 1, area: 32, rent_price: 3000, deposit: 6000, status: 'vacant' })
  db.insert('tenants', { id: 'tenant-a', name: '张三', phone: '13800138000', room_id: null })
}

test('contract creation validates dates, references, and syncs room and tenant state', () => {
  resetTables()

  assert.throws(
    () => businessService.createContract({
      room_id: 'room-a',
      tenant_id: 'tenant-a',
      start_date: '2026-06-01',
      end_date: '2026-05-01',
      monthly_rent: 3000,
      deposit: 6000
    }),
    /结束日期不能早于开始日期/
  )

  const contract = businessService.createContract({
    room_id: 'room-a',
    tenant_id: 'tenant-a',
    start_date: '2026-06-01',
    end_date: '2027-05-31',
    monthly_rent: 3000,
    deposit: 6000
  })

  assert.equal(contract.status, 'active')
  assert.equal(db.findById('rooms', 'room-a').status, 'rented')
  assert.equal(db.findById('tenants', 'tenant-a').room_id, 'room-a')
})

test('checkout is blocked until bills are paid and deposit is refunded', () => {
  resetTables()
  const contract = businessService.createContract({
    room_id: 'room-a',
    tenant_id: 'tenant-a',
    start_date: '2026-06-01',
    end_date: '2027-05-31',
    monthly_rent: 3000,
    deposit: 6000
  })
  const bill = businessService.generateRentBill(contract.id, '2026-06-05')
  const deposit = businessService.recordDeposit({
    room_id: 'room-a',
    tenant_id: 'tenant-a',
    amount: 6000,
    collect_date: '2026-06-01'
  })

  businessService.startCheckout(contract.id, '正常退租')
  assert.throws(() => businessService.settleCheckout(contract.id), /未结清账单/)

  businessService.markBillAsPaid(bill.id, '2026-06-06')
  assert.throws(() => businessService.settleCheckout(contract.id), /押金尚未完成退还/)

  businessService.refundDeposit(deposit.id, {
    deduction: 500,
    refund_amount: 5500,
    refund_date: '2026-06-30',
    refund_reason: '退租',
    deduction_reason: '清洁费'
  })
  const settled = businessService.settleCheckout(contract.id)

  assert.equal(settled.status, 'settled')
  assert.equal(db.findById('rooms', 'room-a').status, 'vacant')
  assert.equal(db.findById('tenants', 'tenant-a').room_id, null)
})

test('meter reading utility bill keeps source linkage consistent on delete', () => {
  resetTables()
  businessService.createContract({
    room_id: 'room-a',
    tenant_id: 'tenant-a',
    start_date: '2026-06-01',
    end_date: '2027-05-31',
    monthly_rent: 3000,
    deposit: 6000
  })
  const reading = businessService.createMeterReading({
    room_id: 'room-a',
    reading_date: '2026-06-20',
    water_meter: 10,
    electricity_meter: 100,
    gas_meter: 20,
    water_price: 5,
    electricity_price: 1,
    gas_price: 3
  })
  const bill = businessService.generateUtilityBillFromMeterReading(reading.id)

  assert.equal(db.findById('meter_readings', reading.id).generated_bill_id, bill.id)
  assert.throws(() => businessService.deleteMeterReading(reading.id), /已生成账单/)

  businessService.deleteBill(bill.id)
  assert.equal(db.findById('meter_readings', reading.id).generated_bill_id, null)
  assert.doesNotThrow(() => businessService.deleteMeterReading(reading.id))
})
