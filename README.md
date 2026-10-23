# Emergency Medical Passport

A bilingual (English / Hindi), mobile-friendly web app. Every person gets a QR passport with life-saving facts
(blood group, allergies, medicines, emergency contact). Verified doctors and hospitals can, with the patient's
one-time code, read and add the patient's full medical history.

Built for Gwalior Vigyan Mahotsav 2026 (Navonmesh). Plain HTML, CSS and JavaScript (ES modules) with Firebase.

## Structure

```
index.html            page markup (all screens)
css/                  base.css, components.css, print.css
js/
  main.js             entry point
  config.js           Firebase web config
  state.js  i18n.js   language state and text lookup
  ui.js  qr.js        shared helpers, QR drawing
  lang/               en.js, hi.js (all visible text)
  services/           firebase.js (init), api.js (every database call)
  features/           patient, lookup, scan, staff, admin
firestore.rules       database security rules (paste into Firebase console)
```

## Run locally

ES modules do not load from `file://`. Serve the folder, then open `http://localhost:<port>`:

```
python -m http.server 8000      # or VS Code "Live Server"
```

## Deploy (GitHub Pages)

1. Push the files to a **public** repository (index.html at the repo root).
2. Settings, Pages, Source: *Deploy from a branch*, branch `main`, folder `/ (root)`.
3. Your site appears at `https://USERNAME.github.io/REPO/` after a minute or two.
4. In Firebase, Authentication, Settings, Authorized domains: add `USERNAME.github.io`.
5. Create passports on the **live site**, so the QR codes point to the public link (not localhost).

## Firebase setup

1. Authentication, Sign-in method: enable **Email/Password**.
2. Firestore Database: create it, then paste `firestore.rules` into the Rules tab and Publish.
3. Put your web config in `js/config.js`.
4. Make yourself admin: create an account on the **Doctor portal** page, copy your user UID from
   Authentication, then in Firestore create collection `admins` with a document whose ID is that UID (any field).
5. Deploying (e.g. GitHub Pages): add your domain (`username.github.io`) under
   Authentication, Settings, Authorized domains.

## Emergency access and blood donors

- If a patient cannot give a code, an approved doctor can use **Emergency access** with a written reason.
  It is always logged and shown in red to the patient. Patients can switch it off in their passport form.
- Logged-in users can register as blood donors and search by blood group and city (compatible groups included).

## How verification works

1. A doctor or hospital registers and stays `pending` until an admin approves them.
2. An approved doctor finds the patient by phone number + date of birth (emergency summary only).
3. The patient generates a 6-digit code (valid 10 minutes) and tells the doctor.
4. Entering it grants 30 minutes of access, enforced by `firestore.rules`, and is logged to the patient's access log.
5. History entries are append-only: corrections are new entries, nothing is edited or deleted.

## Known limitations

- Phone numbers are not verified (SMS OTP needs a paid Firebase plan).
- Wrong-code and wrong-lookup limits need server-side enforcement (Cloud Functions) for production.
- Emergency access cannot send an automatic SMS/email alert (needs paid server features); it is flagged in red in the patient's access log instead.
- Donor names and phone numbers are visible to any logged-in user who searches (donors consent when listing).
- Real health data requires legal compliance (consent, data protection) before real-world use.
