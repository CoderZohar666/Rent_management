<template>
  <el-card class="section-card" :body-style="bodyStyle">
    <template v-if="title || subtitle || $slots.actions" #header>
      <div class="section-card__header">
        <div>
          <div v-if="title" class="section-card__title">{{ title }}</div>
          <div v-if="subtitle" class="section-card__subtitle">{{ subtitle }}</div>
        </div>
        <div v-if="$slots.actions" class="toolbar-actions">
          <slot name="actions" />
        </div>
      </div>
    </template>
    <slot />
  </el-card>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  subtitle: {
    type: String,
    default: ''
  },
  bodyStyle: {
    type: Object,
    default: () => ({})
  }
})
</script>
