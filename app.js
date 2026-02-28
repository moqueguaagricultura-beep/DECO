document.addEventListener('DOMContentLoaded', () => {
    // --- State Management ---
    let state = {
        clients: JSON.parse(localStorage.getItem('decor_clients')) || [],
        currentView: localStorage.getItem('decor_view') === 'all-clients' ? 'dashboard' : (localStorage.getItem('decor_view') || 'dashboard')
    };

    let calendarDate = localStorage.getItem('decor_calendar_date') ?
        new Date(localStorage.getItem('decor_calendar_date')) : new Date();

    const saveState = () => {
        localStorage.setItem('decor_clients', JSON.stringify(state.clients));
        localStorage.setItem('decor_view', state.currentView);
        localStorage.setItem('decor_calendar_date', calendarDate.toISOString());
    };

    // --- DOM Elements ---
    const appContainer = document.getElementById('app-container');
    const navLinks = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view');
    const clientForm = document.getElementById('client-form');

    // --- Navigation Logic ---
    const switchView = (viewId) => {
        views.forEach(view => {
            view.style.display = view.id === viewId ? 'block' : 'none';
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.dataset.view === viewId);
        });
        state.currentView = viewId;
        saveState(); // Persist view change
        render();
    };

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const viewId = link.dataset.view;
            if (viewId === 'add-client') {
                resetForm();
            }
            switchView(viewId);
        });
    });

    // --- Form Handling ---
    let currentImageBase64 = '';

    document.getElementById('client-image').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                currentImageBase64 = event.target.result;
                const preview = document.getElementById('image-preview');
                const container = document.getElementById('image-preview-container');
                preview.src = currentImageBase64;
                container.style.display = 'block';
            };
            reader.readAsDataURL(file);
        }
    });

    clientForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const editId = document.getElementById('edit-client-id').value;
        const clientData = {
            eventName: document.getElementById('event-name').value,
            name: document.getElementById('client-name').value,
            phone: document.getElementById('client-phone').value,
            address: document.getElementById('client-address').value,
            locationUrl: document.getElementById('client-location-url').value,
            date: document.getElementById('event-date').value,
            color: document.getElementById('client-color').value,
            details: document.getElementById('additional-data').value,
            image: currentImageBase64,
            audio: currentAudioBase64
        };

        if (editId) {
            // Update existing
            const index = state.clients.findIndex(c => c.id == editId);
            if (index !== -1) {
                state.clients[index] = { ...state.clients[index], ...clientData };
            }
        } else {
            // Add new
            state.clients.push({
                id: Date.now(),
                ...clientData
            });
        }

        saveState();
        resetForm();
        alert(editId ? '¡Registro actualizado!' : '¡Evento guardado!');
        switchView('dashboard');
    });

    const resetForm = () => {
        clientForm.reset();
        document.getElementById('client-color').value = '#D4AF37';
        currentImageBase64 = '';
        currentAudioBase64 = '';
        document.getElementById('image-preview-container').style.display = 'none';
        document.getElementById('audio-preview-container').style.display = 'none';
        document.getElementById('edit-client-id').value = '';
        const locUrl = document.getElementById('client-location-url');
        if (locUrl) locUrl.value = '';
        document.getElementById('form-title').textContent = 'Registrar Evento Nuevo';
    };

    document.getElementById('open-maps-btn').addEventListener('click', () => {
        const url = document.getElementById('client-location-url').value;
        if (url) {
            window.open(url, '_blank');
        } else {
            alert('Por favor, ingresa un link de Google Maps primero.');
        }
    });

    // --- Audio Recording Logic ---
    let mediaRecorder;
    let audioChunks = [];
    let currentAudioBase64 = '';

    const startBtn = document.getElementById('start-record-btn');
    const stopBtn = document.getElementById('stop-record-btn');
    const status = document.getElementById('recording-status');
    const audioPreview = document.getElementById('audio-preview');
    const previewContainer = document.getElementById('audio-preview-container');

    startBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
                const reader = new FileReader();
                reader.onload = (e) => {
                    currentAudioBase64 = e.target.result;
                    audioPreview.src = currentAudioBase64;
                    previewContainer.style.display = 'block';
                };
                reader.readAsDataURL(audioBlob);
            };

            mediaRecorder.start();
            startBtn.style.display = 'none';
            stopBtn.style.display = 'inline-block';
            status.style.display = 'inline-block';
        } catch (err) {
            console.error('Error al acceder al micrófono:', err);
            alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
        }
    });

    stopBtn.addEventListener('click', () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
            startBtn.style.display = 'inline-block';
            stopBtn.style.display = 'none';
            status.style.display = 'none';
        }
    });

    // --- Rendering Helpers ---
    const calculateReminderDays = (eventDate) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const event = new Date(eventDate);
        event.setHours(0, 0, 0, 0);

        const diffTime = event - today;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const createClientCard = (client) => {
        const daysRemaining = calculateReminderDays(client.date);
        let reminderClass = '';
        let reminderText = '';

        if (daysRemaining === 0) {
            reminderClass = 'reminder-urgent';
            reminderText = '¡HOY!';
        } else if (daysRemaining > 0 && daysRemaining <= 2) {
            reminderClass = 'reminder-urgent';
            reminderText = `¡En ${daysRemaining} días!`;
        } else if (daysRemaining > 2 && daysRemaining <= 7) {
            reminderClass = 'reminder-near';
            reminderText = `Próximamente (${daysRemaining} días)`;
        }

        const card = document.createElement('div');
        card.className = `glass-card client-card ${reminderClass}`;
        card.style.borderLeft = `4px solid ${client.color || 'var(--glass-border)'}`;

        card.innerHTML = `
            ${client.image ? `<img src="${client.image}" class="card-img" alt="Ref">` : ''}
            <div class="date-badge" style="font-size: 0.7rem;">${client.date}</div>
            <h3 style="margin-bottom: 0.1rem;">${client.eventName || 'Sin Título'}</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem;">Cliente: ${client.name}</p>
            <p style="color: var(--accent-gold); font-weight: 600; font-size: 0.85rem; margin-bottom: 0.4rem;">${client.phone}</p>
            ${client.address ? `<p class="address-text">${client.address}</p>` : ''}
            ${client.locationUrl ? `<a href="${client.locationUrl}" target="_blank" style="color: #4facfe; text-decoration: none; font-size: 0.7rem; display: block; margin-bottom: 0.5rem;">📍 Ver Ubicación</a>` : ''}
            ${client.audio ? `<audio src="${client.audio}" controls style="width: 100%; height: 30px; margin-bottom: 0.5rem;"></audio>` : ''}
            <p class="details-text">${client.details || 'Sin detalles adicionales'}</p>
            ${reminderText ? `<div style="margin-top: 0.8rem; font-size: 0.75rem; font-weight: 700; color: ${daysRemaining <= 2 ? '#ff4b2b' : '#ff9a00'}">${reminderText}</div>` : ''}
            <div style="margin-top: auto; display: flex; gap: 0.5rem; padding-top: 0.5rem;">
                <button onclick="window.editClient(${client.id})" style="padding: 0.4rem 0.8rem; font-size: 0.65rem;" class="secondary-btn">Editar</button>
                <button onclick="window.deleteClient(${client.id})" style="padding: 0.4rem 0.8rem; font-size: 0.65rem; background: rgba(255, 75, 43, 0.15); color: #ff4b2b;">Borrar</button>
            </div>
        `;
        return card;
    };

    window.editClient = (id) => {
        const client = state.clients.find(c => c.id == id);
        if (!client) return;

        document.getElementById('edit-client-id').value = client.id;
        document.getElementById('event-name').value = client.eventName || '';
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-phone').value = client.phone;
        document.getElementById('client-address').value = client.address || '';
        const locUrl = document.getElementById('client-location-url');
        if (locUrl) locUrl.value = client.locationUrl || '';
        document.getElementById('event-date').value = client.date;
        document.getElementById('client-color').value = client.color || '#D4AF37';
        document.getElementById('additional-data').value = client.details;

        if (client.image) {
            currentImageBase64 = client.image;
            document.getElementById('image-preview').src = client.image;
            document.getElementById('image-preview-container').style.display = 'block';
        } else {
            currentImageBase64 = '';
            document.getElementById('image-preview-container').style.display = 'none';
        }

        if (client.audio) {
            currentAudioBase64 = client.audio;
            audioPreview.src = client.audio;
            previewContainer.style.display = 'block';
        } else {
            currentAudioBase64 = '';
            previewContainer.style.display = 'none';
        }

        document.getElementById('form-title').textContent = 'Editar Evento';
        switchView('add-client');
    };

    window.deleteClient = (id) => {
        if (confirm('¿Eliminar este registro?')) {
            state.clients = state.clients.filter(c => c.id !== id);
            saveState();
            render();
        }
    };

    // --- Calendar Logic ---
    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const renderCalendar = () => {
        const grid = document.getElementById('calendar-grid');
        const display = document.getElementById('current-month-display');

        grid.innerHTML = '';
        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        display.textContent = `${monthNames[month]} ${year}`;

        const firstDay = new Date(year, month, 1).getDay();
        // Adjust to Monday-start (JS is Sunday-0)
        const offset = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Empty cells for offset
        for (let i = 0; i < offset; i++) {
            const div = document.createElement('div');
            div.className = 'calendar-day empty';
            grid.appendChild(div);
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            const div = document.createElement('div');
            div.className = `calendar-day ${isToday ? 'today' : ''}`;
            div.innerHTML = `<span class="day-num">${day}</span>`;

            // Check events for this day
            const dayEvents = state.clients.filter(c => c.date === dateStr);
            if (dayEvents.length > 0) {
                const dots = document.createElement('div');
                dots.className = 'event-dots';
                dayEvents.forEach(e => {
                    const dot = document.createElement('span');
                    dot.className = 'event-marker';
                    dot.style.backgroundColor = e.color || 'var(--accent-gold)';
                    dots.appendChild(dot);

                    const eventLabel = document.createElement('div');
                    eventLabel.className = 'calendar-event';
                    eventLabel.style.borderLeftColor = e.color || 'var(--accent-gold)';
                    eventLabel.textContent = e.eventName || 'Evento';
                    eventLabel.onclick = (event) => {
                        event.stopPropagation();
                        window.editClient(e.id);
                    };
                    div.appendChild(eventLabel);
                });
                div.appendChild(dots);
                div.style.cursor = 'pointer';
                div.onclick = () => {
                    if (dayEvents.length === 1) {
                        window.editClient(dayEvents[0].id);
                    } else {
                        alert(`Eventos el ${day}/${month + 1}: \n` + dayEvents.map(e => `- ${e.eventName}`).join('\n'));
                    }
                };
            }

            grid.appendChild(div);
        }
    };

    document.getElementById('prev-month').onclick = () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        saveState();
        renderCalendar();
    };

    document.getElementById('next-month').onclick = () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        saveState();
        renderCalendar();
    };

    const render = () => {
        const upcomingList = document.getElementById('upcoming-list');
        const fullList = document.getElementById('full-list');
        const remindersContainer = document.getElementById('reminders-container');

        // Sort by date
        const sortedClients = [...state.clients].sort((a, b) => new Date(a.date) - new Date(b.date));

        if (state.currentView === 'dashboard') {
            upcomingList.innerHTML = '';
            remindersContainer.innerHTML = '';

            // Filter upcoming
            const si = document.getElementById('search-input');
            const searchTerm = (si ? si.value : '').trim().toLowerCase();

            const upcoming = sortedClients.filter(c => {
                const days = calculateReminderDays(c.date);
                if (days < 0) return false;

                if (!searchTerm) return true;

                const eventName = (c.eventName || '').toLowerCase();
                const clientName = (c.name || '').toLowerCase(); // Note: property is 'name', not 'clientName' in state

                return eventName.includes(searchTerm) || clientName.includes(searchTerm);
            });

            // Urgent Reminders (next 2 days)
            const urgent = upcoming.filter(c => calculateReminderDays(c.date) <= 2);
            if (urgent.length > 0) {
                const rTitle = document.createElement('h2');
                rTitle.textContent = 'Recordatorios Urgentes';
                rTitle.style.color = '#ff4b2b';
                remindersContainer.appendChild(rTitle);

                const rGrid = document.createElement('div');
                rGrid.className = 'client-grid';
                urgent.forEach(c => rGrid.appendChild(createClientCard(c)));
                remindersContainer.appendChild(rGrid);
                remindersContainer.style.marginBottom = '3rem';
            }

            if (upcoming.length === 0) {
                upcomingList.innerHTML = searchTerm ?
                    '<p style="color: var(--text-muted); text-align: center; padding: 2rem;">No se encontraron resultados para su búsqueda.</p>' :
                    '<p style="color: var(--text-muted)">No hay eventos programados.</p>';
            } else {
                upcoming.forEach(c => upcomingList.appendChild(createClientCard(c)));
            }
        }

        if (state.currentView === 'calendar') {
            renderCalendar();
        }
    };

    // --- Search Event Listener ---
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            render();
        });
    }

    // Initial load: Set the correct view and render
    switchView(state.currentView);
});
