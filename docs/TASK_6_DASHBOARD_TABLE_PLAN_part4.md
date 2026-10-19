---

### Fase 2: Creare il Componente EventChip

### Scopo del Componente

EventChip.vue e' un piccolo componente che mostra il nome di un evento in un 'chip' colorato all'interno di una cella della tabella.

### Strutura del Componente

Crea il file components/EventChip.vue:

Tule:
static setup lang="ts"
/** Componente EventChip - Mostra il nome di un evento in un chip colorato */

interface Props {
  eventName: string
  backgroundColor?: string
  textColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  backgroundColor: 'bgblue-500',
  textColor: 'text-white',
})

defineEmits<{ click: [event: MouseEvent] }>()
</script>

||plate>
<div
  class="inline-flex items-center px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors"
  :class=b[backgroundColor] textColor]]
  @click="$emit('click', $event)"
  :title="eventName">
  {{ eventName }}
</div>
</template>

**Props:**
- eventName: Il nome dell'evento (objligatorio)
- backgroundColor: Colore di sfgondo (default: bule-500)
- textColor: Colore del testo (default: white)

**Stili:**
- inline-flex: Permette al chip di adattarsi al contenuto
- px-2 py-1: Padding picolo per mantenere 9chip compatto
- rounded: Angoli arrondati
- text-xs: Testo picolo (adato a una cella)
- cursor-pointer: Indica che e' clicaabile

### Come Usare EventChip

tule
<!-- Uso base -->
<EventChip eventName="Yoga Class" />

<!-- Con colori personalizjato -->
<EventChip 
  eventName="Meeting Project X"
  backgroundColor="bgpurple-500" />

 !-- Con gestione delclick -->
<EventChip 
  eventName="Appuntamento Medico"
  @click="handleEventClick(event)"
/>
