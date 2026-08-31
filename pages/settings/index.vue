<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <h2 class="text-2xl font-bold text-gray-900 mb-6">Settings</h2>

    <!-- Authentication Status Section -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900">Authentication Status</h3>
      </template>
      
      <div v-if="isAuthenticated" class="flex items-center space-x-4">
        <img 
          :src="user?.profile?.picture || ''" 
          alt="User Avatar" 
          class="w-12 h-12 rounded-full"
          v-if="user?.profile?.picture"
        />
        <div>
          <p class="text-sm font-medium text-gray-900">{{ user?.profile?.name }}</p>
          <p class="text-sm text-gray-500">{{ user?.profile?.email }}</p>
        </div>
        <button
          @click="handleSignOut"
          class="ml-auto px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
        >
          Sign Out
        </button>
      </div>

      <div v-else class="flex items-center justify-between">
        <div>
          <p class="text-sm text-gray-600">You are not signed in to Google</p>
          <p class="text-xs text-gray-500 mt-1">Sign in to fetch calendar events</p>
        </div>
        <button
          @click="handleSignIn"
          :disabled="authState === 'loading'"
          class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          <span v-if="authState === 'loading'">Loading...</span>
          <span v-else>Sign In with Google</span>
        </button>
      </div>

      <div v-if="errorMessage" class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
        <p class="text-sm text-red-700">{{ errorMessage }}</p>
      </div>
    </UCard>

    <!-- Categories Section -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900">Categories</h3>
      </template>

      <form @submit.prevent="handleAddCategory" class="space-y-4">
        <div>
          <label for="categoryName" class="block text-sm font-medium text-gray-700 mb-1">
            Category Name
          </label>
          <UInput
            id="categoryName"
            v-model="newCategoryName"
            placeholder="e.g. Sale"
            autofocus
          />
          <p v-if="categoryErrors.name" class="mt-1 text-sm text-red-600">
            {{ categoryErrors.name }}
          </p>
        </div>

        <button
          type="submit"
          :disabled="!newCategoryName.trim()"
          class="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Category
        </button>
      </form>

      <div v-if="categories.length === 0" class="mt-4 text-center py-4 border-t border-gray-200">
        <p class="text-sm text-gray-600">No categories yet</p>
      </div>

      <div v-else class="mt-4 space-y-2 border-t border-gray-200 pt-4">
        <div
          v-for="category in categories"
          :key="category.id"
          class="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div class="flex-1 min-w-0">
            <template v-if="editingCategoryId === category.id">
              <UInput
                v-model="editingCategoryName"
                placeholder="Nome categoria"
                autofocus
                @keyup.enter="handleSaveCategory(category.id)"
                @keyup.esc="handleCancelCategoryEdit"
              />
            </template>
            <template v-else>
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ category.name }}
              </p>
              <p class="text-xs text-gray-500">
                {{ calendarCountByCategory(category.id) }} calendario/i
              </p>
            </template>
          </div>

          <div class="flex items-center space-x-2 ml-4">
            <template v-if="editingCategoryId === category.id">
              <UButton
                size="sm"
                variant="ghost"
                color="green"
                @click="handleSaveCategory(category.id)"
                title="Salva"
              >
                <Icon name="heroicons:check" class="w-4 h-4" />
              </UButton>
              <UButton
                size="sm"
                variant="ghost"
                color="gray"
                @click="handleCancelCategoryEdit"
                title="Annulla"
              >
                <Icon name="heroicons:x-mark" class="w-4 h-4" />
              </UButton>
            </template>

            <template v-else>
              <UButton
                size="sm"
                variant="ghost"
                color="gray"
                @click="handleUpdateCategory(category)"
                title="Rename"
              >
                <Icon name="heroicons:pencil" class="w-4 h-4" />
              </UButton>
              <UButton
                size="sm"
                variant="ghost"
                color="red"
                @click="handleRemoveCategory(category.id)"
                title="Remove"
              >
                <Icon name="heroicons:trash" class="w-4 h-4" />
              </UButton>
            </template>
          </div>
        </div>
      </div>
    </UCard>

    <!-- Add Calendar Section -->
    <UCard class="mb-6">
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900">Add Calendar</h3>
      </template>

      <form @submit.prevent="handleAddCalendar" class="space-y-4">
        <div>
          <label for="calendarId" class="block text-sm font-medium text-gray-700 mb-1">
            Calendar ID
          </label>
          <UInput
            id="calendarId"
            v-model="newCalendarId"
            placeholder="example@group.calendar.google.com"
            :class="{ 'border-red-300': errors.calendarId }"
            :ui="{ ring: '', focus: '' }"
          />
          <p v-if="errors.calendarId" class="mt-1 text-sm text-red-600">
            {{ errors.calendarId }}
          </p>
          <p class="mt-1 text-xs text-gray-500">
            Enter the Google Calendar ID (usually ends with @group.calendar.google.com)
          </p>
        </div>

        <div>
          <label for="displayName" class="block text-sm font-medium text-gray-700 mb-1">
            Display Name (Optional)
          </label>
          <UInput
            id="displayName"
            v-model="newCalendarDisplayName"
            placeholder="My Work Calendar"
          />
        </div>

        <div>
          <label for="newCalendarCategory" class="block text-sm font-medium text-gray-700 mb-1">
            Category (Optional)
          </label>
          <select
            id="newCalendarCategory"
            v-model="newCalendarCategoryId"
            class="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Nessuna categoria</option>
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ category.name }}
            </option>
          </select>
        </div>

        <button
          type="submit"
          :disabled="!isValidCalendarId || addingCalendar"
          class="w-full px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="addingCalendar">Adding...</span>
          <span v-else>Add Calendar</span>
        </button>
      </form>
    </UCard>

    <!-- Configured Calendars Section -->
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold text-gray-900">Configured Calendars</h3>
      </template>

      <div v-if="calendars.length === 0" class="text-center py-8">
        <p class="text-sm text-gray-600">No calendars configured yet</p>
        <p class="text-xs text-gray-500 mt-1">Add a calendar above to get started</p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="calendar in calendars"
          :key="calendar.id"
          class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
        >
          <div class="flex-1 min-w-0">
            <template v-if="editingCalendarId === calendar.id">
              <UInput
                v-model="editingName"
                placeholder="Nome visualizzato"
                autofocus
                @keyup.enter="handleSaveDisplayName(calendar.id)"
                @keyup.esc="handleCancelEdit"
              />
            </template>
            <template v-else>
              <p class="text-sm font-medium text-gray-900 truncate">
                {{ calendar.displayName || calendar.id }}
              </p>
              <p class="text-xs text-gray-500 truncate">{{ calendar.id }}</p>
              <div class="mt-2">
                <label :for="`category-${calendar.id}`" class="block text-xs font-medium text-gray-500 mb-1">
                  Categoria
                </label>
                <select
                  :id="`category-${calendar.id}`"
                  :value="calendar.category || ''"
                  @change="handleCalendarCategoryChange(calendar.id, $event)"
                  class="px-2 py-1 border border-gray-300 rounded-md bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Nessuna categoria</option>
                  <option v-for="category in categories" :key="category.id" :value="category.id">
                    {{ category.name }}
                  </option>
                </select>
              </div>
            </template>
          </div>
          
          <div class="flex items-center space-x-2 ml-4">
            <template v-if="editingCalendarId === calendar.id">
              <UButton
                size="sm"
                variant="ghost"
                color="green"
                @click="handleSaveDisplayName(calendar.id)"
                title="Salva"
              >
                <Icon name="heroicons:check" class="w-4 h-4" />
              </UButton>
              
              <UButton
                size="sm"
                variant="ghost"
                color="gray"
                @click="handleCancelEdit"
                title="Annulla"
              >
                <Icon name="heroicons:x-mark" class="w-4 h-4" />
              </UButton>
            </template>
            
            <template v-else>
              <UButton
                size="sm"
                variant="ghost"
                color="gray"
                @click="moveCalendarUp(calendar.id)"
                :disabled="isFirst(calendar)"
                title="Sposta su"
              >
                <Icon name="heroicons:chevron-up" class="w-4 h-4" />
              </UButton>
              
              <UButton
                size="sm"
                variant="ghost"
                color="gray"
                @click="moveCalendarDown(calendar.id)"
                :disabled="isLast(calendar)"
                title="Sposta giù"
              >
                <Icon name="heroicons:chevron-down" class="w-4 h-4" />
              </UButton>
              
              <UButton
                size="sm"
                variant="ghost"
                color="gray"
                @click="handleUpdateDisplayName(calendar)"
                title="Rename"
              >
                <Icon name="heroicons:pencil" class="w-4 h-4" />
              </UButton>
              
              <UButton
                size="sm"
                variant="ghost"
                color="red"
                @click="handleRemoveCalendar(calendar.id)"
                title="Remove"
              >
                <Icon name="heroicons:trash" class="w-4 h-4" />
              </UButton>
            </template>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup>
const route = useRoute()
const router = useRouter()

// Use composables
const { calendars, categories, addCalendar, removeCalendar, updateDisplayName, moveCalendarUp, moveCalendarDown, addCategory, updateCategory, removeCategory, setCalendarCategory } = useCalendarConfig()
const { signIn, signOut, authState, user, errorMessage: authErrorMessage, isAuthenticated } = useGoogleAuth()

// State calendari
const newCalendarId = ref('')
const newCalendarDisplayName = ref('')
const newCalendarCategoryId = ref('')
const addingCalendar = ref(false)
const editingCalendarId = ref(null)
const editingName = ref('')
const errors = ref({})

// State categorie
const newCategoryName = ref('')
const editingCategoryId = ref(null)
const editingCategoryName = ref('')
const categoryErrors = ref({})

// Computed
const isValidCalendarId = computed(() => {
  const id = newCalendarId.value.trim()
  return id.length > 0 && (id.includes('@') || id.startsWith('primary'))
})

// Validation
const validateCalendarId = () => {
  errors.value = {}
  
  const id = newCalendarId.value.trim()
  
  if (!id) {
    errors.value.calendarId = 'Calendar ID is required'
    return false
  }
  
  if (id.length < 5) {
    errors.value.calendarId = 'Calendar ID is too short'
    return false
  }
  
  // Check for duplicates
  if (calendars.value.some(c => c.id === id)) {
    errors.value.calendarId = 'This calendar is already added'
    return false
  }
  
  return true
}

// Event Handlers
const handleSignIn = async () => {
  try {
    await signIn()
  } catch (error) {
    console.error('Sign in error:', error)
  }
}

const handleSignOut = async () => {
  try {
    await signOut()
  } catch (error) {
    console.error('Sign out error:', error)
  }
}

const handleAddCalendar = async () => {
  errors.value = {}
  
  if (!validateCalendarId()) {
    return
  }
  
  addingCalendar.value = true
  
  try {
    const id = newCalendarId.value.trim()
    const displayName = newCalendarDisplayName.value.trim() || undefined
    const categoryId = newCalendarCategoryId.value || undefined
    
    addCalendar(id, displayName)
    
    // Assegna la categoria se selezionata
    if (categoryId) {
      setCalendarCategory(id, categoryId)
    }
    
    console.log('Calendar added successfully:', { id, displayName, category: categoryId })
    
    // Reset form
    newCalendarId.value = ''
    newCalendarDisplayName.value = ''
    newCalendarCategoryId.value = ''
  } catch (error) {
    console.error('Error adding calendar:', error)
    errors.value.general = 'Failed to add calendar. Please try again.'
  } finally {
    addingCalendar.value = false
  }
}

const handleUpdateDisplayName = (calendar) => {
  editingCalendarId.value = calendar.id
  editingName.value = calendar.displayName || ''
}

const handleSaveDisplayName = (calendarId) => {
  if (!editingName.value.trim()) {
    updateDisplayName(calendarId, '')
    console.log('Display name updated to empty string for:', calendarId)
  } else {
    updateDisplayName(calendarId, editingName.value.trim())
    console.log('Display name updated:', { calendarId, displayName: editingName.value.trim() })
  }
  
  editingCalendarId.value = null
  editingName.value = ''
}

const handleCancelEdit = () => {
  editingCalendarId.value = null
  editingName.value = ''
}

const handleRemoveCalendar = (calendarId) => {
  if (confirm(`Are you sure you want to remove this calendar?`)) {
    removeCalendar(calendarId)
    console.log('Calendar removed:', calendarId)
  }
}

// ---------------------------------------------------------------------------
// Gestione categorie
// ---------------------------------------------------------------------------

const handleAddCategory = () => {
  categoryErrors.value = {}

  const name = newCategoryName.value.trim()
  if (!name) {
    categoryErrors.value.name = 'Category name is required'
    return
  }

  const created = addCategory(name)
  if (!created) {
    categoryErrors.value.name = 'A category with this name already exists'
    return
  }

  console.log('Category added successfully:', created)
  newCategoryName.value = ''
}

const handleUpdateCategory = (category) => {
  editingCategoryId.value = category.id
  editingCategoryName.value = category.name
}

const handleSaveCategory = (categoryId) => {
  if (!editingCategoryName.value.trim()) {
    editingCategoryId.value = null
    editingCategoryName.value = ''
    return
  }

  updateCategory(categoryId, editingCategoryName.value.trim())
  console.log('Category updated:', { categoryId, name: editingCategoryName.value.trim() })

  editingCategoryId.value = null
  editingCategoryName.value = ''
}

const handleCancelCategoryEdit = () => {
  editingCategoryId.value = null
  editingCategoryName.value = ''
}

const handleRemoveCategory = (categoryId) => {
  const category = categories.value.find((cat) => cat.id === categoryId)
  if (confirm(`Are you sure you want to remove the category "${category ? category.name : ''}"? Calendars in this category will become uncategorized.`)) {
    removeCategory(categoryId)
    console.log('Category removed:', categoryId)
  }
}

const handleCalendarCategoryChange = (calendarId, event) => {
  const categoryId = event.target.value || undefined
  setCalendarCategory(calendarId, categoryId)
  console.log('Calendar category updated:', { calendarId, category: categoryId || null })
}

const calendarCountByCategory = (categoryId) => {
  return calendars.value.filter((cal) => cal.category === categoryId).length
}

// Watch for editing changes
watch(editingCalendarId, (newId) => {
  if (newId === null) {
    editingName.value = ''
  }
})

// Computed per verificare se un calendario è il primo o l'ultimo
const isFirst = (calendar) => {
  return calendars.value.length > 0 && calendars.value[0].id === calendar.id
}

const isLast = (calendar) => {
  return calendars.value.length > 0 && calendars.value[calendars.value.length - 1].id === calendar.id
}
</script>
