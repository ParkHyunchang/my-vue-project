import { getDefaultMenusForRole, getDefaultMenuDefinitions } from '../../src/config/routes.js';

describe('getDefaultMenusForRole', () => {
    it('USER 역할은 기본 메뉴를 포함한다', () => {
        const menus = getDefaultMenusForRole('USER');
        expect(menus).toContain('/');
        expect(menus).toContain('/todos');
        expect(menus).toContain('/todos/create');
    });

    it('ADMIN 역할은 관리자 메뉴를 포함한다', () => {
        const menus = getDefaultMenusForRole('ADMIN');
        expect(menus).toContain('/admin');
        expect(menus).toContain('/admin/users');
        expect(menus).toContain('/subscription');
    });

    it('PREMIUM 역할은 dating/history 메뉴를 포함한다', () => {
        const menus = getDefaultMenusForRole('PREMIUM');
        expect(menus).toContain('/dating');
        expect(menus).toContain('/history');
    });

    it('존재하지 않는 역할은 빈 배열을 반환한다', () => {
        expect(getDefaultMenusForRole('UNKNOWN')).toEqual([]);
        expect(getDefaultMenusForRole(undefined)).toEqual([]);
    });
});

describe('getDefaultMenuDefinitions', () => {
    it('빈 배열이 아닌 목록을 반환한다', () => {
        const defs = getDefaultMenuDefinitions();
        expect(defs.length).toBeGreaterThan(0);
    });

    it('각 항목은 path, name, icon 필드를 가진다', () => {
        getDefaultMenuDefinitions().forEach(def => {
            expect(def).toHaveProperty('path');
            expect(def).toHaveProperty('name');
            expect(def).toHaveProperty('icon');
        });
    });

    it('홈 경로 "/" 가 포함된다', () => {
        const defs = getDefaultMenuDefinitions();
        const home = defs.find(d => d.path === '/');
        expect(home).toBeDefined();
        expect(home.isRequired).toBe(true);
    });

    it('구독 관리 경로가 포함된다', () => {
        const defs = getDefaultMenuDefinitions();
        expect(defs.find(d => d.path === '/subscription')).toBeDefined();
    });
});
