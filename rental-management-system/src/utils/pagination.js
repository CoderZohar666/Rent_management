/**
 * 通用分页工具
 */

/**
 * 使用分页数据
 * @param {Array} data - 完整数据数组
 * @param {Number} currentPage - 当前页码
 * @param {Number} pageSize - 每页条数
 * @returns {Array} 分页后的数据
 */
export const paginate = (data, currentPage, pageSize) => {
  if (!data || data.length === 0) return []
  
  const start = (currentPage - 1) * pageSize
  const end = start + pageSize
  return data.slice(start, end)
}

/**
 * 获取分页配置
 * @returns {Object} 分页配置对象
 */
export const getPaginationConfig = () => {
  const settings = JSON.parse(localStorage.getItem('system_settings') || '{}')
  return {
    pageSize: settings.page_size || 20,
    pageSizes: [10, 20, 50, 100]
  }
}
