const axios = require('axios');
const ScrapingStrategy = require('./scrapingStrategy');
const logger = require('../../../utils/logger');
const config = require('../../../config/config');

/**
 * RapidAPI scraping strategy
 */
class RapidApiStrategy extends ScrapingStrategy {
  constructor(platformName, apiHost) {
    super(platformName);
    this.apiHost = apiHost;
    this.retryAttempts = config.scraping.retryAttempts;
    this.requestTimeout = config.scraping.requestTimeout;
  }

  /**
   * Build proxy configuration for axios if proxy is enabled
   * @returns {Object|null} Proxy config or null
   */
  getProxyConfig() {
    const { proxy } = config.webScraping;
    
    // Only use proxy if explicitly enabled AND host is configured
    if (!proxy.enabled || !proxy.host) {
      return null;
    }

    // Return axios-compatible proxy configuration
    return {
      protocol: 'http',
      host: proxy.host,
      port: proxy.port,
      auth: proxy.username && proxy.password ? {
        username: proxy.username,
        password: proxy.password,
      } : undefined,
    };
  }

  /**
   * Make an API request with retry logic
   * @param {Object} options - Axios request options
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} Response data
   */
  async makeRequest(options, attempt = 1) {
    try {
      const proxyConfig = this.getProxyConfig();
      
      const requestConfig = {
        ...options,
        timeout: this.requestTimeout,
        headers: {
          'x-rapidapi-key': config.rapidApi.key,
          'x-rapidapi-host': this.apiHost,
          ...options.headers,
        },
      };

      // Add proxy configuration if enabled
      if (proxyConfig) {
        requestConfig.proxy = proxyConfig;
        logger.debug(`${this.platformName} using proxy: ${proxyConfig.host}:${proxyConfig.port}`);
      }

      const response = await axios(requestConfig);

      return response.data;
    } catch (error) {
      const isLastAttempt = attempt >= this.retryAttempts;

      if (isLastAttempt) {
        logger.error(
          `${this.platformName} API request failed after ${attempt} attempts: ${error.message}`
        );
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt - 1) * 1000;
      logger.warn(
        `${this.platformName} API request failed (attempt ${attempt}/${this.retryAttempts}), retrying in ${delay}ms...`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.makeRequest(options, attempt + 1);
    }
  }

  /**
   * Get recent posts using RapidAPI
   * @param {string} username
   * @param {number} count
   * @returns {Promise<Array>}
   */
  async getRecentPosts(username, count) {
    throw new Error('getRecentPosts must be implemented by platform-specific subclass');
  }
}

module.exports = RapidApiStrategy;
