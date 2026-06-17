# Spec: Google Calendar Resource Viewer

## Panoramica

Web app in **Nuxt 3 + TypeScript** che mostra in una tabella giornaliera gli eventi di più calendari Google (risorse di Google Workspace), con autenticazione OAuth2, configurazione dei calendari tramite pannello impostazioni e intestazioni colonne personalizzabili.

---

## Stack tecnico

| Layer | Scelta |
|---|---|
| Framework | Nuxt 3 (Vue 3, Composition API) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Google OAuth2 (scope: `calendar.readonly`) |
| API | Google Calendar API v3 |
| State | `useState` / `useLocalStorage` di Nuxt/VueUse |
| Storage config | `localStorage` (lato client) |

---

## Struttura delle pagine

```
/                → redirect a /dashboard o /settings (primo avvio)
/settings        → configurazione calendari
/dashboard       → tabella giornaliera
```

### Logica di primo avvio

Al montaggio dell'app, se `localStorage` non contiene calendari configurati → redirect automatico a `/settings`.

---

## Pagina `/settings`

### Funzionalità

1. **Connetti calendari** — input testuale per inserire l'ID di un calendario Google (es. `c_abc123@resource.calendar.google.com`) + bottone "Aggiungi".
2. **Lista calendari aggiunti** — per ciascuno:
   - ID calendario (non modificabile, testo piccolo/grigio)
   - Campo testo per il **nome personalizzato** (intestazione colonna)
   - Bottone "Rimuovi"
3. **Salva** — persiste la configurazione in `localStorage`
4. **Vai alla Dashboard** — link/bottone (disabilitato se nessun calendario configurato)

### Struttura dati in localStorage

```typescript
// chiave: "calendar_config"
interface CalendarConfig {
  calendars: CalendarEntry[];
}

interface CalendarEntry {
  id: string;          // ID calendario Google
  displayName: string; // Nome personalizzato (intestazione colonna)
}
```

---

## Pagina `/dashboard`

### Layout tabella

```
| Ora   | [Nome Cal 1] | [Nome Cal 2] | [Nome Cal 3] |
|-------|--------------|--------------|--------------|
| 08:00 | Yoga         |      —       |      —       |
| 09:00 | Yoga         |      —       | Ginnastica   |
| 10:00 |      —       |      —       | Ginnastica   |
| ...   | ...          | ...          | ...          |
| 19:00 |      —       |      —       |      —       |
```

### Specifiche tabella

- **Righe orarie**: dalle `08:00` alle `20:00`, slot da **60 minuti** (13 righe totali: 08, 09, …, 20).
- **Colonne**: una per ogni calendario configurato.
- **Celle evento**: se uno slot orario rientra nell'intervallo `[start, end)` di un evento, mostra il nome dell'evento. Celle consecutive dello stesso evento possono avere un colore/stile unificato (rowspan opzionale, ma non obbligatorio — anche ripetere il titolo va bene).
- **Celle vuote**: mostrare `—` o lasciare vuote.
- **Data mostrata**: sempre **oggi** (nessun selettore data in v1).

### Header

- Data odierna visibile in alto (es. "Mercoledì 18 giugno 2025")
- Link/icona per tornare alle impostazioni (⚙️)

---

## Autenticazione Google OAuth2

### Flusso

1. Al caricamento del `/dashboard`, se non c'è un token valido in memoria → mostra bottone **"Accedi con Google"**.
2. Click → redirect OAuth2 con scope `https://www.googleapis.com/auth/calendar.readonly`.
3. Google rimanda a `/callback` (o gestione inline con popup) con `access_token`.
4. Token salvato in memoria (non in `localStorage` per sicurezza — solo `sessionStorage` o stato reattivo in-memory).
5. Con token valido → fetch automatico degli eventi.

### Configurazione OAuth

Usare **Google Identity Services** (GSI) lato client — nessun backend necessario per v1.

```html
<!-- da inserire in app.vue o layout -->
<script src="https://accounts.google.com/gsi/client" async></script>
```

Credenziali richieste: **Client ID** da Google Cloud Console (OAuth 2.0 per app web). Il Client ID va configurato come variabile d'ambiente:

```env
NUXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

---

## Integrazione Google Calendar API

### Endpoint usato

```
GET https://www.googleapis.com/calendar/v3/calendars/{calendarId}/events
```

### Parametri query

```typescript
const params = {
  timeMin: startOfDay.toISOString(),   // oggi 00:00:00
  timeMax: endOfDay.toISOString(),     // oggi 23:59:59
  singleEvents: true,
  orderBy: 'startTime',
};
```

### Chiamata per ogni calendario

Eseguire una chiamata per ogni `CalendarEntry.id`, in parallelo (`Promise.all`).

### Tipo risposta (semplificato)

```typescript
interface GoogleCalendarEvent {
  id: string;
  summary: string;          // nome evento
  start: { dateTime: string; date?: string };
  end: { dateTime: string; date?: string };
}
```

### Logica di mapping sulla tabella

Per ogni slot orario `H` (es. 08:00 = ore 8):

```typescript
function getEventForSlot(events: GoogleCalendarEvent[], slotHour: number): string | null {
  const match = events.find(event => {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    return start.getHours() <= slotHour && end.getHours() > slotHour;
  });
  return match?.summary ?? null;
}
```

---

## Composables da creare

### `useCalendarConfig`

```typescript
// Legge/scrive la configurazione da localStorage
const { calendars, addCalendar, removeCalendar, updateDisplayName, saveConfig } = useCalendarConfig();
```

### `useGoogleAuth`

```typescript
// Gestisce token OAuth2
const { accessToken, signIn, signOut, isAuthenticated } = useGoogleAuth();
```

### `useCalendarEvents`

```typescript
// Fetch eventi per tutti i calendari configurati per la data odierna
const { events, loading, error, fetchAll } = useCalendarEvents(calendars, accessToken);
// events: Map<calendarId, GoogleCalendarEvent[]>
```

---

## Struttura file consigliata

```
/
├── app.vue
├── nuxt.config.ts
├── .env
├── pages/
│   ├── index.vue          # redirect logic
│   ├── settings.vue       # configurazione calendari
│   └── dashboard.vue      # tabella principale
├── composables/
│   ├── useCalendarConfig.ts
│   ├── useGoogleAuth.ts
│   └── useCalendarEvents.ts
├── components/
│   ├── CalendarTable.vue  # tabella oraria
│   ├── CalendarCell.vue   # singola cella
│   └── EventChip.vue      # chip nome evento
├── types/
│   └── calendar.ts        # interfacce TypeScript
└── public/
```

---

## Requisiti non funzionali

- Nessun backend — tutto client-side.
- Nessun database — solo `localStorage`.
- Responsive (almeno tablet landscape).
- Gestione errori visibile: se un calendario non è accessibile (403/404), mostrare un messaggio nella colonna corrispondente invece di bloccare l'intera app.
- Loading state durante il fetch degli eventi (spinner o skeleton).

---

## Out of scope (v1)

- Selezione data (solo oggi)
- Creazione/modifica eventi
- Slot da 30 minuti
- Notifiche / refresh automatico
- Multi-utente / login multiplo
