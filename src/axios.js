import axios from 'axios';

// api 엔드포인트 백엔드 서버 연동설정
export default axios.create({
    // 배포 서버 사용
    //baseURL: 'http://125.141.20.218:3200/my-vue-project'
    // 로컬 실행시 사용
    baseURL: 'http://localhost:3200/my-vue-project'
});