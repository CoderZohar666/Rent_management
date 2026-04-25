export const chartColorPalette = ['#2563EB', '#12B981', '#F59E0B', '#EF4444', '#7C3AED']

export const getChartBaseOption = () => ({
  color: chartColorPalette,
  textStyle: {
    color: '#475569',
    fontFamily: '"SF Pro Text", "PingFang SC", "Microsoft YaHei", sans-serif'
  },
  grid: {
    left: 24,
    right: 16,
    top: 32,
    bottom: 24,
    containLabel: true
  },
  tooltip: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 0,
    textStyle: {
      color: '#F8FAFC'
    },
    padding: [10, 12]
  },
  legend: {
    top: 0,
    itemWidth: 10,
    itemHeight: 10,
    textStyle: {
      color: '#475569'
    }
  },
  xAxis: {
    axisLine: {
      lineStyle: {
        color: '#CBD5E1'
      }
    },
    axisLabel: {
      color: '#64748B'
    },
    splitLine: {
      show: false
    }
  },
  yAxis: {
    axisLine: {
      show: false
    },
    axisLabel: {
      color: '#64748B'
    },
    splitLine: {
      lineStyle: {
        color: '#E2E8F0'
      }
    }
  }
})
