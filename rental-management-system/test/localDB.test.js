import test from 'node:test'
import assert from 'node:assert/strict'
import { installLocalStorage } from './helpers/localStorage.js'

installLocalStorage()

const { default: db, DB_SCHEMA_VERSION, DB_TABLES, validateImportData } = await import('../src/utils/localDB.js')

test('exportData includes schema metadata and every table', () => {
  const exported = db.exportData()

  assert.equal(exported.__schema_version, DB_SCHEMA_VERSION)
  assert.match(exported.__exported_at, /^\d{4}-\d{2}-\d{2}T/)
  DB_TABLES.forEach((tableName) => {
    assert.ok(Array.isArray(exported[tableName]), `${tableName} should be exported`)
  })
})

test('validateImportData rejects missing required tables before import writes data', () => {
  const before = db.getTable('cities')

  assert.throws(
    () => db.importData({ users: [] }),
    /缺少有效的 cities 数据表/
  )
  assert.deepEqual(db.getTable('cities'), before)
})

test('validateImportData rejects broken references', () => {
  const exported = db.exportData()
  exported.rooms[0] = { ...exported.rooms[0], project_id: 'missing-project' }

  assert.throws(
    () => validateImportData(exported),
    /关联的项目不存在/
  )
})

test('importData accepts a valid backup and normalizes meta defaults', () => {
  const exported = db.exportData()
  delete exported.__meta

  assert.doesNotThrow(() => db.importData(exported))
  assert.equal(localStorage.getItem('rental_db_initialized'), 'true')
  assert.deepEqual(JSON.parse(localStorage.getItem('notifications')), [])
})
