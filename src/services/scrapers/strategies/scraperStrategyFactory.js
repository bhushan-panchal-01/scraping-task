const RapidApiStrategy = require('./rapidApiStrategy');
const TikTokWebStrategy = require('./tiktokWebStrategy');
const InstagramWebStrategy = require('./instagramWebStrategy');
const InstagramMetaStrategy = require('./instagramMetaStrategy');
const logger = require('../../../utils/logger');
const config = require('../../../config/config');


/**
 * Instagram RapidAPI Strategy
 */
class InstagramRapidApiStrategy extends RapidApiStrategy {
  constructor() {
    super('Instagram', config.rapidApi.instagramHost);
  }

  async getRecentPosts(username, count = 10) {
    try {
      const cleanUsername = username.replace('@', '');
      logger.info(`[RapidAPI] Fetching ${count} posts for Instagram user: ${cleanUsername}`);

      const response = await this.makeRequest({
        method: 'GET',
        url: `https://${this.apiHost}/user/posts`,
        params: {
          username: cleanUsername,
          count: count,
        },
      });

      const posts = this.transformResponse(response, cleanUsername);
      logger.info(`[RapidAPI] Successfully fetched ${posts.length} posts for Instagram user: ${cleanUsername}`);

      return posts;
    } catch (error) {
      const errorInfo = this.handleError(error, username);
      logger.error(`[RapidAPI] Failed to fetch Instagram posts for ${username}: ${errorInfo.message}`);
      return [];
    }
  }

  transformResponse(response, username) {
    try {
      let posts = response.data?.items || response.items || response.posts || [];

      if (!Array.isArray(posts)) {
        logger.warn(`Unexpected Instagram API response structure for ${username}`);
        return [];
      }

      return posts.map(post => this.transformPost(post)).filter(post => post !== null);
    } catch (error) {
      logger.error(`Failed to transform Instagram response for ${username}: ${error.message}`);
      return [];
    }
  }

  transformPost(rawPost) {
    try {
      const postId = rawPost.id || rawPost.code || rawPost.shortcode;
      const postUrl = rawPost.permalink || rawPost.link || `https://www.instagram.com/p/${postId}/`;

      return {
        postLink: postUrl,
        postedDate: rawPost.taken_at
          ? new Date(rawPost.taken_at * 1000).toISOString()
          : rawPost.timestamp || new Date().toISOString(),
        comments: this.extractNumber(rawPost.comment_count || rawPost.comments || 0), // Comments count
        likes: this.extractNumber(rawPost.like_count || rawPost.likes || 0),
      };
    } catch (error) {
      logger.warn(`Failed to transform Instagram post: ${error.message}`);
      return null;
    }
  }
}

/**
 * Factory to create appropriate scraping strategy
 */
class ScraperStrategyFactory {
  /**
   * Create scraping strategy based on platform and method
   * @param {string} platform - 'tiktok' or 'instagram'
   * @param {string} method - 'rapidapi' or 'web'
   * @returns {ScrapingStrategy} Appropriate strategy instance
   */
  static create(platform, method) {
    const platformLower = platform.toLowerCase();
    const methodLower = method.toLowerCase();

    logger.debug(`Creating ${methodLower} strategy for ${platformLower}`);

    if (platformLower === 'tiktok') {
      if (methodLower === 'web') {
        return new TikTokWebStrategy();
      } else {
        throw new Error(
          `TikTok only supports web scraping. Please set TIKTOK_SCRAPING_METHOD=web\n` +
          `Current method: ${method}`
        );
      }
    }

    if (platformLower === 'instagram') {
      if (methodLower === 'web') {
        return new InstagramWebStrategy();
      } else if (methodLower === 'meta') {
        return new InstagramMetaStrategy();
      } else if (methodLower === 'rapidapi') {
        return new InstagramRapidApiStrategy();
      } else {
        throw new Error(`Unknown Instagram scraping method: ${method}`);
      }
    }

    throw new Error(`Unknown platform: ${platform}`);
  }
}

module.exports = ScraperStrategyFactory;
