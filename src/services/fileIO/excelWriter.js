const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const BaseWriter = require('./baseWriter');
const logger = require('../../utils/logger');
const config = require('../../config/config');

class ExcelWriter extends BaseWriter {
  constructor(filePath = config.paths.excelFile) {
    super();
    this.filePath = filePath;
    this.ensureBackupDir();
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDir() {
    if (!fs.existsSync(config.paths.backupDir)) {
      fs.mkdirSync(config.paths.backupDir, { recursive: true });
    }
  }

  /**
   * Create a backup of the Excel file
   * @returns {string} Path to backup file
   */
  createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(
        config.paths.backupDir,
        `influencer_names_backup_${timestamp}.xlsx`
      );

      fs.copyFileSync(this.filePath, backupPath);
      logger.info(`Created backup at: ${backupPath}`);
      return backupPath;
    } catch (error) {
      logger.error(`Failed to create backup: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update average views in the "main" sheet
   * @param {Array} updates - Array of {username, platform, averageViews}
   */
  async updateAverageViews(updates) {
    try {
      // Create backup before writing
      this.createBackup();

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.filePath);

      const mainSheet = workbook.getWorksheet(config.sheets.main);
      if (!mainSheet) {
        throw new Error(`Sheet "${config.sheets.main}" not found`);
      }

      // Find headers
      const headers = {};
      mainSheet.getRow(1).eachCell((cell, colNumber) => {
        const headerName = cell.value?.toString().toLowerCase().trim();
        headers[headerName] = colNumber;
      });

      // Ensure "average views" column exists
      if (!headers['average views']) {
        const newColNumber = mainSheet.columnCount + 1;
        mainSheet.getCell(1, newColNumber).value = 'average views';
        headers['average views'] = newColNumber;
      }

      // Update rows
      let updatedCount = 0;
      mainSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const username = row.getCell(headers['username']).value?.toString().trim();
        const platform = row.getCell(headers['platform']).value?.toString().trim().toLowerCase();

        const update = updates.find(
          u => u.username === username && u.platform === platform
        );

        if (update && update.averageViews !== null) {
          row.getCell(headers['average views']).value = update.averageViews;
          updatedCount++;
        }
      });

      // Write to temp file first, then rename (atomic operation)
      const tempPath = `${this.filePath}.tmp`;
      await workbook.xlsx.writeFile(tempPath);
      fs.renameSync(tempPath, this.filePath);

      logger.info(`Updated average views for ${updatedCount} influencers`);
      return updatedCount;
    } catch (error) {
      logger.error(`Failed to update average views: ${error.message}`);
      throw error;
    }
  }

  /**
   * Append new posts to "post link" sheet
   * @param {Array} posts - Array of posts to append
   */
  async appendPosts(posts) {
    if (!posts || posts.length === 0) {
      logger.info('No new posts to append');
      return 0;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.filePath);

      let postSheet = workbook.getWorksheet(config.sheets.postLink);

      // Create sheet if it doesn't exist
      if (!postSheet) {
        postSheet = workbook.addWorksheet(config.sheets.postLink);
        postSheet.addRow(['username', 'post link', 'posted date', 'views', 'likes', 'share']);
      }

      // Append posts
      posts.forEach(post => {
        postSheet.addRow([
          post.username,
          post.postLink,
          post.postedDate,
          post.views,
          post.likes,
          post.share,
        ]);
      });

      // Write to temp file first, then rename
      const tempPath = `${this.filePath}.tmp`;
      await workbook.xlsx.writeFile(tempPath);
      fs.renameSync(tempPath, this.filePath);

      logger.info(`Appended ${posts.length} new posts`);
      return posts.length;
    } catch (error) {
      logger.error(`Failed to append posts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update existing posts with new data
   * @param {Array} posts - Array of posts to update
   */
  async updateExistingPosts(posts) {
    if (!posts || posts.length === 0) {
      logger.info('No posts to update');
      return 0;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.filePath);

      const postSheet = workbook.getWorksheet(config.sheets.postLink);
      if (!postSheet) {
        throw new Error(`Sheet "${config.sheets.postLink}" not found`);
      }

      // Find headers
      const headers = {};
      postSheet.getRow(1).eachCell((cell, colNumber) => {
        const headerName = cell.value?.toString().toLowerCase().trim();
        headers[headerName] = colNumber;
      });

      // Update rows
      let updatedCount = 0;
      postSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const postLink = row.getCell(headers['post link'] || 2).value?.toString().trim();

        const update = posts.find(p => p.postLink === postLink);
        if (update) {
          row.getCell(headers['views'] || 4).value = update.views;
          row.getCell(headers['likes'] || 5).value = update.likes;
          row.getCell(headers['share'] || 6).value = update.share;
          updatedCount++;
        }
      });

      // Write to temp file first, then rename
      const tempPath = `${this.filePath}.tmp`;
      await workbook.xlsx.writeFile(tempPath);
      fs.renameSync(tempPath, this.filePath);

      logger.info(`Updated ${updatedCount} existing posts`);
      return updatedCount;
    } catch (error) {
      logger.error(`Failed to update existing posts: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ExcelWriter;
