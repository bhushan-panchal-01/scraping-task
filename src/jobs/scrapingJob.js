const pLimit = require('p-limit');
const logger = require('../utils/logger');
const config = require('../config/config');
const FileReaderFactory = require('../services/fileIO/fileReaderFactory');
const FileWriterFactory = require('../services/fileIO/fileWriterFactory');
const TikTokScraper = require('../services/scrapers/tiktokScraper');
const InstagramScraper = require('../services/scrapers/instagramScraper');
const {
  calculateAverageViews,
  filterLast10Posts,
  deduplicatePosts,
  normalizePost,
} = require('../utils/dataProcessor');

class ScrapingJob {
  constructor() {
    // Use factory pattern to create appropriate reader/writer based on file format
    this.reader = FileReaderFactory.create();
    this.writer = FileWriterFactory.create();
    this.tiktokScraper = new TikTokScraper();
    this.instagramScraper = new InstagramScraper();
    this.limit = pLimit(config.scraping.maxConcurrentRequests);
  }

  /**
   * Get appropriate scraper for platform
   * @param {string} platform
   * @returns {Object} Scraper instance
   */
  getScraperForPlatform(platform) {
    const normalizedPlatform = platform.toLowerCase().trim();

    if (normalizedPlatform === 'tiktok' || normalizedPlatform === 'tik tok') {
      return this.tiktokScraper;
    }

    if (normalizedPlatform === 'instagram' || normalizedPlatform === 'ig') {
      return this.instagramScraper;
    }

    throw new Error(`Unsupported platform: ${platform}`);
  }

  /**
   * Process a single influencer
   * @param {Object} influencer - {username, platform}
   * @param {Array} existingPosts - Existing posts from data file (CSV/Excel)
   * @returns {Promise<Object>} Processing result
   */
  async processInfluencer(influencer, existingPosts) {
    const { username, platform } = influencer;

    try {
      logger.info(`Processing ${platform} influencer: ${username}`);

      // Get scraper for platform
      const scraper = this.getScraperForPlatform(platform);

      // Fetch recent posts
      const posts = await scraper.getRecentPosts(username, config.scraping.postsToFetch);

      if (!posts || posts.length === 0) {
        logger.warn(`No posts found for ${platform} user: ${username}`);
        return {
          username,
          platform,
          success: false,
          error: 'No posts found',
          postsCount: 0,
        };
      }

      // Normalize posts (include platform)
      const normalizedPosts = posts.map(post => normalizePost(post, username, platform));

      // Get last 10 posts
      const recentPosts = filterLast10Posts(normalizedPosts, 10);

      // Calculate average views
      const averageViews = calculateAverageViews(recentPosts);

      // Deduplicate posts
      const userExistingPosts = existingPosts.filter(
        p => p.username === username
      );
      const { toAppend, toUpdate } = deduplicatePosts(userExistingPosts, normalizedPosts);

      logger.info(
        `${platform} user ${username}: ${posts.length} posts fetched, ` +
        `avg views: ${averageViews}, ${toAppend.length} new, ${toUpdate.length} to update`
      );

      return {
        username,
        platform,
        success: true,
        averageViews,
        postsCount: posts.length,
        toAppend,
        toUpdate,
      };
    } catch (error) {
      logger.error(`Failed to process ${platform} influencer ${username}: ${error.message}`);
      return {
        username,
        platform,
        success: false,
        error: error.message,
        postsCount: 0,
      };
    }
  }

  /**
   * Run the scraping job
   * @returns {Promise<Object>} Job summary
   */
  async run() {
    const startTime = Date.now();
    logger.info('========== Starting scraping job ==========');

    try {
      // Read influencers and existing posts
      logger.info('Reading data from file...');
      const influencers = await this.reader.readInfluencers();
      const existingPosts = await this.reader.readExistingPosts();

      logger.info(`Found ${influencers.length} influencers and ${existingPosts.length} existing posts`);

      if (influencers.length === 0) {
        throw new Error('No influencers found in data file');
      }

      // Process influencers with concurrency control
      logger.info(`Processing influencers with max ${config.scraping.maxConcurrentRequests} concurrent requests...`);

      const results = await Promise.all(
        influencers.map(influencer =>
          this.limit(() => this.processInfluencer(influencer, existingPosts))
        )
      );

      // Collect results
      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      // Prepare updates for data file (CSV/Excel)
      const averageViewsUpdates = successfulResults.map(r => ({
        username: r.username,
        platform: r.platform,
        averageViews: r.averageViews,
      }));

      const allPostsToAppend = successfulResults.flatMap(r => r.toAppend || []);
      const allPostsToUpdate = successfulResults.flatMap(r => r.toUpdate || []);

      // Update data file
      logger.info('Updating data file...');

      if (averageViewsUpdates.length > 0) {
        await this.writer.updateAverageViews(averageViewsUpdates);
      }

      if (allPostsToAppend.length > 0) {
        await this.writer.appendPosts(allPostsToAppend);
      }

      if (allPostsToUpdate.length > 0) {
        await this.writer.updateExistingPosts(allPostsToUpdate);
      }

      // Calculate metrics
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const totalPosts = successfulResults.reduce((sum, r) => sum + r.postsCount, 0);

      const summary = {
        totalInfluencers: influencers.length,
        successCount: successfulResults.length,
        failureCount: failedResults.length,
        totalPosts,
        newPosts: allPostsToAppend.length,
        updatedPosts: allPostsToUpdate.length,
        duration: `${duration}s`,
        errors: failedResults.map(r => ({
          username: r.username,
          platform: r.platform,
          error: r.error,
        })),
      };

      logger.info('========== Scraping job completed ==========');
      logger.info(`Summary: ${JSON.stringify(summary, null, 2)}`);

      // Alert if failure rate is high
      const failureRate = (failedResults.length / influencers.length) * 100;
      if (failureRate > 50) {
        logger.error(`HIGH FAILURE RATE: ${failureRate.toFixed(2)}% of influencers failed`);
      }

      return summary;
    } catch (error) {
      logger.error(`Scraping job failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ScrapingJob;
