// Configurazione di base (default) dell'applicazione
//
// Questo file definisce i calendari e le categorie che vengono applicati
// automaticamente al primo accesso di un nuovo utente (quando localStorage è
// vuoto) e che possono essere riapplicati manualmente dalla pagina Settings
// tramite il pulsante "Ripristina configurazione di base".
//
// NON contiene segreti: sono solo ID calendario e nomi visualizzati, quindi
// possono essere pubblicati nel bundle client-side.
//
// Le categorie hanno un `id` stabile e univoco; i calendari vi fanno
// riferimento tramite il campo `category`, usando lo stesso `id`.

import type { CalendarConfig } from '~/types/calendar'

export const DEFAULT_CONFIG: CalendarConfig = {
  categories: [
    { id: 'piano-terra', name: 'Piano terra' },
    { id: 'primo-piano', name: 'Primo piano' }
  ],
  calendars: [
    {
      id: 'c_18884pjfmai5ug1nnm4r9av8l4gvs@resource.calendar.google.com',
      displayName: 'CO-WORKING',
      category: 'primo-piano'
    },
    {
      id: 'c_1886tt540ih90joigjmn7lq4jpl8o@resource.calendar.google.com',
      displayName: 'DIGITAL LAB',
      category: 'piano-terra'
    },
    {
      id: 'c_18866luuth3hmjqbls29aqqibb97a@resource.calendar.google.com',
      displayName: 'SALA RADIO',
      category: 'primo-piano'
    },
    {
      id: 'c_1884u5s228crog3vnjostthivppi4@resource.calendar.google.com',
      displayName: 'SALA VIDEO',
      category: 'primo-piano'
    },
    {
      id: 'c_188effju1b1gmg0amimf1mdtsjh7o@resource.calendar.google.com',
      displayName: 'SPAZIO X',
      category: 'primo-piano'
    },
    {
      id: 'c_188ctdaumjckuim3ijhg8vrvb55kc@resource.calendar.google.com',
      displayName: 'SPAZIO ASCOLTO',
      category: 'piano-terra'
    }
  ]
}
