<template>
  <div v-if="items.length" class="active-filters-inline">
    <span class="active-filters-inline__label">已选筛选</span>
    <el-tag
      v-for="item in items"
      :key="item.key"
      closable
      class="status-chip active-filters-inline__tag"
      @close="$emit('remove', item.key)"
    >
      {{ item.label }}
    </el-tag>
  </div>
</template>

<script setup>
defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

defineEmits(['remove'])
</script>

<style scoped>
.active-filters-inline {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.active-filters-inline__label {
  color: var(--app-color-text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.active-filters-inline__tag {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.12);
  color: var(--app-color-primary);
}
</style>
