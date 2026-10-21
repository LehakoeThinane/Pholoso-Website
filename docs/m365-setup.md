# Microsoft 365 setup for the website contact form

**For:** the Pholoso Afrika Foundation's Microsoft 365 administrator
**Time needed:** about 30 minutes
**You need:** Global Administrator (or Application Administrator plus Exchange Administrator) rights

## Check this first: was Microsoft 365 bought through GoDaddy?

The domain's DMARC reports go to a GoDaddy address, which suggests Microsoft 365 may have been bought through GoDaddy. Microsoft 365 from GoDaddy often limits what the customer's own admin can do. App registrations and Exchange Online PowerShell, both needed below, may be blocked.

To check: sign in at <https://admin.microsoft.com> with an admin account. If you are sent to a GoDaddy page, or **Billing** shows GoDaddy as the provider, the account is GoDaddy-managed.

- **Bought directly from Microsoft:** continue with this guide.
- **GoDaddy-managed:** stop here and tell the developer. The options are to move the account out of GoDaddy's management (a larger change, best planned with an IT adviser), or to send the website's mail through a separate transactional email service instead. The website code supports swapping the sending method.

## What this is for

The contact form on pholoso.africa currently cannot deliver messages. Email sent straight from the web server is rejected or quarantined by the domain's own SPF and DMARC protection. So the website will instead send each enquiry through Microsoft 365, using a dedicated app identity with **permission to send from one mailbox only**.

No mailbox password is stored on the website. The website gets a client ID and a secret, which you can revoke at any time.

## Step 1: Choose the sending mailbox

Pick the mailbox the website will send **from**. We recommend a new **shared mailbox**, for example `website@pholoso.africa`, because it needs no licence.

1. Go to the Exchange admin center: <https://admin.exchange.microsoft.com>
2. **Recipients → Mailboxes → Add a shared mailbox.**
3. Name: `Pholoso website`. Email: `website@pholoso.africa`.

Enquiries are delivered **to** know@pholoso.africa. Replies go straight to the visitor, because their address is set as Reply-To.

## Step 2: Register the app

1. Go to the Microsoft Entra admin center: <https://entra.microsoft.com>
2. **Identity → Applications → App registrations → New registration.**
   - Name: `Pholoso website contact form`
   - Supported account types: **Accounts in this organizational directory only**
   - Redirect URI: leave empty
3. Click **Register**. On the overview page, note:
   - **Application (client) ID**
   - **Directory (tenant) ID**
4. Then go to **Identity → Applications → Enterprise applications**, open `Pholoso website contact form` and note its **Object ID**. You need it in Step 3. It is different from the IDs above.

## Step 3: Allow it to send from that one mailbox only

This step matters. A plain Microsoft Graph **Mail.Send** application permission lets an app send as **any** mailbox in the organisation. Use one of the two options below so that it can only send as `website@pholoso.africa`.

### Option A (recommended): RBAC for Applications in Exchange Online

With this option, **do not** add Mail.Send under "API permissions" in Entra. The permission is granted in Exchange, scoped to the one mailbox. (An Entra grant would apply to every mailbox on top of the scoped one.)

In PowerShell with the ExchangeOnlineManagement module:

```powershell
Connect-ExchangeOnline

# Make the app known to Exchange (use the IDs from Step 2)
New-ServicePrincipal -AppId <Application (client) ID> -ObjectId <Enterprise application Object ID> -DisplayName "Pholoso website contact form"

# A scope containing only the sending mailbox
New-ManagementScope -Name "Pholoso website sender" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'website@pholoso.africa'"

# Allow Mail.Send within that scope only
New-ManagementRoleAssignment -App <Application (client) ID> -Role "Application Mail.Send" -CustomResourceScope "Pholoso website sender"

# Check: should be allowed for website@, and not for any other mailbox
Test-ServicePrincipalAuthorization -Identity <Application (client) ID> -Resource website@pholoso.africa
Test-ServicePrincipalAuthorization -Identity <Application (client) ID> -Resource know@pholoso.africa
```

### Option B: Application access policy

Use this only if Option A is not available to you. Microsoft is replacing these policies with Option A.

1. In Entra, open the app → **API permissions → Add a permission → Microsoft Graph → Application permissions → Mail.Send → Add**, then **Grant admin consent**.
2. Create a mail-enabled security group (for example `website-senders@pholoso.africa`) whose only member is `website@pholoso.africa`.
3. Restrict the app to that group:

```powershell
Connect-ExchangeOnline
New-ApplicationAccessPolicy -AppId <Application (client) ID> -PolicyScopeGroupId website-senders@pholoso.africa -AccessRight RestrictAccess -Description "Website form may send only as website@pholoso.africa"

# Check: Granted for website@, Denied for anyone else
Test-ApplicationAccessPolicy -Identity website@pholoso.africa -AppId <Application (client) ID>
Test-ApplicationAccessPolicy -Identity know@pholoso.africa -AppId <Application (client) ID>
```

Policy changes can take up to an hour to apply.

Microsoft changes these screens and commands from time to time. If something here doesn't match what you see, follow Microsoft's current documentation for "RBAC for Applications in Exchange Online".

## Step 4: Create a client secret

1. In Entra, open the app → **Certificates & secrets → Client secrets → New client secret.**
2. Description: `pholoso.africa web server`. Expiry: **12 months** (or the longest your policy allows).
3. Copy the secret **Value** straight away. It is shown only once.
4. **Put a reminder in the calendar one month before it expires.** When it expires, the contact form stops delivering and tells visitors to email know@pholoso.africa instead. Renewing means creating a new secret here and replacing it in the website's config file.

## Step 5: Send the details securely

The developer or web host needs:

| Item | Sensitive? |
|---|---|
| Directory (tenant) ID | No |
| Application (client) ID | No |
| Sending mailbox (e.g. `website@pholoso.africa`) | No |
| Client secret value | **Yes** |

**Never send the secret by ordinary email or chat.** Use a password manager's secure share or a one-time secret link, or read it out over the phone. Send the other three items separately.

## Step 6: Recommended: turn on DKIM for pholoso.africa

DKIM signs outgoing mail so receiving servers can trust it. It was not found on the domain.

1. Microsoft Defender portal (<https://security.microsoft.com>) → **Email & collaboration → Policies & rules → Threat policies → Email authentication settings → DKIM**.
2. Select `pholoso.africa`. Microsoft shows two CNAME records (`selector1._domainkey` and `selector2._domainkey`).
3. Add both CNAME records at the domain's DNS provider, wait for them to appear, then switch DKIM signing **on** in the portal.

The domain's DMARC policy is `p=quarantine`, so correct DKIM helps genuine mail from pholoso.africa reach inboxes.

## How to undo it

- To stop the website sending immediately: delete the client secret (Step 4) or the app registration (Step 2).
- To remove the mailbox scope (Option A): `Remove-ManagementRoleAssignment` for the assignment created in Step 3.
