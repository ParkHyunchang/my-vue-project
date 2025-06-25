import axios from 'axios';

export default axios.create({
    baseURL: 'http://125.141.20.218:3200/my-vue-project'
    // baseURL: 'http://localhost:3200/my-vue-project'
});