import { createRouter, createWebHashHistory } from 'vue-router';
import Home from '../pages/index.vue';
import Portfolio from '../pages/portfolio.vue';
import Todos from '../pages/todos/index.vue';
import Todo from '../pages/todos/_id.vue';
import TodoCreate from '../pages/todos/create/index.vue';
import Expense from '../pages/expense.vue';
import Projects from '../pages/projects.vue';
import History from '../pages/history.vue';
import Dating from '../pages/dating.vue';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        {
            path: '/',
            name: 'Home',
            component: Home
        },
        {
            path: '/portfolio',
            name: 'Portfolio',
            component: Portfolio
        },
        {
            path: '/projects',
            name: 'Projects',
            component: Projects
        },
        {
            path: '/history',
            name: 'History',
            component: History
        },
        {
            path: '/dating',
            name: 'Dating',
            component: Dating
        },
        {
            path: '/todos',
            name: 'Todos',
            component: Todos
        },
        {
            path: '/todos/create',
            name: 'TodoCreate',
            component: TodoCreate
        },
        {
            path: '/todos/:id',
            name: 'Todo',
            component: Todo
        },
        {
            path: '/expense',
            name: 'Expense',
            component: Expense
        }
    ]
});

// 1 / home 2 /todos 3 /todos/create 4 /todos/:id

export default router;