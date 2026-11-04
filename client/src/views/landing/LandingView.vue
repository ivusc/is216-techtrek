<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import './landing.css'
import LandingNav from '@/components/landing/LandingNav.vue'
import HeroPreview from '@/components/landing/HeroPreview.vue'
import ProblemCards from '@/components/landing/ProblemCards.vue'
import FeatureTabs from '@/components/landing/FeatureTabs.vue'
import HowItWorks from '@/components/landing/HowItWorks.vue'
import { useUserStore } from '@/store/user'
import { fetchHackathons, fetchJobs } from '@/services/opportunityService'
import { heroWords, problems, features, steps, extras } from './content'

// The public landing page at "/". It follows the project proposal: the problem (Project Overview)
// and the features (Objectives / Functionality).
const auth = useUserStore()

// ─── scrolling: the page scrolls inside this element (@scroll), and that drives the effects below ───
const page = ref(null)
const scrollTop = ref(0) // > 0 once the page has moved: the top bar gets a shadow
const revealed = ref({}) // sections that have scrolled into view (they fade and slide in once)
const activeSection = ref('') // the section under the top bar, underlined in the nav
const howProgress = ref(0) // how far through "How it works" you are, 0 to 1 (fills the line)
const featuresOnScreen = ref(false) // the feature tabs only move on by themselves while you can see them

const REVEAL_IDS = ['stats', 'problem', 'features', 'how', 'extras', 'join']
const NAV_IDS = ['problem', 'features', 'how']

// where a section's top edge is, measured from the top of the screen
function topOf(id) {
  const section = document.getElementById(id)
  return section ? section.getBoundingClientRect() : null
}

function onScroll() {
  if (!page.value) return
  scrollTop.value = page.value.scrollTop
  const screen = page.value.clientHeight || window.innerHeight

  // reveal each section once its top is 85% of the way up the screen
  const seen = { ...revealed.value }
  for (const id of REVEAL_IDS) {
    const box = topOf(id)
    if (box && box.top < screen * 0.85) seen[id] = true
  }
  revealed.value = seen

  // the nav underlines the last section whose top has passed 40% of the screen
  let current = ''
  for (const id of NAV_IDS) {
    const box = topOf(id)
    if (box && box.top < screen * 0.4) current = id
  }
  activeSection.value = current

  // "How it works": 0 when its top reaches 60% of the screen, 1 when its bottom does
  const how = topOf('how')
  if (how) {
    const progress = (screen * 0.6 - how.top) / how.height
    howProgress.value = Math.min(Math.max(progress, 0), 1)
  }

  const featureBox = topOf('features')
  featuresOnScreen.value = featureBox !== null && featureBox.top < screen * 0.7 && featureBox.bottom > screen * 0.3

  if (revealed.value.stats) startCounters()
}

// nav links and buttons scroll smoothly to a section ("top" = back to the hero)
function goTo(id) {
  if (id === 'top') {
    page.value?.scrollTo({ top: 0, behavior: 'smooth' })
    return
  }
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// "See how" on a problem card opens that feature's tab and scrolls to it
const activeFeature = ref(features[0].id)
const featureChosen = ref(false) // a problem card opened a tab, so the tabs stop moving on by themselves
function openFeature(id) {
  activeFeature.value = id
  featureChosen.value = true
  goTo('features')
}

// ─── the hero headline: "Every tech ___ at SMU" swaps its word every 2.4 seconds ───
const wordIndex = ref(0)
let wordTimer = null

// ─── live numbers: real counts from TechTrek's own API, counting up once they scroll into view ───
// target: the real number (null until it loads); shown: the number on screen while it counts up
const stats = ref([
  { id: 'hackathons', icon: 'bi-trophy', label: 'open hackathons right now', target: null, shown: 0, failed: false },
  { id: 'jobs', icon: 'bi-briefcase', label: 'tech jobs in Singapore', target: null, shown: 0, failed: false },
  { id: 'tools', icon: 'bi-grid-1x2', label: 'tools in one app', target: features.length, shown: 0, failed: false }
])
const counterTimers = []

// count one number up from 0 to its target in about a second (40 steps, slowing down at the end)
function countUp(stat) {
  if (stat.started || stat.target === null) return
  stat.started = true
  const steps = 40
  let step = 0
  const timer = setInterval(() => {
    step++
    const t = step / steps
    stat.shown = Math.round(stat.target * (1 - Math.pow(1 - t, 3)))
    if (step >= steps) clearInterval(timer)
  }, 30)
  counterTimers.push(timer)
}

function startCounters() {
  for (const stat of stats.value) countUp(stat)
}

function setTarget(id, value) {
  const stat = stats.value.find((item) => item.id === id)
  if (value === null || value === undefined) {
    stat.failed = true // couldn't load: that number is left out
    return
  }
  stat.target = value
  if (revealed.value.stats) countUp(stat)
}

async function loadNumbers() {
  try {
    const hackathons = await fetchHackathons()
    setTarget('hackathons', hackathons.length)
  } catch (error) {
    console.error(error)
    setTarget('hackathons', null)
  }
}

async function loadJobCount() {
  try {
    const result = await fetchJobs(1)
    setTarget('jobs', result.count)
  } catch (error) {
    console.error(error)
    setTarget('jobs', null)
  }
}

function formatNumber(value) {
  return value.toLocaleString('en-SG')
}

onMounted(() => {
  onScroll() // reveal whatever is already on screen
  loadNumbers()
  loadJobCount()
  wordTimer = setInterval(() => {
    wordIndex.value = (wordIndex.value + 1) % heroWords.length
  }, 2400)
})

onUnmounted(() => {
  clearInterval(wordTimer)
  for (const timer of counterTimers) clearInterval(timer)
})
</script>

<template>
  <div ref="page" class="landing" @scroll="onScroll">
    <LandingNav :logged-in="auth.isLoggedIn" :scrolled="scrollTop > 8" :active="activeSection" @go="goTo" />

    <!-- ─── Hero ─── -->
    <section id="top" class="hero position-relative overflow-hidden">
      <span class="hero-circle hero-circle-sky" aria-hidden="true"></span>
      <span class="hero-circle hero-circle-rose" aria-hidden="true"></span>

      <div class="landing-container position-relative">
        <div class="row g-4 g-lg-5 align-items-center">
          <div class="col-12 col-lg-6 hero-copy">
            <p class="eyebrow d-inline-flex align-items-center gap-2 mb-3">
              <i class="bi bi-mortarboard-fill" aria-hidden="true"></i> Built for SMU students in tech
            </p>
            <!-- the changing word has a line to itself, so swapping it never moves the rest of the headline -->
            <h1 class="hero-title display-1 mb-3">
              Every tech
              <span class="word-slot" aria-hidden="true">
                <span :key="heroWords[wordIndex]" class="word">{{ heroWords[wordIndex] }}</span>
              </span>
              <span class="visually-hidden">opportunity</span>
              at SMU, in one place.
            </h1>
            <p class="hero-lead mb-4">
              Internships, hackathons and competitions from across the web, with a tracker, a teammate finder and
              interview practice built in.
            </p>
            <div class="d-flex flex-wrap gap-2 mb-3">
              <RouterLink v-if="auth.isLoggedIn" to="/home" class="btn btn-tt-accent btn-lg fw-semibold">
                Open TechTrek <i class="bi bi-arrow-right" aria-hidden="true"></i>
              </RouterLink>
              <RouterLink v-else :to="{ path: '/login', query: { mode: 'signup' } }" class="btn btn-tt-accent btn-lg fw-semibold">
                Get started, it's free <i class="bi bi-arrow-right" aria-hidden="true"></i>
              </RouterLink>
              <button type="button" class="btn btn-light btn-lg fw-semibold" @click="goTo('problem')">See why</button>
            </div>
            <p class="text-caption text-body-secondary mb-0">
              <i class="bi bi-shield-check text-primary" aria-hidden="true"></i> Sign up with your @smu.edu.sg email
            </p>
          </div>
          <div class="col-12 col-lg-6">
            <HeroPreview />
          </div>
        </div>

        <!-- live numbers from TechTrek's own API -->
        <div id="stats" class="stats-row reveal" :class="{ 'is-in': revealed.stats }">
          <template v-for="(stat, index) in stats" :key="stat.id">
            <div v-if="!stat.failed" class="stat-card card d-flex flex-row align-items-center gap-3 p-3" :style="{ transitionDelay: index * 90 + 'ms' }">
              <span class="stat-icon rounded-3 d-flex align-items-center justify-content-center" aria-hidden="true">
                <i class="bi" :class="stat.icon"></i>
              </span>
              <span>
                <span class="text-stat d-block" :aria-label="stat.target === null ? 'Loading' : formatNumber(stat.target)">
                  <template v-if="stat.target === null"><span class="stat-loading" aria-hidden="true">···</span></template>
                  <template v-else>{{ formatNumber(stat.shown) }}</template>
                </span>
                <span class="small text-body-secondary">{{ stat.label }}</span>
              </span>
            </div>
          </template>
        </div>
      </div>
    </section>

    <!-- ─── The problem (Project Overview) ─── -->
    <section id="problem" class="landing-section">
      <div class="landing-container">
        <div class="section-head reveal" :class="{ 'is-in': revealed.problem }">
          <p class="eyebrow mb-2">The problem</p>
          <h2 class="section-title mb-3">Chasing tech opportunities shouldn't feel like a second degree</h2>
          <p class="section-lead mb-0">
            Internships, hackathons and competitions are spread across different platforms. Keeping track of them,
            preparing for interviews and finding a team all take time most students don't have.
          </p>
        </div>
        <ProblemCards :problems="problems" :shown="revealed.problem" @see-feature="openFeature" />
      </div>
    </section>

    <!-- ─── The solution (Objectives / Functionality) ─── -->
    <section id="features" class="landing-section section-tinted">
      <div class="landing-container">
        <div class="section-head reveal" :class="{ 'is-in': revealed.features }">
          <p class="eyebrow mb-2">The solution</p>
          <h2 class="section-title mb-3">Four tools, one place, each one fixing a problem</h2>
          <p class="section-lead mb-0">Pick a tab to see what it does. Each one is a page in TechTrek you can open today.</p>
        </div>
        <div class="reveal" :class="{ 'is-in': revealed.features }" style="transition-delay: 120ms">
          <FeatureTabs v-model:active="activeFeature" :features="features" :shown="featuresOnScreen" :chosen="featureChosen" />
        </div>
      </div>
    </section>

    <!-- ─── How it works ─── -->
    <section id="how" class="landing-section">
      <div class="landing-container">
        <div class="section-head reveal" :class="{ 'is-in': revealed.how }">
          <p class="eyebrow mb-2">How it works</p>
          <h2 class="section-title mb-3">From "that looks cool" to "I got the offer"</h2>
          <p class="section-lead mb-0">One opportunity, start to finish, without leaving TechTrek.</p>
        </div>
        <HowItWorks :steps="steps" :progress="howProgress" />
      </div>
    </section>

    <!-- ─── The little things ─── -->
    <section id="extras" class="landing-section section-tinted">
      <div class="landing-container">
        <div class="section-head reveal" :class="{ 'is-in': revealed.extras }">
          <p class="eyebrow mb-2">And the little things</p>
          <h2 class="section-title mb-0">Small touches that save you time</h2>
        </div>
        <div class="row g-3">
          <div v-for="(extra, index) in extras" :key="extra.title" class="col-12 col-sm-6 col-lg-4">
            <div class="extra-card card card-hover h-100 p-4 reveal" :class="{ 'is-in': revealed.extras }" :style="{ transitionDelay: revealed.extras ? index * 70 + 'ms' : '0ms' }">
              <span class="extra-icon rounded-3 d-flex align-items-center justify-content-center mb-3" aria-hidden="true">
                <i class="bi" :class="extra.icon"></i>
              </span>
              <h3 class="h3 mb-1">{{ extra.title }}</h3>
              <p class="text-body-secondary small mb-0">{{ extra.text }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ─── Closing call to action ─── -->
    <section id="join" class="landing-section pb-5">
      <div class="landing-container">
        <div class="cta-band bg-primary text-white position-relative overflow-hidden reveal" :class="{ 'is-in': revealed.join }">
          <span class="cta-circle cta-circle-sky" aria-hidden="true"></span>
          <span class="cta-circle cta-circle-peach" aria-hidden="true"></span>
          <span class="cta-circle cta-circle-rose" aria-hidden="true"></span>
          <div class="position-relative">
            <h2 class="display-5 text-white mb-3">Your next opportunity is one tab away</h2>
            <p class="cta-text mb-4">Find it, track it, team up for it and walk into the interview ready.</p>
            <div class="d-flex flex-wrap gap-2">
              <RouterLink v-if="auth.isLoggedIn" to="/home" class="btn btn-tt-accent btn-lg fw-semibold">Open TechTrek</RouterLink>
              <template v-else>
                <RouterLink :to="{ path: '/login', query: { mode: 'signup' } }" class="btn btn-tt-accent btn-lg fw-semibold">Create your account</RouterLink>
                <RouterLink to="/login" class="btn btn-light btn-lg fw-semibold">I already have one</RouterLink>
              </template>
            </div>
          </div>
        </div>
      </div>
    </section>

    <footer class="landing-footer">
      <div class="landing-container d-flex flex-column flex-md-row align-items-center justify-content-between gap-3 py-4">
        <span class="d-flex align-items-center gap-2">
          <img src="@/assets/logo.svg" alt="" width="20" height="20" />
          <span class="fw-semibold">TechTrek</span>
          <span class="text-body-secondary small">Every tech opportunity at SMU, in one place.</span>
        </span>
        <button type="button" class="btn btn-sm btn-link fw-semibold text-decoration-none" @click="goTo('top')">
          Back to top <i class="bi bi-arrow-up" aria-hidden="true"></i>
        </button>
      </div>
    </footer>
  </div>
</template>
