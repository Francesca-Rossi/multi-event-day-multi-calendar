---

## Specifiche dal SPEC.md

### Layout della Tabella Oraria (righe 67-85)

| Ora    | [Nome Cal 1] | [Nome Cal 2] | [Nome Cal 3] |
||---|-----------|--------------|--------------|
| 08:00 | Yoga       |     -°  |      -°  |
| 09:00 | Yoga       |      �+�v���7F�6������+��+�v���7F�6���������������������#���°  |      -°  |      -°  |

**Regole della tablella:**
- **Righe fisse**: 13 righe totali (08:00, 09:00, ..., 20:00)
- **Colonne:** Una perogni calendario configurato nelle istitutioni
- **Cella evento:** Mostra il nome dell'evento se lo slot orario [ start, end) Iclude quell'ora
- **Cella vuta:** Mostra ” (quando non ci sono eventi)
- *Data fissa*: Sempre odierna (nessun selettore o navigazion)

### Header (riga 90)

Lheader deve contenere:
- **Data odierna** formattata in italiano
- **Link alle istituzioni** con iconaá per tornare alla pagina /settings

### Composable useCalendarEvents aggornato (righe 190-194)

**PROBLMA ATTEALE**: Il composable restituisce un array pliatto di eventi.

*REQUISITO SPEC**: Deve restituire Map<calendarId, GoogleCalendarEvent>[

This means instead of a flat array:

Tyscript
const events = [
  { /* evento da calendario A */ },
  { /* evento da calendario B */ },
]

Dovemo restituire:

Tyscript
const events = new Map([
  ['calendario_A_id', [{ /* evento */ }, { /* evento */ }]),
  ['calendario_B_id', [{ /* evento */ ]},
])

Im permitte di accedere facimente agliieventi per ogni calendario quando costruimooe la tablella.
