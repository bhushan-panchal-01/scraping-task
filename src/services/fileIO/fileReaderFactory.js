const path = require('path');
const ExcelReader = require('./excelReader');
const CsvReader = require('./csvReader');
const logger = require('../../utils/logger');
const config = require('../../config/config');

class FileReaderFactory {
  /**
   * Detect file format from file path
   * @param {string} filePath
   * @returns {string} 'excel' or 'csv'
   */
  static detectFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase();

    if (ext === '.xlsx' || ext === '.xls') {
      return 'excel';
    }

    if (ext === '.csv') {
      return 'csv';
    }

    // Default to CSV format (Excel is legacy)
    logger.warn(`Unknown file extension: ${ext}, defaulting to CSV format`);
    return 'csv';
  }

  /**
   * Create appropriate reader based on file format
   * @param {string} format - 'excel' or 'csv' (optional, will auto-detect if not provided)
   * @returns {BaseReader} Reader instance
   */
  static create(format = null) {
    const dataFilePath = config.paths.dataFile;

    // Auto-detect format if not provided
    if (!format) {
      format = this.detectFormat(dataFilePath);
    }

    logger.debug(`Creating file reader for format: ${format}`);

    if (format === 'csv') {
      return new CsvReader();
    } else {
      return new ExcelReader(dataFilePath);
    }
  }
}

module.exports = FileReaderFactory;
