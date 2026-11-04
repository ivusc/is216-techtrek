<script setup>
import SkillPicker from '@/components/SkillPicker.vue';

const skills = defineModel({ type: Array, required: true });
</script>

<template>
  <div class="card profile-card p-4 d-flex flex-column gap-3">
    <div>
      <h3 class="mb-1">Skills</h3>
      <p class="small text-body-tertiary mb-0">
        Your strengths. The Teams page uses these for "Match my skills", and team leaders can find
        you by them when Show me in Teammate Finder is on. Press Save to update them.
      </p>
    </div>
    <SkillPicker v-model="skills" large />
  </div>
</template>
