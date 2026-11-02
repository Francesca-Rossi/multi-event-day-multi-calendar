<script setup lang="ts">
interface Props {
  modelValue?: string
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  size: 'md',
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const inputRef = ref<HTMLInputElement | null>(null)

function openPicker() {
  inputRef.value?.click()
}

function onInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLInputElement).value)
}

const sizeClass = computed(() => props.size === 'sm' ? 'h-8 w-8' : 'h-10 w-10')
const dotClass = computed(() => props.size === 'sm' ? 'h-6 w-6' : 'h-7 w-7')
</script>

<template>
  <div class="relative inline-flex items-center justify-center shrink-0">
    <input
      ref="inputRef"
      type="color"
      :value="modelValue"
      class="absolute w-0 h-0 opacity-0 pointer-events-none"
      @input="onInput"
    >
    <button
      type="button"
      :class="[
        sizeClass,
        'rounded-full border border-gray-300 shadow-sm cursor-pointer transition-transform hover:scale-110 flex items-center justify-center'
      ]"
      :style="{ backgroundColor: modelValue || '#9ca3af' }"
      :title="modelValue ? 'Clicca per cambiare colore' : 'Clicca per scegliere un colore'"
      @click="openPicker"
    >
      <div :class="[dotClass, 'rounded-full border border-white/30']"></div>
    </button>
  </div>
</template>
