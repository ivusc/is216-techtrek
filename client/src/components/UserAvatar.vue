<script setup>
import { computed, ref, watch } from 'vue';
import serverAPI from '@/services/serverAPI';
import { getAvatarStyle, getInitials } from '@/utils/team';

const props = defineProps({
  userId: { type: String, default: '' },
  name: { type: String, required: true },
  avatarUpdatedAt: { type: String, default: '' },
  size: { type: Number, default: 32 },
  square: { type: Boolean, default: false },
});

const failed = ref(false);

watch(
  () => props.avatarUpdatedAt,
  () => {
    failed.value = false;
  },
);

const photoUrl = computed(() =>
  props.userId && props.avatarUpdatedAt && !failed.value
    ? `${serverAPI.defaults.baseURL}/users/${props.userId}/avatar?v=${encodeURIComponent(props.avatarUpdatedAt)}`
    : null,
);

const style = computed(() => ({
  ...getAvatarStyle(props.name),
  width: `${props.size}px`,
  height: `${props.size}px`,
  fontSize: `${Math.round(props.size * 0.36)}px`,
}));
</script>

<template>
  <span
    class="d-inline-flex justify-content-center align-items-center flex-shrink-0 overflow-hidden fw-semibold border border-2 border-white"
    :class="square ? 'rounded-3' : 'rounded-circle'"
    :style="style"
    :title="name"
  >
    <img
      v-if="photoUrl"
      :src="photoUrl"
      :alt="name"
      class="w-100 h-100 object-fit-cover"
      @error="failed = true"
    />
    <template v-else>{{ getInitials(name) }}</template>
  </span>
</template>
