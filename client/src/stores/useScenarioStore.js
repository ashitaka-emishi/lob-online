import { ref } from 'vue';
import { defineStore } from 'pinia';

export const SCENARIOS = [
  { slug: 'THG', displayName: 'This Hallowed Ground' },
  { slug: 'TTS', displayName: 'This Terrible Sound' },
  { slug: 'AFS', displayName: 'A Fearful Slaughter' },
  { slug: 'SM', displayName: 'South Mountain' },
  { slug: 'LCV', displayName: 'Last Chance for Victory' },
  { slug: 'NBH', displayName: 'None But Heroes' },
  { slug: 'TTW', displayName: 'To Take Washington' },
  { slug: 'NTB', displayName: 'No Turning Back' },
  { slug: 'IB', displayName: 'Inferno in the Bluegrass' },
];

const VALID_SLUGS = new Set(SCENARIOS.map((s) => s.slug));
const LS_KEY = 'lob-selected-scenario';
const DEFAULT_SLUG = 'THG';

function loadFromStorage() {
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored && VALID_SLUGS.has(stored)) return stored;
  } catch (_) {
    // localStorage unavailable (e.g. SSR or privacy mode)
  }
  return DEFAULT_SLUG;
}

export const useScenarioStore = defineStore('scenario', () => {
  const selectedSlug = ref(loadFromStorage());

  function setScenario(slug) {
    if (!VALID_SLUGS.has(slug)) return;
    selectedSlug.value = slug;
    try {
      localStorage.setItem(LS_KEY, slug);
    } catch (_) {
      // ignore write failures
    }
  }

  function scenarioPath(suffix) {
    const clean = suffix.startsWith('/') ? suffix.slice(1) : suffix;
    return `/scenarios/${selectedSlug.value}/${clean}`;
  }

  return { selectedSlug, setScenario, scenarioPath };
});
