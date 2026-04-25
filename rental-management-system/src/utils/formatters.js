export const formatCurrency = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0'
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  })
}

export const formatDecimal = (value, digits = 1) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0'
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
}

export const formatPercent = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '0%'
  return `${Math.round(amount)}%`
}
