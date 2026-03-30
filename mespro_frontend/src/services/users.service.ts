/**
 * Users Service
 * Handles all user management API operations
 */

import { apiService } from './api.service';

class UsersService {
  async getUsers(): Promise<any[]> {
    return apiService.get<any[]>('/users');
  }

  async getUserById(id: string): Promise<any> {
    return apiService.get<any>(`/users/${id}`);
  }

  async createUser(user: any): Promise<any> {
    return apiService.post<any>('/users', user);
  }

  async updateUser(id: string, user: any): Promise<any> {
    return apiService.put<any>(`/users/${id}`, user);
  }

  async deleteUser(id: string): Promise<void> {
    return apiService.delete<void>(`/users/${id}`);
  }

  async getRoles(): Promise<any[]> {
    return apiService.get<any[]>('/users/roles');
  }
}

export const usersService = new UsersService();
export default usersService;
