<script setup>
import { computed } from 'vue';
import { safeHttpUrl } from '@/utils/url';

const github = defineModel('github', { type: String, default: '' });
const linkedin = defineModel('linkedin', { type: String, default: '' });
// Telegram username (no @). Only people in your teams see it, so they can message you.
const telegram = defineModel('telegram', { type: String, default: '' });

defineProps({
  editing: { type: Boolean, default: false },
});

const links = computed(() => [
  { key: 'github', label: 'GitHub', icon: 'bi-github', href: safeHttpUrl(github.value) },
  { key: 'linkedin', label: 'LinkedIn', icon: 'bi-linkedin', href: safeHttpUrl(linkedin.value) },
  {
    key: 'telegram',
    label: 'Telegram · only your teammates see this',
    icon: 'bi-telegram',
    href: telegram.value ? 'https://t.me/' + encodeURIComponent(telegram.value.replace(/^@/, '')) : '',
  },
]);

function shortUrl(url) {
  return url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '');
}
</script>

<template>
  <div class="card profile-card p-4">
    <h3 class="h4 mb-3">Links</h3>

    <div v-if="editing" class="d-flex flex-column gap-3">
      <div>
        <label for="profile-github" class="form-label small fw-semibold">GitHub</label>
        <input
          id="profile-github"
          v-model.trim="github"
          type="url"
          inputmode="url"
          class="form-control"
          placeholder="https://github.com/your-username"
        />
      </div>
      <div>
        <label for="profile-linkedin" class="form-label small fw-semibold">LinkedIn</label>
        <input
          id="profile-linkedin"
          v-model.trim="linkedin"
          type="url"
          inputmode="url"
          class="form-control"
          placeholder="https://www.linkedin.com/in/your-name"
        />
      </div>
      <div>
        <label for="profile-telegram" class="form-label small fw-semibold">Telegram</label>
        <div class="input-group">
          <span class="input-group-text">@</span>
          <input
            id="profile-telegram"
            v-model.trim="telegram"
            type="text"
            class="form-control"
            placeholder="your_username"
            autocomplete="off"
            aria-describedby="profile-telegram-hint"
          />
        </div>
        <p id="profile-telegram-hint" class="text-caption text-body-tertiary mt-1 mb-0">
          Only people in your teams see this, so they can message you.
        </p>
      </div>
    </div>

    <div v-else class="d-flex flex-column gap-2">
      <template v-for="link in links" :key="link.key">
        <a
          v-if="link.href"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          class="profile-link d-flex align-items-center gap-3 rounded-3 text-decoration-none"
        >
          <span class="profile-link-icon"
            ><i :class="`bi ${link.icon}`" aria-hidden="true"></i
          ></span>
          <span class="profile-link-text flex-grow-1">
            <span class="d-block small fw-semibold text-body text-truncate">
              {{ shortUrl(link.href) }}
            </span>
            <span class="d-block text-caption text-body-tertiary">{{ link.label }}</span>
          </span>
          <i class="bi bi-box-arrow-up-right text-body-tertiary" aria-hidden="true"></i>
        </a>
        <div v-else class="profile-link d-flex align-items-center gap-3 rounded-3">
          <span class="profile-link-icon"
            ><i :class="`bi ${link.icon}`" aria-hidden="true"></i
          ></span>
          <span class="small text-body-tertiary">No {{ link.label }} added</span>
        </div>
      </template>
    </div>
  </div>
</template>
