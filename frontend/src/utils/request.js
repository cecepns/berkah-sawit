import { api } from './api';
import toast from 'react-hot-toast';

export const request = {
  async get(url, params = {}, config = {}) {
    try {
      const response = await api.get(url, { params, ...config });
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  },

  async post(url, data = {}, config = {}) {
    try {
      const response = await api.post(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  },

  async put(url, data = {}, config = {}) {
    try {
      const response = await api.put(url, data, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  },

  async delete(url, config = {}) {
    try {
      const response = await api.delete(url, config);
      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  },

  handleError(error) {
    let message = 'Terjadi kesalahan sistem';
    if (error.response && error.response.data && error.response.data.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }
    // We only show toast if not handled manually
    console.error('API Error:', message);
    return message;
  },
};
