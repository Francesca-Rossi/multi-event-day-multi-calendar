# Setup: Google Cloud Console & OAuth2

Questo documento descrive i passi manuali da eseguire **prima** di avviare lo sviluppo, per ottenere le credenziali OAuth2 necessarie all'app.

---

## 1. Creare un progetto Google Cloud

1. Vai su [https://console.cloud.google.com](https://console.cloud.google.com)
2. Crea un nuovo progetto (es. `calendar-resource-viewer`)
3. Seleziona il progetto appena creato

---

## 2. Abilitare Google Calendar API

1. Menu → **API e servizi** → **Libreria**
2. Cerca "Google Calendar API"
3. Clicca **Abilita**

---

## 3. Configurare la schermata di consenso OAuth

1. Menu → **API e servizi** → **Schermata consenso OAuth**
2. Tipo utente: **Interno** (se usi Google Workspace) oppure **Esterno**
3. Compila i campi obbligatori (nome app, email supporto)
4. Scope → Aggiungi: `https://www.googleapis.com/auth/calendar.readonly`
5. Salva

> ⚠️ Se scegli **Esterno**, l'app rimarrà in modalità "Test" finché non viene pubblicata. Aggiungi gli account Google degli utenti di test nella sezione apposita.

---

## 4. Creare le credenziali OAuth2 (Client ID)

1. Menu → **API e servizi** → **Credenziali**
2. Clicca **Crea credenziali** → **ID client OAuth 2.0**
3. Tipo applicazione: **Applicazione web**
4. Nome: es. `Calendar Viewer Web`
5. **Origini JavaScript autorizzate**:
   - `http://localhost:3000` (sviluppo)
   - `https://tuo-dominio.com` (produzione, se applicabile)
6. **URI di reindirizzamento autorizzati**: (non necessari per il flusso token implicito GSI, ma aggiungere `http://localhost:3000` per sicurezza)
7. Clicca **Crea**
8. Copia il **Client ID** generato

---

## 5. Configurare le variabili d'ambiente

Crea il file `.env` nella root del progetto Nuxt:

```env
NUXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcdefgh.apps.googleusercontent.com
```

> Il prefisso `NUXT_PUBLIC_` rende la variabile accessibile lato client in Nuxt 3.

---

## 6. Trovare gli ID dei calendari/risorse

Per ogni risorsa Google Workspace che vuoi monitorare:

### Metodo A — Google Admin Console (consigliato per risorse)

1. Vai su [https://admin.google.com](https://admin.google.com)
2. **Directory** → **Edifici e risorse** → **Gestisci risorse**
3. Clicca sulla risorsa → l'ID del calendario è visibile nei dettagli (formato: `c_xxxxx@resource.calendar.google.com`)

### Metodo B — Google Calendar Web

1. Apri [https://calendar.google.com](https://calendar.google.com)
2. Nella barra laterale, trova il calendario → `⋮` → **Impostazioni e condivisione**
3. Scorri fino a "ID calendario" nella sezione "Integra calendario"

### Metodo C — Calendar API (lista calendari)

Con un token valido:

```
GET https://www.googleapis.com/calendar/v3/calendarList
```

Restituisce tutti i calendari a cui l'utente autenticato ha accesso.

---

## 7. Permessi di accesso alle risorse

L'utente che si autentica nell'app deve avere accesso **almeno in lettura** ai calendari delle risorse. In Google Workspace:

- Le risorse sono spesso accessibili a tutti gli utenti del dominio per impostazione predefinita
- Se l'API restituisce `403 Access Not Configured` o `404`, verificare le condivisioni dalla Admin Console

---

## Note di sicurezza

- Il **Client ID** è pubblico (visibile nel codice client-side) — è normale per il flusso OAuth implicito/PKCE
- Non inserire mai **Client Secret** nel codice client-side
- Il token OAuth è salvato solo in sessione (non in `localStorage`) — scade tipicamente dopo 1 ora
- Per un'app interna, il flusso **Google Identity Services (GSI)** con `tokenClient` è sufficiente senza backend
