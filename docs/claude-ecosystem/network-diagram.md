# Network Diagrams

Visual overview of how agents, skills, and workflows relate in lob-online. All diagrams are
rendered from Mermaid — any Markdown viewer with Mermaid support (GitHub, VS Code + extension,
Obsidian) will display them as graphs.

---

## 1. Agent and Skill Ownership

Which agent owns which skills, and how agents collaborate.

```mermaid
graph TD
  subgraph devops[devops agent]
    dev-build
    dev-start
    dev-stop
    dev-test
  end

  subgraph pm[project-manager agent]
    issue-start
    issue-branch
    issue-implement
  end

  subgraph ii[issue-intake agent]
    issue-intake
  end

  subgraph cr[code-review agent]
    pr-review
    code-assess
  end

  rl[rules-lawyer agent — no skills]

  subgraph standalone[unowned skills]
    pr-create
    pr-merge
    plan-wrap
    agent-sync
    agent-regenerate
    agent-standardize
  end

  issue-intake -.->|consults| rl
  issue-intake -->|calls| pr-create
  issue-intake -->|calls| pr-merge
  pm -.->|delegates intake to| ii
  pm -.->|consults| rl
```

---

## 2. Skill Dependency Graph

Which skills call other skills as prerequisites or sub-steps.

```mermaid
graph LR
  issue-implement --> issue-start
  issue-implement --> issue-branch
  issue-implement --> dev-build
  issue-implement --> dev-test
  issue-implement --> pr-create
  issue-implement --> pr-review
  issue-implement --> pr-merge

  issue-intake --> pr-create
  issue-intake --> pr-merge

  pr-review --> dev-build
  pr-review --> dev-test

  code-assess --> dev-build
  code-assess --> dev-test

  agent-regenerate --> dev-build
  agent-standardize --> dev-build
```

---

## 3. Full SDLC Sequence — Issue to Merge

The complete flow from a raw idea to a squash-merged pull request, showing all human control
points (HCPs) where the engineer must give explicit approval before the workflow continues.

```mermaid
sequenceDiagram
  participant E as Engineer
  participant II as issue-intake
  participant IM as issue-implement
  participant IS as issue-start
  participant IB as issue-branch
  participant DB as dev-build / dev-test
  participant PC as pr-create
  participant PR as pr-review
  participant PM as pr-merge
  participant RL as rules-lawyer

  Note over E,RL: Phase 1 — Scope the work
  E->>II: /issue-intake
  II->>RL: consult (if game logic)
  RL-->>II: ruling
  II-->>E: HCP 1 — approve issue draft?
  E-->>II: confirm
  II->>II: gh issue create + commit artifact
  II-->>E: HCP 2 — merge intake PR?
  E-->>II: merge
  II->>PM: /pr-merge

  Note over E,PM: Phase 2 — Implement
  E->>IM: /issue-implement N
  IM->>IS: /issue-start
  IS-->>E: HCP 1 — approve plan?
  E-->>IM: proceed
  IM->>IB: /issue-branch
  Note over IM: Implement ACs
  IM->>DB: /dev-build then /dev-test
  IM-->>E: HCP 2 — push?
  E-->>IM: push
  IM->>PC: /pr-create
  IM->>PR: /pr-review
  PR-->>E: HCP 2b — triage findings
  E-->>IM: fix all / fix errors only / accept
  IM->>PM: /pr-merge
  PM-->>E: HCP 3 — merge?
  E-->>PM: merge
```

---

## 4. Issue Intake Detail

The six steps inside `/issue-intake`, showing the two HCPs and the code-free scope constraint.

```mermaid
flowchart TD
  A([Start]) --> B["Step 1: git checkout -b intake/{slug}"]
  B --> C["Step 2: Gather → classify → rules gate → draft → milestone check → refine loop"]
  C --> D{Issue draft approved?}
  D -- No --> C
  D -- Yes --> E["HCP 1 — gh issue create"]
  E --> F["Step 4: Write docs/intake/ artifact → git commit → git push"]
  F --> G["Step 5: /pr-create"]
  G --> H{Merge approved?}
  H -- No --> H
  H -- Yes --> I["Step 6: /pr-merge — retry on CI failure"]
  I --> J([Done])

  style B fill:#f0f4ff
  style E fill:#fff3cd
  style H fill:#fff3cd
```
