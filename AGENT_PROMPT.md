# Prompt per l'agente: implementazione Calendar Resource Viewer

## Contesto

Devi implementare una web app in **Nuxt 3 + TypeScript + Tailwind CSS** che mostra gli eventi giornalieri di più calendari Google in una tabella oraria. Leggi `SPEC.md` per la specifica completa e `SETUP_GOOGLE.md` per i prerequisiti manuali.

---

## Prerequisiti (già gestiti dall'utente)

- Client ID OAuth2 Google configurato e inserito in `.env` come `NUXT_PUBLIC_GOOGLE_CLIENT_ID`
- Google Calendar API abilitata nel progetto Google Cloud
- ID dei calendari/risorse disponibili

---

## Task list

Implementa i task nell'ordine indicato. Conferma il completamento di ciascun task prima di procedere.

---

### TASK 1 — Scaffolding progetto

```bash
npx nuxi@latest init calendar-viewer
cd calendar-viewer
npm install -D tailwindcss @tailwindcss/vite
npm install @vueuse/core
```

Configura Tailwind in `nuxt.config.ts`. Crea la struttura di cartelle:
- `pages/`, `composables/`, `components/`, `types/`

Crea `types/calendar.ts` con le interfacce:

```typescript
export interface CalendarEntry {
  id: string;
  displayName: string;
}

export interface CalendarConfig {
  calendars: CalendarEntry[];
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime: string; date?: string };
  end: { dateTime: string; date?: string };
}
```

---

### TASK 2 — Composable `useCalendarConfig`

File: `composables/useCalendarConfig.ts`

Responsabilità:
- Leggere/scrivere la lista di calendari da `localStorage` (chiave: `calendar_config`)
- Esporre: `calendars` (ref), `addCalendar(id, displayName)`, `removeCalendar(id)`, `updateDisplayName(id, name)`, `saveConfig()`, `hasCalendars` (computed)
- Usare `JSON.parse` / `JSON.stringify` per serializzare
- Gestire il caso `localStorage` vuoto o corrotto (try/catch → array vuoto)

---

### TASK 3 — Composable `useGoogleAuth`

File: `composables/useGoogleAuth.ts`

Responsabilità:
- Caricare Google Identity Services (GSI) tramite script tag in `app.vue` (o `useHead`)
- Inizializzare `google.accounts.oauth2.initTokenClient` con:
  - `client_id`: da `useRuntimeConfig().public.googleClientId`
  - `scope`: `https://www.googleapis.com/auth/calendar.readonly`
  - `callback`: salva il token in un `ref<string | null>` in-memory
- Esporre: `accessToken` (ref), `isAuthenticated` (computed), `signIn()`, `signOut()` (pulisce il token)
- Non salvare il token in `localStorage`

Nota: il Client ID va letto da `useRuntimeConfig().public.googleClientId` — aggiungi `runtimeConfig: { public: { googleClientId: '' } }` in `nuxt.config.ts`.

---

### TASK 4 — Composable `useCalendarEvents`

File: `composables/useCalendarEvents.ts`

Firma:
```typescript
function useCalendarEvents(
  calendars: Ref<CalendarEntry[]>,
  accessToken: Ref<string | null>
)
```

Responsabilità:
- Esporre: `events` (`Ref<Map<string, GoogleCalendarEvent[]>>`), `loading` (ref bool), `errors` (`Ref<Map<string, string>>`), `fetchAll()`
- `fetchAll()`:
  1. Calcola `timeMin` (oggi 00:00 UTC) e `timeMax` (oggi 23:59 UTC)
  2. `Promise.all` su tutti i calendari
  3. Per ogni calendario: `GET https://www.googleapis.com/calendar/v3/calendars/{encodeURIComponent(id)}/events` con i parametri della spec
  4. Header: `Authorization: Bearer {accessToken}`
  5. Se risposta non-ok → salva messaggio errore in `errors` per quell'ID, non bloccare gli altri
  6. Popola `events` con `Map<calendarId, events[]>`

---

### TASK 5 — Pagina `/settings`

File: `pages/settings.vue`

UI:
- Titolo "Impostazioni Calendari"
- Sezione "Aggiungi calendario":
  - Input: ID calendario
  - Input: nome visualizzato (opzionale, default = ID)
  - Bottone "Aggiungi" (disabilitato se ID vuoto)
- Lista calendari configurati:
  - Per ciascuno: mostra ID (testo piccolo), input per modificare il nome, bottone "Rimuovi"
- Bottone "Salva impostazioni" → chiama `saveConfig()` e mostra feedback "Salvato ✓"
- Bottone/link "Vai alla Dashboard" → `navigateTo('/dashboard')` (disabilitato se nessun calendario)

Comportamento:
- Al salvataggio, aggiorna `localStorage`
- Se si arriva qui con calendari già configurati, mostrarli pre-popolati

---

### TASK 6 — Pagina `/dashboard`

File: `pages/dashboard.vue`

UI:
- Header: data odierna formattata in italiano (es. "Mercoledì 18 giugno 2025") + link ⚙️ a `/settings`
- Se non autenticato: mostra bottone "Accedi con Google" centrato → chiama `signIn()`
- Se autenticato + loading: skeleton/spinner
- Se autenticato + dati: `<CalendarTable>`

Comportamento:
- Al mount: se `!isAuthenticated` → mostra login; altrimenti → `fetchAll()`
- Dopo `signIn()` (watch su `accessToken`) → `fetchAll()`

---

### TASK 7 — Componente `CalendarTable`

File: `components/CalendarTable.vue`

Props:
```typescript
props: {
  calendars: CalendarEntry[],
  events: Map<string, GoogleCalendarEvent[]>,
  errors: Map<string, string>
}
```

Logica:
- Genera gli slot orari: array di numeri `[8, 9, 10, ..., 20]`
- Per ogni slot e ogni calendario: chiama `getEventForSlot(events.get(calId), hour)`
- Funzione `getEventForSlot`:
  ```typescript
  function getEventForSlot(events: GoogleCalendarEvent[] | undefined, slotHour: number): string | null {
    if (!events) return null;
    const match = events.find(event => {
      const start = new Date(event.start.dateTime ?? event.start.date!);
      const end = new Date(event.end.dateTime ?? event.end.date!);
      return start.getHours() <= slotHour && end.getHours() > slotHour;
    });
    return match?.summary ?? null;
  }
  ```

Rendering tabella:
- `<table>` con `<thead>` (Ora | nomi calendari) e `<tbody>` (righe orarie)
- Se c'è un errore per un calendario → mostra "⚠ Errore accesso" nella cella header o in tutta la colonna
- Celle evento: sfondo colorato leggero (es. `bg-blue-100`), testo nome evento
- Celle vuote: `—` in grigio chiaro

---

### TASK 8 — Pagina `/index` (redirect)

File: `pages/index.vue`

```typescript
// In setup o middleware
const { hasCalendars } = useCalendarConfig();
if (hasCalendars.value) {
  navigateTo('/dashboard');
} else {
  navigateTo('/settings');
}
```

---

### TASK 9 — Integrazione script GSI in `app.vue`

In `app.vue`, usa `useHead` per iniettare lo script Google:

```typescript
useHead({
  script: [
    { src: 'https://accounts.google.com/gsi/client', async: true, defer: true }
  ]
});
```

---

### TASK 10 — Stile e UX minima

- Layout centrato con max-width ragionevole
- Tabella scrollabile orizzontalmente su schermi stretti
- Feedback visivo su loading (spinner o `opacity-50` sulla tabella)
- Messaggio di errore per calendari non accessibili (non blocca l'intera pagina)
- Colori: intestazioni tabella in grigio scuro, righe alternate chiare/bianche, eventi in `bg-indigo-100 text-indigo-800`

---

## Note implementative

- Usare `<NuxtPage />` in `app.vue` — nessun layout complesso necessario in v1
- Evitare SSR per le chiamate Google API: usare `onMounted` o `process.client` guard dove necessario, oppure configurare `ssr: false` in `nuxt.config.ts` (accettabile per questa app interna)
- Il composable `useGoogleAuth` dipende da `window.google` — inizializzare solo dopo il mount
- Tutte le chiamate API fallibili devono avere try/catch con errore mostrato all'utente
