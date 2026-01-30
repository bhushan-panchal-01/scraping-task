const MetaApiStrategy = require('./metaApiStrategy');
const logger = require('../../../utils/logger');
const config = require('../../../config/config');

/**
 * Instagram scraping strategy using Meta's Instagram Graph API
 * Requires Instagram Business or Creator account
 *
 * API Documentation: https://developers.facebook.com/docs/instagram-api/
 *
 * Note: Fetching post views requires two API calls per media:
 * 1. GET /{ig-user-id}/media - Get media list with basic fields
 * 2. GET /{ig-media-id}/insights - Get impressions (views) for each media
 */
class InstagramMetaStrategy extends MetaApiStrategy {
  constructor() {
    const userId = config.metaApi.instagram.userId;
    const apiVersion = config.metaApi.instagram.apiVersion;

    super('Instagram', userId, apiVersion);

    this.baseUrl = 'https://graph.instagram.com';
  }

  /**
   * Get Instagram access token from config
   * @returns {string} Access token
   */
  getAccessToken() {
    return config.metaApi.instagram.accessToken;
  }

  /**
   * Get recent Instagram posts for the configured user
   * @param {string} username - Instagram username (not used, we use userId from config)
   * @param {number} count - Number of posts to fetch (default 25, max 100)
   * @returns {Promise<Array>} Array of posts in standard format
   */
  async getRecentPosts(username, count = 25) {
    try {
      logger.info(`Fetching ${count} Instagram posts via Meta Graph API for user ID: ${this.userId}`);

      console.log('url', `${this.baseUrl}/${this.userId}/media`);

      // Step 1: Fetch media list with basic fields
      const mediaResponse = await this.makeRequest({
        url: `${this.baseUrl}/${this.userId}/media`,
        params: {
          fields: 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
          limit: Math.min(count, 100), // Max 100 per API limitation
        }
      });

      if (!mediaResponse.data || mediaResponse.data.length === 0) {
        logger.warn('No Instagram media found for user');
        return [];
      }

      logger.info(`Fetched ${mediaResponse.data.length} Instagram media items`);

      // Step 2: Fetch insights (views/impressions) for each media
      // Note: This requires a separate API call per media item
      const posts = await Promise.all(
        mediaResponse.data.map(async (media) => {
          return this.transformPost(media);
        })
      );

      logger.info(`Successfully transformed ${posts.length} Instagram posts`);
      return posts;

    } catch (error) {
      logger.error('Instagram Meta API scraping failed:', error.message);
      throw error;
    }
  }

  /**
   * Fetch insights (views/impressions) for a specific media
   * @param {string} mediaId - Instagram media ID
   * @returns {Promise<number>} Number of impressions/views, or 0 if unavailable
   */
  async fetchMediaInsights(mediaId) {
    try {
      const insightsResponse = await this.makeRequest({
        url: `${this.baseUrl}/${mediaId}/insights`,
        params: {
          metric: 'impressions',
        }
      });

      // Extract impressions value from response
      const impressions = insightsResponse.data?.[0]?.values?.[0]?.value || 0;
      return impressions;

    } catch (error) {
      // Insights may not be available for all media types (e.g., stories)
      // or for accounts that don't have sufficient permissions
      logger.warn(`Could not fetch insights for media ${mediaId}: ${error.message}`);
      return 0;
    }
  }

  /**
   * Transform Meta API media response to standard post format
   * @param {Object} media - Media object from Meta API
   * @returns {Promise<Object>} Transformed post object
   */
  async transformPost(media) {
    // Fetch views/impressions for this media (requires separate API call)
    const views = await this.fetchMediaInsights(media.id);

    return {
      postLink: media.permalink || '', // Direct link to Instagram post
      postedDate: media.timestamp || '', // ISO 8601 format (e.g., 2024-01-15T10:30:00+0000)
      comments: media.comments_count || 0, // Comments count
      likes: media.like_count || 0, // Like count from media endpoint
    };
  }
}

module.exports = InstagramMetaStrategy;
