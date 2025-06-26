import axios from 'axios';

// api 엔드포인트 백엔드 서버 연동설정
export default axios.create({
    // nas 서버 테스트
    baseURL: 'http://125.141.20.218:3200/my-vue-project'
    // 로컬 테스트
    //baseURL: 'http://localhost:3200/my-vue-project'
});