const fs = require('fs').promises;
const { parse } = require('csv-parse/sync');
const BaseReader = require('./baseReader');
const logger = require('../../utils/logger');
const config = require('../../config/config');

class CsvReader extends BaseReader {
  constructor() {
    super();
    this.influencersPath = config.paths.csvInfluencers;
    this.postsPath = config.paths.csvPosts;
  }

  /**
   * Read influencers from CSV file
   * @returns {Promise<Array>} Array of influencer objects
   */
  async readInfluencers() {
    try {
      logger.debug(`Reading influencers from CSV: ${this.influencersPath}`);

      // Check if file exists
      try {
        await fs.access(this.influencersPath);
      } catch (error) {
        logger.warn(`Influencers CSV file not found: ${this.influencersPath}`);
        return [];
      }

      const fileContent = await fs.readFile(this.influencersPath, 'utf-8');

      // Parse CSV
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      // Transform to standard format and add row numbers
      const influencers = records.map((record, index) => ({
        username: record.username || record.Username,
        platform: record.platform || record.Platform,
        averageViews: parseFloat(record.averageViews || record['average views'] || 0),
        rowNumber: index + 2, // +2 because: +1 for 0-indexing, +1 for header row
      }));

      logger.info(`Read ${influencers.length} influencers from CSV`);
      return influencers;
    } catch (error) {
      logger.error(`Failed to read influencers CSV: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read existing posts from CSV file
   * @returns {Promise<Array>} Array of post objects
   */
  async readExistingPosts() {
    try {
      logger.debug(`Reading posts from CSV: ${this.postsPath}`);

      // Check if file exists
      try {
        await fs.access(this.postsPath);
      } catch (error) {
        logger.warn(`Posts CSV file not found: ${this.postsPath}, starting fresh`);
        return [];
      }

      const fileContent = await fs.readFile(this.postsPath, 'utf-8');

      // Parse CSV
      const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });

      // Transform to standard format (migrate from old format: views/share to new format: comments)
      const posts = records.map((record, index) => ({
        username: record.username || record.Username,
        platform: record.platform || record.Platform,
        postLink: record.postLink || record['post link'] || record.url,
        postedDate: record.postedDate || record['posted date'],
        comments: parseFloat(record.comments || record.Comments || record.share || record.Share || record.shares || 0), // Migrate from share to comments
        likes: parseFloat(record.likes || record.Likes || 0),
        rowNumber: index + 2, // +2 for 0-indexing and header
      }));

      logger.info(`Read ${posts.length} existing posts from CSV`);
      return posts;
    } catch (error) {
      logger.error(`Failed to read posts CSV: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CsvReader;
