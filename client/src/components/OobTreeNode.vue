<script>
// Named component so Vue can resolve the self-referencing recursion.
export default { name: 'OobTreeNode' };
</script>

<script setup>
import { ref, computed, inject, watch } from 'vue';
import { useOobStore } from '../stores/useOobStore.js';

const props = defineProps({
  node: {
    type: Object,
    required: true,
  },
  nodeType: {
    type: String,
    default: 'unit',
  },
});

const store = useOobStore();
const expanded = ref(true);

// Expand/collapse all — signals provided by OobHierarchyTree
const expandSignal = inject('expandSignal', null);
const collapseSignal = inject('collapseSignal', null);
if (expandSignal)
  watch(expandSignal, () => {
    expanded.value = true;
  });
if (collapseSignal)
  watch(collapseSignal, () => {
    expanded.value = false;
  });

// Build children from the node's actual shape.
// Order: leader(s) → HQ → inline units → batteries → structural children → leaf units
const childEntries = computed(() => {
  const n = props.node;
  const children = [];

  // Single commander (corps/division level)
  if (n._leader) {
    children.push({ node: n._leader, nodeType: 'leader' });
  }

  // Multiple commanders (e.g. cavalry division with div + bde leaders)
  if (n._leaders) {
    n._leaders.forEach((l) => children.push({ node: l, nodeType: 'leader' }));
  }

  // Synthetic HQ child (USA corps/army, CSA divisions)
  if (n._hq) {
    children.push({ node: n._hq, nodeType: 'hq' });
  }

  // Synthetic supply child (army/wing level)
  if (n._supply) {
    children.push({ node: n._supply, nodeType: 'supply' });
  }

  // Inline corps/division units (cavalry attached to corps, etc.)
  if (n.corpsUnits) {
    n.corpsUnits.forEach((u) => children.push({ node: u, nodeType: u.type ?? 'unit' }));
  }

  // Batteries before structural children
  if (n.batteries) {
    n.batteries.forEach((b) => children.push({ node: b, nodeType: 'battery' }));
  }

  // Artillery — fallback for unflattened keyed object groups
  if (n.artillery && typeof n.artillery === 'object' && !Array.isArray(n.artillery)) {
    Object.entries(n.artillery).forEach(([id, group]) => {
      children.push({ node: { id, ...group }, nodeType: 'artillery-group' });
    });
  }

  // Structural children (army → corps → division → brigade)
  if (n.corps) {
    n.corps.forEach((c) => children.push({ node: c, nodeType: 'corps' }));
  }
  if (n.cavalryDivision) {
    children.push({ node: n.cavalryDivision, nodeType: 'division' });
  }
  if (n.divisions) {
    n.divisions.forEach((d) => children.push({ node: d, nodeType: 'division' }));
  }
  if (n.brigades) {
    n.brigades.forEach((b) => children.push({ node: b, nodeType: 'brigade' }));
  }

  // Extra formations (independent, reserve arty, etc.) at wing/army level
  if (n._formations) {
    n._formations.forEach((f) => children.push(f));
  }

  // Leaf units
  if (n.regiments) {
    n.regiments.forEach((r) => children.push({ node: r, nodeType: r.type ?? 'regiment' }));
  }

  return children;
});

const hasChildren = computed(() => childEntries.value.length > 0);

const isSelected = computed(() => store.selectedNode === props.node);

const BADGE_MAP = {
  army: 'Army',
  wing: 'Wing',
  corps: 'Corps',
  division: 'Div',
  brigade: 'BDE',
  'artillery-group': 'Arty',
  independent: 'IDP',
  'reserve-arty': 'RES',
  hq: 'HQ',
  supply: 'SUPP',
  regiment: 'Inf',
  battery: 'Btry',
  cavalry: 'Cav',
  leader: 'Ldr',
  infantry: 'Inf',
  artillery: 'Arty',
  unit: 'Unit',
};

const badgeLabel = computed(() => BADGE_MAP[props.nodeType] ?? props.nodeType);

const RANK_ABBREV = {
  General: 'Gen',
  'Lieutenant General': 'Lt Gen',
  'Major General': 'Maj Gen',
  'Brigadier General': 'Brig Gen',
  Colonel: 'Col',
  'Lieutenant Colonel': 'Lt Col',
  Major: 'Maj',
  Captain: 'Cpt',
};

const rankAbbrev = computed(() =>
  props.nodeType === 'leader' && props.node.rank
    ? (RANK_ABBREV[props.node.rank] ?? props.node.rank)
    : null
);

function handleSelect() {
  store.selectNode(props.node);
}

function toggleExpand(event) {
  event.stopPropagation();
  expanded.value = !expanded.value;
}
</script>

<template>
  <div class="tree-node">
    <div
      class="node-row"
      :class="[`node-${nodeType}`, { selected: isSelected }]"
      @click="handleSelect"
    >
      <button v-if="hasChildren" class="expand-btn" @click="toggleExpand">
        {{ expanded ? '▼' : '▶' }}
      </button>
      <span v-else class="expand-spacer" />
      <span class="node-name">
        <span v-if="rankAbbrev" class="leader-rank">{{ rankAbbrev }}</span
        >{{ node.name }}
      </span>
      <span :class="['badge', `badge-${nodeType}`]">{{ badgeLabel }}</span>
    </div>
    <div v-if="expanded && hasChildren" class="children">
      <OobTreeNode
        v-for="child in childEntries"
        :key="child.node.id ?? child.node.name"
        :node="child.node"
        :node-type="child.nodeType"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  padding-left: 0.75rem;
}

.node-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.4rem;
  cursor: pointer;
  border-radius: 3px;
  user-select: none;
}

.node-row:hover {
  background: #2a2418;
}

.node-row.selected {
  background: #3a3020;
}

.expand-btn {
  background: none;
  border: none;
  color: #7a7060;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 0;
  width: 1rem;
  text-align: center;
}

.expand-spacer {
  display: inline-block;
  width: 1rem;
}

.node-name {
  flex: 1;
  font-size: 0.85rem;
  color: #c8b89a;
}

.badge {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 2px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.badge-army,
.badge-wing {
  background: #3a2810;
  color: #e8c060;
  font-weight: bold;
}

.badge-corps {
  background: #4a3820;
  color: #d4a04a;
}

.badge-division {
  background: #3a3820;
  color: #b8a070;
}

.badge-brigade {
  background: #2a3020;
  color: #8ab070;
}

.badge-artillery-group,
.badge-artillery,
.badge-arty {
  background: #302830;
  color: #a070a0;
}

.badge-regiment,
.badge-infantry,
.badge-unit {
  background: #203040;
  color: #6090b0;
}

.badge-cavalry {
  background: #302020;
  color: #b07060;
}

.badge-battery {
  background: #281828;
  color: #906880;
}

.badge-leader {
  background: #203028;
  color: #60a880;
}

.leader-rank {
  color: #7a9080;
  font-size: 0.75em;
  margin-right: 0.35em;
}

.badge-independent {
  background: #282838;
  color: #7878c0;
}

.badge-reserve-arty {
  background: #302820;
  color: #b08840;
}

.badge-hq {
  background: #283028;
  color: #70a870;
}

.badge-supply {
  background: #282830;
  color: #7070b0;
}

.children {
  border-left: 1px solid #3a3020;
  margin-left: 0.5rem;
}
</style>
