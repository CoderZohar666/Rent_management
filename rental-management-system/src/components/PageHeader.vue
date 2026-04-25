<template>
  <section class="page-header surface-panel">
    <div class="page-header__main">
      <div v-if="backable" class="page-header__back">
        <el-button text @click="$emit('back')">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
      </div>
      <p v-if="eyebrow" class="page-header__eyebrow">{{ eyebrow }}</p>
      <div class="page-header__heading">
        <h1 class="page-header__title">{{ title }}</h1>
        <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="page-header__actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<script setup>
import { ArrowLeft } from '@element-plus/icons-vue'

defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    default: ''
  },
  eyebrow: {
    type: String,
    default: ''
  },
  backable: {
    type: Boolean,
    default: false
  }
})

defineEmits(['back'])
</script>

<style scoped>
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 24px 28px;
}

.page-header__main {
  min-width: 0;
}

.page-header__back {
  margin-bottom: 8px;
}

.page-header__eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--app-color-primary);
}

.page-header__heading {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.page-header__title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  color: var(--app-color-text);
}

.page-header__subtitle {
  margin: 0;
  max-width: 760px;
  color: var(--app-color-text-secondary);
}

.page-header__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 991px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
  }

  .page-header__title {
    font-size: 24px;
  }

  .page-header__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
