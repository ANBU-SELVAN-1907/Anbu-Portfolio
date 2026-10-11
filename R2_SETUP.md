# Cloudflare R2 setup — portfolio files and private backups

## Price and scope

R2 **Standard** includes **10 GB-month storage**, **1 million Class A** and **10 million Class B** requests each month, and free Internet egress. It is a recurring allowance, not unlimited storage or a price guarantee forever. Infrequent Access has no free allowance. Activation uses an R2 subscription checkout; usage above the allowance is billed. Do not assume a billing alert is a spending cap. [Pricing](https://developers.cloudflare.com/r2/pricing/) · [Activation](https://developers.cloudflare.com/r2/get-started/)

This app stores new images, videos, audio, documents, data files and backup exports in a private R2 bucket. Firebase Authentication and Firestore retain structured records, ownership, revisions, inbox and counters. R2 is not a transactional database. Bundled website assets still deploy through GitHub/Vercel; you can upload replacement originals through the admin. No new upload binary is written to Firestore. Legacy Firestore file copies remain readable and can be migrated without deleting their source.

The upload limit is **100 MiB per file**. Direct browser-to-R2 PUT avoids Vercel's 4.5 MB function payload limit. The app verifies size, MIME signature and SHA-256 against the original upload, then copies it from `incoming/` to an immutable `media/` key. No resizing/recompression happens. A replayed upload URL cannot overwrite a published original.

## 1. Activate R2 and create the private bucket

1. Sign in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Storage & databases → **R2 → Overview**. Activate R2 if needed. Review its subscription checkout and any requested billing details yourself; the code does not activate billing.
3. Create a bucket named **anbu-portfolio-files**, with **Standard** storage and the default jurisdiction. This integration uses `https://ACCOUNT_ID.r2.cloudflarestorage.com`, not EU/FedRAMP-specific endpoints.
4. Leave **public access disabled**: no public `r2.dev` URL and no public custom-domain attachment. Drafts, inbox backups and private file originals must not be public.
5. Copy the **Account ID** from the R2 overview/account settings.

## 2. Create a scoped S3 credential

R2 → **Manage R2 API Tokens** → create token. Choose **Object Read & Write**, scoped **only to anbu-portfolio-files**. Do not grant bucket/account admin rights. Record the resulting **Access Key ID** and **Secret Access Key** privately; the secret is shown once. These are S3 credentials, not a general Cloudflare API bearer token. [Token instructions](https://developers.cloudflare.com/r2/api/tokens/)

## 3. Configure bucket CORS

Bucket → Settings → **CORS policy** → paste this JSON and save:

```json
[
  {
    "AllowedOrigins": [
      "https://anbu-portfolio-seven.vercel.app",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["content-type", "x-amz-meta-sha256", "range", "if-match"],
    "ExposeHeaders": ["ETag", "Content-Type", "Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 3600
  }
]
```

Use exact production/localhost origins. If your domain changes, update CORS and Firebase Authorized domains. Do not add `*` just to suppress errors. PDF previews and direct uploads need CORS. The browser receives temporary signed URLs; long-lived keys stay on the server. [Presigned URL guidance](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)

## 4. Add private variables in Vercel

Anbu-Portfolio → Settings → Environment Variables → **Production**:

| Name | Value |
|---|---|
| R2_ACCOUNT_ID | Cloudflare's 32-character account ID |
| R2_BUCKET_NAME | anbu-portfolio-files |
| R2_ACCESS_KEY_ID | scoped S3 Access Key ID |
| R2_SECRET_ACCESS_KEY | scoped S3 Secret Access Key |

Use the exact names above. Do not add `NEXT_PUBLIC_`. Never put keys in chat, GitHub or the admin content fields. For local development, add the same values to ignored `.env.local` and restart the server. Firebase's existing web/private settings remain required for sign-in and database transactions.

Vercel → Deployments → latest **main** deployment → **Redeploy**. Existing deployments do not pick up new environment values automatically.

## 5. Clean up unfinished direct uploads

Bucket → Settings → **Object lifecycle rules** → add a rule for prefix **incoming/** that expires objects after **1 day**. This deletes only abandoned upload objects, never published `media/` objects or private `backups/`. Configure it explicitly; application code does not change your bucket settings. If you do not configure it, failed/replayed uploads can consume storage until manually removed.

## 6. Verify and migrate

1. Sign in to `/admin` → **Media library → Cloudflare R2 → Check connection**.
2. Upload an original photo, PDF, video, audio or data file. Review it in a draft. Save draft and Publish; unused/draft-only media must remain unavailable to visitors.
3. Test a video by playing and seeking; test PDF preview and Get my resume. Original image quality is unchanged.
4. Click **Migrate next 10 legacy files** until none remain. Each batch copies bytes, reads them back and verifies their hash before changing the file's backend. Existing `/api/media/ID` links stay valid. Source Firestore files are intentionally preserved; no destructive automatic cleanup occurs.
5. Click **Create private backup**. Download the resulting application export from the owner-only backup list. It includes draft/published content, retained history, media references, inbox, metrics and sources (up to 10,000 records per collection). Original file bodies already live under `media/`; this JSON is not an independent duplicate of every binary or a point-in-time database snapshot. Keep a separate offline export of originals for account-loss/disaster recovery. Use Overview → Import content backup for a draft-only content export; a full backup's `content.draft` can be extracted and imported after review.

## Staying inside the allowance

- The app stops new committed media above its **9 GB managed-file** ledger and backup creation above **500 MB** of listed backups. These are app safety limits, **not Cloudflare billing caps**. Temporary uploads, retained objects, other buckets/accounts, request totals and manual dashboard uploads are not all represented by that ledger.
- Monitor Cloudflare → R2 → Usage/Billing; configure notifications. All buckets share the account's free allowance. Read-heavy traffic can exceed request quotas even below 10 GB storage.
- Backups are private and are never automatically deleted. Download/archive older backups manually when approaching limits.
- R2 serves files through short-lived signed GET URLs after publication/owner checks. URLs are bearer access until expiry: documents/images use 60 seconds, video/audio use one hour so seeking remains usable. Hiding an entry blocks new links immediately; already issued links expire later.
- New upload URLs expire after five minutes. Reservation/verification states remain in Firestore for audit/retry; configure periodic maintenance if the app grows.

## Current Firebase login blocker

The live server previously reported a service-account project mismatch. Firebase's private JSON must belong to **anbu-portfolio-b91f6**. R2 does not repair that authentication/database credential. See **outputs/FIREBASE_LOGIN_FIX.md** and **FIREBASE_SETUP.md**. A correct project credential is still needed to reach admin and use R2 uploads.

## Troubleshooting

- **R2 needs configuration:** check all four variable names and redeploy.
- **Upload blocked by CORS:** verify the exact site origin, PUT, content-type and x-amz-meta-sha256 headers.
- **R2 403:** verify Object Read & Write scope, account ID, bucket name, correct S3 keys and the default jurisdiction endpoint.
- **Verification failed:** retry the original file; mismatched size, file signature or hash is rejected before publication.
- **PDF preview fails but download works:** allow GET and required exposed headers in CORS.
- **Cannot sign in:** repair the Firebase credential/project/provider setup first.
