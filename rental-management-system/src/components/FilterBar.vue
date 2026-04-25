<template>
  <section class="filter-bar surface-panel">
    <div class="filter-bar__main">
      <slot />
    </div>
    <div v-if="$slots.actions" class="filter-bar__actions">
      <slot name="actions" />
    </div>
  </section>
</template>

<style scoped>
.filter-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 20px;
}

.filter-bar__main {
  flex: 1;
  min-width: 0;
}

.filter-bar__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 991px) {
  .filter-bar {
    flex-direction: column;
  }

  .filter-bar__actions {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
