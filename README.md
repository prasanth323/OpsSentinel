# 🛡️ OpsSentinel — Autonomous Multi-Agent SRE Incident Remediation Engine

> **Built for Hackathon Excellence | Theme: Agentic AI & Intelligent Systems**  
> *Transforming 3:00 AM P1 operational toil into deterministic, safe, 5-second resolutions.*

---

## ⚡ 1. Problem Statement
Modern cloud infrastructure generates millions of telemetry signals per second. When a critical P1 outage occurs:
- **Alert Fatigue & Cognitive Overload:** On-call engineers are inundated with fragmented Grafana alerts, Kafka lag spikes, and unreadable Kubernetes log streams.
- **Mean Time to Identify (MTTI) > 25 Minutes:** Isolating whether an outage stems from a poisoned database pool, container memory leak (OOMKilled), or an upstream network gatekeeper takes dozens of manual CLI hops.
- **Fear of Blast Radius:** Fully autonomous agents without safeguards are feared in production because a hallucinated command could wipe persistent volumes or drop production schemas.

---

## 🚀 2. The OpsSentinel Solution
**OpsSentinel** is a defense-grade SRE command center powered by a **4-Stage Multi-Agent Orchestration Pipeline** coupled with a cryptographically enforced **Human-in-the-Loop Safeguard**.

```
[ Inbound P1 Incident Telemetry ]
               │
               ▼
┌────────────────────────────────────────────────────────┐
│  AGENT 1: Triager & Metric Correlator                  │
│  • Correlates 5xx errors & P99 latency with deployments│
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│  AGENT 2: Code Diff & Git Inspector                    │
│  • Inspects Git commits (e.g. sha-7b819, sha-8f92a)    │
│  • Pinpoints exact buggy function or unreleased socket │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│  AGENT 3: Remediation Planner                          │
│  • Synthesizes surgical CLI command & rollback plan    │
└──────────────────────┬─────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────┐
│  AGENT 4: SRE Risk Evaluator & Gatekeeper              │
│  • Computes blast radius & safety confidence score     │
│  • 🛑 HALTS PIPELINE FOR HUMAN-IN-THE-LOOP APPROVAL    │
└──────────────────────┬─────────────────────────────────┘
                       │
        [ Staff SRE Authorize vs Reject ]
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
   [ Authorize ]              [ Reject ]
   • Real-Time CLI Stream     • Abort & Log
   • SVG Telemetry Normalizes
   • Auto Post-Mortem RCA
```

---

## 🏆 3. The Winning Differentiator: Human-in-the-Loop Safeguard
Rather than blindly executing destructive commands, **Agent 4 pauses execution** and renders a high-visibility **Interactive Action Card**:
- **Affected Microservice**
- **Surgical Proposed Command** (e.g., `kubectl rollout undo` or `pg_terminate_backend()`)
- **Computed Blast Radius & Dependency Impact**
- **Safety Confidence Score** (e.g., `98.7%`)

Upon operator authorization (`POST /api/agents/approve`):
1. **Live Terminal Output Streaming:** Real-time cluster rollout commands stream directly in the HUD.
2. **Dynamic SVG Telemetry Gauges:** Transition in real-time from critical crimson (84% error rate, 3800ms latency) down to healthy emerald green (< 0.1% error rate, 41ms latency).
3. **Executive Post-Mortem RCA:** Instantly synthesizes a comprehensive Markdown incident post-mortem adhering to Google SRE 5-Whys methodology with a 1-click clipboard copy.

---

## 🧪 4. Three 1-Click Real-World Demo Scenarios
OpsSentinel features 3 pre-configured incident buttons for instant live judging:
1. **PostgreSQL Connection Pool Saturation (`HTTP 500 Spike @ 84%`)**
   - *Root Cause:* Unreleased connection in transaction retry middleware.
   - *Agent Action:* Evicts zombie idle connections, inflates max pool headroom, rolls proxy pods.
2. **OOMKilled CrashLoopBackOff in Payment Consumer (`sha-8f92a`)**
   - *Root Cause:* Unbounded memory heap accumulator buffer.
   - *Agent Action:* Rollback to stable revision 34 and patch container cgroup memory limits.
3. **Cascading API Gateway Timeout & Rate-Limit Failure (`P99 > 3800ms`)**
   - *Root Cause:* Erroneous YAML circuit breaker throttle dropped max pending requests to 50.
   - *Agent Action:* Restores high-concurrency request ceilings with zero-downtime rolling restart.

---

## 🛠️ 5. Technology Stack
- **Frontend:** Vite, React 18, Tailwind CSS, React Router DOM, Lucide Icons, Axios.
- **Backend:** Node.js, Express.js, CORS, Dotenv.
- **Security & Auth:** JSON Web Tokens (JWT) + bcryptjs password hashing.
- **Input Validation:** Zod schema validation across all API endpoints.
- **Database:** SQLite (`better-sqlite3`) with automatic table creation & audit logging (`users`, `incidents`, `agent_executions`).
- **AI Engine:** Google Gemini API (`@google/generative-ai`) with **built-in deterministic fallback simulator** so live pitches never fail even if an API key is absent or rate-limited.

---

## 🚦 6. Quickstart & Deployment Instructions

### Prerequisites
- Node.js `v18.0.0+` (tested on `v20.18.0`)
- npm `v9+`

### Step 1: Clone and Enter the Project
\`\`\`bash
cd ops-sentinel
\`\`\`

### Step 2: Configure Server Environment
\`\`\`bash
cd server
cp .env.example .env
npm install
\`\`\`
*(Optional)* Add your Gemini API key in `server/.env`:
\`\`\`env
PORT=5001
JWT_SECRET=ops_sentinel_super_secret_jwt_key_2025_prod_secure
GEMINI_API_KEY=your_gemini_api_key_here
\`\`\`
> **Note:** If `GEMINI_API_KEY` is omitted, OpsSentinel's deterministic fallback engine activates automatically with zero errors!

### Step 3: Start the Backend Server
\`\`\`bash
npm run dev
# Server boots on http://localhost:5001
\`\`\`

### Step 4: Configure and Start the Frontend
In a new terminal window:
\`\`\`bash
cd ops-sentinel/client
npm install
npm run dev
# Frontend boots on http://localhost:5173
\`\`\`

### Step 5: Open the Application
Open your browser at:
👉 **`http://localhost:5173`**

---

## 🔑 7. Instant Demo Credentials
For effortless testing and hackathon evaluation:
- **Email:** `sre@sentinel.ai`
- **Password:** `sentinel2025`
- Or click the **"1-Click Fill Demo Credentials"** button on the Login screen!

---

## ⏱️ 8. 3-Minute Hackathon Pitch Script
1. **[0:00 - 0:45] The Problem:** Explain that cloud outages cost \$5,600 per minute. Start the **Pitch Clock** in the top navigation bar.
2. **[0:45 - 1:30] The Trigger:** Click **Scenario A (PostgreSQL Connection Pool Saturation)**. Notice the dynamic SVG gauges turn critical red (84.2% error rate).
3. **[1:30 - 2:15] The Multi-Agent Reasoning:** Point out how **Agent 1** isolates the service, **Agent 2** pinpoints `sha-7b819`, **Agent 3** drafts the surgical CLI fix, and **Agent 4** halts with the Human-in-the-Loop Action Card.
4. **[2:15 - 2:45] The Safe Execution:** Click **"Authorize & Execute Remediation"**. Watch live terminal execution logs stream into the HUD, while the SVG gauges normalize back to emerald green (< 0.1% error rate).
5. **[2:45 - 3:00] The Post-Mortem:** Show the automatically synthesized Executive RCA and click **"Copy Markdown"** to conclude!
