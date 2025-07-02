<template>
    <div class="history-container">
        <div class="page-header">
            <h2>My History</h2>
            <button class="btn btn-primary" @click="openCreateModal">
                Add New Event
            </button>
        </div>

        <!-- 타임라인 필터 -->
        <div class="timeline-filter">
            <button 
                v-for="category in categories" 
                :key="category.id"
                :class="['filter-btn', { active: selectedCategory === category.id }]"
                @click="filterByCategory(category.id)"
            >
                <i :class="category.icon"></i>
                {{ category.name }}
            </button>
        </div>

        <!-- 타임라인 -->
        <div class="timeline">
            <div v-for="event in filteredEvents" :key="event.id" 
                :class="['timeline-item', event.category]"
                @click="openEventDetail(event)"
            >
                <div class="timeline-date">
                    {{ formatDate(event.date) }}
                </div>
                <div class="timeline-content">
                    <div class="timeline-icon">
                        <i :class="getCategoryIcon(event.category)"></i>
                    </div>
                    <div class="timeline-body">
                        <h3>{{ event.title }}</h3>
                        <p>{{ event.description }}</p>
                        <div v-if="event.image" class="timeline-image">
                            <img :src="event.image" :alt="event.title">
                        </div>
                        <div class="timeline-footer">
                            <span class="location" v-if="event.location">
                                <i class="fas fa-map-marker-alt"></i>
                                {{ event.location }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 이벤트 생성/수정 모달 -->
        <teleport to="#modal">
            <Modal v-if="showEventModal" @close="closeEventModal">
                <template #header>
                    <h3>{{ isEditing ? 'Edit Event' : 'Add New Event' }}</h3>
                </template>
                <template #body>
                    <form @submit.prevent="saveEvent" class="event-form">
                        <div class="form-group">
                            <label>Title</label>
                            <input v-model="currentEvent.title" type="text" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Date</label>
                            <input v-model="currentEvent.date" type="date" class="form-control" required>
                        </div>
                        <div class="form-group">
                            <label>Category</label>
                            <select v-model="currentEvent.category" class="form-control" required>
                                <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                                    {{ cat.name }}
                                </option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea v-model="currentEvent.description" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label>Location</label>
                            <input v-model="currentEvent.location" type="text" class="form-control">
                        </div>
                        <div class="form-group">
                            <label>Image URL</label>
                            <input v-model="currentEvent.image" type="url" class="form-control">
                        </div>
                    </form>
                </template>
                <template #footer>
                    <button type="button" class="btn btn-secondary" @click="closeEventModal">Cancel</button>
                    <button type="button" class="btn btn-primary" @click="saveEvent">Save</button>
                </template>
            </Modal>
        </teleport>
    </div>
</template>

<script>
import { ref, computed } from 'vue';
import Modal from '@/components/Modal.vue';
import { useToast } from '@/composables/toast';
import axios from '@/axios';

export default {
    components: {
        Modal
    },
    setup() {
        const { triggerToast } = useToast();
        const events = ref([]);
        const showEventModal = ref(false);
        const isEditing = ref(false);
        const selectedCategory = ref(null);
        
        const currentEvent = ref({
            title: '',
            date: '',
            category: '',
            description: '',
            location: '',
            image: ''
        });

        const categories = [
            { id: 'travel', name: 'Travel', icon: 'fas fa-plane' },
            { id: 'education', name: 'Education', icon: 'fas fa-graduation-cap' },
            { id: 'move', name: 'Moving', icon: 'fas fa-home' },
            { id: 'work', name: 'Work', icon: 'fas fa-briefcase' },
            { id: 'achievement', name: 'Achievement', icon: 'fas fa-trophy' }
        ];

        const filteredEvents = computed(() => {
            if (!selectedCategory.value) return events.value;
            return events.value.filter(event => event.category === selectedCategory.value);
        });

        const fetchEvents = async () => {
            try {
                const response = await axios.get('/histories');
                events.value = response.data;
            } catch (error) {
                triggerToast('Failed to load events', 'danger');
            }
        };

        const openCreateModal = () => {
            isEditing.value = false;
            currentEvent.value = {
                title: '',
                date: '',
                category: '',
                description: '',
                location: '',
                image: ''
            };
            showEventModal.value = true;
        };

        const openEventDetail = (event) => {
            isEditing.value = true;
            currentEvent.value = { ...event };
            showEventModal.value = true;
        };

        const closeEventModal = () => {
            showEventModal.value = false;
            currentEvent.value = {
                title: '',
                date: '',
                category: '',
                description: '',
                location: '',
                image: ''
            };
        };

        const saveEvent = async () => {
            try {
                if (isEditing.value) {
                    await axios.put(`/histories/${currentEvent.value.id}`, currentEvent.value);
                    triggerToast('Event updated successfully');
                } else {
                    await axios.post('/histories', currentEvent.value);
                    triggerToast('Event created successfully');
                }
                await fetchEvents();
                closeEventModal();
            } catch (error) {
                triggerToast('Failed to save event', 'danger');
            }
        };

        const filterByCategory = (categoryId) => {
            selectedCategory.value = selectedCategory.value === categoryId ? null : categoryId;
        };

        const formatDate = (date) => {
            return new Date(date).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        };

        const getCategoryIcon = (categoryId) => {
            const category = categories.find(c => c.id === categoryId);
            return category ? category.icon : 'fas fa-calendar';
        };

        // 초기 데이터 로드
        fetchEvents();

        return {
            events,
            showEventModal,
            currentEvent,
            categories,
            selectedCategory,
            filteredEvents,
            isEditing,
            openCreateModal,
            openEventDetail,
            closeEventModal,
            saveEvent,
            filterByCategory,
            formatDate,
            getCategoryIcon
        };
    }
}
</script>

<style scoped>
.history-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.timeline-filter {
    display: flex;
    gap: 10px;
    margin-bottom: 30px;
    flex-wrap: wrap;
}

.filter-btn {
    padding: 8px 16px;
    border: none;
    border-radius: 20px;
    background: #f0f0f0;
    cursor: pointer;
    transition: all 0.3s ease;
}

.filter-btn.active {
    background: #007bff;
    color: white;
}

.timeline {
    position: relative;
    padding: 20px 0;
}

.timeline::before {
    content: '';
    position: absolute;
    left: 50%;
    transform: translateX(-50%);
    width: 2px;
    height: 100%;
    background: #e0e0e0;
}

.timeline-item {
    position: relative;
    margin-bottom: 30px;
    width: calc(50% - 30px);
    margin-left: auto;
}

.timeline-item:nth-child(even) {
    margin-left: 0;
    margin-right: auto;
}

.timeline-date {
    position: absolute;
    top: 0;
    left: -150px;
    padding: 5px 10px;
    background: #f8f9fa;
    border-radius: 4px;
    font-size: 14px;
}

.timeline-item:nth-child(even) .timeline-date {
    left: auto;
    right: -150px;
}

.timeline-content {
    background: white;
    padding: 20px;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.timeline-icon {
    position: absolute;
    left: -45px;
    top: 50%;
    transform: translateY(-50%);
    width: 40px;
    height: 40px;
    background: #007bff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}

.timeline-item:nth-child(even) .timeline-icon {
    left: auto;
    right: -45px;
}

.timeline-body h3 {
    margin: 0 0 10px;
    color: #333;
}

.timeline-image {
    margin: 15px 0;
}

.timeline-image img {
    max-width: 100%;
    border-radius: 4px;
}

.timeline-footer {
    margin-top: 10px;
    font-size: 14px;
    color: #666;
}

.location {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.event-form {
    display: flex;
    flex-direction: column;
    gap: 15px;
}

@media (max-width: 768px) {
    .timeline::before {
        left: 30px;
    }

    .timeline-item {
        width: calc(100% - 60px);
        margin-left: 60px;
    }

    .timeline-item:nth-child(even) {
        margin-left: 60px;
        margin-right: 0;
    }

    .timeline-date {
        left: -90px;
        width: 80px;
        text-align: right;
    }

    .timeline-item:nth-child(even) .timeline-date {
        left: -90px;
        right: auto;
    }

    .timeline-icon {
        left: -55px;
    }

    .timeline-item:nth-child(even) .timeline-icon {
        left: -55px;
        right: auto;
    }
}
</style>