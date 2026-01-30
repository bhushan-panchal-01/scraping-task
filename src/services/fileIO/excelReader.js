const ExcelJS = require('exceljs');
const BaseReader = require('./baseReader');
const logger = require('../../utils/logger');
const config = require('../../config/config');

class ExcelReader extends BaseReader {
  constructor(filePath = config.paths.excelFile) {
    super();
    this.filePath = filePath;
  }

  /**
   * Read influencers from the "main" sheet
   * @returns {Promise<Array>} Array of {username, platform, averageViews}
   */
  async readInfluencers() {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.filePath);

      const mainSheet = workbook.getWorksheet(config.sheets.main);
      if (!mainSheet) {
        throw new Error(`Sheet "${config.sheets.main}" not found in Excel file`);
      }

      const influencers = [];
      const headers = {};

      // Read headers from first row
      mainSheet.getRow(1).eachCell((cell, colNumber) => {
        const headerName = cell.value?.toString().toLowerCase().trim();
        headers[headerName] = colNumber;
      });

      // Validate required columns
      if (!headers['username'] || !headers['platform']) {
        throw new Error('Required columns "username" and "platform" not found in main sheet');
      }

      // Read data rows
      mainSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const username = row.getCell(headers['username']).value?.toString().trim();
        const platform = row.getCell(headers['platform']).value?.toString().trim();

        if (username && platform) {
          const averageViews = headers['average views']
            ? row.getCell(headers['average views']).value
            : null;

          influencers.push({
            username,
            platform: platform.toLowerCase(),
            averageViews: averageViews ? Number(averageViews) : null,
            rowNumber, // Store for updates
          });
        }
      });

      logger.info(`Read ${influencers.length} influencers from Excel file`);
      return influencers;
    } catch (error) {
      logger.error(`Failed to read influencers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Read existing posts from "post link" sheet
   * @returns {Promise<Array>} Array of existing posts
   */
  async readExistingPosts() {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(this.filePath);

      const postSheet = workbook.getWorksheet(config.sheets.postLink);
      if (!postSheet) {
        logger.warn(`Sheet "${config.sheets.postLink}" not found, will create it`);
        return [];
      }

      const posts = [];
      const headers = {};

      // Read headers from first row
      postSheet.getRow(1).eachCell((cell, colNumber) => {
        const headerName = cell.value?.toString().toLowerCase().trim();
        headers[headerName] = colNumber;
      });

      // Read data rows
      postSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row

        const postLink = row.getCell(headers['post link'] || 1).value?.toString().trim();
        if (postLink) {
          posts.push({
            username: row.getCell(headers['username'] || 1).value?.toString().trim(),
            postLink,
            postedDate: row.getCell(headers['posted date'] || 3).value,
            views: row.getCell(headers['views'] || 4).value,
            likes: row.getCell(headers['likes'] || 5).value,
            share: row.getCell(headers['share'] || 6).value,
            rowNumber,
          });
        }
      });

      logger.info(`Read ${posts.length} existing posts from Excel file`);
      return posts;
    } catch (error) {
      logger.error(`Failed to read existing posts: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ExcelReader;
