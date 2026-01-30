const axios = require('axios');
const ScrapingStrategy = require('./scrapingStrategy');
const logger = require('../../../utils/logger');
const config = require('../../../config/config');

/**
 * Abstract base class for Meta Graph API-based scraping strategies
 * Provides common functionality for Meta API authentication, request handling, and retry logic
 */
class MetaApiStrategy extends ScrapingStrategy {
  /**
   * @param {string} platformName - Name of the platform (e.g., 'Instagram')
   * @param {string} userId - Meta user ID for the platform
   * @param {string} apiVersion - Meta API version (default: v21.0)
   */
  constructor(platformName, userId, apiVersion = 'v21.0') {
    super(platformName);
    this.userId = userId;
    this.apiVersion = apiVersion;
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 second base delay for exponential backoff
  }

  /**
   * Get access token for the specific platform
   * Must be implemented by platform-specific subclasses
   * @returns {string} Access token
   */
  getAccessToken() {
    throw new Error('getAccessToken() must be implemented by subclass');
  }

  /**
   * Make authenticated request to Meta Graph API with retry logic
   * @param {Object} options - Request options
   * @param {string} options.url - Full URL to request
   * @param {Object} options.params - Query parameters (access_token will be added)
   * @param {number} attempt - Current attempt number (for retry logic)
   * @returns {Promise<Object>} API response data
   */
  async makeRequest(options, attempt = 1) {
    const { url, params = {} } = options;

    // Add access token to query parameters
    const requestParams = {
      ...params,
      access_token: this.getAccessToken()
    };

    try {
      logger.info(`${this.platformName} Meta API request (attempt ${attempt}/${this.maxRetries}): ${url}`);

      const response = await axios.get(url, {
        params: requestParams,
        timeout: 30000, // 30 second timeout
      });

      return response.data;
    } catch (error) {
      return this.handleError(error, options, attempt);
    }
  }

  /**
   * Handle Meta API errors with retry logic
   * @param {Error} error - The error that occurred
   * @param {Object} options - Original request options
   * @param {number} attempt - Current attempt number
   * @returns {Promise<Object>} Retry response or throws error
   */
  async handleError(error, options, attempt) {
    const errorResponse = error.response?.data?.error;
    const errorCode = errorResponse?.code;
    const errorMessage = errorResponse?.message || error.message;

    logger.error(
      `${this.platformName} Meta API error (attempt ${attempt}):`,
      { code: errorCode, message: errorMessage }
    );

    // Meta-specific error codes
    const isRateLimited = errorCode === 4 || errorCode === 17; // Rate limit errors
    const isTokenExpired = errorCode === 190; // Access token expired
    const isInvalidParam = errorCode === 100; // Invalid parameter
    const isPermissionError = errorCode === 10; // Permission error

    // Non-retryable errors
    if (isTokenExpired) {
      throw new Error(
        `${this.platformName} Meta API: Access token has expired. ` +
        'Please generate a new long-lived access token.'
      );
    }

    if (isInvalidParam) {
      throw new Error(
        `${this.platformName} Meta API: Invalid parameter. ` +
        `Message: ${errorMessage}`
      );
    }

    if (isPermissionError) {
      throw new Error(
        `${this.platformName} Meta API: Permission error. ` +
        'Please ensure your app has the required permissions and capabilities. ' +
        `Message: ${errorMessage}`
      );
    }

    // Retry logic for rate limits and temporary errors
    if (attempt < this.maxRetries && (isRateLimited || error.code === 'ECONNABORTED')) {
      const delay = this.baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
      logger.warn(
        `${this.platformName} Meta API: Retrying after ${delay}ms... ` +
        `(attempt ${attempt + 1}/${this.maxRetries})`
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.makeRequest(options, attempt + 1);
    }

    // Max retries exceeded or non-retryable error
    throw new Error(
      `${this.platformName} Meta API request failed after ${attempt} attempts. ` +
      `Error: ${errorMessage}`
    );
  }

  /**
   * Abstract method to get recent posts
   * Must be implemented by platform-specific subclasses
   * @param {string} username - Username to scrape
   * @param {number} count - Number of posts to fetch
   * @returns {Promise<Array>} Array of posts in standard format
   */
  async getRecentPosts(username, count) {
    throw new Error('getRecentPosts() must be implemented by subclass');
  }
}

module.exports = MetaApiStrategy;
