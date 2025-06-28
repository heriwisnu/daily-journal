document.addEventListener('DOMContentLoaded', () => {
    const tg = window.Telegram.WebApp;
    tg.ready();

    // --- DOM Elements ---
    const greetingEl = document.getElementById('user-greeting');
    const dateInput = document.getElementById('current-date');
    const prevDayBtn = document.getElementById('prev-day');
    const nextDayBtn = document.getElementById('next-day');
    const entryTextarea = document.getElementById('journal-entry');
    const moodButtons = document.querySelectorAll('.mood-btn');
    const saveBtn = document.getElementById('save-btn');
    const toggleViewBtn = document.getElementById('toggle-view-btn');
    const journalView = document.getElementById('journal-view');
    const archiveView = document.getElementById('archive-view');
    const entryList = document.getElementById('entry-list');

    // --- State ---
    let currentDate = new Date();
    let selectedMood = null;
    let entriesCache = {}; // Cache entries to reduce API calls

    // --- API Configuration ---
    // --- API Configuration ---
    // We will send the raw initData string for the backend to validate
    const API_HEADERS = {
        'Content-Type': 'application/json',
        'X-Telegram-Init-Data': tg.initData
    };

    // --- Functions ---
    const formatDate = (date) => {
        return date.toISOString().split('T')[0];
    };

    const updateDateInput = () => {
        dateInput.value = formatDate(currentDate);
    };

    const fetchEntryForDate = async (dateStr) => {
        if (entriesCache[dateStr]) {
            displayEntry(entriesCache[dateStr]);
            return;
        }
        
        // For now, we assume all entries are loaded at once.
        // A better approach would be to fetch a specific date:
        // const response = await fetch(`/api/entries?date=${dateStr}`, { headers: API_HEADERS });
        // For this simple version, we'll just check the cache after initial load.
        displayEntry(null); // Clear the view if no entry found in cache
    };

    const displayEntry = (entry) => {
        if (entry) {
            entryTextarea.value = entry.content;
            selectedMood = entry.mood;
            updateMoodSelection();
        } else {
            entryTextarea.value = '';
            selectedMood = null;
            updateMoodSelection();
        }
    };
    
    const updateMoodSelection = () => {
        moodButtons.forEach(btn => {
            if (btn.dataset.mood === selectedMood) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    };

    const saveEntry = async () => {
        const entryData = {
            entry_date: dateInput.value,
            content: entryTextarea.value,
            mood: selectedMood,
            file_id: null // Placeholder for file upload logic
        };

        if (!entryData.content.trim()) {
            tg.showAlert('Please write something in your journal.');
            return;
        }

        try {
            const response = await fetch('/api/entries', {
                method: 'POST',
                headers: API_HEADERS,
                body: JSON.stringify(entryData)
            });

            if (!response.ok) {
                throw new Error('Failed to save entry.');
            }
            
            entriesCache[entryData.entry_date] = entryData;
            tg.showPopup({
                title: 'Success',
                message: 'Your journal entry has been saved!',
                buttons: [{type: 'ok'}]
            });

        } catch (error) {
            console.error('Save error:', error);
            tg.showAlert('Could not save your entry. Please try again.');
        }
    };

    const loadAllEntries = async () => {
        try {
            const response = await fetch('/api/entries', { headers: API_HEADERS });
            if (!response.ok) throw new Error('Failed to load entries.');
            
            const result = await response.json();
            entriesCache = {};
            result.data.forEach(entry => {
                entriesCache[entry.entry_date] = entry;
            });
            
            // Populate archive view
            entryList.innerHTML = '';
            result.data.forEach(entry => {
                const li = document.createElement('li');
                li.textContent = `${entry.entry_date} - ${entry.mood || ''}`;
                li.dataset.date = entry.entry_date;
                entryList.appendChild(li);
            });

        } catch (error) {
            console.error('Load entries error:', error);
        }
    };

    // --- Event Listeners ---
    prevDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() - 1);
        updateDateInput();
        fetchEntryForDate(formatDate(currentDate));
    });

    nextDayBtn.addEventListener('click', () => {
        currentDate.setDate(currentDate.getDate() + 1);
        updateDateInput();
        fetchEntryForDate(formatDate(currentDate));
    });

    dateInput.addEventListener('change', () => {
        currentDate = new Date(dateInput.value);
        fetchEntryForDate(formatDate(currentDate));
    });

    moodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            selectedMood = btn.dataset.mood;
            updateMoodSelection();
        });
    });

    saveBtn.addEventListener('click', saveEntry);

    toggleViewBtn.addEventListener('click', () => {
        const isJournalVisible = journalView.style.display !== 'none';
        if (isJournalVisible) {
            journalView.style.display = 'none';
            archiveView.style.display = 'block';
            toggleViewBtn.textContent = 'Back to Journal';
            loadAllEntries(); // Refresh archive list
        } else {
            journalView.style.display = 'block';
            archiveView.style.display = 'none';
            toggleViewBtn.textContent = 'View Archive';
        }
    });

    entryList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const dateStr = e.target.dataset.date;
            currentDate = new Date(dateStr);
            updateDateInput();
            fetchEntryForDate(dateStr);
            // Switch back to journal view
            journalView.style.display = 'block';
            archiveView.style.display = 'none';
            toggleViewBtn.textContent = 'View Archive';
        }
    });

    // --- Initialization ---
    const init = async () => {
        if (tg.initDataUnsafe.user) {
            greetingEl.textContent = `Hello, ${tg.initDataUnsafe.user.first_name}!`;
        }
        
        updateDateInput();
        await loadAllEntries();
        fetchEntryForDate(formatDate(currentDate));
        
        // Set theme params
        tg.setHeaderColor(tg.themeParams.secondary_bg_color || '#f7f7f7');
    };

    init();
});
