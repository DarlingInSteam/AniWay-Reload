import { authService } from './authService';

export interface TelegramLinkStatus {
  connected: boolean;
  notificationsEnabled: boolean;
  linkedAt: string | null;
  botUsername?: string | null;
}

export interface TelegramLinkResponse {
  token: string;
  deepLinkUrl: string;
  expiresAt: string;
  botUsername?: string | null;
}

class TelegramService {
  private readonly baseUrl = '/api/users/me/telegram';

  private getAuthHeaders(): HeadersInit {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  async getStatus(): Promise<TelegramLinkStatus> {
    const response = await fetch(`${this.baseUrl}`, {
      method: 'GET',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const payload = await response.text().catch(() => '');
      throw new Error(payload || `Не удалось получить статус Telegram (${response.status})`);
    }

    return response.json();
  }

  async createLink(): Promise<TelegramLinkResponse> {
    const response = await fetch(`${this.baseUrl}/link`, {
      method: 'POST',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const payload = await response.text().catch(() => '');
      throw new Error(payload || `Не удалось создать ссылку (${response.status})`);
    }

    return response.json();
  }

  async unlink(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/link`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const payload = await response.text().catch(() => '');
      throw new Error(payload || `Не удалось отвязать Telegram (${response.status})`);
    }
  }

  async setNotifications(enabled: boolean): Promise<TelegramLinkStatus> {
    const response = await fetch(`${this.baseUrl}/notifications`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ enabled })
    });

    if (!response.ok) {
      const payload = await response.text().catch(() => '');
      throw new Error(payload || `Не удалось обновить настройки уведомлений (${response.status})`);
    }

    return response.json();
  }
}

export const telegramService = new TelegramService();
