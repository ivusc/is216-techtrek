<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useNotificationStore } from '@/store/notifications'
import { describeNotification } from '@/utils/notification'
import { timeAgo } from '@/utils/team'

// the bell in the page header: a red count of unread notifications, and a dropdown listing them
defineProps({
  size: { type: Number, default: 36 }
})

const router = useRouter()
const store = useNotificationStore()
const { notifications, unreadCount, isLoading } = storeToRefs(store)

const items = computed(() => notifications.value.map((notification) => ({ ...notification, ...describeNotification(notification) })))
const badgeText = computed(() => (unreadCount.value > 9 ? '9+' : String(unreadCount.value)))

function open(item) {
  const original = notifications.value.find((notification) => notification._id === item._id)
  if (original) store.markRead(original)
  router.push(item.to)
}
</script>

<template>
  <div class="dropdown flex-shrink-0">
    <button
      type="button"
      class="bell-button btn bg-white border p-0 position-relative"
      :style="{ width: size + 'px', height: size + 'px' }"
      data-bs-toggle="dropdown"
      data-bs-auto-close="outside"
      aria-expanded="false"
      :aria-label="unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'"
      @click="store.refresh()"
    >
      <i class="bi" :class="unreadCount > 0 ? 'bi-bell-fill text-primary' : 'bi-bell'"></i>
      <span v-if="unreadCount > 0" :key="unreadCount" class="bell-badge badge rounded-pill bg-tt-accent text-white">{{ badgeText }}</span>
    </button>

    <div class="dropdown-menu dropdown-menu-end notification-menu p-0">
      <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
        <h2 class="h6 fw-semibold mb-0">Notifications</h2>
        <button
          v-if="unreadCount > 0"
          type="button"
          class="btn btn-link btn-sm p-0 fw-semibold text-decoration-none"
          @click="store.markAllRead()"
        >
          Mark all as read
        </button>
      </div>

      <div class="notification-list">
        <p v-if="items.length === 0 && isLoading" class="small text-body-secondary px-3 py-4 mb-0 text-center">Loading…</p>
        <div v-else-if="items.length === 0" class="text-center px-3 py-4">
          <i class="bi bi-bell-slash fs-3 text-body-tertiary" aria-hidden="true"></i>
          <p class="small text-body-secondary mb-0 mt-2">
            Nothing yet. Team requests, invites and people joining or leaving your teams show up here.
          </p>
        </div>

        <button
          v-for="item in items"
          :key="item._id"
          type="button"
          class="notification-item d-flex align-items-start gap-2 w-100 text-start border-0 px-3 py-2"
          :class="{ 'is-unread': !item.read }"
          @click="open(item)"
        >
          <span class="notification-icon rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" :class="'tone-' + item.tone">
            <i class="bi" :class="item.icon" aria-hidden="true"></i>
          </span>
          <span class="flex-grow-1 min-w-0">
            <span class="d-block small" :class="{ 'fw-semibold': !item.read }">{{ item.text }}</span>
            <span class="d-block text-caption text-body-secondary">{{ timeAgo(item.createdAt) }}</span>
          </span>
          <span v-if="!item.read" class="unread-dot rounded-circle bg-primary flex-shrink-0 mt-2" aria-label="Unread"></span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bell-button .bi {
  font-size: 1.05rem;
}

/* the count pops in whenever it changes */
.bell-badge {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 18px;
  padding: 3px 5px;
  font-size: 11px;
  line-height: 12px;
  border: 2px solid var(--bs-white);
  animation: badge-pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.5);
}

.notification-menu {
  width: min(360px, calc(100vw - 32px));
  overflow: hidden;
  border-radius: 12px;
}

.notification-list {
  max-height: min(420px, 60vh);
  overflow-y: auto;
}

.notification-item {
  background: transparent;
  color: var(--bs-body-color);
  transition: background-color 0.15s ease;
}
.notification-item + .notification-item {
  border-top: 1px solid var(--bs-border-color) !important;
}
.notification-item:hover,
.notification-item:focus-visible {
  background-color: var(--bs-secondary-bg);
}
.notification-item.is-unread {
  background-color: rgba(91, 63, 228, 0.05);
}
.notification-item.is-unread:hover {
  background-color: var(--bs-primary-bg-subtle);
}

.notification-icon {
  width: 32px;
  height: 32px;
  font-size: 15px;
}
.tone-primary { background-color: var(--bs-primary-bg-subtle); color: var(--bs-primary); }
.tone-success { background-color: var(--bs-success-bg-subtle); color: var(--bs-success-text-emphasis); }
.tone-warning { background-color: var(--bs-warning-bg-subtle); color: #8a5a00; }
.tone-muted { background-color: var(--bs-secondary-bg); color: var(--bs-secondary-color); }

.unread-dot {
  width: 8px;
  height: 8px;
}

@keyframes badge-pop {
  from { transform: scale(0.4); }
}

@media (prefers-reduced-motion: reduce) {
  .bell-badge { animation: none; }
}
</style>
