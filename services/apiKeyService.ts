const API_KEYS_STORAGE_KEY = 'geminiApiKeys';
const ACTIVE_KEY_INDEX_KEY = 'geminiActiveKeyIndex';

// Function to safely parse JSON from localStorage
function getFromStorage<T>(key: string, defaultValue: T): T {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error reading from localStorage key "${key}":`, error);
        return defaultValue;
    }
}

// Function to safely save to localStorage
function saveToStorage(key: string, value: any): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving to localStorage key "${key}":`, error);
    }
}

/**
 * Retrieves all stored API keys.
 * @returns {string[]} An array of API key strings.
 */
export function getApiKeys(): string[] {
    return getFromStorage<string[]>(API_KEYS_STORAGE_KEY, []);
}

/**
 * Adds a new API key to the list.
 * @param {string} key The API key to add.
 */
export function addApiKey(key: string): void {
    const keys = getApiKeys();
    if (!keys.includes(key)) {
        keys.push(key);
        saveToStorage(API_KEYS_STORAGE_KEY, keys);
    }
}

/**
 * Removes an API key from the list by its index.
 * @param {number} index The index of the key to remove.
 */
export function removeApiKey(index: number): void {
    const keys = getApiKeys();
    if (index >= 0 && index < keys.length) {
        keys.splice(index, 1);
        saveToStorage(API_KEYS_STORAGE_KEY, keys);
        
        // Adjust the active index if necessary
        const activeIndex = getActiveKeyIndex();
        if (activeIndex >= keys.length) {
            setActiveKeyIndex(Math.max(0, keys.length - 1));
        }
    }
}

/**
 * Gets the index of the currently active API key.
 * @returns {number} The active key index.
 */
export function getActiveKeyIndex(): number {
    return getFromStorage<number>(ACTIVE_KEY_INDEX_KEY, 0);
}

/**
 * Sets the index of the active API key.
 * @param {number} index The new active key index.
 */
export function setActiveKeyIndex(index: number): void {
    saveToStorage(ACTIVE_KEY_INDEX_KEY, index);
}

/**
 * Retrieves the currently active API key.
 * @returns {string | null} The active API key string, or null if no keys are set.
 */
export function getActiveApiKey(): string | null {
    const keys = getApiKeys();
    if (keys.length === 0) {
        return null;
    }
    const activeIndex = getActiveKeyIndex();
    // Ensure index is within bounds if keys have been removed
    if (activeIndex >= keys.length) {
        const newIndex = Math.max(0, keys.length - 1);
        setActiveKeyIndex(newIndex);
        return keys[newIndex];
    }
    return keys[activeIndex];
}

/**
 * Switches to the next available API key in the list.
 */
export function switchToNextKey(): void {
    const keys = getApiKeys();
    if (keys.length > 1) {
        const currentIndex = getActiveKeyIndex();
        const nextIndex = (currentIndex + 1) % keys.length;
        setActiveKeyIndex(nextIndex);
    }
}
