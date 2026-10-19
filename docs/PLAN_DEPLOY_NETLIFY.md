# Piano di Deploy su Netlify

Documento di riferimento con tutte le attività concordate per mettere online l'applicazione, aggiungere una configurazione di base condivisa e ripulire le credenziali.

---

## Stato attività

| Attività | Stato |
| --- | --- |
| Parte A — Configurazione di base (default) | ✅ Fatto |
| Parte A-bis — Pulsante Home dalle impostazioni | ✅ Fatto |
| Parte A-ter — Persistenza sessione di login | ✅ Fatto |
| Rimozione avatar utente dalle impostazioni | ✅ Fatto |
| Parte B — Pulizia credenziali (Client Secret, `.env.example`) | ✅ Fatto |
| Parte C — Passi consigliati (`netlify.toml`, `package-lock.json`) | ✅ Fatto |
| Parte C — Passi obbligatori (Google Cloud Console + env var Netlify) | ⬜ Da fare (manuale) |

---

## Contesto e risposte alle domande frequenti

### Il Client Secret serve per accedere all'app?

**No.** L'autenticazione usa **Google Identity Services (GSI)** con `initTokenClient` (`composables/useGoogleAuth.ts`): è un **client pubblico** (flusso token implicito/PKCE), dove conta solo il `client_id`. Il Client Secret serve esclusivamente a un backend che esegue lo scambio *authorization code → token*; questa app è `ssr: false` e **non ha backend**, quindi il secret non viene mai letto né usato.

Conseguenze:
- Non va inserito da nessuna parte: va **eliminato** da `nuxt.config.ts` e da `.env` (✅ fatto).
- Deve comunque restare segreto: non deve finire nel repository né nel bundle client-side.

### Chi può modificare le impostazioni?

- Calendari e categorie sono salvati **solo nel `localStorage` del browser** del visitatore (chiave `calendar_config`, `composables/useCalendarConfig.ts:7`). Non esiste un backend/database condiviso.
- Ogni visitatore modifica **solo le proprie** impostazioni; nessuno può modificare quelle degli altri.
- L'app è **aperta a tutti**: chiunque abbia l'URL può usarla col proprio account Google. L'accesso ai dati resta limitato a ciò che è condiviso con il suo account (e, se il consent screen è in modalità *Test*, agli account di test).
- Il **Client ID è pubblico per design** (flusso GSI/PKCE): è normale che sia visibile.

### Si può creare una configurazione di base per tutti?

**Sì.** La configurazione resta per-browser, ma si fornisce un **default** nel codice che:
1. viene applicato **automaticamente al primo accesso** (quando `localStorage` è vuoto);
2. può essere **riapplicato manualmente** con un pulsante nelle impostazioni.

Il default non blocca le personalizzazioni: ogni utente può modificarle, e verrà sovrascritto solo premendo il pulsante di ripristino.

---

## Parte A — Configurazione di base ✅ FATTO

1. **Nuovo file** `config/defaultConfig.ts` ✅
   - Esporta `export const DEFAULT_CONFIG: CalendarConfig = { calendars: [...], categories: [...] }`.
   - Popolato con i dati reali: **2 categorie** (`Piano terra`, `Primo piano`) e **6 calendari**:
     - Primo piano: CO-WORKING, SALA RADIO, SALA VIDEO, SPAZIO X
     - Piano terra: DIGITAL LAB, SPAZIO ASCOLTO
   - Non contiene segreti: è un semplice elenco di ID e nomi, quindi può stare nel bundle pubblico.

2. **`composables/useCalendarConfig.ts`** ✅
   - In `loadConfig()`: se `localStorage` è vuoto o corrotto, popola `calendars`/`categories` da `DEFAULT_CONFIG` (solo se il default non è vuoto, così un futuro default si applica anche agli utenti esistenti).
   - Aggiunta funzione `applyDefaultConfig(mode: 'replace' | 'merge')` esposta insieme alle altre:
     - `replace` → azzera la configurazione attuale e imposta il default (reset);
     - `merge` → aggiunge solo gli elementi mancanti (confronto per `id`), senza toccare le modifiche dell'utente.

3. **`pages/settings/index.vue`** ✅
   - Aggiunto pulsante **"Ripristina configurazione di base"** con conferma (`confirm()`), collegato a `applyDefaultConfig('replace')`.

---

## Parte A-bis — Pulsante Home dalle impostazioni ✅ FATTO

- **Obiettivo**: dalla pagina Settings un pulsante "Home" riporta alla dashboard (`/dashboard`).
- **File**: `pages/settings/index.vue` ✅
  - Aggiunto accanto al titolo "Settings" un `<NuxtLink to="/dashboard">` con stile coerente (stesso pattern di `pages/dashboard.vue`).
- **Nota**: la navigazione esiste già nell'header (`layouts/default.vue`); il pulsante offre un accesso rapido direttamente in pagina.

---

## Parte A-ter — Persistenza sessione di login ✅ FATTO

**Problema riscontrato**: premendo "Home" il documento si ricarica; poiché lo stato di autenticazione era tenuto **solo in memoria**, la dashboard ripartiva da "non autenticato" e chiedeva di riaccedere con Google.

**Soluzione implementata** in `composables/useGoogleAuth.ts`:
- Sessione persistita in **`sessionStorage`** (chiave `google_auth`) al login (`handleOAuthResponse`) e rimossa al logout (`signOut`).
- **Ripristino automatico** all'avvio lato client (`restoreAuth()`): dopo un reload la dashboard resta autenticata (finché il tab è aperto).
- Sistemato l'`onMounted` a livello di modulo (era un no-op): l'inizializzazione ora avviene **dentro** `useGoogleAuth()` ed è protetta dal flag `initialized`.

**Nota**: il reload completo a ogni navigazione è anomalo (probabile ambiente di test / static server). La persistenza rende comunque il login resiliente; da verificare se con il fallback SPA su Netlify la navigazione torna a essere istantanea.

---

## Altre modifiche ✅ FATTO

- Rimosso l'**avatar utente** dalla sezione "Authentication Status" in `pages/settings/index.vue` (restano nome ed email).

---

## Parte B — Pulizia credenziali ✅ FATTO

1. ✅ `nuxt.config.ts` → rimosso `googleClientSecret: ''` dal `runtimeConfig`.
2. ✅ `.env` → rimossa la riga `NUXT_GOOGLE_CLIENT_SECRET`.
3. ✅ Creato `.env.example` con solo:
   ```env
   NUXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdefgh.apps.googleusercontent.com
   ```
   (con commento che ricorda di non inserire mai il Client Secret)

---

## Parte C — Deploy su Netlify

### Passi consigliati ✅ FATTO

1. ✅ **`netlify.toml`** (nuovo file nella root):
   ```toml
   [build]
     command = "npm run generate"
     publish = ".output/public"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```
   Il redirect è il **fallback SPA**: senza di esso, l'accesso diretto a `/dashboard` o `/settings` restituirebbe 404 (l'app è `ssr: false`).

2. ✅ **`.gitignore`** → rimossa la riga `package-lock.json`; il lockfile non è più ignorato e va **committato**, per build riproducibili sul provider.

### Passi obbligatori ⬜ DA FARE (manuale)

3. ⬜ **Google Cloud Console (non nel repo)**
   - Credenziali → Client OAuth2 → *Origini JavaScript autorizzate*: aggiungere `https://<dominio-produzione>` (oltre a `http://localhost:3000`).
   - Se il consent screen è in modalità **Test**: pubblicarlo oppure aggiungere gli eventuali utenti alla lista di test.

4. ⬜ **Variabile d'ambiente su Netlify**
   - Site settings → Environment variables → `NUXT_PUBLIC_GOOGLE_CLIENT_ID` = `<client-id>` (build-time). Il `.env` locale non viene deployato.

---

## Verifica

- ✅ `npm run generate` completa senza errori.
- ⬜ Login Google funzionante in produzione.
- ⬜ Refresh diretto su `https://<dominio>/settings` senza 404 (fallback SPA attivo).
- ✅ Pulsante "Ripristina configurazione di base" applica correttamente il default.
- ✅ Il pulsante "Home" in Settings naviga correttamente a `/dashboard`.
- ✅ Dopo un reload la sessione resta attiva (persistenza in `sessionStorage`).
- ✅ Il Client Secret non è presente in `.env`, in `nuxt.config.ts` né nel repo.

---

## Riepilogo file toccati

| File | Azione | Stato |
| --- | --- | --- |
| `config/defaultConfig.ts` | Nuovo — configurazione di base (2 categorie, 6 calendari) | ✅ Fatto |
| `composables/useCalendarConfig.ts` | Modifica — seed default + `applyDefaultConfig()` | ✅ Fatto |
| `composables/useGoogleAuth.ts` | Modifica — persistenza sessione (`sessionStorage`) + fix `onMounted` | ✅ Fatto |
| `pages/settings/index.vue` | Modifica — pulsante ripristino, pulsante "Home", rimozione avatar | ✅ Fatto |
| `nuxt.config.ts` | Modifica — rimozione `googleClientSecret` | ✅ Fatto |
| `.env` | Modifica — rimozione `NUXT_GOOGLE_CLIENT_SECRET` | ✅ Fatto |
| `.env.example` | Nuovo — documentazione env | ✅ Fatto |
| `netlify.toml` | Nuovo — build + fallback SPA | ✅ Fatto |
| `.gitignore` | Modifica — non ignorare `package-lock.json` | ✅ Fatto |
