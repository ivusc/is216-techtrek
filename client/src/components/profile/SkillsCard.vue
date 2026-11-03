<script setup>
import SkillInput from '@/components/teams/SkillInput.vue';

const skills = defineModel({ type: Array, required: true });
</script>

<template>
  <div class="card profile-card p-4 d-flex flex-column gap-3">
    <div>
      <h3 class="mb-1">Skills</h3>
      <p class="small text-body-tertiary mb-0">Used to match you with teams and recommend roles.</p>
    </div>
    <SkillInput v-model="skills" placeholder="Add a skill and press Enter" />
  </div>
</template>
