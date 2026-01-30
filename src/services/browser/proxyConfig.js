const logger = require('../../utils/logger');

class ProxyConfig {
  /**
   * Format proxy configuration for Puppeteer
   * @param {Object} proxySettings - Proxy configuration from config
   * @returns {Object|null} Puppeteer-compatible proxy config
   */
  static formatProxyArgs(proxySettings) {
    if (!proxySettings.enabled || !proxySettings.host) {
      logger.info('Proxy not enabled or host not specified');
      return null;
    }

    try {
      const { host, port, username, password } = proxySettings;

      // Validate proxy configuration
      if (!host) {
        throw new Error('Proxy host is required when proxy is enabled');
      }

      // Build proxy URL
      let proxyUrl;
      if (username && password) {
        proxyUrl = `http://${username}:${password}@${host}:${port}`;
        logger.info(`Proxy configured with authentication: ${host}:${port}`);
      } else {
        proxyUrl = `http://${host}:${port}`;
        logger.info(`Proxy configured without authentication: ${host}:${port}`);
      }

      return {
        proxyServer: `${host}:${port}`,
        proxyUrl: proxyUrl,
        args: [`--proxy-server=${host}:${port}`],
      };
    } catch (error) {
      logger.error(`Failed to configure proxy: ${error.message}`);
      return null;
    }
  }

  /**
   * Validate proxy configuration
   * @param {Object} proxySettings - Proxy settings to validate
   * @returns {boolean} True if valid
   */
  static validate(proxySettings) {
    if (!proxySettings.enabled) {
      return true; // Not using proxy is valid
    }

    if (!proxySettings.host) {
      logger.error('Proxy enabled but host not specified');
      return false;
    }

    if (!proxySettings.port || proxySettings.port < 1 || proxySettings.port > 65535) {
      logger.error('Invalid proxy port');
      return false;
    }

    return true;
  }

  /**
   * Get proxy authentication credentials if configured
   * @param {Object} proxySettings - Proxy configuration
   * @returns {Object|null} Authentication credentials
   */
  static getAuthCredentials(proxySettings) {
    if (!proxySettings.enabled || !proxySettings.username || !proxySettings.password) {
      return null;
    }

    return {
      username: proxySettings.username,
      password: proxySettings.password,
    };
  }
}

module.exports = ProxyConfig;
