# fabrikam Delivery Schedule Kiosk

A full-screen delivery calendar display designed to run on a Windows 11 kiosk (TV/monitor) or be hosted in Azure. Reads events from a shared Exchange/Outlook mailbox via Microsoft Graph using a service account — no user login required.

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Prerequisites](#prerequisites)
3. [Step 1 — Register the App in Microsoft Entra ID](#step-1--register-the-app-in-microsoft-entra-id)
4. [Step 2 — Restrict Access to the Delivery Mailbox Only](#step-2--restrict-access-to-the-delivery-mailbox-only)
5. [Step 3 — Install and Configure the App](#step-3--install-and-configure-the-app)
6. [Option A — Windows 11 Kiosk Mode](#option-a--windows-11-kiosk-mode)
7. [Option B — Host on Azure App Service](#option-b--host-on-azure-app-service)
8. [Verifying the Setup](#verifying-the-setup)
9. [Troubleshooting](#troubleshooting)
10. [Maintenance](#maintenance)

---

## How It Works

```
 ┌──────────────────────────────────────────────┐
 │  Windows 11 Kiosk / Azure App Service        │
 │                                              │
 │  ┌─────────────┐     ┌─────────────────────┐ │
 │  │ Express API │────▶│  Microsoft Graph    │ │
 │  │ (Node.js)   │◀────│  calendarView API   │ │
 │  └──────┬──────┘     └─────────────────────┘ │
 │         │  /api/events                        │
 │  ┌──────▼──────┐                              │
 │  │ React SPA   │  ← served statically         │
 │  │ (browser)   │  ← auto-refreshes every 5min │
 │  └─────────────┘                              │
 └──────────────────────────────────────────────┘
```

- The **Node.js/Express server** holds your credentials, fetches an OAuth token via client credentials flow, and queries the shared mailbox calendar.
- The **React frontend** polls `/api/events` every 5 minutes and renders the delivery board.
- **Credentials never reach the browser** — the client secret lives only in the server environment.

---

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js 18 or later | Download from [nodejs.org](https://nodejs.org). LTS version recommended. |
| Microsoft 365 tenant | With an Exchange Online mailbox for delivery scheduling |
| Global Admin or Exchange Admin | To register the app and assign permissions |
| PowerShell with ExchangeOnline module | For RBAC scoping (Step 2) |
| Windows 11 Pro or Enterprise | For kiosk mode (Assigned Access) |

---

## Step 1 — Register the App in Microsoft Entra ID

This creates the identity the server uses to authenticate with Microsoft Graph — no user needs to log in.

### 1.1 Create the app registration

1. Go to [Entra admin center](https://entra.microsoft.com) → **Applications → App registrations → New registration**
2. Fill in:
   - **Name**: `DeliveryScheduleKiosk`
   - **Supported account types**: Accounts in this organizational directory only (Single tenant)
   - **Redirect URI**: Leave blank
3. Click **Register**
4. On the overview page, copy and save:
   - **Application (client) ID** — you'll need this as `CLIENT_ID`
   - **Directory (tenant) ID** — you'll need this as `TENANT_ID`

### 1.2 Add API permissions

1. In your app registration, go to **API permissions → Add a permission**
2. Select **Microsoft Graph → Application permissions**
3. Search for and select **`Calendars.Read`**
4. Click **Add permissions**
5. Click **Grant admin consent for [your org]** — this is required for application permissions
6. Confirm the status shows a green checkmark ✅

> ⚠️ **Important**: Application permissions apply to the entire tenant by default. Step 2 restricts access to only the delivery mailbox.

### 1.3 Create a client secret

1. Go to **Certificates & secrets → New client secret**
2. Set a description (e.g., `KioskSecret`) and an expiration (12 or 24 months)
3. Click **Add**
4. **Copy the secret Value immediately** — it is only shown once
   - Save it as `CLIENT_SECRET` in your config

> 📅 Note the expiration date. You must rotate this secret before it expires or the kiosk will stop loading events. See [Maintenance](#maintenance).

---

## Step 2 — Restrict Access to the Delivery Mailbox Only

By default, `Calendars.Read` as an application permission allows reading every mailbox in the tenant. This step uses Exchange RBAC to limit the app to only the delivery schedule mailbox.

### 2.1 Install and connect the Exchange Online module

Open PowerShell as Administrator:

```powershell
Install-Module -Name ExchangeOnlineManagement -Force
Connect-ExchangeOnline
```

### 2.2 Create a scoped mail-enabled security group

```powershell
# Create a mail-enabled security group that contains only the delivery mailbox
New-DistributionGroup `
  -Name "DeliveryScheduleScopeGroup" `
  -PrimarySmtpAddress "deliveryschedule-scope@fabrikam.com" `
  -Type Security

# Add the delivery mailbox as the only member
Add-DistributionGroupMember `
  -Identity "DeliveryScheduleScopeGroup" `
  -Member "deliveryschedule@fabrikam.com"
```

### 2.3 Create the management scope

```powershell
New-ManagementScope `
  -Name "DeliveryScheduleScope" `
  -RecipientRestrictionFilter "MemberOfGroup -eq 'deliveryschedule-scope@fabrikam.com'"
```

### 2.4 Assign the scoped role to your app

Replace `<YOUR_CLIENT_ID>` with the Application (client) ID from Step 1:

```powershell
New-ManagementRoleAssignment `
  -Name "DeliveryKioskCalRead" `
  -Role "Application Calendars.Read" `
  -App "<YOUR_CLIENT_ID>" `
  -CustomResourceScope "DeliveryScheduleScope"
```

### 2.5 Verify the assignment

Allow up to 30 minutes for the scope to propagate, then verify:

```powershell
Test-ServicePrincipalAuthorization `
  -Identity "<YOUR_CLIENT_ID>" `
  -Resource "deliveryschedule@fabrikam.com"
```

A successful result confirms the app can access only that mailbox.

---

## Step 3 — Install and Configure the App

### 3.1 Get the application files

Copy the `delivery-schedule-kiosk` folder to the target machine (e.g., `C:\Apps\delivery-schedule-kiosk`).

### 3.2 Install Node.js

Download and install [Node.js LTS](https://nodejs.org). Accept all defaults. Restart after installation.

Verify in PowerShell:
```powershell
node --version   # Should print v18.x.x or higher
npm --version
```

### 3.3 Create the environment config file

In the project folder, create a file named `.env` (no extension):

```
# C:\Apps\delivery-schedule-kiosk\.env

TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
CLIENT_SECRET=your~secret~value~here
MAILBOX_UPN=deliveryschedule@fabrikam.com

# Number of days ahead to show on the board
LOOKAHEAD_DAYS=14

# Port the server listens on
PORT=3000
```

> ⚠️ This file contains a secret. Do not commit it to source control, email it, or store it in a shared folder. The `.gitignore` already excludes it.

### 3.4 Install dependencies and build

```powershell
cd C:\Apps\delivery-schedule-kiosk
npm install
npm run build
```

### 3.5 Test before configuring kiosk mode

```powershell
npm start
```

Open Edge and go to `http://localhost:3000`. You should see the delivery schedule board with live calendar data.

To test without credentials using sample data:
```
http://localhost:3000/?demo=1
```

---

## Option A — Windows 11 Kiosk Mode

This configures the machine to boot directly into full-screen Edge showing the kiosk app — no login prompt, no desktop access.

### A.1 Create a dedicated local user account

1. Open **Settings → Accounts → Other users → Add account**
2. Click **I don't have this person's sign-in information → Add a user without a Microsoft account**
3. Set username: `KioskUser`, leave password blank (or set one and configure auto-login)
4. Click **Next**

### A.2 Configure Assigned Access (kiosk mode)

1. Go to **Settings → Accounts → Other users**
2. Scroll to **Set up a kiosk** and click **Get started**
3. Select `KioskUser`
4. Choose **Microsoft Edge** as the kiosk app
5. Set the URL to: `http://localhost:3000`
6. Choose **Digital/interactive signage** (runs full-screen, no navigation bar)
7. Set the idle timer to your preference (or 0 to never return to start)
8. Click **Close**

> After this is configured, logging in as `KioskUser` will launch Edge directly in full-screen kiosk mode pointing to the delivery board.

### A.3 Run the Node server as a Windows Service

The server must start automatically on boot before Edge opens. Use [NSSM (Non-Sucking Service Manager)](https://nssm.cc/download) for reliable service management.

**Download and install NSSM:**
1. Download the 64-bit NSSM from [nssm.cc/download](https://nssm.cc/download)
2. Extract and copy `nssm.exe` to `C:\Windows\System32\`

**Create the service (run PowerShell as Administrator):**

```powershell
nssm install DeliveryKiosk "C:\Program Files\nodejs\node.exe"
nssm set DeliveryKiosk AppDirectory "C:\Apps\delivery-schedule-kiosk"
nssm set DeliveryKiosk AppParameters "server/index.js"
nssm set DeliveryKiosk AppEnvironmentExtra "NODE_ENV=production"
nssm set DeliveryKiosk DisplayName "fabrikam Delivery Schedule Kiosk"
nssm set DeliveryKiosk Description "Serves the delivery schedule board on port 3000"
nssm set DeliveryKiosk Start SERVICE_AUTO_START
nssm set DeliveryKiosk AppStdout "C:\Apps\delivery-schedule-kiosk\logs\service.log"
nssm set DeliveryKiosk AppStderr "C:\Apps\delivery-schedule-kiosk\logs\service-error.log"
nssm start DeliveryKiosk
```

Create the logs directory first:
```powershell
mkdir C:\Apps\delivery-schedule-kiosk\logs
```

**Verify the service is running:**
```powershell
Get-Service DeliveryKiosk
# Status should show: Running
```

**Service management commands:**
```powershell
nssm start DeliveryKiosk
nssm stop DeliveryKiosk
nssm restart DeliveryKiosk
nssm remove DeliveryKiosk confirm   # Uninstall
```

### A.4 Configure Edge to start after the service

Add a startup delay so the Node server is ready before Edge loads. Create a scheduled task:

```powershell
$action = New-ScheduledTaskAction -Execute "powershell.exe" `
  -Argument '-Command "Start-Sleep 10; exit"'
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "KioskStartupDelay" `
  -Action $action -Trigger $trigger `
  -RunLevel Highest -Force
```

Alternatively, in the Assigned Access settings you can increase the Edge launch delay.

### A.5 Disable Windows Update restarts (optional but recommended)

To prevent the kiosk from rebooting mid-day:

1. Open **Group Policy Editor** (`gpedit.msc`)
2. Navigate to: `Computer Configuration → Administrative Templates → Windows Components → Windows Update`
3. Set **Configure Automatic Updates** to **Notify for download and notify for install**
4. Set a maintenance window via **Automatic Maintenance Activation Boundary**

---

## Option B — Host on Azure App Service

This option hosts the app in Azure, making it accessible from any browser on your network or the internet.

### B.1 Create an Azure App Service

```powershell
# Install Azure CLI if needed
winget install Microsoft.AzureCLI

az login

# Create resource group
az group create --name rg-delivery-kiosk --location eastus

# Create App Service plan (free tier for low traffic)
az appservice plan create `
  --name plan-delivery-kiosk `
  --resource-group rg-delivery-kiosk `
  --sku B1 `
  --is-linux

# Create the web app (Node.js 20)
az webapp create `
  --name fabrikam-delivery-kiosk `
  --resource-group rg-delivery-kiosk `
  --plan plan-delivery-kiosk `
  --runtime "NODE:20-lts"
```

### B.2 Set environment variables in Azure

Never put secrets in your deployment package. Configure them as App Settings:

```powershell
az webapp config appsettings set `
  --name fabrikam-delivery-kiosk `
  --resource-group rg-delivery-kiosk `
  --settings `
    TENANT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" `
    CLIENT_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" `
    CLIENT_SECRET="your~secret~value~here" `
    MAILBOX_UPN="deliveryschedule@fabrikam.com" `
    LOOKAHEAD_DAYS="14" `
    NODE_ENV="production"
```

Or set them in the Azure Portal: **App Service → Configuration → Application settings → New application setting**.

### B.3 (Recommended) Use Azure Key Vault for the client secret

Instead of storing the secret in plain text App Settings:

```powershell
# Create a Key Vault
az keyvault create `
  --name kv-delivery-kiosk `
  --resource-group rg-delivery-kiosk `
  --location eastus

# Store the secret
az keyvault secret set `
  --vault-name kv-delivery-kiosk `
  --name "ClientSecret" `
  --value "your~secret~value~here"

# Enable system-assigned managed identity on the App Service
az webapp identity assign `
  --name fabrikam-delivery-kiosk `
  --resource-group rg-delivery-kiosk

# Grant the App Service identity access to read the secret
az keyvault set-policy `
  --name kv-delivery-kiosk `
  --object-id $(az webapp identity show --name fabrikam-delivery-kiosk --resource-group rg-delivery-kiosk --query principalId -o tsv) `
  --secret-permissions get
```

Then in App Settings, reference the vault instead of the plain value:
```
CLIENT_SECRET = @Microsoft.KeyVault(VaultName=kv-delivery-kiosk;SecretName=ClientSecret)
```

### B.4 Deploy the application

**Build locally first:**
```powershell
cd C:\Apps\delivery-schedule-kiosk
npm install
npm run build
```

**Deploy via ZIP:**
```powershell
# Create deployment ZIP (exclude node_modules and .env)
Compress-Archive -Path `
  .\dist, .\server, .\package.json, .\package-lock.json `
  -DestinationPath deploy.zip -Force

az webapp deploy `
  --name fabrikam-delivery-kiosk `
  --resource-group rg-delivery-kiosk `
  --src-path deploy.zip `
  --type zip
```

**Or deploy via GitHub Actions** — see the [Azure Static Web Apps docs](https://learn.microsoft.com/en-us/azure/app-service/deploy-github-actions) for a full CI/CD pipeline example.

### B.5 Configure startup command

Tell App Service to run the server:

```powershell
az webapp config set `
  --name fabrikam-delivery-kiosk `
  --resource-group rg-delivery-kiosk `
  --startup-file "node server/index.js"
```

### B.6 Point the kiosk Edge to Azure

Once hosted on Azure, configure Assigned Access (Step A.2) to point Edge at the Azure URL instead of `localhost`:

```
https://fabrikam-delivery-kiosk.azurewebsites.net
```

For a custom domain, configure it under **App Service → Custom domains**.

---

## Verifying the Setup

Once running, check these URLs:

| URL | Expected result |
|---|---|
| `http://localhost:3000/api/health` | `{"ok":true,"ts":"..."}` |
| `http://localhost:3000/api/events` | JSON array of calendar events |
| `http://localhost:3000` | Full delivery board UI |
| `http://localhost:3000/?demo=1` | Board with sample data (no credentials needed) |

---

## Troubleshooting

### The board shows "Could not load schedule"

**Check the service logs:**
```powershell
Get-Content C:\Apps\delivery-schedule-kiosk\logs\service-error.log -Tail 50
```

**Common causes:**

| Error message | Cause | Fix |
|---|---|---|
| `Missing required env vars` | `.env` file not found or incomplete | Verify `.env` exists in the project root with all four required values |
| `Token request failed (400)` | Wrong `TENANT_ID` or `CLIENT_ID` | Copy values directly from the Entra app registration overview page |
| `Token request failed (401)` | Wrong or expired `CLIENT_SECRET` | Generate a new secret in Entra → Certificates & secrets |
| `Graph API error (403)` | Admin consent not granted | Go to API permissions in the app registration and click **Grant admin consent** |
| `Graph API error (403)` | RBAC scope not propagated | Wait 30 minutes after running the PowerShell commands in Step 2 |
| `Graph API error (404)` | Wrong `MAILBOX_UPN` | Verify the mailbox address in Exchange admin center |
| `ECONNREFUSED` on kiosk | Node server not running | Check `Get-Service DeliveryKiosk` and review logs |

### The service starts but Edge shows a blank page

- Verify the server is listening: `Test-NetConnection -ComputerName localhost -Port 3000`
- Check Windows Firewall isn't blocking port 3000: `New-NetFirewallRule -DisplayName "DeliveryKiosk" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow`
- Ensure the startup delay is sufficient (see Step A.4)

### Events are not showing / wrong events

- Confirm the mailbox UPN is correct: try `https://graph.microsoft.com/v1.0/users/deliveryschedule@fabrikam.com/calendarView` in [Graph Explorer](https://developer.microsoft.com/en-us/graph/graph-explorer)
- Check that events in the calendar fall within `LOOKAHEAD_DAYS` from today
- All-day events use a different date format — verify they appear correctly in Outlook first
- **A previous day's all-day event appears in Upcoming:** This is a Graph API boundary
  behavior. All-day events are stored with an exclusive end time of midnight on the following
  day (e.g., a June 11 all-day event ends at June 12 00:00 UTC). Because the server queries
  `calendarView` starting at midnight UTC, Graph includes that event since its end time touches
  the window boundary. The board filters these out on the client side — any event whose calendar
  date is before today is dropped from both Today and Upcoming. If you see a past all-day event
  on the board, ensure you are running the latest version of the app. For staff entering
  deliveries: specifying a start and end time rather than marking events as All Day avoids this
  edge case entirely and gives drivers more useful arrival window information on the board.

### Times are showing in the wrong timezone

The server fetches events in UTC (`Prefer: outlook.timezone="UTC"`) and the browser converts them to local time using `Intl.DateTimeFormat`. Ensure the kiosk machine's **Windows timezone is set correctly**: Settings → Time & Language → Date & time → Time zone.

### The kiosk shows Edge "page not found" on startup

The Node service hasn't started yet when Edge opened. Either increase the startup delay (Step A.4) or configure the NSSM service with a delayed start:

```powershell
nssm set DeliveryKiosk AppThrottle 5000
sc.exe config DeliveryKiosk start= delayed-auto
```

### Client secret expired

See [Maintenance — Rotating the client secret](#rotating-the-client-secret).

---

## Maintenance

### Rotating the client secret

Microsoft Entra client secrets expire. Rotate before the expiration date to avoid downtime.

1. Go to **Entra admin center → App registrations → DeliveryScheduleKiosk → Certificates & secrets**
2. Click **New client secret**, set a new description and expiration
3. Copy the new **Value** immediately
4. Update the `.env` file on the kiosk machine (or the Azure App Setting):
   ```
   CLIENT_SECRET=new~secret~value~here
   ```
5. Restart the service:
   ```powershell
   nssm restart DeliveryKiosk
   ```
6. Delete the old secret in Entra to keep the registration clean

> 💡 Set a calendar reminder 30 days before the secret expires.

### Updating the application

When a new version of the app is available:

```powershell
# Stop service
nssm stop DeliveryKiosk

# Copy new files to the app folder
# (or git pull if the machine has git)

# Rebuild
cd C:\Apps\delivery-schedule-kiosk
npm install
npm run build

# Start service
nssm start DeliveryKiosk
```

### Checking token cache health

The server caches the OAuth token in memory (valid ~1 hour). If the server restarts it fetches a new token automatically. No manual action is needed.

### Log rotation

The NSSM log file grows over time. Add log rotation using Windows Task Scheduler or configure NSSM's built-in rotation:

```powershell
nssm set DeliveryKiosk AppRotateFiles 1
nssm set DeliveryKiosk AppRotateBytes 10485760   # 10 MB
```
