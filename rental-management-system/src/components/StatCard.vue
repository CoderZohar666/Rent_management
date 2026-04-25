<template>
  <article class="stat-card surface-panel" :class="`stat-card--${tone}`">
    <div class="stat-card__icon">
      <slot name="icon" />
    </div>
    <div class="stat-card__content">
      <p class="stat-card__label">{{ label }}</p>
      <div class="stat-card__value metric-value">{{ value }}</div>
      <p v-if="hint" class="stat-card__hint">{{ hint }}</p>
    </div>
  </article>
</template>

<script setup>
defineProps({
  label: {
    type: String,
    required: true
  },
  value: {
    type: [String, Number],
    required: true
  },
  hint: {
    type: String,
    default: ''
  },
  tone: {
    type: String,
    default: 'primary'
  }
})
</script>

<style scoped>
.stat-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  min-height: 132px;
  padding: 22px;
  overflow: hidden;
}

.stat-card::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  border-radius: 16px;
  background: var(--card-accent, var(--app-color-primary));
}

.stat-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: var(--card-accent-soft, var(--app-color-primary-soft));
  color: var(--card-accent, var(--app-color-primary));
  font-size: 24px;
  flex-shrink: 0;
}

.stat-card__content {
  min-width: 0;
}

.stat-card__label {
  margin: 0 0 10px;
  color: var(--app-color-text-secondary);
  font-size: 14px;
}

.stat-card__value {
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
  color: var(--app-color-text);
}

.stat-card__hint {
  margin: 10px 0 0;
  color: var(--app-color-text-muted);
  font-size: 13px;
}

.stat-card--primary {
  --card-accent: var(--app-color-primary);
  --card-accent-soft: var(--app-color-primary-soft);
}

.stat-card--success {
  --card-accent: var(--app-color-success);
  --card-accent-soft: var(--app-color-success-soft);
}

.stat-card--warning {
  --card-accent: var(--app-color-warning);
  --card-accent-soft: var(--app-color-warning-soft);
}

.stat-card--danger {
  --card-accent: var(--app-color-danger);
  --card-accent-soft: var(--app-color-danger-soft);
}
</style>
