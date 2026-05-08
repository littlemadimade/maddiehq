---
name: configure-sso
description: Configure OAuth SSO providers for an AppSeed project. Detects which stacks (Node.js, Rails, or both) are present, configures providers, and writes credentials to the appropriate env files. Uses Chrome DevTools MCP browser automation when available, falls back to guided manual mode per-provider, and keeps Microsoft fully automated via az CLI.
allowed-tools: Read, Bash, Write, Edit, Glob, mcp__chrome-devtools__list_pages, mcp__chrome-devtools__new_page, mcp__chrome-devtools__select_page, mcp__chrome-devtools__navigate_page, mcp__chrome-devtools__take_snapshot, mcp__chrome-devtools__take_screenshot, mcp__chrome-devtools__click, mcp__chrome-devtools__fill, mcp__chrome-devtools__fill_form, mcp__chrome-devtools__wait_for, mcp__chrome-devtools__evaluate_script, mcp__chrome-devtools__press_key, mcp__chrome-devtools__hover
---

# configure-sso

You are configuring OAuth SSO providers for an AppSeed project. Do as much work as possible automatically. Minimize copy-paste requests to zero when browser automation is available.

---

## Phase 0 — Capability detection

### 0a. Detect browser automation

Attempt to call `list_pages`.

- **If it succeeds** → browser automation is available. Set `BROWSER_MODE=auto`. Log: `[configure-sso] Browser automation available via Chrome DevTools MCP`.
- **If it fails or throws** → no browser tools. Set `BROWSER_MODE=guided`. Log: `[configure-sso] No browser tools detected — using guided manual mode`.

### 0b. If BROWSER_MODE=auto: check login state per provider

Open a dedicated tab for SSO setup (keep the user's existing tabs untouched):

```
new_page("about:blank")
```

Hold the returned page ID as `SSO_PAGE_ID`. Use `select_page(SSO_PAGE_ID)` before every browser action in this skill.

For each provider, detect login state by navigating to its authenticated dashboard URL, taking a snapshot, and checking whether the page contains login-gate indicators (see Provider Login URLs below). Record the result as `{PROVIDER}_LOGGED_IN = true|false`.

**Provider Login URLs:**

| Provider  | Dashboard URL (requires auth)                                      | Login gate indicators |
|-----------|-------------------------------------------------------------------|-----------------------|
| Google    | `https://console.cloud.google.com/apis/credentials`               | snapshot contains "Sign in", "Choose an account", or `accounts.google.com` in URL |
| GitHub    | `https://github.com/settings/developers`                          | snapshot contains "Sign in" button or URL contains `github.com/login` |
| Facebook  | `https://developers.facebook.com/apps/`                          | snapshot contains "Log in" or URL contains `facebook.com/login` |
| Apple     | `https://developer.apple.com/account/resources/identifiers/list` | snapshot contains "Sign In" or URL contains `appleid.apple.com` |

Log the result for each: `[configure-sso] Google: logged in ✓` or `[configure-sso] Google: not logged in — will pause for auth`.

---

## Phase 1 — Orient yourself

1. **Detect which stack(s) are present:**
   - Check for `node/package.json` or `package.json` in the project root → Node.js stack present
   - Check for `rails/Gemfile` or `Gemfile` in the project root → Rails stack present
   - Record as `HAS_NODE=true|false` and `HAS_RAILS=true|false`

2. **Read env files for each stack:**
   - Node: Read `BETTER_AUTH_URL` from `.env.local` or `node/.env.local` (fall back to `.env.example`). If missing from both, ask the user before proceeding.
   - Rails: Read `APP_URL` from `rails/.env` (fall back to `rails/.env.example`). If missing, ask the user.

3. Extract the app name from `package.json` (`name` field, title-cased with hyphens → spaces) or from `rails/.env` (`APP_NAME`).

4. **Compute redirect URIs for each stack:**
   - Node (if present):
     ```
     {BETTER_AUTH_URL}/api/auth/callback/google
     {BETTER_AUTH_URL}/api/auth/callback/github
     {BETTER_AUTH_URL}/api/auth/callback/apple
     {BETTER_AUTH_URL}/api/auth/callback/facebook
     {BETTER_AUTH_URL}/api/auth/callback/microsoft
     ```
   - Rails (if present):
     ```
     {APP_URL}/api/auth/oauth/google/callback
     {APP_URL}/api/auth/oauth/github/callback
     {APP_URL}/api/auth/oauth/apple/callback
     {APP_URL}/api/auth/oauth/facebook/callback
     {APP_URL}/api/auth/oauth/microsoft/callback
     ```

5. Ensure env files exist:
   - Node: `.env.local` (or `node/.env.local`). If not, copy from `.env.example` (or create empty).
   - Rails: `rails/.env`. If not, create empty.

---

## Phase 2 — Scan and present status

Read both `.env.local` (Node) and `rails/.env` (Rails). Check each provider's required vars:

| Provider  | Required vars                                    |
|-----------|--------------------------------------------------|
| Google    | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`       |
| GitHub    | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`       |
| Apple     | `APPLE_CLIENT_ID`, `APPLE_CLIENT_SECRET`         |
| Facebook  | `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET`   |
| Microsoft | `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET` |

Display status. If both stacks are present, show status per-stack:

```
SSO Provider Status                           Mode
──────────────────────────────────────────────────────────
  ✓  Google     — configured (Node + Rails)
  ✗  GitHub     — not configured              [AUTO]
  ✗  Apple      — not configured              [AUTO — needs 2FA pause]
  ✓  Facebook   — configured (Node only)
  ✗  Microsoft  — not configured              [az CLI]

Stacks detected: Node.js + Rails

Enter the numbers or names to configure (e.g. "2 3"), "all", or "skip".
```

**Wait for the user to respond before proceeding.**

---

## Phase 3 — Configure each selected provider

Process in order: **Microsoft → Google → GitHub → Facebook → Apple**.

After each provider completes, write credentials to the appropriate env file(s) and confirm before moving on.

**Important:** When both stacks are present, register ALL redirect URIs for both stacks with each provider. The same client ID/secret pair works for both stacks — the redirect URIs just need to all be registered.

---

### PROVIDER: Microsoft

**Primary path: `az` CLI (no browser needed)**

```
[configure-sso] Microsoft: using az CLI
```

**a) Check az**
```bash
az --version 2>/dev/null
```
If not found: tell the user to install it (`brew install azure-cli` / `winget install Microsoft.AzureCLI`) then re-check.

**b) Login check**
```bash
az account show -o json 2>/dev/null
```
If fails → `az login` → re-run.

**c) Create app**

Build the list of redirect URIs based on which stacks are present:
```bash
az ad app create \
  --display-name "{app name} SSO" \
  --sign-in-audience AzureADandPersonalMicrosoftAccount \
  --web-redirect-uris \
    "{BETTER_AUTH_URL}/api/auth/callback/microsoft" \   # if Node present
    "{APP_URL}/api/auth/oauth/microsoft/callback" \     # if Rails present
  -o json
```
Extract `appId`.

**d) Generate secret**
```bash
az ad app credential reset --id {appId} --years 2 -o json
```
Extract `password` (the client secret).

**e) Write**
```
MICROSOFT_CLIENT_ID={appId}
MICROSOFT_CLIENT_SECRET={secret}
MICROSOFT_TENANT_ID=common
```

Write to both `.env.local` (Node) and `rails/.env` (Rails) if both stacks are present.

**Browser fallback** (only if `az` unavailable after install attempt):

Navigate to `https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/CreateApplicationBlade`. Use the automated browser flow (snapshot-navigate-fill pattern below), then extract the client ID from the app overview page and generate a secret via "Certificates & secrets → New client secret".

---

### PROVIDER: Google

```
[configure-sso] Google: mode={BROWSER_MODE}
```

#### AUTO path

**Step 1 — Navigate**
```
navigate_page(url="https://console.cloud.google.com/apis/credentials")
```
Retry up to 3× with 2s delay if navigation hangs. After each retry, take a snapshot to check current state.

**Step 2 — Handle auth gate (if not logged in)**

If snapshot indicates a login page:
```
[configure-sso] Google: pausing for login — complete sign-in in the browser, then tell me to continue
```
Wait for user to confirm login is done. Navigate back to the credentials URL. Verify snapshot shows the console (check for "Create Credentials" button or project name in nav).

**Step 3 — Ensure a project is selected**

Take snapshot. Look for a project selector element (typically near the top nav, labeled with the current project name or "Select a project").

- If the selector shows "Select a project" or no project: click it → look for "New Project" or an existing project → select or create one. Wait for navigation back to credentials page.
- If a project is already selected: proceed.

**Step 4 — Handle OAuth consent screen (if not yet configured)**

Take snapshot. Look for an element or banner about "Configure Consent Screen". If present:

1. Click through to the consent screen setup.
2. Select "External" (if prompted for audience) → Create.
3. Fill form:
   - App name: `{app name}`
   - User support email: find the first email in the dropdown
   - Developer contact: same
4. Save and Continue through Scopes (no changes) → Save and Continue through Test Users (no changes) → Back to Dashboard.
5. Navigate back: `https://console.cloud.google.com/apis/credentials`

**Step 5 — Create OAuth client**

Take snapshot. Find and click "Create Credentials" → in the dropdown, click "OAuth client ID".

Take snapshot on the new page. Fill:
- Application type: find the dropdown, select "Web application"
- Name: `{app name}`
- Authorized redirect URIs → click "Add URI" for each:
  - `{BETTER_AUTH_URL}/api/auth/callback/google` (if Node present)
  - `{APP_URL}/api/auth/oauth/google/callback` (if Rails present)

Click "Create". Wait for a dialog/modal to appear.

**Step 6 — Extract credentials**

Take snapshot of the dialog. Find the Client ID and Client secret values.

If not visible in the snapshot, try:
```javascript
evaluate_script(function: () => {
  const texts = Array.from(document.querySelectorAll('[class*="credential"], input[readonly], code'))
    .map(el => el.value || el.textContent)
    .filter(Boolean);
  return texts;
})
```

Extract `GOOGLE_CLIENT_ID` (ends in `.apps.googleusercontent.com`) and `GOOGLE_CLIENT_SECRET`.

Write to `.env.local` (Node) and `rails/.env` (Rails) as applicable. Log: `[configure-sso] Google: ✓ configured (automated)`.

#### GUIDED fallback (if AUTO fails at any step)

```
[configure-sso] Google: switching to guided mode (reason: {reason})
```

```bash
open "https://console.cloud.google.com/apis/credentials/oauthclient" 2>/dev/null || xdg-open "https://console.cloud.google.com/apis/credentials/oauthclient"
```

Walk the user through:
1. Select/create project
2. Configure consent screen if prompted (External → fill name + email → Save through all steps)
3. Create Credentials → OAuth client ID → Web application → add ALL redirect URIs (Node and/or Rails) → Create
4. Copy Client ID and Client Secret from the dialog

Ask the user to paste both values. Write to env files.

---

### PROVIDER: GitHub

```
[configure-sso] GitHub: mode={BROWSER_MODE}
```

#### AUTO path

GitHub is the most automation-friendly provider. The UI is stable and semantic.

**Step 1 — Navigate**
```
navigate_page(url="https://github.com/settings/developers")
wait_for(text="OAuth Apps")
```

**Step 2 — Handle auth gate**

Take snapshot. If URL contains `github.com/login` or snapshot contains "Sign in to GitHub":
```
[configure-sso] GitHub: pausing for login — sign in and then tell me to continue
```
After confirmation, navigate back to `https://github.com/settings/developers`.

**Step 3 — Open New OAuth App form**

Take snapshot. Find the button labeled "New OAuth App" (or "Register a new application"). Click it.

`wait_for(text="Application name")`

**Step 4 — Fill the form**

Take snapshot. Fill all fields:
```
fill_form([
  { field labeled "Application name": "{app name}" },
  { field labeled "Homepage URL": "{BETTER_AUTH_URL or APP_URL}" },
  { field labeled "Authorization callback URL": "{BETTER_AUTH_URL}/api/auth/callback/github" }
])
```

**Note:** GitHub only allows one callback URL per OAuth app. If both stacks are present, use the Node callback URL as the primary. After creating the app, inform the user that Rails uses a different callback pattern (`{APP_URL}/api/auth/oauth/github/callback`) and they may need to create a second OAuth app for Rails, or configure a proxy/redirect.

Find and click "Register application".

`wait_for(text="Client ID")`

**Step 5 — Extract Client ID**

Take snapshot. Find the element containing the Client ID (a 20-character string starting with `Iv`). Extract it.

If not in snapshot:
```javascript
evaluate_script(function: () => {
  const el = document.querySelector('[id*="client-id"], code, .client-id');
  return el ? el.textContent : null;
})
```

**Step 6 — Generate Client Secret**

Take snapshot. Find and click the button labeled "Generate a new client secret". Wait for a highlighted secret value to appear.

Take snapshot. Extract the secret (40-character hex string). It appears in a highlighted/colored element immediately after generation.

If not in snapshot:
```javascript
evaluate_script(function: () => {
  const el = document.querySelector('[class*="secret"] code, .flash code, [data-copy-text]');
  return el ? (el.getAttribute('data-copy-text') || el.textContent) : null;
})
```

Write to `.env.local` (Node) and `rails/.env` (Rails) as applicable. Log: `[configure-sso] GitHub: ✓ configured (automated)`.

#### GUIDED fallback

```
[configure-sso] GitHub: switching to guided mode (reason: {reason})
```

```bash
open "https://github.com/settings/developers" 2>/dev/null || xdg-open "https://github.com/settings/developers"
```

Walk the user through: New OAuth App → fill form → Register → copy Client ID → Generate and copy Client Secret. Ask to paste both. Write to env files.

---

### PROVIDER: Facebook

```
[configure-sso] Facebook: mode={BROWSER_MODE}
```

> **Note:** Facebook's developer portal has changed its flow multiple times. The AUTO path uses `take_snapshot` before every action and adapts to current UI state. If a CAPTCHA appears at any point, fall back immediately to GUIDED.

#### AUTO path

**Step 1 — Navigate to app creation**
```
navigate_page(url="https://developers.facebook.com/apps/create/")
```
Wait up to 10s for page to load. Take snapshot.

**Step 2 — Handle auth gate**

If snapshot contains "Log In" button or URL contains `facebook.com/login`:
```
[configure-sso] Facebook: pausing for login — log in and then tell me to continue
```
After confirmation, navigate back to `https://developers.facebook.com/apps/create/`.

**Step 3 — Navigate app creation wizard**

Take snapshot after each action — use text matching to find the right elements, not assumed positions.

- Look for "Allow people to log in with their Facebook account" option — click it.
- Click "Next" or "Continue".
- Look for app type options. Click "Consumer" or "None" (whichever relates to consumer apps in current UI).
- Click "Next".
- Fill App Name field with `{app name}`.
- Fill contact email if prompted.
- Click "Create App" or "Submit".

**CAPTCHA check:** After clicking Create App, take snapshot. If snapshot contains "captcha", "verify", or a challenge image → immediately fall back to GUIDED mode.

Wait for the app dashboard to load (`wait_for(text="Add a Product")` or similar).

**Step 4 — Add Facebook Login product**

Take snapshot. Find the "Facebook Login" product card (look for text "Facebook Login" near a "Set Up" button). Click "Set Up" or "Add".

If prompted to choose platform, click "Web".

Find the Site URL field, fill `{BETTER_AUTH_URL or APP_URL}`. Click "Save" or "Continue".

**Step 5 — Configure redirect URI**

Navigate to the Facebook Login settings within the app:
```
navigate_page(url="https://developers.facebook.com/apps/{APP_ID}/fb-login/settings/")
```
(Extract APP_ID from the URL after the dashboard loaded in Step 3.)

Alternatively, use the left sidebar: take snapshot → find "Facebook Login" → "Settings". Click it.

Find the "Valid OAuth Redirect URIs" field. Fill ALL redirect URIs (comma or newline separated):
- `{BETTER_AUTH_URL}/api/auth/callback/facebook` (if Node present)
- `{APP_URL}/api/auth/oauth/facebook/callback` (if Rails present)

Click "Save Changes".

**Step 6 — Extract credentials**

Navigate to Settings → Basic:
```
navigate_page(url="https://developers.facebook.com/apps/{APP_ID}/settings/basic/")
```

Take snapshot. Extract "App ID" (numeric).

Find "App Secret" field (may show `••••••` hidden). Click "Show" button next to it. Take snapshot again. Extract the revealed secret.

If not in snapshot:
```javascript
evaluate_script(function: () => {
  const appId = document.querySelector('[name="app_id"], #app_id, [data-testid="app-id"]');
  const secret = document.querySelector('[name="app_secret"], #app_secret, input[type="text"][value]');
  return { appId: appId?.value, secret: secret?.value };
})
```

Write to `.env.local` (Node) and `rails/.env` (Rails) as applicable. Log: `[configure-sso] Facebook: ✓ configured (automated)`.

#### GUIDED fallback

```
[configure-sso] Facebook: switching to guided mode (reason: {reason})
```

```bash
open "https://developers.facebook.com/apps/create/" 2>/dev/null || xdg-open "https://developers.facebook.com/apps/create/"
```

Guide user through: consumer app → fill name → Create App → Add Facebook Login → Web → set site URL → configure redirect URIs (both Node and Rails if applicable) → Settings → Basic → copy App ID + App Secret. Ask to paste. Write to env files.

---

### PROVIDER: Apple

```
[configure-sso] Apple: mode={BROWSER_MODE}
```

Apple's developer portal is the most complex. Two phases require browser interaction; JWT generation is always fully automated.

> **On automation:** Apple's portal is JavaScript-heavy with custom web components. Automation is possible but the portal may present 2FA, device-confirmation prompts, or session refresh screens. The skill pauses for human interaction whenever Apple auth is required and resumes automatically afterward.

#### AUTO path — Phase A: Create Services ID

**Step 1 — Navigate**
```
navigate_page(url="https://developer.apple.com/account/resources/identifiers/add/serviceId")
```

**Step 2 — Handle auth gate**

Take snapshot. If URL contains `appleid.apple.com` or snapshot contains "Sign In" with Apple ID branding:

```
[configure-sso] Apple: 2FA or login required — complete sign-in in the browser (including any 2FA prompt), then tell me to continue
```

After confirmation, navigate back to `https://developer.apple.com/account/resources/identifiers/add/serviceId`.

**Step 3 — Create Services ID**

Take snapshot. The page shows a list of identifier types. Find "Services IDs" radio button. Click it. Find and click "Continue".

`wait_for(text="Description")`

Take snapshot. Fill:
- Description field: `{app name} Sign In`
- Identifier field: suggest `com.{reversed-domain-from-BETTER_AUTH_URL}.auth` but confirm with user (this becomes `APPLE_CLIENT_ID`)

Ask the user: "What should the Services ID identifier be? (e.g. com.example.myapp.auth)" — this is the one value that requires user input.

Click "Continue" → "Register".

`wait_for(text="Services IDs")`

**Step 4 — Configure Sign In with Apple**

Take snapshot. Find the newly created Services ID in the list. Click it.

Take snapshot on the detail page. Find and enable the "Sign In with Apple" checkbox. Click "Configure".

In the configuration dialog:
- Primary App ID: take snapshot of the dropdown. Select the main App ID for this project.
- Domains: fill `{domain from BETTER_AUTH_URL, strip https://}`. If Rails is also present and uses a different domain, add that domain too.
- Return URLs: add ALL applicable return URLs:
  - `{BETTER_AUTH_URL}/api/auth/callback/apple` (if Node present)
  - `{APP_URL}/api/auth/oauth/apple/callback` (if Rails present)

Click "Next" → "Done" → "Continue" → "Save".

#### AUTO path — Phase B: Create Key

**Step 5 — Navigate to key creation**
```
navigate_page(url="https://developer.apple.com/account/resources/authkeys/add")
```
Take snapshot. Verify we're on the key creation page (not a login gate).

**Step 6 — Create key**

Fill Key Name: `{app name} Sign In`. Find and enable "Sign In with Apple" checkbox. Click "Configure". In the dropdown, select the App ID. Click "Save" → "Continue" → "Register".

`wait_for(text="Download")`

Take snapshot. Extract the **Key ID** (10-character string visible on the page).

**Step 7 — Download .p8 key**

Find and click the "Download" button.

The file will download to the system's default download location. After clicking:
```bash
sleep 3 && ls -t ~/Downloads/AuthKey_*.p8 2>/dev/null | head -1
```

This finds the most recently downloaded `.p8` file. Record the path.

```
[configure-sso] Apple: Key downloaded to {path}. Key ID: {keyId}
```

**Step 8 — Get Team ID**
```
navigate_page(url="https://developer.apple.com/account")
```
Take snapshot. Find the Team ID (10-character alphanumeric, under "Membership" or "Account" section). Extract it.

If not in snapshot:
```javascript
evaluate_script(function: () => {
  const el = Array.from(document.querySelectorAll('p, span, td'))
    .find(el => /^[A-Z0-9]{10}$/.test(el.textContent.trim()));
  return el?.textContent.trim();
})
```

Ask the user to confirm the Team ID if extraction is uncertain.

#### Phase C — JWT generation (always automated)

Once you have: `{teamId}`, `{keyId}`, `{servicesId}`, `{keyPath}`:

```bash
node -e "
const { SignJWT } = require('jose');
const { createPrivateKey } = require('crypto');
const fs = require('fs');
const [,, teamId, keyId, clientId, keyPath] = process.argv;
const key = createPrivateKey(fs.readFileSync(keyPath, 'utf8'));
const now = Math.floor(Date.now() / 1000);
new SignJWT({})
  .setProtectedHeader({ alg: 'ES256', kid: keyId })
  .setIssuer(teamId)
  .setIssuedAt(now)
  .setExpirationTime(now + 60 * 60 * 24 * 180)
  .setAudience('https://appleid.apple.com')
  .setSubject(clientId)
  .sign(key)
  .then(jwt => { console.log(jwt); process.exit(0); });
" -- {teamId} {keyId} {servicesId} {keyPath}
```

Write to both `.env.local` (Node) and `rails/.env` (Rails) as applicable:
```
APPLE_CLIENT_ID={servicesId}
APPLE_CLIENT_SECRET={jwt}
```

Compute expiry date (today + 180 days). Log:
```
[configure-sso] Apple: ✓ configured (automated portal + JWT). Secret expires {date}.
```

#### GUIDED fallback

```
[configure-sso] Apple: switching to guided mode (reason: {reason})
```

Walk user through each portal page with `open`/`xdg-open`. Still run Phase C (JWT generation) automatically once the user provides the `.p8` file, Team ID, and Key ID.

---

## Phase 4 — Final summary

Display a final table. If both stacks are present, show per-stack status:

```
Final SSO Status
──────────────────────────────────────────────────────
  ✓  Google     configured   [automated]         Node + Rails
  ✓  GitHub     configured   [automated]         Node + Rails
  ✓  Apple      configured   [automated + 2FA]   Node + Rails   expires 2026-08-21
  ✓  Facebook   configured   [was already set]   Node + Rails
  ✓  Microsoft  configured   [az CLI]            Node + Rails

All done. Restart your dev server(s):
  Node:  npm run dev
  Rails: cd rails && bin/rails server

Test at:
  Node:  {BETTER_AUTH_URL}/auth
  Rails: {APP_URL}/auth
```

---

## Appendix A — Snapshot-first interaction pattern

**Always follow this pattern when interacting with a page:**

```
1. take_snapshot → get accessibility tree
2. Search the tree for the target element by accessible name, label, or role
   (e.g. button named "Create Credentials", input labeled "Application name")
3. Use the UID from the snapshot result to click/fill
4. wait_for(text="{expected next state text}")
5. If element not found after snapshot: wait 2s, take_snapshot again
   If still not found: trigger fallback for this provider
```

Never hard-code UIDs — they change per page load.

---

## Appendix B — Retry pattern

Apply this wrapper around any `navigate_page` call:

```
Attempt navigate_page(url=X)
  On success: continue
  On failure or timeout:
    Wait 2 seconds
    Attempt navigate_page(url=X) again
    On second failure:
      Log: [configure-sso] {Provider}: navigation failed after retry
      Trigger fallback for this provider
```

---

## Appendix C — Fallback triggers

Immediately switch a provider to GUIDED mode if any of the following occur:

| Trigger | Reason |
|---------|--------|
| CAPTCHA detected in snapshot | Cannot automate — requires human |
| Unexpected URL after 3 navigation attempts | Portal may have changed |
| Required element not found after 2 snapshots | UI changed or rate-limited |
| `evaluate_script` returns null for credential extraction | Cannot read credentials |
| Any JavaScript error during `evaluate_script` | Page structure unexpected |
| Page takes >15s to reach expected state | Possible 2FA / session issue |

Log the trigger reason before switching: `[configure-sso] {Provider}: fallback triggered — {reason}`.

---

## Appendix D — Writing to env files

When both stacks are present, write credentials to BOTH `node/.env.local` (or `.env.local`) AND `rails/.env`. The env var names are the same for both stacks (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, etc.).

Read the full file content before writing. Update matching keys in-place (do not truncate). Append if key doesn't exist. Never display full secret values in logs — show first 8 chars + `…`.

```
For each env file (.env.local for Node, rails/.env for Rails):
  Read the file
  For each credential to write:
    If key exists: replace the line
    If key doesn't exist: append
  Write back
```

---

## Appendix E — Mode summary per provider (quick reference)

| Provider  | Default mode        | Human interaction required                          |
|-----------|---------------------|-----------------------------------------------------|
| Microsoft | az CLI (no browser) | Only if `az` not installed / first-time `az login`  |
| Google    | Browser AUTO        | Only if not logged in to Google in Chrome           |
| GitHub    | Browser AUTO        | Only if not logged in to GitHub in Chrome           |
| Facebook  | Browser AUTO        | Login + CAPTCHA on app creation (trigger fallback)  |
| Apple     | Browser AUTO        | Login 2FA always — pause/resume pattern             |
