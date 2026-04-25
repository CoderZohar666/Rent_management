/**
 * Excel导出工具
 */
import ExcelJS from 'exceljs'
import dayjs from 'dayjs'

/**
 * 导出表格数据到Excel
 * @param {Array} data - 数据数组
 * @param {Array} columns - 列配置 [{header: '列名', key: '字段名', width: 宽度}]
 * @param {String} fileName - 文件名
 * @param {String} sheetName - 工作表名
 */
export const exportToExcel = async (data, columns, fileName, sheetName = '数据') => {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)
  
  // 添加列配置
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 15
  }))
  
  // 添加数据
  data.forEach(row => {
    worksheet.addRow(row)
  })
  
  // 设置表头样式
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF409EFF' }
  }
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' }
  
  // 设置数据样式
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell(cell => {
        cell.alignment = { vertical: 'middle' }
      })
    }
  })
  
  // 冻结首行
  worksheet.views = [
    { state: 'frozen', ySplit: 1 }
  ]
  
  // 下载文件
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}_${dayjs().format('YYYY-MM-DD')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 导出多个工作表
 * @param {Array} sheets - 工作表配置数组 [{name: '表名', columns: [], data: []}]
 * @param {String} fileName - 文件名
 */
export const exportMultipleSheets = async (sheets, fileName) => {
  const workbook = new ExcelJS.Workbook()
  
  sheets.forEach(sheet => {
    const worksheet = workbook.addWorksheet(sheet.name)
    
    worksheet.columns = sheet.columns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width || 15
    }))
    
    sheet.data.forEach(row => {
      worksheet.addRow(row)
    })
    
    // 设置表头样式
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF409EFF' }
    }
  })
  
  // 下载文件
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}_${dayjs().format('YYYY-MM-DD')}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
