const fs = require('fs').promises;
const path = require('path');
const { stringify } = require('csv-stringify/sync');
const { parse } = require('csv-parse/sync');
const BaseWriter = require('./baseWriter');
const logger = require('../../utils/logger');
const config = require('../../config/config');

class CsvWriter extends BaseWriter {
  constructor() {
    super();
    this.influencersPath = config.paths.csvInfluencers;
    this.postsPath = config.paths.csvPosts;
    this.backupDir = config.paths.backupDir;
  }

  /**
   * Create backup of a file
   * @param {string} filePath
   * @returns {Promise<void>}
   */
  async createBackup(filePath) {
    try {
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        logger.debug(`No existing file to backup: ${filePath}`);
        return;
      }

      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      const fileName = path.basename(filePath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `${fileName}.${timestamp}.bak`);

      await fs.copyFile(filePath, backupPath);
      logger.debug(`Created backup: ${backupPath}`);
    } catch (error) {
      logger.warn(`Failed to create backup: ${error.message}`);
    }
  }

  /**
   * Write data to CSV file atomically
   * @param {string} filePath
   * @param {Array} data
   * @param {Array} columns
   * @returns {Promise<void>}
   */
  async writeCSV(filePath, data, columns) {
    try {
      // Create backup
      await this.createBackup(filePath);

      // Convert to CSV
      const csv = stringify(data, {
        header: true,
        columns: columns,
      });

      // Write to temp file first (atomic write)
      const tempPath = `${filePath}.tmp`;
      await fs.writeFile(tempPath, csv, 'utf-8');

      // Rename temp file to final file (atomic operation)
      await fs.rename(tempPath, filePath);

      logger.debug(`Successfully wrote CSV: ${filePath}`);
    } catch (error) {
      logger.error(`Failed to write CSV: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update average views for influencers
   * @param {Array} updates - Array of {username, platform, averageViews, rowNumber}
   * @returns {Promise<void>}
   */
  async updateAverageViews(updates) {
    try {
      logger.info(`Updating average views for ${updates.length} influencers in CSV`);

      // Read current influencers
      let influencers = [];
      try {
        const fileContent = await fs.readFile(this.influencersPath, 'utf-8');
        influencers = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (error) {
        logger.warn('Could not read existing influencers CSV, creating new one');
      }

      // Create a map for quick lookup
      const updateMap = new Map();
      updates.forEach(update => {
        const key = `${update.username}|${update.platform}`;
        updateMap.set(key, update.averageViews);
      });

      // Update or add influencers
      const existingKeys = new Set();
      influencers = influencers.map(influencer => {
        const key = `${influencer.username}|${influencer.platform}`;
        existingKeys.add(key);
        if (updateMap.has(key)) {
          return {
            ...influencer,
            averageViews: updateMap.get(key),
          };
        }
        return influencer;
      });

      // Add new influencers
      updates.forEach(update => {
        const key = `${update.username}|${update.platform}`;
        if (!existingKeys.has(key)) {
          influencers.push({
            username: update.username,
            platform: update.platform,
            averageViews: update.averageViews,
          });
        }
      });

      // Write updated data
      await this.writeCSV(this.influencersPath, influencers, [
        { key: 'username', header: 'username' },
        { key: 'platform', header: 'platform' },
        { key: 'averageViews', header: 'average views' },
      ]);

      logger.info('Successfully updated influencers CSV');
    } catch (error) {
      logger.error(`Failed to update average views in CSV: ${error.message}`);
      throw error;
    }
  }

  /**
   * Append new posts to CSV
   * @param {Array} posts - Array of post objects
   * @returns {Promise<void>}
   */
  async appendPosts(posts) {
    try {
      if (posts.length === 0) {
        return;
      }

      logger.info(`Appending ${posts.length} new posts to CSV`);

      // Read existing posts
      let existingPosts = [];
      try {
        const fileContent = await fs.readFile(this.postsPath, 'utf-8');
        existingPosts = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (error) {
        logger.warn('Could not read existing posts CSV, creating new one');
      }

      // Append new posts
      const allPosts = [...existingPosts, ...posts];

      // Write all posts
      await this.writeCSV(this.postsPath, allPosts, [
        { key: 'username', header: 'username' },
        { key: 'platform', header: 'platform' },
        { key: 'postLink', header: 'post link' },
        { key: 'postedDate', header: 'posted date' },
        { key: 'comments', header: 'comments' },
        { key: 'likes', header: 'likes' },
      ]);

      logger.info('Successfully appended posts to CSV');
    } catch (error) {
      logger.error(`Failed to append posts to CSV: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update existing posts in CSV
   * @param {Array} posts - Array of post objects with updated data
   * @returns {Promise<void>}
   */
  async updateExistingPosts(posts) {
    try {
      if (posts.length === 0) {
        return;
      }

      logger.info(`Updating ${posts.length} existing posts in CSV`);

      // Read all posts
      let allPosts = [];
      try {
        const fileContent = await fs.readFile(this.postsPath, 'utf-8');
        allPosts = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        });
      } catch (error) {
        logger.error('Could not read posts CSV for updating');
        throw error;
      }

      // Create update map keyed by postLink
      const updateMap = new Map();
      posts.forEach(post => {
        updateMap.set(post.postLink, post);
      });

      // Update posts
      allPosts = allPosts.map(post => {
        if (updateMap.has(post.postLink || post['post link'])) {
          const update = updateMap.get(post.postLink || post['post link']);
          return {
            username: update.username || post.username,
            platform: update.platform || post.platform,
            postLink: update.postLink,
            postedDate: update.postedDate || post.postedDate || post['posted date'],
            comments: update.comments !== undefined ? update.comments : (post.comments !== undefined ? post.comments : (post.share !== undefined ? post.share : 0)),
            likes: update.likes !== undefined ? update.likes : (post.likes !== undefined ? post.likes : 0),
          };
        }
        // Migrate old format (views/share) to new format (comments)
        return {
          username: post.username,
          platform: post.platform,
          postLink: post.postLink || post['post link'],
          postedDate: post.postedDate || post['posted date'],
          comments: post.comments !== undefined ? post.comments : (post.share !== undefined ? post.share : 0),
          likes: post.likes !== undefined ? post.likes : 0,
        };
      });

      // Write updated data
      await this.writeCSV(this.postsPath, allPosts, [
        { key: 'username', header: 'username' },
        { key: 'platform', header: 'platform' },
        { key: 'postLink', header: 'post link' },
        { key: 'postedDate', header: 'posted date' },
        { key: 'comments', header: 'comments' },
        { key: 'likes', header: 'likes' },
      ]);

      logger.info('Successfully updated posts in CSV');
    } catch (error) {
      logger.error(`Failed to update posts in CSV: ${error.message}`);
      throw error;
    }
  }
}

module.exports = CsvWriter;
