import axios from 'axios';

// api 엔드포인트 백엔드 서버 연동설정
export default axios.create({
    baseURL: 'http://125.141.20.218:3200/my-vue-project'
});